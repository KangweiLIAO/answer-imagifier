# Answer Imagifier - for ChatGPT

把 **ChatGPT 单独一条回答** 渲染成一张完整的 PNG / JPG 长图。

## 安装

已构建的扩展在 `dist/` 中，可以直接加载，无需运行开发环境。

1. 在 Chrome 地址栏打开 `chrome://extensions`。
2. 打开右上角「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择本项目的 `dist` 文件夹。
4. 刷新 ChatGPT 对话页面。
5. 在需要分享的那条回答下方点击「导出长图」。如果该条回答有分享按钮，也可从其分享面板中的「导出长图」进入。

从页面顶部的全局分享面板进入时，按钮明确显示「导出最新回答长图」，也只导出最后一条回答。

## 功能

- 每条回答独立导出，不合并聊天历史。默认不包含用户提问，可选择附上该回答之前的最近一条提问。
- 简洁的黑白灰界面，浅色与深色图片，ChatGPT Logo 与文字来源标识；扩展说明中标注为非官方扩展。
- PNG / JPG 下载、PNG 剪贴板复制。
- 600 / 760 / 960 px 排版宽度，1× / 2× / 3× 清晰度。
- 小 / 标准 / 大三档字号、紧凑排版，以及可编辑的导出文件名。
- 完整表格、自动换行的代码块、常用语言代码高亮。
- Mermaid 代码先在本地渲染成 SVG，再进入最终图片。保留已有 SVG / 可读取 Canvas 和公式的样式。
- 图片预览与下载使用同一个文件，不是另做一套视觉模拟。
- 自动检测新回答和分享面板；样式通过 Shadow DOM 隔离。

## 构建与测试

```sh
npm ci
npm run build
npm test
```

`npm run build` 将全部运行时依赖打包到扩展里，不从 CDN 加载脚本。构建后在扩展管理页点击刷新，并刷新 ChatGPT 页面。

## 隐私与边界

- 不调用 ChatGPT / OpenAI API，不读取 Cookie，不上传回答，不建立公开分享链接，不需要 API Key。
- 引用卡片、网站图标和正文图片（包括 GPT 生成的图片）在渲染前移除，不下载这些图片，也不添加缺图提示；生成图片请使用 ChatGPT 自带的下载功能。保留 SVG、可读取的 Canvas 图表和公式；公式字体仍受原站跨域和登录限制。
- 任意 iframe、交互应用、音视频不会执行或截取，以说明文字替代。只导出当前 DOM 中已加载的内容。
- Mermaid 语法无效时保留源码并提示。数学公式依赖原页面可读取的字体
- 特别长的回答会自动降低像素倍率，以限制内存占用和画布尺寸；仍然超限时显示错误，不静默裁切。

## 结构

- `src/content.js`：每条回答的入口和分享面板适配。
- `src/panel.js`：单条回答的预览、设置、复制与保存。
- `src/render.js`：内容快照、代码高亮、图表预渲染和图片生成。
- `src/card.css` / `src/panel.css`：长图与面板样式。
- `public/manifest.json`：Chrome Manifest V3 配置，仅匹配 ChatGPT 域名，无额外 API 权限。

实现参考：[Chrome 内容脚本文档](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)、[html-to-image 项目文档](https://github.com/bubkoo/html-to-image)。
