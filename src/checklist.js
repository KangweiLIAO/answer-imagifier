// Replace interactive list checkboxes after style cleanup, before controls are
// removed. Read live properties from the source; checked attributes can be stale.
export function preserveChecklist(clone, sourceByCopy) {
  for (const control of clone.querySelectorAll('input[type="checkbox"],[role="checkbox"]')) {
    const item = control.closest('li');
    if (!item || control.closest('pre,code')) continue;
    const original = sourceByCopy.get(control);
    if (!original) continue;
    const state = original.getAttribute('aria-checked');
    const checked = original.matches('input[type="checkbox"]')
      ? (original.checked ?? original.hasAttribute('checked'))
      : state === 'true';
    const mixed = original.indeterminate === true || state === 'mixed';
    const svg = clone.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('data-checklist-box', mixed ? 'mixed' : checked ? 'checked' : 'unchecked');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', mixed ? 'Partially checked' : checked ? 'Checked' : 'Unchecked');
    svg.innerHTML = '<rect x="1" y="1" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-opacity="0.6" stroke-width="1.3"/>' +
      (mixed ? '<path d="M5 10h10" fill="none" stroke="currentColor" stroke-width="1.6"/>' :
        checked ? '<path d="m5 10 3.3 3.5L15 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' : '');
    control.replaceWith(svg);
    item.setAttribute('data-checklist-item', '');
  }
}
