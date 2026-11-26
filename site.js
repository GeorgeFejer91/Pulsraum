import { prepare, measureLineStats, measureNaturalWidth, setLocale } from './assets/pretext/layout.js';

// The document remains readable without JS. Measurements only let text regions grow.
setLocale('de');
await document.fonts.ready;
const root = document.documentElement;
const navigation = document.querySelector('.site-header nav');
const cache = new WeakMap();
const elements = [...document.querySelectorAll('[data-measure]')];
function measure() {
  root.style.setProperty('--navigation-block-size', `${navigation.offsetHeight}px`);
  for (const element of elements) {
    const width = element.getBoundingClientRect().width;
    if (width <= 0) continue;
    const css = getComputedStyle(element);
    const font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
    const text = element.innerText;
    const spacing = Number.parseFloat(css.letterSpacing) || 0;
    const whiteSpace = element.querySelector('br') ? 'pre-wrap' : 'normal';
    const key = `${font}|${spacing}|${whiteSpace}|${text}`;
    let entry = cache.get(element);
    if (entry?.key !== key) {
      entry = { key, prepared: prepare(text, font, { letterSpacing: spacing, whiteSpace }) };
      cache.set(element, entry);
    }
    const stats = measureLineStats(entry.prepared, width);
    const lineHeight = Number.parseFloat(css.lineHeight);
    // Natural flow and wrapping take priority; never shrink user-enlarged text.
    element.style.minHeight = `${stats.lineCount * lineHeight}px`;
    element.dataset.measuredLines = String(stats.lineCount);
    element.dataset.measuredWidth = String(Math.round(measureNaturalWidth(entry.prepared)));
  }
  root.dataset.textMeasurement = 'ready';
}
let frame;
const observer = new ResizeObserver(() => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(measure);
});
elements.forEach(element => observer.observe(element));
observer.observe(navigation);
measure();

// Run the demonstrations while any part of the drawing is visible.
if ('IntersectionObserver' in window) {
  const drawings = new IntersectionObserver(entries => {
    for (const entry of entries) {
      entry.target.classList.toggle('in-view', entry.isIntersecting);
    }
  });
  document.querySelectorAll('.milestone-figure').forEach(svg => drawings.observe(svg));
  document.querySelector('.motion-setting').hidden = false;
}
