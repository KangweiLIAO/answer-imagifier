import { t } from '../i18n.js';
import { preserveVisualAssets } from './adapters/visual-assets.js';
import { preserveFormControls } from './adapters/form-controls.js';
import { preserveChecklist } from './adapters/checklist.js';
import { preserveComponents } from './adapters/components.js';
import { preserveImagePlaceholders } from './adapters/image-placeholder.js';

// Order is intentional: forms own their choices; checklists handle remaining
// checkboxes. Components then normalize wrappers, including static controls.
export const CONTENT_ADAPTERS = Object.freeze([
  Object.freeze({ id: 'visual-assets', apply: ({ clone, sourceByCopy, readStyle }) => preserveVisualAssets(clone, sourceByCopy, readStyle) }),
  Object.freeze({ id: 'form-controls', apply: ({ clone, sourceByCopy, readStyle }) => preserveFormControls(clone, sourceByCopy, readStyle) }),
  Object.freeze({ id: 'checklist', apply: ({ clone, sourceByCopy }) => preserveChecklist(clone, sourceByCopy) }),
  Object.freeze({ id: 'structured-layout', apply: ({ clone, sourceByCopy, readStyle }) => preserveComponents(clone, sourceByCopy, readStyle) }),
  Object.freeze({ id: 'image-placeholders', apply: ({ clone, sourceByCopy, omitted, options }) => preserveImagePlaceholders(clone, sourceByCopy, omitted, t('imagePlaceholder'), options.showImagePlaceholders !== false) }),
]);

export function adaptContent(context) {
  for (const adapter of CONTENT_ADAPTERS) adapter.apply(context);
}
