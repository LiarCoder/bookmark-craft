const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// 获取命令行参数
const args = process.argv.slice(2);
const scriptName = args[0];

if (!scriptName) {
  console.error("❌ 错误：请提供脚本名称");
  console.log("📝 使用方法：npm run create <script-name>");
  console.log("📝 示例：npm run create my-bookmark");
  process.exit(1);
}

// 验证脚本名称格式
if (!/^[a-zA-Z0-9-_]+$/.test(scriptName)) {
  console.error("❌ 错误：脚本名称只能包含字母、数字、短横线和下划线");
  process.exit(1);
}

// 路径配置
const bookmarkletsDir = path.join(__dirname, "../src/bookmarklets");
const docsDir = path.join(__dirname, "../docs");
const scriptPath = path.join(bookmarkletsDir, `${scriptName}.js`);
const docPath = path.join(docsDir, `${scriptName}.md`);

// 检查文件是否已存在
if (fs.existsSync(scriptPath)) {
  console.error(`❌ 错误：脚本文件 ${scriptName}.js 已存在`);
  process.exit(1);
}

if (fs.existsSync(docPath)) {
  console.error(`❌ 错误：文档文件 ${scriptName}.md 已存在`);
  process.exit(1);
}

/**
 * 生成文档模板
 * @param {string} chineseName 中文名称
 */
const generateDocTemplate = (chineseName) => {
  // 生成文档模板
  const docTemplate = `# ${chineseName}

## 书签作用

这是一个 [描述书签的主要功能和用途]。

**功能特点：**

- 功能特点1
- 功能特点2
- 功能特点3

**适用场景：**

- 使用场景1
- 使用场景2
- 使用场景3

## 更新日志

### v1.0.0 (${new Date().toISOString().split("T")[0]})

- 初始版本发布
- 实现基本功能

## 注意事项

1. **浏览器兼容性**：支持所有现代浏览器，需要启用 JavaScript
2. **使用限制**：[如有特殊使用限制请在此说明]
3. **安全说明**：[如有安全相关注意事项请在此说明]
`;

  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  fs.writeFileSync(docPath, docTemplate);
};

/**
 * 生成脚本模板
 * @param {string} chineseName 中文名称
 */
const generateScriptTemplate = (chineseName) => {
  const scriptTemplate = `// @name: ${chineseName}

// 在这里编写您的书签代码
alert('Hello from ${chineseName}!');
`;

  // 确保目录存在
  if (!fs.existsSync(bookmarkletsDir)) {
    fs.mkdirSync(bookmarkletsDir, { recursive: true });
  }

  fs.writeFileSync(scriptPath, scriptTemplate);
};

/**
 * 打印成功信息
 */
const printSuccessInfo = () => {
  console.log("✅ 成功创建文件：");
  console.log(`📄 脚本文件：src/bookmarklets/${scriptName}.js`);
  console.log(`📖 文档文件：docs/${scriptName}.md`);
  console.log("");
  console.log("🚀 接下来您可以：");
  console.log(`1. 编辑 src/bookmarklets/${scriptName}.js 实现您的功能`);
  console.log(`2. 完善 docs/${scriptName}.md 文档内容`);
  console.log("3. 运行 npm run dev 开始开发调试");
  console.log("4. 运行 npm run build 构建最终产物");
};

// 提示用户输入脚本中文名
console.log("📝 请输入脚本的中文名称（不输入则使用英文名）：");
process.stdout.write("> ");

process.stdin.setEncoding("utf8");
process.stdin.on("readable", () => {
  const input = process.stdin.read();
  // 如果用户没有输入中文名，则默认取脚本名称
  const chineseName = input?.trim() || scriptName;
  try {
    generateDocTemplate(chineseName);
    generateScriptTemplate(chineseName);
    printSuccessInfo();
  } catch (error) {
    console.error("❌ 创建文件时出错：", error.message);
    process.exit(1);
  }

  process.exit(0);
});

process.stdin.on("end", () => {
  console.log("❌ 操作被取消");
  process.exit(1);
});
