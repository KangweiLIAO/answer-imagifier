// A vertical group of bordered pressables carries answer choices, including
// disabled choices after feedback. Convert the group before button cleanup.
export function preserveAnswerOptions(clone, sourceByCopy) {
  const selector = '[data-d-component="pressable"][data-d-has-border][data-d-direction="row"]';
  for (const copy of [...clone.querySelectorAll(selector)]) {
    const source = sourceByCopy.get(copy);
    const group = source?.parentElement;
    if (!group?.matches('[data-d-component="box"][data-d-direction="col"]')) continue;
    const choices = [...group.children];
    if (choices.length < 2 || !choices.every(choice => choice.matches(selector) && choice.querySelector('[data-d-component="text"]'))) continue;
    if (!clone.contains(copy) || source.matches('[hidden],[aria-hidden="true"],[role="radio"],[role="checkbox"]')) continue;
    const option = clone.ownerDocument.createElement('div');
    for (const attribute of [...copy.attributes]) {
      if (!['role', 'tabindex', 'type', 'disabled', 'aria-disabled', 'aria-haspopup', 'aria-expanded', 'aria-pressed', 'aria-selected'].includes(attribute.name)) option.setAttribute(attribute.name, attribute.value);
    }
    option.setAttribute('data-d-component', 'row');
    option.setAttribute('data-export-answer-option', '');
    const selected = source.getAttribute('aria-pressed') ?? source.getAttribute('aria-selected');
    if (selected !== null) option.setAttribute('data-export-selected', selected);
    option.append(...copy.childNodes);
    sourceByCopy.set(option, source);
    copy.replaceWith(option);
  }
}
