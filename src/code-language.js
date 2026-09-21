const LANGUAGE_ALIASES = new Map([
  ['c++', 'cpp'],
  ['c#', 'csharp'],
  ['f#', 'fsharp'],
  ['objective-c', 'objectivec'],
  ['shell script', 'bash'],
  ['zsh', 'bash'],
  ['html', 'xml'],
  ['jsx', 'javascript'],
  ['tsx', 'typescript'],
  ['jsonc', 'json'],
  ['md', 'markdown'],
  ['yml', 'yaml'],
]);

export function normalizeCodeLanguage(value, supportsLanguage) {
  const candidate = String(value || '').trim().toLowerCase();
  if (!candidate || candidate.length > 32 || /[\n\r]/.test(candidate)) return '';
  if (candidate === 'mermaid') return candidate;

  const normalized = LANGUAGE_ALIASES.get(candidate) || candidate;
  return supportsLanguage(normalized) ? normalized : '';
}

function candidatesFromAttributes(element) {
  if (!element?.getAttribute) return [];
  const candidates = [
    element.getAttribute('data-language'),
    element.getAttribute('data-lang'),
    element.getAttribute('lang'),
  ];
  for (const match of String(element.className || '').matchAll(/(?:^|\s)(?:language|lang)-([\w+#.-]+)/gi)) {
    candidates.push(match[1]);
  }
  return candidates;
}

function shortLeafText(element, code) {
  if (!element) return [];
  const descendants = [...(element.querySelectorAll?.('div,span') || [])];
  const leaves = descendants.filter(node =>
    !node.querySelector?.('div,span') &&
    !node.closest?.('button,[role="button"]') &&
    !node.querySelector?.('svg') &&
    !node.contains?.(code) &&
    !code?.contains?.(node)
  );
  const interactive = element.matches?.('button,[role="button"]') || element.querySelector?.('button,[role="button"],svg');
  const nodes = leaves.length ? leaves : (element.contains?.(code) || interactive ? [] : [element]);
  return nodes.map(node => node.textContent?.trim()).filter(Boolean);
}

function nearbyHeaderText(container, code) {
  const candidates = [];
  candidates.push(...shortLeafText(container, code).filter(text => text.length <= 32));

  // ChatGPT may place the language label in a header beside the <pre>, rather
  // than inside it. Walk only the nearest single-code-block wrappers.
  let current = container;
  for (let depth = 0; depth < 3; depth += 1) {
    const parent = current?.parentElement;
    if (!parent || parent.querySelectorAll?.('pre').length !== 1) break;
    for (let sibling = current.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
      candidates.push(...shortLeafText(sibling, code).filter(text => text.length <= 32));
    }
    current = parent;
  }
  return candidates;
}

export function detectCodeLanguage(container, code, supportsLanguage) {
  const attributedElements = [container, code, ...(container.querySelectorAll?.('[data-language],[data-lang],[lang],[class*="language-"],[class*="lang-"]') || [])];
  const candidates = attributedElements.flatMap(candidatesFromAttributes);
  const block = container.closest?.('[data-markdown-copy="code-block"]');
  if (block) {
    const header = block.querySelector('[data-markdown-copy="exclude"]');
    candidates.push(...shortLeafText(header, code));
  }
  candidates.push(...nearbyHeaderText(container, code));

  for (const candidate of candidates) {
    const language = normalizeCodeLanguage(candidate, supportsLanguage);
    if (language) return language;
  }
  return '';
}
