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

/**
 * 执行构建，带有错误处理，确保服务器不会崩溃
 */
async function runBuild() {
  if (isBuilding) {
    buildQueue = true;
    console.log("构建正在进行中，已加入队列...");
    return;
  }

  try {
    isBuilding = true;
    console.log("\n🔨 开始构建小书签...");

    await buildBookmarklets();

    console.log("✅ 构建完成！");

    // 如果有排队的构建请求，执行它
    if (buildQueue) {
      buildQueue = false;
      setTimeout(() => runBuild(), 100); // 短暂延迟后执行
    }
  } catch (error) {
    console.error("❌ 构建失败:", error.message);
    console.log("服务器继续运行，请修复错误后保存文件重试");
  } finally {
    isBuilding = false;
  }
}

// 配置静态文件服务，提供 public 目录访问
app.use(express.static(path.join(__dirname, "..", "public")));

// 文件监听功能
function setupFileWatcher() {
  const srcBookmarkletsPath = path.join(__dirname, "..", "src", "bookmarklets");
  const srcUtilsPath = path.join(__dirname, "..", "src", "utils");

  // 检查目录是否存在
  const watchPaths = [];

  if (fs.existsSync(srcBookmarkletsPath)) {
    watchPaths.push(srcBookmarkletsPath);
    console.log(`监听目录: ${srcBookmarkletsPath}`);
  }

  if (fs.existsSync(srcUtilsPath)) {
    watchPaths.push(srcUtilsPath);
    console.log(`监听目录: ${srcUtilsPath}`);
  }

  if (watchPaths.length === 0) {
    console.log("警告: 没有找到要监听的源码目录");
    return;
  }

  // 使用 chokidar 监听文件变化
  const watcher = chokidar.watch(watchPaths, {
    ignored: /node_modules/,
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on("change", (filePath) => {
    console.log(`📝 文件已更改: ${path.relative(process.cwd(), filePath)}`);
    runBuild();
  });

  watcher.on("add", (filePath) => {
    console.log(`➕ 新文件添加: ${path.relative(process.cwd(), filePath)}`);
    runBuild();
  });

  watcher.on("unlink", (filePath) => {
    console.log(`🗑️ 文件已删除: ${path.relative(process.cwd(), filePath)}`);
    runBuild();
  });

  watcher.on("error", (error) => {
    console.error("文件监听错误:", error);
  });

  return watcher;
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`开发服务器已启动: http://localhost:${PORT}`);
  console.log("按 Ctrl+C 停止服务器");

  // 启动文件监听
  const watcher = setupFileWatcher();

  // 执行初始构建
  console.log("\n执行初始构建...");
  runBuild();

  // 优雅关闭时清理监听器
  process.on("SIGINT", () => {
    console.log("\n正在关闭开发服务器...");
    if (watcher) {
      watcher.close();
    }
    process.exit(0);
  });
});
