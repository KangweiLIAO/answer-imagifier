import { t } from '../i18n.js';
import { recommendedWidth, hasLayoutOverflow, WIDTH_LIMITS } from '../layout.js';
import { prepareTableLayouts, applyTableLayouts, hasCrampedTableColumns } from '../table-layout.js';
import { applyImageWidths } from '../image-width.js';
import { preserveBlockSpacing } from '../block-spacing.js';

export function layoutCard(card, options, warnings) {
  const tableLayouts = prepareTableLayouts(card);
  if (options.widthMode === 'auto') card.style.width = `${Math.min(WIDTH_LIMITS.max, Math.max(recommendedWidth(card, options), ...tableLayouts.map(plan=>plan.width+80)))}px`;
  applyTableLayouts(tableLayouts);
  applyImageWidths(card, options.diagramSize);
  preserveBlockSpacing(card);
  if (options.widthMode === 'auto') {
    while ((hasLayoutOverflow(card) || hasCrampedTableColumns(tableLayouts)) && parseFloat(card.style.width) < WIDTH_LIMITS.max) {
      card.style.width = `${Math.min(WIDTH_LIMITS.max, parseFloat(card.style.width) + 80)}px`;
      applyTableLayouts(tableLayouts);
    }
  }
  if (hasLayoutOverflow(card)) warnings.push(t('layoutOverflow'));
  if (options.widthMode === 'custom' && options.width < recommendedWidth(card, options)) warnings.push(t('narrowLayout'));
}
