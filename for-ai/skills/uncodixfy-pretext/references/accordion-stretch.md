# Accordion stretch layout

Use accordion stretch spacing for the visual units in the requested surface. A card can grow with its content in document flow. A bounded, resizable panel can use the same spacing while meeting a separate no-scrollbar requirement.

Read [pretext.md](pretext.md) for the text API and font parity requirements. Pretext measures text; CSS Grid and Flexbox place the controls.

Exclude menu bars and navigation rails from the equal-gap checks below. Verify
their edge anchors and label alignment at each breakpoint, including after
resizing or switching languages. Keep keyboard focus visible and touch targets
reachable when the bar wraps.

## Geometry contract

1. Define the panel's supported minimum dimensions and name its anchors: usually header at the top, actions at the bottom, and ordered control groups between them. Group a label with its input so stretch never separates a pair. Keep DOM reading and keyboard order aligned with visual order.
2. Center each group in its available box on both axes. For unanchored peers, give the outer edges and internal gaps the same minimum, then share surplus equally among all those spaces. One group has equal space on either side. Unequal-width marks can have equal *visible gaps* even when their centers are different distances apart. Trim empty SVG canvas before measuring. For a bounded shell with anchored header and actions, use `grid-template-rows: auto minmax(0, 1fr) auto` and apply the rule inside the flexible middle region.
3. Let width distribute columns and inline gaps with shrinkable tracks (`minmax(0, 1fr)`) or wrapped Flex rows. Reflow at a content-driven breakpoint when one row no longer fits. Preserve the same anchors and group order across the breakpoint.
4. Derive spacing tokens from **both** dimensions, with lower and upper bounds. Use viewport units for a full-window panel; use container query units or a batched `ResizeObserver` for an embedded panel with definite dimensions. Let preferred type depend on the smaller width-derived and height-derived budget, so a wide but short panel does not suddenly acquire tall typography.

```css
.stretch-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  block-size: 100%;
  min-inline-size: 0;
}
.stretch-panel__body {
  display: grid;
  align-content: space-evenly;
  justify-items: center;
  gap: var(--minimum-group-gap);
  padding: var(--minimum-group-gap);
  min-block-size: 0;
  min-inline-size: 0;
}
.stretch-panel__choices {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-evenly;
  inline-size: 100%;
  box-sizing: border-box;
  gap: var(--block-gap) var(--inline-gap);
  padding-inline: var(--inline-gap);
}
```

These are geometry roles, not mandatory class names or universal numeric tokens. Choose each bound from the app's real controls and minimum window size. At the minimum, all required controls must fit with the minimum readable type and gaps. If they do not, change the arrangement or minimum dimensions; hiding overflow is not a fit strategy.

Check rendered rectangles after fonts and images load. In a horizontal row,
compare the leading space, each artwork-to-artwork gap and the trailing space.
For a vertical stack, compare the corresponding block-axis distances. Check
opposing margins on the cross axis as well. Allow for pixel rounding. Test a
single item, unequal peers, a wrapped row, and a short unit stretched to the
height of a taller sibling. Repeat across resize, language and text enlargement.

## Type and no-fit decisions

- After fonts load, use Pretext to check each bounded label at the preferred size: one-line controls need natural-width, line-count, and line-height checks against the **inner** content box. Use the rendered DOM as the final check.
- Derive `widthBudget` and `heightBudget` as font-size candidates from the panel's usable dimensions and product-specific factors. Start each measurement from `clamp(minReadable, min(widthBudget, heightBudget), preferredMax)`, then use Pretext to try the largest candidate that fits every fixed action in its actual track. Reprepare text when the candidate font changes. Recompute from the current dimensions on each resize so type can grow again after an earlier contraction. If no candidate fits, reflow controls or revise the supported minimum; never shrink below the readable floor. Preserve user-enlarged text instead of reducing an explicit accessibility override.
- Give each no-fit result a deliberate path. Reflow ordinary labels when space allows. For an unbounded status or identifier, keep the full value reachable by keyboard and pointer in a detail view. Do not report ellipsis or `overflow: hidden` as a successful text fit.
- Batch resize and content measurements. Cache preparations by text, font, spacing, and locale. If Pretext is unavailable, keep a readable CSS fallback and mark measurement unavailable rather than claiming fit.

## No-scrollbar acceptance

A strict no-scrollbar request means the **requested panel** has no internal scrolling at every supported size. For a full-window panel the page must also not scroll; an embedded panel does not change its host page's scroll policy. Dialogs and overlays may have a separate policy. Check both dimensions independently: minimum width with tall height, minimum height with wide width, both minimum, both expanded, and each breakpoint on both sides. Assert that group spacing grows when height grows, inline separation grows when width grows, and preferred type grows only when both dimensions permit it. Confirm anchors, group order, non-overlap, visible controls, and full-text access.

Inspect `scrollWidth`/`clientWidth` and `scrollHeight`/`clientHeight` on the panel, its shell, and any status region; include the document for a full-window panel. Also inspect control bounds. `overflow: hidden` can conceal broken geometry, so it is never sufficient evidence by itself. Exercise long values, enlarged text, user text-spacing overrides, light/dark themes, and the target browser or WebView. Report the exact tested range and any state that cannot meet the contract.
