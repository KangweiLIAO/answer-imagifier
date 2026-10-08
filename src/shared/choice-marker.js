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
