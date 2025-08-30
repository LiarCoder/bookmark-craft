const express = require("express");
const path = require("path");
const chokidar = require("chokidar");
const fs = require("fs");
const { buildBookmarklets } = require("./build.js");

const app = express();
const PORT = 3000;

// 构建状态跟踪
let isBuilding = false;
let buildQueue = false;

// 存储 SSE 连接
const sseClients = new Set();

/**
 * 执行构建，带有错误处理，确保服务器不会崩溃
 */
async function runBuild(trigger = "手动") {
  if (isBuilding) {
    buildQueue = true;
    console.log("⏳ 构建正在进行中，新的构建请求已加入队列...");

    // 通知客户端构建正在排队
    broadcastUpdate({
      type: "build_queued",
      message: "构建请求已排队，等待当前构建完成",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const buildStartTime = Date.now();

  try {
    isBuilding = true;
    console.log(`\n🔨 开始构建小书签... (触发原因: ${trigger})`);
    console.log(`⏰ 构建开始时间: ${new Date().toLocaleString()}`);

    // 通知客户端构建开始
    broadcastUpdate({
      type: "build_start",
      message: `开始构建小书签 (${trigger})`,
      timestamp: new Date().toISOString(),
    });

    await buildBookmarklets();

    const buildDuration = ((Date.now() - buildStartTime) / 1000).toFixed(2);

    console.log(`✅ 构建成功完成！`);
    console.log(`⏱️ 构建耗时: ${buildDuration} 秒`);
    console.log(`🕒 完成时间: ${new Date().toLocaleString()}`);
    console.log(`🔗 访问 http://localhost:${PORT} 查看更新后的小书签列表`);

    // 通知所有 SSE 客户端构建完成
    broadcastUpdate({
      type: "build_complete",
      message: `小书签构建完成，耗时 ${buildDuration} 秒`,
      timestamp: new Date().toISOString(),
      duration: buildDuration,
    });

    // 如果有排队的构建请求，执行它
    if (buildQueue) {
      buildQueue = false;
      console.log("🔄 执行排队中的构建请求...");
      setTimeout(() => runBuild("排队构建"), 100); // 短暂延迟后执行
    }
  } catch (error) {
    const buildDuration = ((Date.now() - buildStartTime) / 1000).toFixed(2);

    console.error(`❌ 构建失败 (耗时 ${buildDuration} 秒)`);
    console.error(`🔍 错误详情: ${error.message}`);
    console.log(`💡 解决建议:`);
    console.log(`   1. 检查源码文件的 JavaScript 语法`);
    console.log(`   2. 确保所有文件都已正确保存`);
    console.log(`   3. 修复错误后，保存文件将自动重新构建`);
    console.log(`🔄 开发服务器继续运行，等待文件修改...`);

    // 通知所有 SSE 客户端构建失败
    broadcastUpdate({
      type: "build_error",
      message: `构建失败: ${error.message}`,
      error: error.message,
      timestamp: new Date().toISOString(),
      duration: buildDuration,
    });
  } finally {
    isBuilding = false;
  }
}

// 配置静态文件服务，提供 public 目录访问
app.use(express.static(path.join(__dirname, "..", "public")));

// API 端点：获取小书签列表
app.get("/api/bookmarklets", (req, res) => {
  try {
    const outputDir = path.join(__dirname, "..", "output");
    const scriptDir = path.join(__dirname, "..", "src", "bookmarklets");

    if (!fs.existsSync(outputDir)) {
      console.log(`📂 输出目录不存在，返回空列表: ${outputDir}`);
      return res.json([]);
    }

    const files = fs
      .readdirSync(outputDir)
      .filter((file) => file.endsWith(".js") && file !== ".gitkeep")
      .map((file) => {
        try {
          const filePath = path.join(outputDir, file);
          const content = fs.readFileSync(filePath, "utf8");
          const scriptPath = path.join(scriptDir, file);

          let scriptContent = "";
          let chineseName = path.basename(file, ".js");

          // 尝试读取源文件获取中文名称
          if (fs.existsSync(scriptPath)) {
            scriptContent = fs.readFileSync(scriptPath, "utf8");
            const nameMatch = scriptContent.match(/@name: (.+)/);
            if (nameMatch) {
              chineseName = nameMatch[1].trim();
            }
          }

          return {
            chineseName: chineseName,
            name: path.basename(file, ".js"),
            filename: file,
            content: content.trim(),
          };
        } catch (fileError) {
          console.error(`❌ 读取文件 ${file} 时出错: ${fileError.message}`);
          return null;
        }
      })
      .filter((file) => file !== null); // 过滤掉读取失败的文件

    console.log(`📋 成功获取小书签列表，共 ${files.length} 个文件`);
    res.json(files);
  } catch (error) {
    console.error(`❌ 获取小书签列表时发生错误:`);
    console.error(`🔍 错误详情: ${error.message}`);
    console.error(`📍 错误类型: ${error.constructor.name}`);

    let errorMessage = "获取小书签列表失败";
    let statusCode = 500;

    if (error.code === "ENOENT") {
      errorMessage = "小书签目录不存在，请先运行构建命令";
      statusCode = 404;
    } else if (error.code === "EACCES") {
      errorMessage = "没有权限访问小书签目录，请检查文件权限";
      statusCode = 403;
    } else if (error.code === "EMFILE" || error.code === "ENFILE") {
      errorMessage = "系统文件句柄不足，请稍后重试";
      statusCode = 503;
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: error.message,
      code: error.code || "UNKNOWN",
    });
  }
});

// SSE 端点：实时更新通知
app.get("/api/events", (req, res) => {
  // 设置 SSE 头部
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  // 发送初始连接消息
  res.write('data: {"type":"connected","message":"已连接到实时更新服务"}\n\n');

  // 添加到客户端列表
  sseClients.add(res);

  // 处理客户端断开连接
  req.on("close", () => {
    sseClients.delete(res);
  });

  req.on("aborted", () => {
    sseClients.delete(res);
  });
});

// 广播更新消息给所有 SSE 客户端
function broadcastUpdate(message) {
  const data = `data: ${JSON.stringify(message)}\n\n`;

  sseClients.forEach((client) => {
    try {
      client.write(data);
    } catch (error) {
      // 如果写入失败，移除这个客户端
      sseClients.delete(client);
    }
  });
}

// 文件监听功能
function setupFileWatcher() {
  const srcBookmarkletsPath = path.join(__dirname, "..", "src", "bookmarklets");
  const srcUtilsPath = path.join(__dirname, "..", "src", "utils");

  // 检查目录是否存在
  const watchPaths = [];

  console.log(`🔍 检查源码目录...`);

  if (fs.existsSync(srcBookmarkletsPath)) {
    watchPaths.push(srcBookmarkletsPath);
    console.log(`✅ 找到小书签目录: ${srcBookmarkletsPath}`);
  } else {
    console.log(`⚠️ 小书签目录不存在: ${srcBookmarkletsPath}`);
    console.log(`💡 建议: 请创建 src/bookmarklets/ 目录并添加 .js 文件`);
  }

  if (fs.existsSync(srcUtilsPath)) {
    watchPaths.push(srcUtilsPath);
    console.log(`✅ 找到工具函数目录: ${srcUtilsPath}`);
  } else {
    console.log(`ℹ️ 工具函数目录不存在: ${srcUtilsPath} (可选)`);
  }

  if (watchPaths.length === 0) {
    console.log(`❌ 没有找到要监听的源码目录`);
    console.log(`💡 解决方案:`);
    console.log(`   1. 创建 src/bookmarklets/ 目录`);
    console.log(`   2. 在目录中添加 .js 文件`);
    console.log(`   3. 重启开发服务器`);
    return null;
  }

  console.log(`📡 开始监听 ${watchPaths.length} 个目录...`);

  try {
    // 使用 chokidar 监听文件变化
    const watcher = chokidar.watch(watchPaths, {
      ignored: /node_modules/,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    console.log(`✅ 文件监听器创建成功`);
    return watcher;
  } catch (error) {
    console.error(`❌ 创建文件监听器失败:`);
    console.error(`🔍 错误详情: ${error.message}`);
    console.error(`💡 可能的解决方案:`);
    console.error(`   1. 检查目录权限`);
    console.error(`   2. 确保没有其他程序占用文件`);
    console.error(`   3. 重启开发服务器`);
    return null;
  }

  watcher.on("change", (filePath) => {
    const relativePath = path.relative(process.cwd(), filePath);
    const fileName = path.basename(filePath);
    console.log(`\n📝 检测到文件变化: ${relativePath}`);
    console.log(`🔄 文件 "${fileName}" 已修改，触发自动重新构建...`);
    runBuild(`文件修改: ${fileName}`);
  });

  watcher.on("add", (filePath) => {
    const relativePath = path.relative(process.cwd(), filePath);
    const fileName = path.basename(filePath);
    console.log(`\n➕ 检测到新文件: ${relativePath}`);
    console.log(`🔄 新文件 "${fileName}" 已添加，触发自动构建...`);
    runBuild(`新文件: ${fileName}`);
  });

  watcher.on("unlink", (filePath) => {
    const relativePath = path.relative(process.cwd(), filePath);
    const fileName = path.basename(filePath);
    console.log(`\n🗑️ 检测到文件删除: ${relativePath}`);
    console.log(`🔄 文件 "${fileName}" 已删除，触发自动重新构建...`);
    runBuild(`文件删除: ${fileName}`);
  });

  watcher.on("error", (error) => {
    console.error(`\n❌ 文件监听系统出现错误:`);
    console.error(`🔍 错误详情: ${error.message}`);
    console.error(`💡 可能的解决方案:`);
    console.error(`   1. 检查文件系统权限`);
    console.error(`   2. 确保监听的目录存在且可访问`);
    console.error(`   3. 重启开发服务器`);

    // 通知客户端文件监听错误
    broadcastUpdate({
      type: "watcher_error",
      message: `文件监听错误: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  });

  return watcher;
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🚀 小书签开发服务器启动成功！`);
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`🌐 服务器地址: http://localhost:${PORT}`);
  console.log(`📁 源码目录: src/bookmarklets/`);
  console.log(`📦 输出目录: output/`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`\n📋 功能说明:`);
  console.log(`   • 自动监听源码文件变化并重新构建`);
  console.log(`   • 提供 Web 界面管理和预览小书签`);
  console.log(`   • 支持拖拽小书签到浏览器书签栏`);
  console.log(`   • 实时显示构建状态和错误信息`);
  console.log(`\n🎯 使用方法:`);
  console.log(`   1. 在 src/bookmarklets/ 目录中编写 .js 文件`);
  console.log(`   2. 保存文件后自动触发构建`);
  console.log(`   3. 访问 http://localhost:${PORT} 查看结果`);
  console.log(`   4. 按 Ctrl+C 停止服务器`);
  console.log(`\n🔧 正在初始化开发环境...`);

  // 启动文件监听
  console.log(`\n📡 启动文件监听系统...`);
  const watcher = setupFileWatcher();

  if (watcher) {
    console.log(`✅ 文件监听系统已启动，开始监控源码变化`);
  } else {
    console.log(`⚠️ 文件监听系统启动失败，请检查源码目录是否存在`);
  }

  // 执行初始构建
  console.log(`\n🔨 执行初始构建...`);
  runBuild("服务器启动");

  // 优雅关闭时清理监听器
  process.on("SIGINT", () => {
    console.log(`\n\n🛑 收到停止信号，正在关闭开发服务器...`);
    console.log(`📡 关闭文件监听系统...`);
    if (watcher) {
      watcher.close();
      console.log(`✅ 文件监听系统已关闭`);
    }
    console.log(`🔌 关闭 HTTP 服务器...`);
    console.log(`👋 开发服务器已安全关闭，感谢使用！`);
    process.exit(0);
  });

  // 处理未捕获的异常
  process.on("uncaughtException", (error) => {
    console.error(`\n💥 开发服务器遇到未处理的异常:`);
    console.error(`🔍 错误详情: ${error.message}`);
    console.error(`📍 错误堆栈: ${error.stack}`);
    console.error(`💡 建议: 请检查代码并重启服务器`);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error(`\n⚠️ 开发服务器遇到未处理的 Promise 拒绝:`);
    console.error(`🔍 拒绝原因: ${reason}`);
    console.error(`📍 Promise: ${promise}`);
    console.error(`💡 建议: 请检查异步代码的错误处理`);
  });
});
