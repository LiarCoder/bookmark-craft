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
 * 解析 Terser 错误信息，提取行号和列号
 * @param {Error} error - Terser 错误对象
 * @param {string} filename - 文件名
 * @returns {Object} 格式化的错误信息
 */
function parseErrorDetails(error, filename) {
  const errorInfo = {
    filename,
    message: error.message,
    line: null,
    column: null,
    type: "unknown",
  };

  // 检查是否是语法错误
  if (
    error.message.includes("SyntaxError") ||
    error.message.includes("Unexpected token")
  ) {
    errorInfo.type = "syntax";

    // 尝试从错误消息中提取行号和列号
    const lineMatch = error.message.match(/line (\d+)/i);
    const columnMatch = error.message.match(/column (\d+)/i);
    const positionMatch = error.message.match(/\((\d+):(\d+)\)/);

    if (positionMatch) {
      errorInfo.line = parseInt(positionMatch[1]);
      errorInfo.column = parseInt(positionMatch[2]);
    } else {
      if (lineMatch) errorInfo.line = parseInt(lineMatch[1]);
      if (columnMatch) errorInfo.column = parseInt(columnMatch[1]);
    }
  } else if (error.message.includes("Parse error")) {
    errorInfo.type = "parse";
  } else if (error.message.includes("Compress error")) {
    errorInfo.type = "compress";
  }

  return errorInfo;
}

/**
 * 格式化错误信息显示
 * @param {Object} errorInfo - 错误信息对象
 * @returns {string} 格式化的错误消息
 */
