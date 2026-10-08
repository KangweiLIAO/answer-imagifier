# Answer Imagifier - for ChatGPT

把 **ChatGPT 单独一条回答** 渲染成一张完整的 PNG / JPG 长图。

当前版本：**1.2.2**。更新内容见 [更新日志](changelog.md)。

## 安装

从源码安装时，先按下方「构建与测试」生成 `dist/`（构建产物不提交到 Git）。如果已有构建好的 `dist/`，可直接加载。

1. 在 Chrome 地址栏打开 `chrome://extensions`。
2. 打开右上角「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择本项目的 `dist` 文件夹。
4. 刷新 ChatGPT 对话页面。
5. 等回答完成并出现原生操作栏后，点击该回答下方的「Export image / 导出长图」。插件不在 ChatGPT 原生分享弹窗中添加按钮。

升级到 1.2.2 后，重新加载扩展并刷新已打开的 ChatGPT 页面。本次未新增权限，仍只使用 `storage` 保存本机导出偏好；旧版宽度设置会保留，旧 Compact layout 设置将忽略。

## 功能

- 将单条 ChatGPT 回答导出为完整的 PNG / JPG 长图，或复制 PNG 到剪贴板。
- 保留代码高亮、表格、数学公式、Mermaid 图表和结构化卡片。
- 保留待办列表的完成状态，以及问卷的当前选择和填写内容；互动控件以静态快照呈现，操作按钮不导出。
- 提供浅色／深色主题，自动／自定义宽度，以及字号、图表尺寸、排版间距和清晰度调整。
- 可选择包含提问、显示图片占位或隐藏扩展署名；实体名称与网格布局保留。
- 先调整设置再生成预览，也可开启进入时自动渲染；修改设置后手动重新生成。
- 图片在本机生成，导出偏好仅保存在本机。

自定义的排版宽度不是最终像素宽度：输出像素宽度 = 排版宽度 × 清晰度倍数。例如 1500px 配合 2× 清晰度，输出为 3000px；自定义模式下会显示预计值，并提醒自定义宽度可能导致排版异常。

## 构建与测试

```sh
npm ci
npm run build
npm test
```

`npm run build` 将全部运行时依赖打包到扩展里，不从 CDN 加载脚本。构建后在扩展管理页点击刷新，并刷新 ChatGPT 页面。

## 隐私与边界

- 仅保存导出偏好，不保存对话、图片或自定义文件名；详情见 [隐私政策](PRIVACY_POLICY.md)。

- 不调用 ChatGPT / OpenAI API，不读取 Cookie，不上传回答，不建立公开分享链接，不需要 API Key。
- 引用卡片、网站图标和正文图片（包括 GPT 生成的图片）在渲染前移除，不下载这些图片；结构化图片卡片保留原始比例的占位框，并显示「Image」，以保持缩略图与网格布局；可关闭「显示图片占位」开关，仅保留文字并自动收紧布局，开关偏好保存在本机。生成图片请使用 ChatGPT 自带的下载功能。保留 SVG、可读取的 Canvas 图表和公式；公式字体仍受原站跨域和登录限制。
- 任意 iframe、交互应用、音视频不会执行或截取，以说明文字替代。只导出当前 DOM 中已加载的内容。
- Mermaid 语法无效时保留源码并提示。数学公式依赖原页面可读取的字体
- 特别长的回答会自动降低像素倍率，以限制内存占用和画布尺寸；仍然超限时显示错误，不静默裁切。

## 结构

- `src/content.js`：每条回答的导出入口、生成状态检测和按钮挂载。
- `src/panel.js`：单条回答的预览、设置、复制与保存。
- `src/settings.js`：导出偏好的校验、本机存储与恢复。
- `src/code-block.js` / `src/code-language.js`：代码块提取、语言识别与高亮。
- `src/form-controls.js`：表单实时状态快照、静态控件、Radio／Checkbox 去重及刻度布局。
- `src/checklist.js`：勾选状态到静态 SVG 的转换。
- `src/components.js`：结构化回答组件的布局、文字层级和进度条保留。
- `src/block-spacing.js`：块内容外层间距归一化，保留行内公式布局。
- `src/image-placeholder.js`：结构化图片占位及显示开关，保留原始比例与缩略图宽度。
- `src/image-width.js`：内部图表的容器自适应与三级尺寸限制。
- `src/layout.js`：宽度／字号范围、自动长图宽度建议及溢出检测。
- `src/render.js`：内容快照、代码高亮、图表预渲染和图片生成。
- `src/card.css` / `src/panel.css`：长图与面板样式。
- `public/manifest.json`：Chrome Manifest V3 配置，仅匹配 ChatGPT 域名，仅申请 storage 权限以保存导出偏好。

实现参考：[Chrome 内容脚本文档](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)、[html-to-image 项目文档](https://github.com/bubkoo/html-to-image)。

## 后续事项

- 部分混合内容的本地深色 PNG 样本中，内嵌 SVG 架构图出现空白；单独图表样本导出正常，原因尚未定位，需进一步验证。小图标与提示卡片修复已单独验证。

- 已实现组件保留、自动／自定义长图宽度及自定义字号；仍需在真实 ChatGPT 对话页面重新加载扩展后验证。
