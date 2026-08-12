# BookmarkCraft

BookmarkCraft 是一个轻量的小书签开发工具：用普通 JavaScript 编写源码，经 Terser 压缩后生成可直接拖入浏览器书签栏的 `javascript:` URL，并通过本地页面预览和复制。

## 环境要求

- Node.js 18 或更高版本
- npm

## 快速开始

```bash
npm ci
npm run dev
```

开发服务器默认运行在 <http://localhost:3000>。修改 `src/bookmarklets/*.js` 后会自动构建，页面通过 SSE 刷新列表。

常用命令：

```bash
npm run create <name> # 创建源码和配套文档
npm run remove <name> # 删除源码、文档和构建产物
npm run build         # 生成 output/*.js
npm test              # 运行 Node 内置测试
npm run check         # 依次运行测试和构建
```

## 工作方式

1. 在 `src/bookmarklets/` 中编写独立的 `.js` 文件
2. 在文件首部添加 `// @name: 中文名称`，供管理页面展示；可选添加 `// @bookmark-name: 简短名称`，控制拖入书签栏后的默认名称
3. 运行 `npm run build`，将压缩结果写入 `output/`
4. 运行 `npm run dev`，在管理页面拖拽、执行或复制小书签

构建会先压缩全部源码；任一源码失败时退出并保留上一份完整输出。构建成功后会同步所有产物，并删除已经没有对应源码的 `.js` 输出。

当前构建器不包含模块打包功能，因此每个小书签必须自包含，不能从 `src/utils/` 或 npm 包导入代码。

## 目录结构

```text
src/bookmarklets/  小书签源码
output/            受版本控制的构建产物，不要手工编辑
docs/              各小书签的使用说明
scripts/           创建、删除、构建和开发服务器脚本
public/            本地管理页面
test/              Node 内置测试
```

## 现有书签

- [测试示例书签](docs/test-example.md)
- [飞书任务跳转书签](docs/feishu-issue-jump.md)
- [元素轮廓显示书签](docs/outline-element.md)
- [显示星号密码书签](docs/display-asterisk-password.md)

## 开发约定

- 源码、同名文档和生成产物应保持对应
- 不直接编辑 `output/`；修改源码后重新构建
- 提交前运行 `npm run check`
- 保持原生 Node.js、DOM 和 CSS 实现，除非现有能力无法满足明确需求，否则不引入新框架
