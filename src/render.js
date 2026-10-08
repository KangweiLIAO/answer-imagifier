import { t } from './i18n.js';
import { getAnswerRoot, getPrompt } from './dom.js';
import { validLayout } from './layout.js';
import { createSnapshot } from './export/snapshot.js';
import { adaptContent } from './export/adapters.js';
import { preserveCode } from './export/adapters/code.js';
import { cleanInteractiveContent, pruneEmptyWrappers } from './export/cleanup.js';
import { assembleCard } from './export/card.js';
import { prepareResources } from './export/resources.js';
import { layoutCard } from './export/layout.js';

export { rasterize } from './export/rasterize.js';

export async function createCard(answer, options, mount) {
  if (!validLayout(options)) throw new Error(t('invalidLayout'));
  const warnings = [];
  const context = createSnapshot(getAnswerRoot(answer), warnings, options);
  adaptContent(context);
  cleanInteractiveContent(context);
  preserveCode(context);
  pruneEmptyWrappers(context);
  const card = assembleCard(context.clone, getPrompt(answer), options);
  mount.replaceChildren(card);
  await prepareResources(card, options, warnings);
  layoutCard(card, options, warnings);
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return { card, warnings: [...new Set(warnings)] };
}
