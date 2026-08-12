const chokidar = require("chokidar");
const express = require("express");
const fs = require("fs");
const path = require("path");
const { buildBookmarklets } = require("./build.js");

const ROOT_DIR = path.join(__dirname, "..");
const SOURCE_DIR = path.join(ROOT_DIR, "src", "bookmarklets");
const OUTPUT_DIR = path.join(ROOT_DIR, "output");
const PORT = Number.parseInt(process.env.PORT || "3000", 10);

const app = express();
const sseClients = new Set();
let isBuilding = false;
let queuedTrigger = null;

function broadcastUpdate(message) {
  const data = `data: ${JSON.stringify(message)}\n\n`;

  sseClients.forEach((client) => {
    try {
      client.write(data);
    } catch {
      sseClients.delete(client);
    }
  });
}

async function runBuild(trigger = "手动") {
  if (isBuilding) {
    queuedTrigger = trigger;
    broadcastUpdate({ type: "build_queued", message: "构建请求已排队" });
    return;
  }

  isBuilding = true;
  broadcastUpdate({ type: "build_start", message: `开始构建 (${trigger})` });

  try {
    const result = await buildBookmarklets();
    console.log(`✓ 构建完成 (${trigger}, ${result.durationMs}ms)`);
    broadcastUpdate({
      type: "build_complete",
      message: `构建完成，共 ${result.files.length} 个小书签`,
    });
  } catch (error) {
    console.error(`✗ 构建失败 (${trigger}): ${error.message}`);
    if (error instanceof AggregateError) {
      error.errors.forEach((item) => console.error(`  - ${item.message}`));
    }
    broadcastUpdate({ type: "build_error", message: error.message });
  } finally {
    isBuilding = false;
    if (queuedTrigger) {
      const nextTrigger = queuedTrigger;
      queuedTrigger = null;
      setImmediate(() => runBuild(nextTrigger));
    }
  }
}

function readBookmarklets() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    return [];
  }

  return fs
    .readdirSync(OUTPUT_DIR)
    .filter((filename) => path.extname(filename) === ".js")
    .sort()
    .map((filename) => {
      const sourcePath = path.join(SOURCE_DIR, filename);
      const source = fs.existsSync(sourcePath)
        ? fs.readFileSync(sourcePath, "utf8")
        : "";
      const nameMatch = source.match(/^\s*\/\/\s*@name:\s*(.+)$/m);

      return {
        chineseName: nameMatch?.[1].trim() || path.basename(filename, ".js"),
        name: path.basename(filename, ".js"),
        filename,
        content: fs.readFileSync(path.join(OUTPUT_DIR, filename), "utf8").trim(),
      };
    });
}

app.use(express.static(path.join(ROOT_DIR, "public")));

app.get("/api/bookmarklets", (req, res) => {
  try {
    res.json(readBookmarklets());
  } catch (error) {
    console.error(`读取小书签失败: ${error.message}`);
    res.status(500).json({ error: "读取小书签失败" });
  }
});

app.get("/api/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write('data: {"type":"connected","message":"实时更新已连接"}\n\n');
  sseClients.add(res);

  req.on("close", () => sseClients.delete(res));
});

function setupFileWatcher(watchPaths = [SOURCE_DIR]) {
  const existingPaths = watchPaths.filter((watchPath) => fs.existsSync(watchPath));
  if (existingPaths.length === 0) {
    console.warn("未找到源码目录，文件监听未启动");
    return null;
  }

  const watcher = chokidar.watch(existingPaths, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  const rebuild = (eventName, filePath) => {
    if (path.extname(filePath) !== ".js") {
      return;
    }
    const relativePath = path.relative(ROOT_DIR, filePath);
    runBuild(`${eventName}: ${relativePath}`);
  };

  watcher.on("change", (filePath) => rebuild("修改", filePath));
  watcher.on("add", (filePath) => rebuild("新增", filePath));
  watcher.on("unlink", (filePath) => rebuild("删除", filePath));
  watcher.on("error", (error) => {
    console.error(`文件监听失败: ${error.message}`);
    broadcastUpdate({ type: "watcher_error", message: error.message });
  });

  return watcher;
}

function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`BookmarkCraft 已启动: http://localhost:${PORT}`);
  });
  const watcher = setupFileWatcher();

  runBuild("服务器启动");

  const shutdown = async () => {
    console.log("正在关闭开发服务器");
    await watcher?.close();
    sseClients.forEach((client) => client.end());
    server.close((error) => {
      if (error) {
        console.error(`关闭服务器失败: ${error.message}`);
        process.exitCode = 1;
      }
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  return { server, watcher };
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  readBookmarklets,
  runBuild,
  setupFileWatcher,
  startServer,
};
