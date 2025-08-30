# BookmarkCraft

## 项目说明

这是一个小书签制作工具仓库。

1. 你可以在仓库中使用 JavaScript 正常编写你想要实现的小书签的代码逻辑[./src/bookmarklets 目录](./src/bookmarklets)。
2. 然后使用压缩工具（比如 terser）将小书签的代码尽可能压缩，以确保满足小书签的代码长度限制。
3. 最后将压缩过的小书签代码打包输出到一个单文件中，并放在指定目录下[./output 目录](./output)。

## 现有书签列表

- [测试示例书签(test-example) v1.0.0](docs/test-example.md)
- [飞书任务跳转书签(feishu-issue-jump) v1.1.0](docs/feishu-issue-jump.md)
- [元素轮廓显示书签(outline-element) v1.0.0](docs/outline-element.md)
- [显示星号密码书签(display-asterisk-password) v1.0.0](docs/display-asterisk-password.md)

## 目录结构

目录结构如下：

```
src/
  ├── utils/                // 共用工具函数目录
  │     ├── index.js        // 工具函数入口
  │     └── ...             // 其他工具文件
  ├── bookmarklets/         // 小书签源码目录
  │     ├── bookmarklet1.js // 小书签1源码
  │     ├── bookmarklet2.js // 小书签2源码
  │     └── ...             // 其他小书签源码
  └── index.js              // 入口文件（如有需要）
docs/
  ├── bookmarklet1.md      // 小书签1文档
  ├── bookmarklet2.md      // 小书签2文档
  └── ...                   // 其他小书签文档
scripts/
  ├── create.js             // 创建书签脚本
  ├── remove.js             // 删除书签脚本
  ├── dev.js                // 开发脚本
  ├── build.js              // 打包脚本
  └── ...                   // 其他脚本
output/                     // 压缩后的小书签输出目录
  ├── bookmarklet1.js       // 压缩后的小书签1
  ├── bookmarklet2.js       // 压缩后的小书签2
  └── ...                   // 其他压缩后的小书签
public/                     // 静态资源目录
  ├── favicon.ico           // 网站图标等
  ├── index.html            // 小书签列表页面，可直接将打包后的小书签拖拽到书签栏
  └── ...                   // 其他静态资源
README.md                   // 项目说明文档
package.json                // 项目依赖及脚本配置
.gitignore                  // Git忽略文件配置
```

## 开发说明

```bash
# 安装依赖
npm install

# 开发模式（支持热更新）
npm run dev

# 创建新书签（会生成 src/bookmarklets/<name>.js 和 docs/<name>.md）
npm run create <script-name>

# 删除书签（同步删除脚本、文档与构建产物）
npm run remove <script-name>

# 打包（生成压缩后的小书签）
npm run build
```

### 开发模式特性

`npm run dev` 会启动一个功能丰富的开发服务器：

- 🚀 **友好的启动界面** - 显示服务器状态、功能说明和使用方法
- 📡 **智能文件监听** - 自动监听 `src/bookmarklets` 和 `src/utils` 目录变化
- 🔄 **实时自动构建** - 文件保存后立即触发重新构建
- 📊 **详细构建统计** - 显示处理文件数量、压缩率、构建时间等信息
- 🌐 **Web 管理界面** - 访问 `http://localhost:3000` 查看和管理小书签
- 🎯 **拖拽安装** - 直接将小书签拖拽到浏览器书签栏

### 构建功能增强

`npm run build` 提供了强大的构建能力：

- ✅ **智能错误检测** - 精确定位 JavaScript 语法错误的文件名和行号
- 📈 **构建成功统计** - 显示处理文件数量、压缩率和输出位置
- 🔍 **详细错误报告** - 构建失败时提供清晰的错误信息和解决建议
- 🛡️ **容错处理** - 单个文件失败不影响其他文件的构建
- 🇨🇳 **中文友好** - 所有提示信息都有清晰的中文描述

## 小书签模板

```js
javascript: (function () {
  /* 压缩过的小书签代码 */
})();
```

## 小书签开发规范

1. 小书签的代码必须放在 `src/bookmarklets` 目录下。
2. 小书签的代码必须以 `.js` 结尾。
3. 小书签的代码必须符合 JavaScript 语法。
4. 建议在代码中添加 `@name: 中文名称` 注释，用于在 Web 界面中显示友好的名称。

### 开发最佳实践

- **语法检查** - 保存文件后，构建系统会自动检查语法错误并提供详细的错误位置信息
- **实时预览** - 使用开发模式可以实时查看构建结果和错误信息
- **错误修复** - 遇到构建错误时，系统会提供具体的解决建议
- **代码优化** - 构建过程会自动压缩代码并显示压缩率统计

### 错误处理

当遇到构建错误时，系统会提供：

- 📍 **精确定位** - 显示错误的具体文件名和行号
- 🔍 **错误分析** - 区分语法错误、解析错误等不同类型
- 💡 **解决建议** - 提供针对性的修复建议
- 📊 **错误汇总** - 批量处理时显示所有错误的详细列表
