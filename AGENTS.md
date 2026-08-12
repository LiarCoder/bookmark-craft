# BookmarkCraft 开发指南

## 项目定位

这是一个轻量的本地小书签开发工具：压缩独立 JavaScript 源码，生成可拖拽的 `javascript:` URL，并提供本地管理页面。

## 技术与命令

- Node.js >= 18，CommonJS
- Terser 负责压缩，Express 提供本地服务，Chokidar 监听源码
- 安装：`npm ci`
- 开发：`npm run dev`，默认地址 `http://localhost:3000`
- 测试：`npm test`
- 完整门禁：`npm run check`

## 目录与不变量

- `src/bookmarklets/*.js` 是源码真相，每个文件必须自包含
- 构建器不打包模块，不要从 `src/utils/` 或 npm 包导入代码
- 源码首部使用 `// @name: 中文名称` 声明展示名
- `output/*.js` 是受版本控制的生成产物，禁止手工编辑
- 修改源码后运行 `npm run build`，同时提交源码与变化的产物
- 新增或删除书签时保持 `src/bookmarklets/`、`docs/`、`output/` 同名对应
- `public/index.html` 使用原生 DOM/CSS，不使用字符串形式的事件处理器

## 变更原则

- 优先修复可复现问题，保持原生 Node.js 和浏览器能力
- 不为单一调用创建抽象，不预先加入框架、打包器、类型系统或配置层
- 改动构建逻辑时覆盖成功、失败不污染旧产物、过期产物清理
- 改动 CLI 时验证名称，所有文件操作限制在项目约定目录内
- 注释末尾不使用多余的中文句号
- Codex 临时文件只放根目录 `.codex-tmp/`，不得提交

## 文档与提交

- README 记录使用合同，具体书签行为写在 `docs/<name>.md`
- 文档描述与代码冲突时，以测试和当前运行行为为证据并同步文档
- 提交前运行 `npm run check` 和 `git diff --check`
- 提交信息沿用 Conventional Commits，并使用中文描述
- 独立主题分开提交；源码与对应生成产物放在同一提交

## 当前状态

核心构建、监听、CLI 安全和页面脚本已有 Node 内置测试。项目没有既定功能路线图，后续只围绕明确需求或可复现缺陷演进。
