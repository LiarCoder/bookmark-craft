# BookmarkCraft

BookmarkCraft 是一个轻量的小书签开发工具：用普通 JavaScript 编写源码，经 Terser 压缩后生成可直接拖入浏览器书签栏的 `javascript:` URL，并通过静态页面预览和复制。

## 环境要求

- Node.js 18 或更高版本
- npm

## 快速开始

```bash
npm ci
npm run dev
```

开发服务器默认运行在 <http://localhost:3000>。它启动时构建一次小书签并只提供 `public/` 静态文件；修改源码后再次运行 `npm run dev` 或 `npm run build`，然后刷新网页即可看到最新内容。

常用命令：

```bash
npm run create <name> # 创建源码和配套文档
npm run remove <name> # 删除源码和配套文档
npm run build         # 生成 public/bookmarklets.json
npm test              # 运行 Node 内置测试
npm run check         # 依次运行测试和构建
```

## 工作方式

1. 在 `src/bookmarklets/` 中编写独立的 `.js` 文件
2. 在文件首部添加 `// @name: 中文名称`，供管理页面展示；可选添加 `// @bookmark-name: 简短名称`，控制拖入书签栏后的默认名称，简短名称不超过 6 个字符
3. 运行 `npm run build`，将压缩结果写入页面读取的 `public/bookmarklets.json`
4. 运行 `npm run dev`，在管理页面拖拽、执行或复制小书签

## 静态页面工作方式

GitHub Pages 只能提供静态文件，因此页面不再请求本地 API，也不再建立 SSE 连接或定期轮询。书签数据在构建阶段生成，页面每次打开或刷新时读取同目录下的 `bookmarklets.json`。

一次更新会经过以下流程：

1. 修改 `src/bookmarklets/*.js` 源码
2. `npm run build` 使用 Terser 压缩源码
3. 同一次构建从源码注释中读取展示名和书签栏名称，生成 `public/bookmarklets.json`
4. 本地 `npm run dev` 在启动时构建一次，然后仅提供 `public/`；页面刷新后读取最新清单
5. 推送到 `main` 分支后，GitHub Actions 安装依赖、运行 `npm run check`，再把 `public/` 上传并部署到 GitHub Pages

这样，`public/bookmarklets.json` 是唯一的静态页面数据入口，GitHub Pages 不需要运行 Node.js 服务。

## 发布到 GitHub Pages

仓库已提供 `.github/workflows/deploy-pages.yml`。首次发布前，在 GitHub 仓库的 **Settings → Pages → Build and deployment** 中将 **Source** 设置为 **GitHub Actions**，然后向 `main` 分支推送代码。

当前仓库使用项目站点地址：<https://liarcoder.github.io/bookmark-craft/>。工作流会在每次 `main` 分支推送和手动触发时重新构建并部署页面。

构建会先压缩全部源码；任一源码失败时退出并保留上一份静态清单。

当前构建器不包含模块打包功能，因此每个小书签必须自包含，不能从 `src/utils/` 或 npm 包导入代码。

## 目录结构

```text
src/bookmarklets/  小书签源码
docs/              各小书签的使用说明
scripts/           创建、删除、构建和开发服务器脚本
public/            本地管理页面
public/bookmarklets.json  构建生成的静态小书签清单
test/              Node 内置测试
```

## 现有书签

- [测试示例书签](docs/test-example.md)
- [飞书任务跳转书签](docs/feishu-issue-jump.md)
- [元素轮廓显示书签](docs/outline-element.md)
- [显示星号密码书签](docs/display-asterisk-password.md)

## 开发约定

- 源码、同名文档和静态清单应保持对应
- 不直接编辑 `public/bookmarklets.json`；修改源码后重新构建
- 提交前运行 `npm run check`
- 保持原生 Node.js、DOM 和 CSS 实现，除非现有能力无法满足明确需求，否则不引入新框架
