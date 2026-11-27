import { prepare, measureLineStats, measureNaturalWidth, setLocale } from './assets/pretext/layout.js';

// The document remains readable without JS. Measurements only let text regions grow.
const root = document.documentElement;
const navigation = document.querySelector('.site-header nav');
const languageToggle = navigation.querySelector('.language-toggle');
const languageKey = 'pulsraum.language';
const translations = [];
// The German text is the source for the static page and for switching back.
for (const attribute of [null, 'aria-label', 'title', 'content', 'lang', 'alt', 'href']) {
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

// Sample the connector once per layout. Its normals are in screen pixels so a
// heartbeat stays legible when the SVG viewBox stretches on a narrow phone.
function mapEcgStations(curve) {
  const svg = curve.ownerSVGElement;
  const sx = svg.clientWidth / svg.viewBox.baseVal.width;
  const sy = svg.clientHeight / svg.viewBox.baseVal.height;
  const length = curve.getTotalLength();
  const positions = Array.from({ length: 241 }, (_, i) => curve.getPointAtLength(length * i / 240));
  return positions.map(({ x, y }, i) => {
    const before = positions[Math.max(0, i - 1)];
    const after = positions[Math.min(240, i + 1)];
    const dx = (after.x - before.x) * sx;
    const dy = (after.y - before.y) * sy;
    const tangent = Math.hypot(dx, dy);
    return { x, y, fraction: i / 240, nx: dy / tangent / sx, ny: -dx / tangent / sy };
  });
}

async function animateMapEcg(reducedMotion) {
  const wave = document.querySelector('.map-ecg-wave');
  const curve = document.querySelector('.map-spoke.signal-ecg');
  const trace = document.querySelector('.signal-figure.signal-ecg .signal-trace');
  const source = new URL(trace.querySelector('use').getAttribute('href'), document.baseURI);
  const response = await fetch(source);
  if (!response.ok) throw Error('Could not load the ECG samples');
  const svg = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
  const samples = Array.from(svg.getElementById(source.hash.slice(1)).points, ({ x, y }) => ({ x, y }));
  const period = samples.at(-1).x;
  const plot = trace.ownerSVGElement;
  const rightEdge = plot.viewBox.baseVal.width;
  const baseline = plot.querySelector('.signal-baseline').getPointAtLength(0).y;
  const pause = document.getElementById('pause-map');
  let stations = [];
  let visible = false;
  let frame;

  function draw() {
    const phase = trace.getAnimations()[0]?.effect.getComputedTiming().progress;
    if (phase != null && stations.length) {
      // The newest sample enters at the ECG node. At the hub the stream is
      // half a plot-window older. Traverse backwards in space, forwards in time.
      const newest = rightEdge + phase * period;
      let index = 0;
      const points = new Array(stations.length);
      for (let i = stations.length - 1; i >= 0; i--) {
        const station = stations[i];
        const t = (newest - station.fraction * rightEdge / 2) % period;
        if (samples[index].x > t) index = 0;
        while (samples[index + 1].x < t) index++;
        const a = samples[index], b = samples[index + 1];
        const y = a.y + (b.y - a.y) * (t - a.x) / (b.x - a.x);
        const amplitude = (baseline - y) * .32;
        points[i] = `${(station.x + station.nx * amplitude).toFixed(2)},${(station.y + station.ny * amplitude).toFixed(2)}`;
      }
      wave.setAttribute('points', points.join(' '));
    }
    if (!pause.checked) frame = requestAnimationFrame(draw);
  }
  function sync() {
    cancelAnimationFrame(frame);
    if (reducedMotion.matches) wave.removeAttribute('points');
    else if (visible && !document.hidden) frame = requestAnimationFrame(draw);
  }
  new ResizeObserver(() => {
    stations = mapEcgStations(curve);
    sync();
  }).observe(wave.ownerSVGElement);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(wave.ownerSVGElement);
  reducedMotion.addEventListener('change', sync);
  pause.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
}

// Run the demonstrations while any part of the drawing is visible.
if ('IntersectionObserver' in window) {
  const rig = document.querySelector('.breathing-rig');
  const figure = rig.ownerSVGElement;
  const breath = createBreathAnimation(rig);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  animateMapEcg(reducedMotion).catch(() => {
    // The original curved connection remains visible if the sample asset is unavailable.
  });
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
  document.querySelectorAll('.hero, .milestone-figure').forEach(element => drawings.observe(element));
  document.querySelectorAll('.motion-setting').forEach(control => { control.hidden = false; });
}
