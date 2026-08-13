const fs = require("fs").promises;
const path = require("path");
const { minify } = require("terser");

const SOURCE_DIR = path.join(__dirname, "../src/bookmarklets");
const BOOKMARKLETS_MANIFEST_PATH = path.join(
  __dirname,
  "../public/bookmarklets.json"
);

const TERSER_OPTIONS = {
  compress: {
    drop_console: true,
    drop_debugger: true,
    dead_code: true,
    conditionals: true,
    comparisons: true,
    inline: true,
    unused: true,
  },
  mangle: {
    toplevel: true,
  },
  format: {
    comments: false,
    beautify: false,
  },
};

async function readSourceFiles(sourceDir = SOURCE_DIR) {
  let entries;

  try {
    entries = await fs.readdir(sourceDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`源码目录不存在: ${sourceDir}`, { cause: error });
    }
    throw error;
  }

  const filenames = entries
    .filter((entry) => entry.isFile() && path.extname(entry.name) === ".js")
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    filenames.map(async (filename) => ({
      filename,
      content: await fs.readFile(path.join(sourceDir, filename), "utf8"),
    }))
  );
}

async function compressCode(code) {
  const result = await minify(code, TERSER_OPTIONS);

  if (!result.code) {
    throw new Error("Terser 压缩结果为空");
  }

  return result.code;
}

function wrapAsBookmarklet(compressedCode) {
  return `javascript:(function(){${compressedCode.trim()}})();`;
}

function readBookmarkletMetadata(filename, source) {
  const nameMatch = source.match(/^\s*\/\/\s*@name:\s*(.+)$/m);
  const bookmarkNameMatch = source.match(
    /^\s*\/\/\s*@bookmark-name:\s*(.+)$/m
  );
  const name = path.basename(filename, ".js");

  return {
    chineseName: nameMatch?.[1].trim() || name,
    bookmarkName: bookmarkNameMatch?.[1].trim() || nameMatch?.[1].trim() || name,
    name,
    filename,
  };
}

function createBookmarkletManifest(sourceFiles, processedFiles) {
  const processedByFilename = new Map(
    processedFiles.map((file) => [file.filename, file])
  );

  return sourceFiles.map(({ filename, content }) => ({
    ...readBookmarkletMetadata(filename, content),
    content: processedByFilename.get(filename).bookmarkletCode.trim(),
  }));
}

async function writeBookmarkletManifest(
  manifest,
  manifestPath = BOOKMARKLETS_MANIFEST_PATH
) {
  if (!manifestPath) {
    return;
  }

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );
}

function formatError(error, filename) {
  const location = error.line
    ? ` (${filename}:${error.line}:${error.col ?? 0})`
    : "";
  return `${filename}${location}: ${error.message}`;
}

async function buildBookmarklets(options = {}) {
  const {
    sourceDir = SOURCE_DIR,
    manifestPath = BOOKMARKLETS_MANIFEST_PATH,
    logger = console,
  } = options;
  const startedAt = Date.now();
  const sourceFiles = await readSourceFiles(sourceDir);
  const processedFiles = [];
  const buildErrors = [];

  logger.log(`开始构建 ${sourceFiles.length} 个小书签`);

  for (const file of sourceFiles) {
    try {
      const compressedCode = await compressCode(file.content);
      const bookmarkletCode = wrapAsBookmarklet(compressedCode);
      processedFiles.push({
        filename: file.filename,
        bookmarkletCode,
        originalSize: Buffer.byteLength(file.content),
        bookmarkletSize: Buffer.byteLength(bookmarkletCode),
      });
    } catch (error) {
      buildErrors.push(
        new Error(formatError(error, file.filename), { cause: error })
      );
    }
  }

  if (buildErrors.length > 0) {
    throw new AggregateError(
      buildErrors,
      `${buildErrors.length} 个小书签构建失败，静态清单保持不变`
    );
  }

  const manifest = createBookmarkletManifest(sourceFiles, processedFiles);
  await writeBookmarkletManifest(manifest, manifestPath);
  const durationMs = Date.now() - startedAt;

  processedFiles.forEach((file) => {
    logger.log(
      `✓ ${file.filename}: ${file.originalSize} → ${file.bookmarkletSize} 字节`
    );
  });
  logger.log(`构建完成，耗时 ${durationMs}ms`);

  return {
    files: processedFiles,
    manifest,
    durationMs,
  };
}

if (require.main === module) {
  buildBookmarklets().catch((error) => {
    console.error(`构建失败: ${error.message}`);
    if (error instanceof AggregateError) {
      error.errors.forEach((item) => console.error(`- ${item.message}`));
    }
    process.exitCode = 1;
  });
}

module.exports = {
  buildBookmarklets,
  compressCode,
  createBookmarkletManifest,
  readBookmarkletMetadata,
  readSourceFiles,
  writeBookmarkletManifest,
  wrapAsBookmarklet,
};
