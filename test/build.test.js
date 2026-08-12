const assert = require("node:assert/strict");
const fs = require("node:fs").promises;
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  buildBookmarklets,
  wrapAsBookmarklet,
} = require("../scripts/build.js");

const silentLogger = { log() {} };

async function createFixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bookmark-craft-"));
  const sourceDir = path.join(root, "src");
  const outputDir = path.join(root, "output");
  await fs.mkdir(sourceDir);
  await fs.mkdir(outputDir);
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return { sourceDir, outputDir };
}

test("wrapAsBookmarklet 生成可拖拽的 JavaScript URL", () => {
  assert.equal(
    wrapAsBookmarklet("alert('ok');"),
    "javascript:(function(){alert('ok');})();"
  );
});

test("构建同步源码并移除失去来源的产物", async (t) => {
  const { sourceDir, outputDir } = await createFixture(t);
  await fs.writeFile(path.join(sourceDir, "sample.js"), "alert('ok');");
  await fs.writeFile(path.join(outputDir, "stale.js"), "stale");

  const result = await buildBookmarklets({
    sourceDir,
    outputDir,
    logger: silentLogger,
  });

  assert.deepEqual(result.staleFiles, ["stale.js"]);
  assert.match(
    await fs.readFile(path.join(outputDir, "sample.js"), "utf8"),
    /^javascript:/
  );
  await assert.rejects(fs.access(path.join(outputDir, "stale.js")), {
    code: "ENOENT",
  });
});

test("任一源码失败时保留上一份完整输出", async (t) => {
  const { sourceDir, outputDir } = await createFixture(t);
  const outputPath = path.join(outputDir, "existing.js");
  await fs.writeFile(outputPath, "previous-output");
  await fs.writeFile(path.join(sourceDir, "existing.js"), "alert('ok');");
  await fs.writeFile(path.join(sourceDir, "invalid.js"), "function () {");

  await assert.rejects(
    buildBookmarklets({ sourceDir, outputDir, logger: silentLogger }),
    AggregateError
  );
  assert.equal(await fs.readFile(outputPath, "utf8"), "previous-output");
  await assert.rejects(fs.access(path.join(outputDir, "invalid.js")), {
    code: "ENOENT",
  });
});
