import { prepare, measureLineStats, measureNaturalWidth, setLocale } from './assets/pretext/layout.js';

// The document remains readable without JS. Measurements only let text regions grow.
const root = document.documentElement;
const navigation = document.querySelector('.site-header nav');
const languageToggle = navigation.querySelector('.language-toggle');
const languageKey = 'pulsraum.language';
const translations = [];
// The German text is the source for the static page and for switching back.
for (const attribute of [null, 'aria-label', 'title', 'content', 'lang', 'alt', 'href', 'src']) {
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
const cloudNodes = [...document.querySelectorAll('.idea-node, .map-hub')];
function measure() {
  const navHeight = navigation.offsetHeight;
  const measurements = new Map();
  for (const element of elements) {
    const css = getComputedStyle(element);
    const padding = parseFloat(css.paddingLeft) + parseFloat(css.paddingRight);
    // CSS layout widths stay stable as the cloud scales and the nodes drift.
    const width = (parseFloat(css.width) || element.offsetWidth) - padding;
    if (width <= 0 || !element.getClientRects().length) continue;
    const font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
    const text = element.innerText;
    const spacing = Number.parseFloat(css.letterSpacing) || 0;
    const whiteSpace = element.querySelector('br') ? 'pre-wrap' : 'normal';
    const key = `${root.lang}|${font}|${spacing}|${whiteSpace}|${text}`;
    let entry = cache.get(element);
    if (entry?.key !== key) {
      const prepared = prepare(text, font, { letterSpacing: spacing, whiteSpace });
      entry = { key, prepared, natural: Math.round(measureNaturalWidth(prepared)) };
      cache.set(element, entry);
    }
    const stats = measureLineStats(entry.prepared, width);
    const lineHeight = Number.parseFloat(css.lineHeight);
    measurements.set(element, {
      height: stats.lineCount * lineHeight, width: Math.max(width, stats.maxLineWidth) + padding,
      lines: stats.lineCount, natural: entry.natural,
    });
  }
  // Reserve room for each wrapped label and keep the spoke endpoint inside its icon.
  const travel = cloudNodes.map(node => {
    const icon = parseFloat(getComputedStyle(node.querySelector('.map-icon')).width);
    const labels = [...node.querySelectorAll('[data-measure]')].map(el => measurements.get(el));
    const width = Math.max(icon, ...labels.map(label => label?.width ?? 0));
    const height = labels.reduce((sum, label) => sum + (label?.height ?? 0), 0);
    const labelMargin = parseFloat(getComputedStyle(node.lastElementChild).marginTop);
    const halfGap = (node.clientHeight - icon) / 2;
    return {
      x: Math.max(0, Math.min(icon * .33, (node.clientWidth - width) / 2 - 1)),
      up: Math.max(0, Math.min(icon * .24, halfGap - 2)),
      down: Math.max(0, Math.min(icon * .24, halfGap - height - labelMargin - 2)),
    };
  });
  // Commit after all layout reads. Animation frames never enter this pass.
  root.style.setProperty('--navigation-block-size', `${navHeight}px`);
  for (const [element, size] of measurements) {
    element.style.minHeight = `${size.height}px`;
    if (element.dataset.measuredLines !== String(size.lines)) element.dataset.measuredLines = size.lines;
    if (element.dataset.measuredWidth !== String(size.natural)) element.dataset.measuredWidth = size.natural;
  }
  cloudNodes.forEach((node, i) => {
    for (const [axis, distance] of Object.entries(travel[i])) {
      node.style.setProperty(`--drift-${axis}`, `${distance.toFixed(1)}px`);
    }
  });
  root.dataset.textMeasurement = 'ready';
}
let frame;
const observer = new ResizeObserver(() => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(measure);
});
elements.forEach(element => observer.observe(element));
cloudNodes.forEach(node => observer.observe(node));
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
function mapEcgStations(curve, sx, sy, left, top) {
  const length = curve.getTotalLength();
  const positions = Array.from({ length: 241 }, (_, i) => curve.getPointAtLength(length * i / 240));
  return positions.map(({ x, y }, i) => {
    const before = positions[Math.max(0, i - 1)];
    const after = positions[Math.min(240, i + 1)];
    const dx = (after.x - before.x) * sx;
    const dy = (after.y - before.y) * sy;
    const tangent = Math.hypot(dx, dy);
    return { x: x * sx - left, y: y * sy - top, fraction: i / 240, nx: dy / tangent, ny: -dx / tangent };
  });
}

