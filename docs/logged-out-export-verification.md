# Logged-out export fixes — 2026-11-04

## Findings and changes

1. The live logged-out `/uc/` shell uses `data-message-role`, `data-assistant-markdown-root`, `data-user-message-copy`, and `data-assistant-message-actions`. Recognize those markers without exporting attribution or actions. Require `data-message-complete`, no busy markdown, and native actions before offering export; observe completion attribute changes.
2. Logged-out code toolbars and language labels are siblings of `pre`. Replace the containing wrapper identified by its direct `data-message-content-controls` and `pre` children. Read `data-code-language` and keep one label inside the exported code block.
3. Generic ChatGPT page titles now fall back to the answer heading, then the associated prompt, then `ChatGPT-answer`. Named conversations retain their titles.
4. `html-to-image` 1.11.13 reuses a global font-format regexp without resetting `lastIndex` between `src` declarations. A regression test reproduces missing font sources in the unpatched library. A guarded build patch resets the matcher for each declaration, retaining regular/italic/bold sources across repeated exports. This establishes a concrete font-selection defect; the exact intermittent glyph overlap in the demo has not been independently replayed.
5. A visualization launcher containing `data-assistant-math-rendered` is now an inert formula card. Preserve its MathML before button cleanup, including answers whose only content is this card. Ordinary actions remain excluded.
6. Snapshotting a block formula copied its host width (700 px in the browser reproduction) into a 640 px export. Formula outer boxes now reflow; internal fraction/script geometry remains copied. Display formulas are centered and structured prose without `data-d-text-flow` receives paragraph spacing.

## Verification

- Automated checks cover guest discovery, prompt association, completion/busy state, formula-only answers, code labels, filename fallback, formula cards, tables containing math, and font source filtering. Existing legacy and content-unit selectors remain covered.
- Live logged-out DOM inspection confirmed the structures above, including a quadratic formula launcher and Python toolbar. The currently open logged-in page had four content-unit answers and four existing export buttons; no matching recognition failure was observed there.
- A temporary localhost fixture based on the observed structures ran the built content script and the actual SVG/PNG export pipeline. At 640 px / Large / 2×, it produced a 1280 × 1560 PNG containing a formula card, standalone equation, three table rows, code with one language label, and a numbered list. Visual inspection passed. The original overflow warning reproduced before the formula-width fix and disappeared afterward; measured card width was 640 px with no horizontal overflow.
- The separate conservative “A wider layout is recommended” advisory still appears below the recommended width. It is distinct from detected overflow and remains intentional.
- Temporary browser assets live outside the repository. These checks do not establish that a reloaded extension has passed acceptance on the original demo conversation or every ChatGPT layout variant.
