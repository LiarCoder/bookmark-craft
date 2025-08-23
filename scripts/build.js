const fs = require("fs").promises;
const path = require("path");
const { minify } = require("terser");

// 配置路径
const SOURCE_DIR = path.join(__dirname, "../src/bookmarklets");
const OUTPUT_DIR = path.join(__dirname, "../output");

/**
 * 读取源码目录中的所有 JavaScript 文件
 * @returns {Promise<Array>} 返回文件信息数组
 */
async function readSourceFiles() {
  try {
    console.log("正在读取源码目录:", SOURCE_DIR);

    // 检查源码目录是否存在
    try {
      await fs.access(SOURCE_DIR);
    } catch (error) {
      throw new Error(`源码目录不存在: ${SOURCE_DIR}`);
    }

    // 读取目录内容
    const files = await fs.readdir(SOURCE_DIR);

    // 过滤出 .js 文件
    const jsFiles = files.filter((file) => path.extname(file) === ".js");

    if (jsFiles.length === 0) {
      console.log("警告: 在源码目录中未找到 .js 文件");
      return [];
    }

    console.log(`找到 ${jsFiles.length} 个 JavaScript 文件:`, jsFiles);

    // 读取每个文件的内容
    const fileContents = [];
    for (const filename of jsFiles) {
      try {
        const filePath = path.join(SOURCE_DIR, filename);
        const content = await fs.readFile(filePath, "utf8");

        fileContents.push({
          filename,
          filePath,
          content,
        });

        console.log(`✓ 成功读取文件: ${filename}`);
      } catch (error) {
        console.error(`✗ 读取文件失败 ${filename}:`, error.message);
        throw error;
      }
    }

    return fileContents;
  } catch (error) {
    console.error("读取源码文件时出错:", error.message);
    throw error;
  }
}

/**
 * 确保输出目录存在
 */
async function ensureOutputDirectory() {
  try {
    console.log("检查输出目录:", OUTPUT_DIR);

    // 检查目录是否存在
    try {
      await fs.access(OUTPUT_DIR);
      console.log("✓ 输出目录已存在");
    } catch (error) {
      // 目录不存在，创建它
      console.log("创建输出目录...");
      await fs.mkdir(OUTPUT_DIR, { recursive: true });
      console.log("✓ 输出目录创建成功");
    }
  } catch (error) {
    console.error("创建输出目录时出错:", error.message);
    throw error;
  }
}

/**
 * 使用 Terser 压缩 JavaScript 代码
 * @param {string} code - 要压缩的代码
 * @param {string} filename - 文件名（用于错误报告）
 * @returns {Promise<string>} 压缩后的代码
 */
async function compressCode(code, filename) {
  try {
    console.log(`正在压缩文件: ${filename}`);

    // Terser 配置选项
    const terserOptions = {
      compress: {
        // 移除 console.log 语句
        drop_console: true,
        // 移除 debugger 语句
        drop_debugger: true,
        // 移除未使用的代码
        dead_code: true,
        // 压缩条件语句
        conditionals: true,
        // 压缩比较运算
        comparisons: true,
        // 内联函数调用
        inline: true,
        // 移除未使用的函数参数
        unused: true,
      },
      mangle: {
        // 压缩变量名
        toplevel: true,
      },
      format: {
        // 移除注释
        comments: false,
        // 紧凑输出
        beautify: false,
      },
    };

    const result = await minify(code, terserOptions);

    if (result.error) {
      throw new Error(`Terser 压缩错误: ${result.error.message}`);
    }

    if (!result.code) {
      throw new Error("Terser 压缩结果为空");
    }

    const originalSize = code.length;
    const compressedSize = result.code.length;
    const compressionRatio = (
      ((originalSize - compressedSize) / originalSize) *
      100
    ).toFixed(1);

    console.log(
      `✓ ${filename} 压缩完成: ${originalSize} → ${compressedSize} 字符 (压缩率: ${compressionRatio}%)`
    );

    return result.code;
  } catch (error) {
    console.error(`✗ 压缩文件 ${filename} 时出错:`, error.message);

    // 如果是语法错误，提供更详细的信息
    if (
      error.message.includes("SyntaxError") ||
      error.message.includes("Unexpected token")
    ) {
      console.error(`语法错误详情: 请检查文件 ${filename} 的 JavaScript 语法`);
    }

    throw error;
  }
}