async function animateMapEcg(reducedMotion) {
  const wave = document.querySelector('.map-ecg-wave');
  const ctx = wave.getContext('2d');
  if (!ctx) return;
  const curve = document.querySelector('.map-spoke.signal-ecg');
  const trace = document.querySelector('.signal-figure.signal-ecg .signal-trace');
  const source = new URL(trace.querySelector('use').getAttribute('href'), document.baseURI);
  const response = await fetch(source);
  if (!response.ok) throw Error('Could not load the ECG samples');
  const svg = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
  const samples = Array.from(svg.getElementById(source.hash.slice(1)).points, ({ x, y }) => ({ x, y }));
  const period = samples.at(-1).x;
  const rightEdge = period / 2;
  const baseline = trace.querySelector('.signal-baseline').getPointAtLength(0).y;
  const pause = document.getElementById('pause-map');
  const gain = .32;
  const gutter = 2 + Math.ceil(gain * Math.max(...samples.map(p => Math.abs(baseline - p.y))));
  let stations = [];
  let visible = false;
  let frame;
  let clock;
  let cycleMs;

  function draw() {
    if (!clock) {
      clock = trace.getAnimations()[0];
      cycleMs = clock?.effect.getTiming().duration;
    }
    const time = clock?.currentTime;
    if (time != null && stations.length) {
      // The newest sample enters at the ECG node. At the hub the stream is
      // half a plot-window older. Traverse backwards in space, forwards in time.
      const newest = rightEdge + ((time % cycleMs) / cycleMs) * period;
      let index = 0;
      ctx.clearRect(0, 0, wave.width, wave.height);
      ctx.beginPath();
      for (let i = stations.length - 1; i >= 0; i--) {
        const station = stations[i];
        const t = (newest - station.fraction * rightEdge / 2) % period;
        if (samples[index].x > t) index = 0;
        while (samples[index + 1].x < t) index++;
        const a = samples[index], b = samples[index + 1];
        const y = a.y + (b.y - a.y) * (t - a.x) / (b.x - a.x);
        const amplitude = (baseline - y) * gain;
        ctx.lineTo(station.x + station.nx * amplitude, station.y + station.ny * amplitude);
      }
      ctx.stroke();
      if (wave.hidden) wave.hidden = false;
    }
    if (!pause.checked) frame = requestAnimationFrame(draw);
  }
  function sync() {
    cancelAnimationFrame(frame);
    clock = undefined;
    if (reducedMotion.matches) wave.hidden = true;
    else if (visible && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function setInk() {
    ctx.strokeStyle = getComputedStyle(wave).color;
    sync();
  }
  const links = curve.ownerSVGElement;
  function resize() {
    const sx = links.clientWidth / links.viewBox.baseVal.width;
    const sy = links.clientHeight / links.viewBox.baseVal.height;
    if (!sx || !sy) return;
    const bounds = curve.getBBox();
    const left = Math.floor(bounds.x * sx) - gutter, top = Math.floor(bounds.y * sy) - gutter;
    const width = Math.ceil((bounds.x + bounds.width) * sx) + gutter - left;
    const height = Math.ceil((bounds.y + bounds.height) * sy) + gutter - top;
    stations = mapEcgStations(curve, sx, sy, left, top);
    Object.assign(wave.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
    const ratio = Math.min(window.devicePixelRatio, 2);
    wave.width = Math.round(width * ratio);
    wave.height = Math.round(height * ratio);
    ctx.setTransform(wave.width / width, 0, 0, wave.height / height, 0, 0);
    ctx.lineWidth = 2;
    ctx.lineCap = ctx.lineJoin = 'round';
    setInk();
  }
  new ResizeObserver(resize).observe(links);
  new MutationObserver(setInk).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(links);
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
