const express = require("express");
const path = require("path");
const { buildBookmarklets } = require("./build.js");

const ROOT_DIR = path.join(__dirname, "..");
const PORT = Number.parseInt(process.env.PORT || "3000", 10);

const app = express();

app.use(express.static(path.join(ROOT_DIR, "public")));

async function startServer() {
  const result = await buildBookmarklets();
  console.log(`✓ 构建完成，共 ${result.files.length} 个小书签`);

  const server = app.listen(PORT, () => {
    console.log(`BookmarkCraft 已启动: http://localhost:${PORT}`);
  });

  const shutdown = () => {
    console.log("正在关闭开发服务器");
    server.close((error) => {
      if (error) {
        console.error(`关闭服务器失败: ${error.message}`);
        process.exitCode = 1;
      }
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  return { server };
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(`启动开发服务器失败: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  app,
  startServer,
};
