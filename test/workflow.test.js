const assert = require("node:assert/strict");
const fs = require("node:fs").promises;
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const vm = require("node:vm");
const { app } = require("../scripts/dev.js");

const ROOT_DIR = path.join(__dirname, "..");

test("开发服务器只提供静态文件，不暴露动态书签 API", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/bookmarklets`);

  assert.equal(response.status, 404);
});

test("删除命令拒绝可能越出项目目录的名称", () => {
  const result = spawnSync(process.execPath, ["scripts/remove.js", "../outside"], {
    cwd: ROOT_DIR,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /脚本名称只能包含/);
});

test("删除不存在的书签时能正常列出现有名称", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/remove.js", "definitely-not-existing"],
    { cwd: ROOT_DIR, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /未找到名称为/);
  assert.doesNotMatch(result.stderr, /ReferenceError/);
  assert.match(result.stdout, /display-asterisk-password/);
});

test("静态清单为拖拽安装提供简短书签名", async () => {
  const bookmarklets = JSON.parse(
    await fs.readFile(path.join(ROOT_DIR, "public/bookmarklets.json"), "utf8")
  );
  const passwordBookmarklet = bookmarklets.find(
    ({ name }) => name === "display-asterisk-password"
  );

  assert.ok(passwordBookmarklet);
  assert.equal(passwordBookmarklet.chineseName, "显示星号密码");
  assert.equal(passwordBookmarklet.bookmarkName, "显示密码");
  assert.ok(
    bookmarklets.every(
      ({ bookmarkName }) => Array.from(bookmarkName).length <= 6
    )
  );
});

test("GitHub Pages 工作流构建并部署 public 目录", async () => {
  const workflow = await fs.readFile(
    path.join(ROOT_DIR, ".github/workflows/deploy-pages.yml"),
    "utf8"
  );

  assert.match(workflow, /branches:\s+- main/);
  assert.match(workflow, /run: npm run check/);
  assert.match(workflow, /path: \.\/public/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});

test("管理页面脚本语法和基础无障碍标记有效", async () => {
  const html = await fs.readFile(path.join(ROOT_DIR, "public/index.html"), "utf8");
  const script = html.match(/<script>([\s\S]+)<\/script>/)?.[1];

  assert.ok(script);
  assert.doesNotThrow(() => new vm.Script(script));
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.match(html, /text: bookmarklet\.bookmarkName/);
  assert.match(html, /fetch\('\.\/bookmarklets\.json'/);
  assert.match(
    html,
    /<link rel="icon" href="\.\/favicon\.ico" type="image\/x-icon">/
  );
  assert.match(
    html,
    /<a class="repository-link" href="https:\/\/github\.com\/LiarCoder\/bookmark-craft" target="_blank"/
  );
  assert.doesNotMatch(html, /EventSource|setInterval|\/api\//);
  assert.match(html, /<meta name="theme-color"/);
  assert.match(html, /class="skip-link" href="#main-content"/);
  assert.doesNotMatch(html, /connection-status|refresh-btn/);
  assert.match(
    html,
    /id="action-feedback"[^>]*role="status"[^>]*aria-live="polite"/
  );
  assert.doesNotMatch(html, /\.\.\./);
});
