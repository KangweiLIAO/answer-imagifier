# Intelligent UI 样本库

用真实 ChatGPT 回答验证：页面中可见的内容和当前交互状态，是否完整出现在导出的 PNG / JPG 中。

这里保存人工采集的样本及视觉证据；`tests/fixtures/` 继续存放自动化测试使用的精简 HTML。添加到这里不会自动生成测试。

## 添加一个样本

1. 在项目根目录复制模板，并使用英文小写和连字符命名：

   ```sh
   cp -R samples/intelligent-ui/_template samples/intelligent-ui/chart-line-basic
   ```

2. 在真实 ChatGPT 对话里生成回答，等生成完成、图表和控件加载完毕。按需修改输入、勾选项目或切换标签页，停留在要采集的状态。
3. 填写新文件夹里的 `sample.md`：提问、采集日期、组件类型、当前状态、导出设置和预期结果。
4. 保存回答 DOM 为 `source.html`，方法见下节。
5. 将页面截图放到 `reference/`，实际导出的图片放到 `exports/`。推荐对应命名：

   ```text
   reference/light-default.png
   exports/light-default.png
   reference/dark-selected.png
   exports/dark-selected.png
   ```

6. 对照图片填写 `sample.md` 的结果表，再在本文件的「样本索引」中增加一行。

一次样本可以先只完成一个场景。未完成的验证写 `pending`，不要提前标记通过。切换标签页、改变表单值或展开面板后，如需保留这个状态的 DOM，另存为 `source-selected.html` 等，并在结果表注明文件名。

## 保存回答 DOM

在 Chrome 中打开开发者工具（macOS：⌘⌥I），使用元素选择器点选回答里的正文。到 Elements 面板向上找到包住**完整单条回答**的容器，通常带有：

- `data-message-author-role="assistant"`；或
- `data-content-search-unit-key`，值以 `:assistant` 结尾。

不要只选择某一段文字或 Markdown 子块；图表和其他组件可能是它的兄弟节点。避免选到整段对话、分享弹窗或插件预览。

简单内容可以右键所选元素 → Copy → Copy outerHTML，粘贴到 `source.html`，替换模板注释。

**包含表单时推荐使用下面的 Console 代码。** `$0` 是 Elements 当前选中的元素；此代码复制完整回答，并将原生输入控件的实时值写入副本，不修改页面：

```js
{
  const sampleRoot = $0.closest('[data-message-author-role="assistant"],[data-content-search-unit-key$=":assistant"]');
  if (!sampleRoot) throw new Error('请先在 Elements 中选择回答里的元素');
  const sampleClone = sampleRoot.cloneNode(true);
  const sampleSources = [sampleRoot, ...sampleRoot.querySelectorAll('*')];
  const sampleCopies = [sampleClone, ...sampleClone.querySelectorAll('*')];
  sampleSources.forEach((source, index) => {
    const target = sampleCopies[index];
    if (source.matches('input')) {
      if (source.type === 'password' || source.type === 'file') target.removeAttribute('value');
      else target.setAttribute('value', source.value);
      if (source.type === 'checkbox' || source.type === 'radio') {
        target.toggleAttribute('checked', source.checked);
        if (source.indeterminate) target.setAttribute('data-sample-indeterminate', 'true');
      }
    }
    if (source.matches('textarea')) target.textContent = source.value;
    if (source.matches('option')) target.toggleAttribute('selected', source.selected);
  });
  copy(sampleClone.outerHTML);
}
```

把剪贴板内容粘贴到 `source.html`。`copy()` 是 Chrome DevTools 的功能，只在开发者工具 Console 中使用。

HTML 不能完整保存计算样式、字体、Canvas 像素、应用内部状态或 iframe 内容。`data-sample-indeterminate` 只是采集标记，重放时需要恢复控件属性。当前状态还应写入 `sample.md`，并保留截图；保存 HTML 不代表能离线复现原页面。自定义控件尤其需要核对可见文字及 ARIA 状态。

## 截图和导出

- 页面参考图：保留完整组件、标签、图例和结果。长回答可分段截图，使用 `light-default-01.png`、`light-default-02.png` 等。
- 导出图：使用本扩展生成并保存真实 PNG / JPG。预览截图不能代替实际导出图片。
- 首次采集建议验证浅色 + Automatic；之后补深色、自定义 600px（当前允许的最小宽度），以及一个交互后的状态。
- 记录插件版本及所有导出设置。对比时以内容完整、状态正确、图表可见和文字可读为准；允许主题、字体、间距按导出设置变化。
- 采集前将鼠标移出图表，避免把临时 tooltip 当作默认画面。

## 结果标记

| 状态 | 含义 |
| --- | --- |
| `pending` | 尚未完成实际导出或对照 |
| `pass` | 当前场景满足记录的预期 |
| `partial` | 有降级，但主体内容仍可读；注明缺失项 |
| `fail` | 内容缺失、状态错误、空白或明显裁切 |

只有至少完成一个场景的 DOM、参考截图和实际导出图片，才算一个已采集样本。不要用单个通过样本推断整个组件家族已兼容。

## 优先采集清单

以下是计划项，不代表已有支持或已通过验证：

- 卡片与网格：商品对比、食谱、行程、混合文字与图片占位。
- 时间线与进度：日程、部分完成清单、0% / 50% / 100% 进度。
- 表单：文本、下拉选择、单选、多选、滑块、分段选择。
- 可见状态：标签页切换、折叠面板展开、计算器修改输入后的结果。
- 图表：柱状图、折线图、饼图、带图例及长标签的图表。
- 示意图：架构图、带文字的 SVG、图表与其他组件混排。
- 边界：主要由图形组成的回答、Canvas、地图、iframe 应用。

## 样本索引

复制下面的空行填写；文件夹链接使用相对路径。

| 样本 | 组件家族 | 已验证场景 | 结果 | 问题摘要 |
| --- | --- | --- | --- | --- |
<!-- | [chart-line-basic](chart-line-basic/sample.md) | 图表 | light-default | pending | 待采集 | -->

## 提交前检查

使用虚构数据采集。分享或提交之前检查 HTML 和截图，删除个人信息、私密对话、文件名、账户信息及带凭证的链接。`source.html` 可能含页面生成的 ID 和资源地址；对话链接可以不填。不要提交密码或真实业务数据。