function formatErrorMessage(errorInfo) {
  let message = `✗ 文件 ${errorInfo.filename} 处理失败`;

  if (errorInfo.type === "syntax") {
    message += " - JavaScript 语法错误";
    if (errorInfo.line) {
      message += `\n  位置: 第 ${errorInfo.line} 行`;
      if (errorInfo.column) {
        message += `，第 ${errorInfo.column} 列`;
      }
    }
    message += `\n  错误详情: ${errorInfo.message}`;
    message += `\n  建议: 请检查文件的 JavaScript 语法，确保所有括号、分号和引号都正确匹配`;
  } else if (errorInfo.type === "parse") {
    message += " - 代码解析错误";
    message += `\n  错误详情: ${errorInfo.message}`;
    message += `\n  建议: 请检查代码结构和语法`;
  } else {
    message += ` - ${errorInfo.message}`;
  }

  return message;
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
      // 添加源文件名用于更好的错误报告
      sourceMap: false,
    };

    const result = await minify(code, terserOptions);

    if (result.error) {
      const errorInfo = parseErrorDetails(result.error, filename);
      const formattedMessage = formatErrorMessage(errorInfo);
      console.error(formattedMessage);
      throw new Error(`压缩失败: ${result.error.message}`);
    }

    if (!result.code) {
      throw new Error("Terser 压缩结果为空，可能是输入代码有问题");
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
    // 如果不是我们已经处理过的错误，进行额外处理
    if (!error.message.startsWith("压缩失败:")) {
      const errorInfo = parseErrorDetails(error, filename);
      const formattedMessage = formatErrorMessage(errorInfo);
      console.error(formattedMessage);
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
  const writeErrors = [];

  try {
    console.log(`\n开始写入 ${processedFiles.length} 个输出文件...`);

    let writeSuccessCount = 0;
    let writeErrorCount = 0;

    for (const file of processedFiles) {
      try {
        // 保持与源文件相同的文件名
        const outputPath = path.join(OUTPUT_DIR, file.filename);

        console.log(`写入文件: ${file.filename}`);

        // 检查文件大小
        const fileSizeKB = (file.bookmarkletCode.length / 1024).toFixed(2);

        await fs.writeFile(outputPath, file.bookmarkletCode, "utf8");

        console.log(`✓ 成功写入: ${outputPath} (${fileSizeKB} KB)`);
        writeSuccessCount++;
      } catch (error) {
        const errorMessage = `写入文件 ${file.filename} 失败`;
        let detailedError = error.message;

        // 提供更具体的错误信息
        if (error.code === "EACCES") {
          detailedError = `权限不足，无法写入文件。请检查输出目录权限: ${OUTPUT_DIR}`;
        } else if (error.code === "ENOSPC") {
          detailedError = `磁盘空间不足，无法写入文件`;
        } else if (error.code === "ENOENT") {
          detailedError = `输出目录不存在或路径无效: ${OUTPUT_DIR}`;
        } else if (error.code === "EMFILE" || error.code === "ENFILE") {
          detailedError = `系统打开文件数量超限，请稍后重试`;
        }

        console.error(`✗ ${errorMessage}: ${detailedError}`);

        writeErrors.push({
          filename: file.filename,
          error: detailedError,
          code: error.code,
        });

        writeErrorCount++;
      }
    }

    console.log(`\n=== 文件写入完成 ===`);
    console.log(`成功写入: ${writeSuccessCount} 个文件`);
    console.log(`写入失败: ${writeErrorCount} 个文件`);

    if (writeErrorCount > 0) {
      console.log(`\n写入错误详情:`);
      writeErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.filename}: ${error.error}`);
      });

      throw new Error(`${writeErrorCount} 个文件写入失败，请检查上述错误信息`);
    }
  } catch (error) {
    if (!error.message.includes("个文件写入失败")) {
      console.error("写入输出文件时出现未预期的错误:", error.message);
    }
    throw error;
  }
}

/**
 * 主构建函数
 */
async function buildBookmarklets() {
  const buildStartTime = Date.now();
  const buildErrors = [];

  try {
    console.log("=== 开始构建小书签 ===");
    console.log("时间:", new Date().toLocaleString());
    console.log("源码目录:", SOURCE_DIR);
    console.log("输出目录:", OUTPUT_DIR);

    // 1. 确保输出目录存在
    await ensureOutputDirectory();

    // 2. 读取源码文件
    const sourceFiles = await readSourceFiles();

    if (sourceFiles.length === 0) {
      console.log("\n=== 构建完成 ===");
      console.log("状态: 没有找到需要处理的文件");
      console.log("建议: 请在 src/bookmarklets/ 目录中添加 .js 文件");
      return;
    }

    console.log(`\n准备处理 ${sourceFiles.length} 个文件...`);

    // 处理每个文件：压缩代码
    const processedFiles = [];
    const fileResults = [];
    let successCount = 0;
    let errorCount = 0;
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    for (const file of sourceFiles) {
      try {
        console.log(`\n处理文件: ${file.filename}`);

        // 记录原始文件大小
        totalOriginalSize += file.content.length;

        // 压缩代码
        const compressedCode = await compressCode(file.content, file.filename);

        // 包装为小书签格式
        const bookmarkletCode = wrapAsBookmarklet(
          compressedCode,
          file.filename
        );

        // 记录压缩后大小
        totalCompressedSize += compressedCode.length;

        processedFiles.push({
          ...file,
          compressedCode,
          bookmarkletCode,
        });

        fileResults.push({
          filename: file.filename,
          status: "success",
          originalSize: file.content.length,
          compressedSize: compressedCode.length,
          bookmarkletSize: bookmarkletCode.length,
        });

        successCount++;
      } catch (error) {
        console.error(`\n处理文件 ${file.filename} 失败:`);
        console.error(`错误类型: ${error.constructor.name}`);
        console.error(`错误信息: ${error.message}`);

        buildErrors.push({
          filename: file.filename,
          error: error.message,
          type: error.constructor.name,
        });

        fileResults.push({
          filename: file.filename,
          status: "failed",
          error: error.message,
        });

        errorCount++;
        // 继续处理其他文件，不中断整个构建过程
      }
    }

    console.log(`\n=== 处理阶段完成 ===`);
    console.log(`成功处理: ${successCount} 个文件`);
    console.log(`处理失败: ${errorCount} 个文件`);

    if (successCount > 0) {
      const totalCompressionRatio =
        totalOriginalSize > 0
          ? (
              ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) *
              100
            ).toFixed(1)
          : 0;
      console.log(
        `总压缩率: ${totalCompressionRatio}% (${totalOriginalSize} → ${totalCompressedSize} 字符)`
      );
    }

    // 如果有成功处理的文件，写入输出目录
    if (processedFiles.length > 0) {
      await writeOutputFiles(processedFiles);

      console.log(`\n=== 构建成功完成 ===`);
      console.log(
        `构建时间: ${((Date.now() - buildStartTime) / 1000).toFixed(2)} 秒`
      );
      console.log(`成功处理: ${processedFiles.length} 个小书签文件`);
      console.log(`输出位置: ${OUTPUT_DIR}`);

      // 显示成功处理的文件列表
      console.log(`\n成功构建的文件:`);
      fileResults
        .filter((f) => f.status === "success")
        .forEach((file) => {
          console.log(
            `  ✓ ${file.filename} (${file.originalSize} → ${file.bookmarkletSize} 字符)`
          );
        });
    } else {
      console.log(`\n=== 构建失败 ===`);
      console.log("没有文件成功处理，跳过输出步骤");
    }

    // 如果有错误，显示详细的错误汇总
    if (buildErrors.length > 0) {
      console.log(`\n=== 错误汇总 ===`);
      console.log(`共 ${buildErrors.length} 个文件处理失败:`);
      buildErrors.forEach((error, index) => {
        console.log(`\n${index + 1}. 文件: ${error.filename}`);
        console.log(`   错误类型: ${error.type}`);
        console.log(`   错误信息: ${error.error}`);
      });

      console.log(`\n建议解决方案:`);
      console.log(`1. 检查失败文件的 JavaScript 语法`);
      console.log(`2. 确保所有括号、分号和引号都正确匹配`);
      console.log(`3. 移除或修复有问题的代码`);
      console.log(`4. 重新运行构建命令`);

      // 如果所有文件都失败了，退出并返回错误码
      if (errorCount === sourceFiles.length) {
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(`\n=== 构建过程出现严重错误 ===`);
    console.error(
      `构建时间: ${((Date.now() - buildStartTime) / 1000).toFixed(2)} 秒`
    );
    console.error(`错误类型: ${error.constructor.name}`);
    console.error(`错误信息: ${error.message}`);

    if (error.stack) {
      console.error(`\n错误堆栈:`);
      console.error(error.stack);
    }

    console.error(`\n可能的解决方案:`);
    console.error(`1. 检查源码目录是否存在: ${SOURCE_DIR}`);
    console.error(`2. 检查输出目录权限: ${OUTPUT_DIR}`);
    console.error(`3. 确保 Node.js 和依赖包正确安装`);
    console.error(`4. 检查磁盘空间是否充足`);

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