/**
 * 将压缩后的代码包装为小书签格式
 * @param {string} compressedCode - 压缩后的代码
 * @param {string} filename - 文件名（用于日志）
 * @returns {string} 包装后的小书签代码
 */
function wrapAsBookmarklet(compressedCode, filename) {
  try {
    console.log(`正在包装小书签格式: ${filename}`);

    // 移除代码中的换行符和多余空格
    const cleanCode = compressedCode.trim();

    // 包装为小书签格式
    const bookmarkletCode = `javascript:(function(){${cleanCode}})();`;

    console.log(`✓ ${filename} 包装完成: ${bookmarkletCode.length} 字符`);

    return bookmarkletCode;
  } catch (error) {
    console.error(`✗ 包装文件 ${filename} 时出错:`, error.message);
    throw error;
  }
}

/**
 * 将处理后的文件写入输出目录
 * @param {Array} processedFiles - 处理后的文件数组
 */
async function writeOutputFiles(processedFiles) {
  try {
    console.log(`\n开始写入 ${processedFiles.length} 个输出文件...`);

    let writeSuccessCount = 0;
    let writeErrorCount = 0;

    for (const file of processedFiles) {
      try {
        // 保持与源文件相同的文件名
        const outputPath = path.join(OUTPUT_DIR, file.filename);

        console.log(`写入文件: ${file.filename}`);
        await fs.writeFile(outputPath, file.bookmarkletCode, "utf8");

        console.log(`✓ 成功写入: ${outputPath}`);
        writeSuccessCount++;
      } catch (error) {
        console.error(`✗ 写入文件 ${file.filename} 失败:`, error.message);
        writeErrorCount++;
      }
    }

    console.log(`\n=== 文件写入完成 ===`);
    console.log(`成功: ${writeSuccessCount} 个文件`);
    console.log(`失败: ${writeErrorCount} 个文件`);

    if (writeErrorCount > 0) {
      throw new Error(`${writeErrorCount} 个文件写入失败`);
    }
  } catch (error) {
    console.error("写入输出文件时出错:", error.message);
    throw error;
  }
}

/**
 * 主构建函数
 */
async function buildBookmarklets() {
  try {
    console.log("=== 开始构建小书签 ===");
    console.log("时间:", new Date().toLocaleString());

    // 1. 确保输出目录存在
    await ensureOutputDirectory();

    // 2. 读取源码文件
    const sourceFiles = await readSourceFiles();

    if (sourceFiles.length === 0) {
      console.log("没有找到需要处理的文件，构建结束");
      return;
    }

    console.log(`\n准备处理 ${sourceFiles.length} 个文件...`);

    // 处理每个文件：压缩代码
    const processedFiles = [];
    let successCount = 0;
    let errorCount = 0;

    for (const file of sourceFiles) {
      try {
        console.log(`\n处理文件: ${file.filename}`);

        // 压缩代码
        const compressedCode = await compressCode(file.content, file.filename);

        // 包装为小书签格式
        const bookmarkletCode = wrapAsBookmarklet(
          compressedCode,
          file.filename
        );

        processedFiles.push({
          ...file,
          compressedCode,
          bookmarkletCode,
        });

        successCount++;
      } catch (error) {
        console.error(`处理文件 ${file.filename} 失败:`, error.message);
        errorCount++;
        // 继续处理其他文件，不中断整个构建过程
      }
    }

    console.log(`\n=== 处理阶段完成 ===`);
    console.log(`成功: ${successCount} 个文件`);
    console.log(`失败: ${errorCount} 个文件`);

    if (errorCount > 0) {
      console.log("注意: 部分文件处理失败，请检查上述错误信息");
    }

    // 如果有成功处理的文件，写入输出目录
    if (processedFiles.length > 0) {
      await writeOutputFiles(processedFiles);

      console.log(`\n=== 构建完成 ===`);
      console.log(`总共处理了 ${processedFiles.length} 个文件`);
      console.log(`输出目录: ${OUTPUT_DIR}`);
    } else {
      console.log("\n没有文件成功处理，跳过输出步骤");
    }
  } catch (error) {
    console.error("\n=== 构建失败 ===");
    console.error("错误:", error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本，执行构建
if (require.main === module) {
  buildBookmarklets();
}

module.exports = {
  buildBookmarklets,
  readSourceFiles,
  ensureOutputDirectory,
  compressCode,
  wrapAsBookmarklet,
  writeOutputFiles,
};
