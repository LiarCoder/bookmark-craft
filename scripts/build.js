const fs = require("fs").promises;
const path = require("path");
const { minify } = require("terser");

const SOURCE_DIR = path.join(__dirname, "../src/bookmarklets");
const OUTPUT_DIR = path.join(__dirname, "../output");

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

function formatError(error, filename) {
  const location = error.line
    ? ` (${filename}:${error.line}:${error.col ?? 0})`
    : "";
  return `${filename}${location}: ${error.message}`;
}

async function syncOutputFiles(processedFiles, outputDir = OUTPUT_DIR) {
  await fs.mkdir(outputDir, { recursive: true });

  const sourceNames = new Set(processedFiles.map((file) => file.filename));
  const outputEntries = await fs.readdir(outputDir, { withFileTypes: true });
  const staleFiles = outputEntries
    .filter(
      (entry) =>
        entry.isFile() &&
        path.extname(entry.name) === ".js" &&
        !sourceNames.has(entry.name)
    )
    .map((entry) => entry.name);

  await Promise.all(
    processedFiles.map((file) =>
      fs.writeFile(
        path.join(outputDir, file.filename),
        file.bookmarkletCode,
        "utf8"
      )
    )
  );
  await Promise.all(
    staleFiles.map((filename) => fs.unlink(path.join(outputDir, filename)))
  );

  return staleFiles;
}

async function buildBookmarklets(options = {}) {
  const {
    sourceDir = SOURCE_DIR,
    outputDir = OUTPUT_DIR,
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
        outputSize: Buffer.byteLength(bookmarkletCode),
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
      `${buildErrors.length} 个小书签构建失败，输出目录保持不变`
    );
  }

  const staleFiles = await syncOutputFiles(processedFiles, outputDir);
  const durationMs = Date.now() - startedAt;

  processedFiles.forEach((file) => {
    logger.log(
      `✓ ${file.filename}: ${file.originalSize} → ${file.outputSize} 字节`
    );
  });
  staleFiles.forEach((filename) => logger.log(`- 移除过期产物: ${filename}`));
  logger.log(`构建完成，耗时 ${durationMs}ms`);

  return {
    files: processedFiles,
    staleFiles,
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
  readSourceFiles,
  syncOutputFiles,
  wrapAsBookmarklet,
};
