const assert = require("node:assert/strict");
const fs = require("node:fs").promises;
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const vm = require("node:vm");
const { setupFileWatcher } = require("../scripts/dev.js");

const ROOT_DIR = path.join(__dirname, "..");

test("开发监听器绑定源码变化事件", async (t) => {
  const watchDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "bookmark-craft-watch-")
  );
  const watcher = setupFileWatcher([watchDir]);
  t.after(async () => {
    await watcher.close();
    await fs.rm(watchDir, { recursive: true, force: true });
  });

  assert.ok(watcher.listenerCount("change") > 0);
  assert.ok(watcher.listenerCount("add") > 0);
  assert.ok(watcher.listenerCount("unlink") > 0);
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

test("管理页面脚本语法有效且不使用字符串事件处理器", async () => {
  const html = await fs.readFile(path.join(ROOT_DIR, "public/index.html"), "utf8");
  const script = html.match(/<script>([\s\S]+)<\/script>/)?.[1];

  assert.ok(script);
  assert.doesNotThrow(() => new vm.Script(script));
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
});
