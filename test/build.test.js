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
  const manifestPath = path.join(root, "public", "bookmarklets.json");
  await fs.mkdir(sourceDir);
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return { root, sourceDir, manifestPath };
}

test("wrapAsBookmarklet 生成可拖拽的 JavaScript URL", () => {
  assert.equal(
    wrapAsBookmarklet("alert('ok');"),
    "javascript:(function(){alert('ok');})();"
  );
});

test("构建源码并生成静态清单", async (t) => {
  const { root, sourceDir, manifestPath } = await createFixture(t);
  await fs.writeFile(
    path.join(sourceDir, "sample.js"),
    "// @name: 示例\n// @bookmark-name: 示例\nalert('ok');"
  );

  const result = await buildBookmarklets({
    sourceDir,
    manifestPath,
    logger: silentLogger,
  });

  assert.equal(result.files.length, 1);
  assert.deepEqual(JSON.parse(await fs.readFile(manifestPath, "utf8")), [
    {
      chineseName: "示例",
      bookmarkName: "示例",
      name: "sample",
      filename: "sample.js",
      content: result.files[0].bookmarkletCode,
    },
  ]);
  await assert.rejects(fs.access(path.join(root, "output")), {
    code: "ENOENT",
  });
});

test("任一源码失败时保留上一份静态清单", async (t) => {
  const { sourceDir, manifestPath } = await createFixture(t);
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, "previous-manifest");
  await fs.writeFile(path.join(sourceDir, "existing.js"), "alert('ok');");
  await fs.writeFile(path.join(sourceDir, "invalid.js"), "function () {");

  await assert.rejects(
    buildBookmarklets({
      sourceDir,
      manifestPath,
      logger: silentLogger,
    }),
    AggregateError
  );
  assert.equal(await fs.readFile(manifestPath, "utf8"), "previous-manifest");
});
