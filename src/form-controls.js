const NON_CHECKBOX = 'input:not([type=checkbox]):not([type=hidden]),select,textarea,[role=radio],[role=radiogroup],[role=combobox],[role=slider],[role=textbox]';
const CONTROLS = `${NON_CHECKBOX},input[type=checkbox],[role=checkbox],[data-d-component=select],[data-d-component=date-picker],[data-d-component=slider]`;

function formContext(source) {
  const form = source.closest('form,[data-export-form]');
  if (form) return form;
  for (let parent = source.parentElement; parent; parent = parent.parentElement) {
    if (parent.matches('[data-d-has-border],fieldset,[role=group]') && parent.querySelector(NON_CHECKBOX)) return parent;
  }
  return null;
}
function node(document, tag, kind, text) {
  const result = document.createElement(tag);
  result.setAttribute('data-export-form-control', kind);
  if (text !== undefined) result.textContent = text;
  return result;
}
export function choiceMarker(document, state, round = false, radio = false) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 20 20');
  svg.setAttribute('width','20'); svg.setAttribute('height','20');
  svg.setAttribute('data-checklist-box',state);
  svg.setAttribute('role','img');
  svg.setAttribute('aria-label',state === 'mixed' ? 'Partially checked' : state === 'checked' ? 'Checked' : 'Unchecked');
  svg.innerHTML = round
    ? '<circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" stroke-opacity=".6" stroke-width="1.3"/>'
    : '<rect x="1" y="1" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-opacity=".6" stroke-width="1.3"/>';
  if (state === 'mixed') svg.innerHTML += '<path d="M5 10h10" fill="none" stroke="currentColor" stroke-width="1.6"/>';
  else if (state === 'checked') svg.innerHTML += radio
    ? '<circle cx="10" cy="10" r="5" fill="currentColor"/>'
    : '<path d="m5 10 3.3 3.5L15 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';
  return svg;
}
export function preserveFormControls(clone, sourceByCopy, readStyle = source => getComputedStyle(source)) {
  const document = clone.ownerDocument;
  for (const copy of [...clone.querySelectorAll(CONTROLS)]) {
    if (!clone.contains(copy) || copy.closest('pre,code,svg,[data-math]')) continue;
    const source = sourceByCopy.get(copy);
    if (!source || source.matches('input[type=hidden],input[type=submit],input[type=reset],input[type=button],[role=radiogroup],[aria-hidden="true"]')) continue;
    const checkbox = source.matches('input[type=checkbox],[role=checkbox]');
    const radio = source.matches('input[type=radio],[role=radio]');
    if (source.matches('input[type=checkbox],input[type=radio]') && source.parentElement.querySelector('[role=checkbox],[role=radio]')) continue;
    if (checkbox && !formContext(source)) continue; // todo conversion remains separate
    if (source.parentElement?.closest('[role=checkbox],[role=radio],[role=combobox],[role=slider],[data-d-component=select],[data-d-component=date-picker],[data-d-component=slider]')) continue;
    if (radio || checkbox) {
      const aria = source.getAttribute('aria-checked');
      const checked = source.localName === 'input' ? (source.checked ?? source.hasAttribute('checked')) : aria === 'true';
      const state = source.indeterminate || aria === 'mixed' ? 'mixed' : checked ? 'checked' : 'unchecked';
      const style = readStyle(source);
      const round = radio || !!source.querySelector('circle') || parseFloat(style.getPropertyValue('border-radius')) >= 10 || /round/i.test(source.parentElement?.className || '');
      const marker = choiceMarker(document,state,round,radio);
      marker.setAttribute('data-export-form-control',radio ? 'radio' : 'checkbox');
      marker.setAttribute('data-component-checkbox','');
      // Custom controls may expose both a native input and an ARIA wrapper.
      // Replace the wrapper as a unit rather than exporting two markers.
      const row = copy.closest('label,[data-d-component=row]') || copy.parentElement;
      if (row && row !== clone) row.setAttribute('data-export-choice-row','');
      copy.replaceWith(marker);
      continue;
    }
    if (source.matches('input[type=range],[role=slider],[data-d-component=slider]')) {
      const range = source.matches('[data-d-component=slider]') ? source.querySelector('[role=slider],input[type=range]') : source;
      if (!range) continue;
      const min = Number(range.getAttribute('aria-valuemin') ?? range.getAttribute('min') ?? 0);
      const max = Number(range.getAttribute('aria-valuemax') ?? range.getAttribute('max') ?? 100);
      const value = Number(range.getAttribute('aria-valuenow') ?? range.value ?? range.getAttribute('value') ?? (min + max) / 2);
      const percent = max > min ? Math.max(0,Math.min(100,(value-min)/(max-min)*100)) : 0;
      const slider = node(document,'div','slider');
      const track = node(document,'div','slider-track');
      const thumb = node(document,'span','slider-thumb'); thumb.style.left = `${percent}%`;
      track.append(thumb); slider.append(track);
      const ticks = node(document,'div','slider-ticks');
      const marks = [...source.querySelectorAll('[data-mark]')].map(mark => mark.textContent.trim());
      const labels = marks.length ? marks : [String(min),String((min+max)/2),String(max)];
      labels.forEach((label,index) => {
        const tick = node(document,'span','slider-tick',label);
        const numeric = Number(label);
        const position = max > min && Number.isFinite(numeric) ? (numeric-min)/(max-min)*100 : index/(labels.length-1 || 1)*100;
        tick.style.left = `${Math.max(0,Math.min(100,position))}%`;
        ticks.append(tick);
      });
      slider.append(ticks);
      if (source.localName === 'input') slider.append(node(document,'span','slider-value',String(value)));
      slider.setAttribute('aria-label',range.getAttribute('aria-valuetext') || `${value} (${min}–${max})`);
      slider.setAttribute('data-export-value',String(value));
      copy.replaceWith(slider);
      continue;
    }
    const select = source.matches('select,[role=combobox],[data-d-component=select]');
    const date = source.matches('input[type=date],input[type=datetime-local],[data-d-component=date-picker]');
    const multiline = source.matches('textarea');
    let value = source.value;
    if (source.localName === 'select') {
      const selected = [...source.querySelectorAll('option')].filter(option => option.selected || option.getAttribute('value') === source.value);
      value = selected.map(option => option.textContent).join(', ');
    } else if (source.localName !== 'input' && source.localName !== 'textarea') value = source.getAttribute('aria-valuetext') || source.textContent.trim();
    if (source.matches('input[type=password]')) value = value ? '••••••••' : '';
    const placeholder = source.getAttribute('placeholder') || source.getAttribute('data-placeholder') || '';
    const box = node(document, multiline ? 'div' : 'span', select ? 'select' : date ? 'date' : multiline ? 'textarea' : 'input', value || placeholder || '—');
    if (!value || source.querySelector('[data-selected="false"]')) box.setAttribute('data-export-empty','');
    if (select) { const arrow = node(document,'span','arrow','⌄'); box.append(arrow); }
    if (date) {
      box.setAttribute('data-export-date','');
      const icon = document.createElementNS('http://www.w3.org/2000/svg','svg');
      icon.setAttribute('viewBox','0 0 24 24'); icon.setAttribute('data-export-icon','');
      icon.innerHTML = '<path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm-2 5h18M8 3v4m8-4v4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>';
      box.prepend(icon);
      box.append(node(document,'span','arrow','⌄'));
    }
    copy.replaceWith(box);
  }
  for (const copy of clone.querySelectorAll('button,input[type=submit],input[type=reset],input[type=button]')) {
    const source = sourceByCopy.get(copy);
    if (!source || !formContext(source) || source.closest('pre,code') || source.matches('[role=checkbox],[role=radio],[role=combobox]')) continue;
    let parent = copy.parentElement;
    copy.remove();
    // Prune action-only rows so removed Reset/Submit buttons leave no blank gap.
    while (parent && parent !== clone && !parent.textContent.trim() &&
        !parent.querySelector('svg,img,input,textarea,select,[data-export-form-control],[role=checkbox],[role=radio]')) {
      const next = parent.parentElement;
      parent.remove();
      parent = next;
    }
  }
  // Keep field rows horizontal, but never wrap vertical lists into extra columns.
  for (const copy of clone.querySelectorAll('div,span,label,fieldset')) {
    const source = sourceByCopy.get(copy);
    if (!source || !formContext(source)) continue;
    const style = readStyle(source);
    if (['flex','inline-flex'].includes(style.getPropertyValue('display'))) {
      copy.setAttribute('data-export-form-layout','');
      copy.style.display = 'flex';
      copy.style.flexDirection = style.getPropertyValue('flex-direction') || 'row';
      copy.style.justifyContent = style.getPropertyValue('justify-content') || 'flex-start';
      copy.style.alignItems = style.getPropertyValue('align-items') || 'center';
      copy.style.gap = `calc(${parseFloat(style.getPropertyValue('gap')) || 8}px * var(--spacing-scale, 1))`;
      copy.style.flexWrap = copy.style.flexDirection.startsWith('column') ? 'nowrap' : 'wrap';
    }
  }
}
