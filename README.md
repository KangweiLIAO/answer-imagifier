# Answer Imagifier - for ChatGPT

把 **ChatGPT 单独一条回答** 渲染成一张完整的 PNG / JPG 长图。

当前版本：**1.3.0**。更新内容见 [更新日志](changelog.md)。

## 安装

从源码安装时，先按下方「构建与测试」生成 `dist/`（构建产物不提交到 Git）。如果已有构建好的 `dist/`，可直接加载。

1. 在 Chrome 地址栏打开 `chrome://extensions`。
2. 打开右上角「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择本项目的 `dist` 文件夹。
4. 刷新 ChatGPT 对话页面。
5. 等回答完成并出现原生操作栏后，点击该回答下方的「Export image / 导出长图」。插件不在 ChatGPT 原生分享弹窗中添加按钮。

升级到 1.3.0 后，重新加载扩展并刷新已打开的 ChatGPT 页面。本次未新增权限，仍只使用 `storage` 保存本机导出偏好；旧版宽度设置会保留，旧 Compact layout 设置将忽略。

## 功能

- 将单条 ChatGPT 回答导出为完整的 PNG / JPG 长图，或复制 PNG 到剪贴板。
- 保留代码高亮、表格、数学公式、Mermaid 图表和结构化卡片。
- 保留待办列表的完成状态，以及问卷的当前选择和填写内容；互动控件以静态快照呈现，操作按钮不导出。
- 提供浅色／深色主题，自动／自定义宽度，以及字号、图表尺寸、排版间距和清晰度调整。
- 可选择包含提问、显示图片占位或隐藏扩展署名；实体名称与网格布局保留。
- 先调整设置再生成预览，也可开启进入时自动渲染；修改设置后手动重新生成。
- 图片在本机生成，导出偏好仅保存在本机。

Automatic 会结合字号、表格列数和每列文字宽度选择排版宽度，优先保留短列的可读宽度，长说明正常换行；达到 1600px 上限后仍允许换行。含合并单元格或明确指定列宽的表格保留原布局。

自定义的排版宽度不是最终像素宽度：输出像素宽度 = 排版宽度 × 清晰度倍数。例如 1500px 配合 2× 清晰度，输出为 3000px；自定义模式下会显示预计值，并提醒自定义宽度可能导致排版异常。

## 构建与测试

```sh
npm ci
npm run build
npm test
```

`npm run build` 将全部运行时依赖打包到扩展里，不从 CDN 加载脚本。构建后在扩展管理页点击刷新，并刷新 ChatGPT 页面。

测试分层、公共工具和替代依赖边界见 [测试维护说明](tests/README.md)。

## 隐私与边界

- 仅保存导出偏好，不保存对话、图片或自定义文件名；详情见 [隐私政策](PRIVACY_POLICY.md)。

- 不调用 ChatGPT / OpenAI API，不读取 Cookie，不上传回答，不建立公开分享链接，不需要 API Key。
- 引用卡片、网站图标和正文图片（包括 GPT 生成的图片）在渲染前移除，不下载这些图片；结构化图片卡片保留原始比例的占位框，并显示「Image」，以保持缩略图与网格布局；可关闭「显示图片占位」开关，仅保留文字并自动收紧布局，开关偏好保存在本机。生成图片请使用 ChatGPT 自带的下载功能。保留 SVG、可读取的 Canvas 图表和公式；公式字体仍受原站跨域和登录限制。
- 任意 iframe、交互应用、音视频不会执行或截取，以说明文字替代。只导出当前 DOM 中已加载的内容。
- Mermaid 语法无效时保留源码并提示。数学公式依赖原页面可读取的字体
- 特别长的回答会自动降低像素倍率，以限制内存占用和画布尺寸；仍然超限时显示错误，不静默裁切。

## 结构

- `src/content.js` / `src/dom.js`：回答识别、生成状态及导出入口；宿主回答选择器集中在 `src/chatgpt/selectors.js`。
- `src/panel.js` / `src/settings.js`：预览面板、导出操作及本机偏好。
- `src/render.js`：导出流程协调，保留 `createCard()` / `rasterize()` 接口。
- `src/export/`：快照、适配器顺序、清理、长图组装、资源加载、布局及图片输出。
- `src/export/adapters/`：结构化布局、表单、清单、图标、图片占位和代码块的静态转换。
- `src/shared/`：适配器共用的勾选标记、颜色判断及异步超时。
- `src/code-block.js` / `src/code-language.js` / `src/math-style.js`：代码与数学内容处理。
- `src/layout.js` / `src/table-layout.js` / `src/image-width.js` / `src/block-spacing.js`：排版策略与测量。
- `src/styles/`：长图基础、组件、字号／间距和控件样式；按固定顺序合并到 Shadow DOM。
- `src/panel.css`：面板样式。
- `samples/intelligent-ui/`：真实回答样本的采集模板、参考截图与导出对照。
- `tests/fixtures/`：自动化测试使用的精简 HTML。
- `public/manifest.json`：Chrome Manifest V3 配置，仅匹配 ChatGPT 域名，仅申请 storage 权限。

处理阶段、节点归属与新增组件步骤见 [架构说明](ARCHITECTURE.md)。

实现参考：[Chrome 内容脚本文档](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)、[html-to-image 项目文档](https://github.com/bubkoo/html-to-image)。

## 后续事项

- Intelligent UI 兼容性样本的采集模板和操作说明见 [样本库](samples/intelligent-ui/README.md)。

- 部分混合内容的本地深色 PNG 样本中，内嵌 SVG 架构图出现空白；单独图表样本导出正常，原因尚未定位，需进一步验证。小图标与提示卡片修复已单独验证。

- 已实现组件保留、自动／自定义长图宽度及自定义字号；仍需在真实 ChatGPT 对话页面重新加载扩展后验证。
