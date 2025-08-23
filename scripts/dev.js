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

    // 通知所有 SSE 客户端构建完成
    broadcastUpdate({
      type: "build_complete",
      message: "小书签构建完成，列表已更新",
      timestamp: new Date().toISOString(),
    });

    // 如果有排队的构建请求，执行它
    if (buildQueue) {
      buildQueue = false;
      setTimeout(() => runBuild(), 100); // 短暂延迟后执行
    }
  } catch (error) {
    console.error("❌ 构建失败:", error.message);
    console.log("服务器继续运行，请修复错误后保存文件重试");

    // 通知所有 SSE 客户端构建失败
    broadcastUpdate({
      type: "build_error",
      message: `构建失败: ${error.message}`,
      timestamp: new Date().toISOString(),
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
      return res.json([]);
    }

    const files = fs
      .readdirSync(outputDir)
      .filter((file) => file.endsWith(".js") && file !== ".gitkeep")
      .map((file) => {
        const filePath = path.join(outputDir, file);
        const content = fs.readFileSync(filePath, "utf8");
        const scriptPath = path.join(scriptDir, file);
        const scriptContent = fs.readFileSync(scriptPath, "utf8");
        const name = path.basename(file, ".js");
        const chineseName = scriptContent.match(/@name: (.+)/)?.[1] || name;

        return {
          chineseName: chineseName,
          name: name,
          filename: file,
          content: content.trim(),
        };
      });

    res.json(files);
  } catch (error) {
    console.error("获取小书签列表失败:", error);
    res.status(500).json({ error: "获取小书签列表失败" });
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
