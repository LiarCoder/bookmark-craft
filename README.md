# BookmarkCraft

## 项目说明

这是一个小书签制作工具仓库。

你可以在仓库中使用 JavaScript 正常编写你想要实现的小书签的代码逻辑，然后使用压缩工具（比如 terser）将小书签的代码尽可能压缩，以确保满足小书签的代码长度限制。最后将压缩过的小书签代码打包输出到一个单文件中，并放在指定目录下。

## 现有书签列表

- [测试示例书签(test-example) v1.0.0](docs/test-example.md)
- [飞书任务跳转书签(feishu-issue-jump) v1.0.0](docs/feishu-issue-jump.md)

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

# 打包（生成压缩后的小书签）
npm run build
```

`npm run dev` 会启动一个本地服务器，并监听 `src/bookmarklets` 目录下的文件变化，自动重新打包。同时可以访问 `http://localhost:3000` 查看小书签列表页面。

`npm run build` 会打包所有的小书签，并输出到 `output` 目录下。

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
