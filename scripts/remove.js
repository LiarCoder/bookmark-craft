const fs = require("fs");
const path = require("path");

// 获取命令行参数
const args = process.argv.slice(2);
const scriptName = args[0];

if (!scriptName) {
  console.error("❌ 错误：请提供脚本名称");
  console.log("📝 使用方法：npm run remove <script-name>");
  console.log("📝 示例：npm run remove my-bookmark");
  process.exit(1);
}

if (!/^[a-zA-Z0-9-_]+$/.test(scriptName)) {
  console.error("❌ 错误：脚本名称只能包含字母、数字、短横线和下划线");
  process.exit(1);
}

// 路径配置
const bookmarkletsDir = path.join(__dirname, "../src/bookmarklets");
const scriptPath = path.join(__dirname, `../src/bookmarklets/${scriptName}.js`);
const docPath = path.join(__dirname, `../docs/${scriptName}.md`);

// 检查文件是否存在
const scriptExists = fs.existsSync(scriptPath);
const docExists = fs.existsSync(docPath);

if (!scriptExists && !docExists) {
  console.error(`❌ 错误：未找到名称为 "${scriptName}" 的书签文件`);
  console.log("📋 可用的书签文件：");

  // 列出现有的书签文件
  try {
    const bookmarkletFiles = fs
      .readdirSync(bookmarkletsDir)
      .filter((file) => file.endsWith(".js"))
      .map((file) => file.replace(".js", ""));

    if (bookmarkletFiles.length > 0) {
      bookmarkletFiles.forEach((name) => {
        console.log(`\t• ${name}`);
      });
    } else {
      console.log("  （没有找到任何书签文件）");
    }
  } catch (error) {
    console.log("  （无法读取书签目录）");
  }

  process.exit(1);
}

/**
 * 显示将要删除的文件
 */
const printToBeDeletedFiles = () => {
  const deleteTips = [`🗑️  准备删除书签 "${scriptName}" 的相关文件：`];
  if (scriptExists) {
    deleteTips.push(`\t📄 脚本文件：${scriptPath}`);
  }
  if (docExists) {
    deleteTips.push(`\t📖 文档文件：${docPath}`);
  }
  deleteTips.forEach((tip) => {
    console.log(tip);
  });
};

printToBeDeletedFiles();

console.log("");
console.log("⚠️  此操作不可撤销！确定要删除吗？(y/N)");
process.stdout.write("> ");

process.stdin.setEncoding("utf8");
process.stdin.on("readable", () => {
  const input = process.stdin.read();
  if (input !== null) {
    const confirmation = input.trim().toLowerCase();

    if (confirmation !== "y" && confirmation !== "yes") {
      console.log("❌ 操作已取消");
      process.exit(0);
    }

    // 执行删除操作
    let deletedCount = 0;
    const deletedFiles = [];

    try {
      if (scriptExists) {
        fs.unlinkSync(scriptPath);
        deletedCount++;
        deletedFiles.push(`src/bookmarklets/${scriptName}.js`);
      }

      if (docExists) {
        fs.unlinkSync(docPath);
        deletedCount++;
        deletedFiles.push(`docs/${scriptName}.md`);
      }

      console.log("");
      console.log("✅ 删除成功：");
      deletedFiles.forEach((file) => {
        console.log(`🗑️  ${file}`);
      });

      console.log("");
      console.log(`📊 共删除 ${deletedCount} 个文件`);
      console.log("💡 请运行 npm run build 更新静态清单");
    } catch (error) {
      console.error("❌ 删除文件时出错：", error.message);
      process.exit(1);
    }
  }
});

process.stdin.on("end", () => {
  console.log("❌ 操作被取消");
  process.exit(1);
});
