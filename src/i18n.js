export const PLUGIN_NAME = 'Answer Imagifier - for ChatGPT';

export const messages = {
  "settingHelp": { "zh": "{setting}说明", "en": "About {setting}" },
  "outputWidthEstimate": { "zh": "预计输出宽度：{width}px（{layout}px × {scale}）", "en": "Expected output width: {width}px ({layout}px × {scale})" },
  "widthHelp": { "zh": "控制内容排版宽度，最终像素宽度 = 排版宽度 × 清晰度倍数。", "en": "Set the layout width. Output pixel width = layout width × resolution scale." },
  "qualityHelp": { "zh": "提高像素分辨率，不改变排版；倍数越高，文件越大。", "en": "Increase pixel resolution without changing layout. Higher scales make larger files." },
  "diagramSizeHelp": { "zh": "调整图表在图片中的大小，保持比例；不影响行内小图标。", "en": "Resize diagrams within the image, keeping their proportions. Inline icons stay unchanged." },
  "spacingHelp": { "zh": "调整行距和内容块之间的留白，不改变字号。", "en": "Adjust line spacing and gaps between content blocks without changing font size." },
  "exportImage": {
    "zh": "导出长图",
    "en": "Export image"
  },
  "close": {
    "zh": "关闭",
    "en": "Close"
  },
  "imageStyle": {
    "zh": "图片风格",
    "en": "Appearance"
  },
  "light": {
    "zh": "浅色",
    "en": "Light"
  },
  "dark": {
    "zh": "深色",
    "en": "Dark"
  },
  "format": {
    "zh": "导出格式",
    "en": "Image format"
  },
  "width": {
    "zh": "排版宽度",
    "en": "Layout width"
  },
  "automatic": { "zh": "自动", "en": "Automatic" },
  "custom": { "zh": "自定义", "en": "Custom" },
  "customWidth": { "zh": "自定义（px）", "en": "Custom (px)" },
  "cardWidthPixels": { "zh": "排版宽度（px）", "en": "Layout width (px)" },
  "fontSizePixels": { "zh": "正文字号（px）", "en": "Body font size (px)" },
  "widthRange": { "zh": "请输入 600–1600 之间的整数。", "en": "Enter a whole number from 600 to 1600." },
  "fontRange": { "zh": "请输入 12–24 之间的整数。", "en": "Enter a whole number from 12 to 24." },
  "invalidLayout": { "zh": "请修正宽度或字号后继续。", "en": "Correct the width or font size to continue." },
  "layoutOverflow": { "zh": "部分内容超出排版宽度，请增加宽度或减小字号。", "en": "Some content exceeds the layout width. Increase the width or reduce the font size." },
  "narrowLayout": { "zh": "此回答建议使用更宽的排版，请检查图表和表格的可读性。", "en": "A wider layout is recommended. Check that diagrams and tables are readable." },
  "standard": {
    "zh": "标准",
    "en": "Standard"
  },
  "wide": {
    "zh": "宽幅",
    "en": "Wide"
  },
  "quality": {
    "zh": "清晰度",
    "en": "Resolution"
  },
  "diagramSize": { "zh": "图表尺寸", "en": "Diagram size" },
  "spacing": { "zh": "排版间距", "en": "Layout spacing" },
  "fontSize": {
    "zh": "字体大小",
    "en": "Font size"
  },
  "small": {
    "zh": "小",
    "en": "Small"
  },
  "large": {
    "zh": "大",
    "en": "Large"
  },
  "high": {
    "zh": "高清",
    "en": "High"
  },
  "ultra": {
    "zh": "超清",
    "en": "Ultra"
  },
  "showExtensionCredit": { "zh": "显示扩展署名", "en": "Show extension credit" },
  "includePrompt": {
    "zh": "包含我的提问",
    "en": "Include my prompt"
  },
  "fileName": {
    "zh": "图片文件名",
    "en": "Image file name"
  },
  "localOnly": {
    "zh": "本地生成，内容不上传。",
    "en": "Created locally. Nothing uploaded."
  },
  "preview": {
    "zh": "图片预览",
    "en": "Image preview"
  },
  "preparing": {
    "zh": "准备中",
    "en": "Preparing"
  },
  "layingOut": {
    "zh": "正在排版回答…",
    "en": "Laying out the answer…"
  },
  "previewAlt": {
    "zh": "即将保存的回答长图预览",
    "en": "Preview of the image to be saved"
  },
  "copy": {
    "zh": "复制图片",
    "en": "Copy image"
  },
  "autoRenderOnEntry": { "zh": "打开时自动渲染", "en": "Auto-render on entry" },
  "startRender": { "zh": "开始渲染", "en": "Start render" },
  "notRendered": { "zh": "尚未渲染", "en": "Not rendered" },
  "readyToRender": { "zh": "调整设置后，点击开始渲染。", "en": "Adjust settings, then click Start render." },
  "rerender": { "zh": "重新渲染", "en": "Re-render" },
  "previewOutdated": { "zh": "设置已更改，请重新渲染预览。", "en": "Settings changed. Re-render to update the preview." },
  "retry": {
    "zh": "重试",
    "en": "Retry"
  },
  "renderingContent": {
    "zh": "正在渲染表格、代码与图表…",
    "en": "Rendering tables, code, and diagrams…"
  },
  "noAnswer": {
    "zh": "当前页面还没有可导出的回答",
    "en": "There is no answer to export yet"
  },
  "generating": {
    "zh": "正在生成",
    "en": "Generating"
  },
  "empty": {
    "zh": "无回答",
    "en": "No answer"
  },
  "generatingPreview": {
    "zh": "正在生成预览…",
    "en": "Generating preview…"
  },
  "openFromAnswer": {
    "zh": "请在一条回答下方打开导出长图。",
    "en": "Open Export image below an answer."
  },
  "conversationChanged": {
    "zh": "对话已切换，请关闭并重新打开导出面板。",
    "en": "The conversation has changed. Close and reopen the export panel."
  },
  "streaming": {
    "zh": "回答仍在生成，请等待完成后重新打开导出面板。",
    "en": "The answer is still being generated. Wait until it finishes, then reopen the export panel."
  },
  "reduced": {
    "zh": "长图已自动调整清晰度以完整保存。",
    "en": "Resolution was adjusted to keep the entire answer."
  },
  "ready": {
    "zh": "排版已就绪，可以保存分享。",
    "en": "Your image is ready to save and share."
  },
  "previewFailed": {
    "zh": "暂时无法生成预览",
    "en": "Unable to generate a preview"
  },
  "failed": {
    "zh": "生成失败",
    "en": "Generation failed"
  },
  "renderError": {
    "zh": "生成失败，请调整设置后重试。",
    "en": "Generation failed. Adjust the settings and try again."
  },
  "downloadStarted": {
    "zh": "已开始下载，图片可直接分享。",
    "en": "Download started. Your image is ready to share."
  },
  "conversionFailed": {
    "zh": "无法转换图片",
    "en": "Unable to convert the image"
  },
  "copied": {
    "zh": "图片已复制，可以粘贴给朋友。",
    "en": "Image copied. You can paste it to share."
  },
  "copiedAction": {
    "zh": "图片已复制",
    "en": "Image copied"
  },
  "copyDenied": {
    "zh": "浏览器未允许复制，请使用「保存图片」。",
    "en": "Copying was blocked by the browser. Save the image instead."
  },
  "chart": {
    "zh": "图表",
    "en": "Chart"
  },
  "chartBlocked": {
    "zh": "此图表受浏览器限制，无法读取。",
    "en": "This chart cannot be read due to browser restrictions."
  },
  "chartsBlocked": {
    "zh": "部分 Canvas 图表无法读取。",
    "en": "Some canvas charts could not be read."
  },
  "embedBlocked": {
    "zh": "嵌入式交互内容无法导出，请在原对话中查看。",
    "en": "Interactive content cannot be exported. View it in the original conversation."
  },
  "embedsReplaced": {
    "zh": "嵌入式交互内容已用说明替代。",
    "en": "Interactive content was replaced with a note."
  },
  "imageTimeout": {
    "zh": "图片加载超时",
    "en": "Image loading timed out"
  },
  "imagesFailed": {
    "zh": "部分图片无法载入，已在预览中标注。",
    "en": "Some images could not be loaded and are marked in the preview."
  },
  "fontsLoading": {
    "zh": "字体仍在载入，请稍后重试。",
    "en": "Fonts are still loading. Please try again shortly."
  },
  "mermaidFailed": {
    "zh": "一个 Mermaid 图表未能渲染，保留了原始代码。",
    "en": "A Mermaid diagram could not be rendered. Its original code was preserved."
  },
  "mathFontTimeout": {
    "zh": "公式字体加载超时，请稍后重试。",
    "en": "Math fonts took too long to load. Please try again."
  },
  "imageFailed": {
    "zh": "图片生成失败，请降低清晰度重试。",
    "en": "Image generation failed. Try a lower resolution."
  },
  "answerTooLong": {
    "zh": "这条回答过长，已超出单张图片的清晰导出上限。请尝试关闭「包含我的提问」或调整图片宽度。",
    "en": "This answer exceeds the size limit for a clear image. Try excluding your prompt or changing the image width."
  },
  "save": {
    "zh": "保存 {format}",
    "en": "Save {format}"
  },
  "imageUnavailable": {
    "zh": "图片无法载入，请在原对话中查看。",
    "en": "Image unavailable. View it in the original conversation."
  },
  "imageUnavailableAlt": {
    "zh": "图片无法载入：{alt}",
    "en": "Image unavailable: {alt}"
  },
  "popupHelp": {
    "zh": "打开 ChatGPT，在需要分享的那条回答下方点击「导出长图」，或从该回答的分享面板进入。每次只导出一条回答。",
    "en": "Open ChatGPT and click Export image below the answer you want to share, or open it from that answer’s share panel. Each image contains one answer."
  },
  "openChatGPT": {
    "zh": "打开 ChatGPT ↗",
    "en": "Open ChatGPT ↗"
  },
  "popupLocal": {
    "zh": "图片在浏览器本地生成。",
    "en": "Images are generated locally in your browser."
  },
  "unofficial": {
    "zh": "独立扩展，与 OpenAI 无隶属关系。",
    "en": "An independent extension, not affiliated with OpenAI."
  }
};

export function resolveLanguage(language = 'en') {
  return /^zh(?:[-_]|$)/i.test(language) ? 'zh' : 'en';
}

export const locale = resolveLanguage(globalThis.chrome?.i18n?.getUILanguage?.() || globalThis.navigator?.language || 'en');

export function translate(key, language, values = {}) {
  const message = messages[key]?.[resolveLanguage(language)] || messages[key]?.en;
  if (!message) throw new Error(`Unknown translation key: ${key}`);
  return message.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
}

export function t(key, values) { return translate(key, locale, values); }
