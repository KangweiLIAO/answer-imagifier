// The logged-out shell wraps inline MathML in a visualization launcher. Export
// its visible formula as an inert card before ordinary button cleanup.
export function preserveFormulaCards({ clone }) {
  for (const rendered of clone.querySelectorAll('[data-assistant-math-rendered]')) {
    const button = rendered.closest('button[aria-haspopup="dialog"]');
    if (!button || !clone.contains(button) || !rendered.querySelector('math,.katex')) continue;
    const card = clone.ownerDocument.createElement('div');
    card.setAttribute('data-export-formula-card', '');
    card.setAttribute('data-export-display-math', '');
    card.append(rendered);
    button.replaceWith(card);
  }
}
