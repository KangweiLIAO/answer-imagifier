import { choiceMarker } from '../../shared/choice-marker.js';

// Replace interactive list checkboxes after style cleanup, before controls are
// removed. Read live properties from the source; checked attributes can be stale.
export function preserveChecklist(clone, sourceByCopy) {
  for (const control of clone.querySelectorAll('input[type="checkbox"],[role="checkbox"]')) {
    const item = control.closest('li');
    const row = !item && (control.closest('[data-d-component="row"],label') || control.parentElement);
    if ((!item && (!row || row === clone)) || control.closest('pre,code')) continue;
    const original = sourceByCopy.get(control);
    if (!original || original.matches('[aria-hidden="true"],[hidden]')) continue;
    if (original.matches('input') && original.parentElement.querySelector('[role="checkbox"]')) continue;
    const state = original.getAttribute('aria-checked');
    const checked = original.matches('input[type="checkbox"]')
      ? (original.checked ?? original.hasAttribute('checked'))
      : state === 'true';
    const mixed = original.indeterminate === true || state === 'mixed';
    // Use the outer ARIA control once when a native input is nested inside it.
    if (control.parentElement?.closest('[role="checkbox"]')) continue;
    const round = !!original.querySelector('circle') || /round/i.test(original.parentElement?.className || '');
    const svg = choiceMarker(clone.ownerDocument, mixed ? 'mixed' : checked ? 'checked' : 'unchecked', round);
    control.replaceWith(svg);
    if (item) item.setAttribute('data-checklist-item', '');
    else {
      svg.setAttribute('data-component-checkbox', '');
      row.setAttribute('data-export-checklist-row', '');
      row.setAttribute('data-checklist-state', mixed ? 'mixed' : checked ? 'checked' : 'unchecked');
    }
  }
}
