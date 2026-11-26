import { prepare, measureLineStats, measureNaturalWidth, setLocale } from './assets/pretext/layout.js';

// The document remains readable without JS. Measurements only let text regions grow.
const root = document.documentElement;
const navigation = document.querySelector('.site-header nav');
const languageToggle = navigation.querySelector('.language-toggle');
const languageKey = 'pulsraum.language';
const translations = [];
// The German text is the source for the static page and for switching back.
for (const attribute of [null, 'aria-label', 'title', 'content', 'lang', 'alt', 'src', 'href']) {
  const source = attribute ? `data-en-${attribute}` : 'data-en';
  for (const element of document.querySelectorAll(`[${source}]`)) {
    const de = attribute ? element.getAttribute(attribute) : element.textContent;
    translations.push({ element, attribute, de, en: element.getAttribute(source) });
  }
}

function applyLanguage(language) {
  root.lang = language;
  setLocale(language);
  for (const translation of translations) {
    const { element, attribute } = translation;
    if (attribute) element.setAttribute(attribute, translation[language]);
    else element.textContent = translation[language];
  }
}

let initialLanguage = 'de';
try {
  if (localStorage.getItem(languageKey) === 'en') initialLanguage = 'en';
} catch {
  // Use German when storage is unavailable.
}
applyLanguage(initialLanguage);

await document.fonts.ready;
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
    const key = `${root.lang}|${font}|${spacing}|${whiteSpace}|${text}`;
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
languageToggle.addEventListener('click', () => {
  const language = root.lang === 'de' ? 'en' : 'de';
  applyLanguage(language);
  measure();
  try {
    localStorage.setItem(languageKey, language);
  } catch {
    // The selected language still applies to the current page.
  }
});
languageToggle.hidden = false;
measure();

function createBreathAnimation(rig) {
  const plot = rig.querySelector('.breath-plot');
  const segments = [...plot.querySelectorAll('polyline')];
  // The shared peak has two colors at the same instant and one displacement.
  const intervals = segments.reduce((n, segment) => n + segment.points.length - 1, 0);
  const frames = [];
  let firstSample = 0;
  for (const segment of segments) {
    for (const [i, { x, y }] of Array.from(segment.points).entries()) {
      frames.push({
        offset: (firstSample + i) / intervals, '--breath-x': x, '--breath-y': y,
        color: `var(--${segment.dataset.phase})`,
      });
    }
    firstSample += segment.points.length - 1;
  }
  const effect = new KeyframeEffect(rig, frames, {
    duration: intervals * Number(plot.dataset.sampleMs), iterations: Infinity,
  });
  return new Animation(effect, document.timeline);
}

// Run the demonstrations while any part of the drawing is visible.
if ('IntersectionObserver' in window) {
  const rig = document.querySelector('.breathing-rig');
  const figure = rig.ownerSVGElement;
  const breath = createBreathAnimation(rig);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pause = document.getElementById('pause-animations');
  function syncBreathPlayback() {
    const recording = figure.classList.contains('in-view') && !reducedMotion.matches && !pause.checked;
    rig.classList.toggle('is-recording', recording);
    if (recording) breath.play();
    else breath.cancel();
  }
  pause.addEventListener('change', syncBreathPlayback);
  reducedMotion.addEventListener('change', syncBreathPlayback);
  const drawings = new IntersectionObserver(entries => {
    for (const entry of entries) {
      entry.target.classList.toggle('in-view', entry.isIntersecting);
      if (entry.target === figure) syncBreathPlayback();
    }
  });
  document.querySelectorAll('.milestone-figure, .signal-figure').forEach(figure => drawings.observe(figure));
  document.querySelectorAll('.motion-setting').forEach(control => { control.hidden = false; });
}
