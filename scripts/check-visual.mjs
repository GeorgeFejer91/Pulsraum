import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { join } from 'node:path';
import { chromium, webkit } from 'playwright';

const site = process.argv[2] ?? '.';
const screenshots = process.env.PULSRAUM_VISUAL_DIR ?? '.for-ai-local/visual';
const contentTypes = { html: 'text/html', css: 'text/css', js: 'text/javascript', webp: 'image/webp', mp4: 'video/mp4', png: 'image/png', svg: 'image/svg+xml', blend: 'application/octet-stream' };
const server = createServer(async (request, response) => {
  const pathname = request.url === '/' ? '/index.html' : request.url;
  if (!/^\/(?:index\.html|styles\.css|site\.js|theme\.js|assets\/pretext\/[\w/-]+\.js|assets\/models\/polar-h10-worn\.blend|assets\/illustrations\/(?:polar-h10(?:-breathing)?\.webp|polar-h10-worn\.mp4|vernier-go-direct-spirometer\.svg|breathing-validation\.webp|(?:signals|overview-icons)\.svg)|assets\/team\/[\w-]+\.(?:webp|png|svg))$/.test(pathname)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const contents = await readFile(join(site, pathname));
    response.writeHead(200, { 'Content-Type': contentTypes[pathname.split('.').at(-1)] });
    response.end(contents);
  } catch {
    response.writeHead(404).end();
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const url = process.env.PULSRAUM_VISUAL_URL ?? `http://127.0.0.1:${server.address().port}/`;

async function checkBluetoothBelt(drawing) {
  const poses = [];
  for (const ms of [0, 1000, 2000, 3000, 4000]) {
    await drawing.evaluate(async (svg, ms) => {
      for (const animation of svg.getAnimations({ subtree: true })) {
        animation.pause();
        await animation.ready;
        animation.currentTime = ms;
      }
    }, ms);
    const frame = await drawing.screenshot();
    poses.push(await drawing.evaluate(async (_, png) => {
      const image = new Image();
      image.src = 'data:image/png;base64,' + png;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 144;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, 320, 144);
      // Only the belt is dark in this region of the light-theme panel.
      const { data } = ctx.getImageData(2, 35, 119, 64);
      let left = 119, right = -1, podBottom = -1;
      for (let i = 0; i < data.length; i += 4) {
        if (Math.max(data[i], data[i + 1], data[i + 2]) >= 75) continue;
        const x = (i / 4) % 119;
        left = Math.min(left, x);
        right = Math.max(right, x);
        if (x >= 39 && x < 59) podBottom = Math.floor(i / 4 / 119);
      }
      return { width: right - left, podBottom };
    }, frame.toString('base64')));
  }
  const [rest, rising, full, falling, end] = poses;
  assert.ok(rest.width > 85 && rising.width > rest.width + 4 && full.width > rising.width + 4);
  assert.ok(falling.width < full.width - 4 && falling.width > end.width + 4);
  assert.ok(full.podBottom >= rest.podBottom + 3 && Math.abs(end.podBottom - rest.podBottom) <= 1);
  assert.ok(Math.abs(end.width - rest.width) <= 1, 'The strap must return to its resting width');
}

async function checkValidationBreath(drawing) {
  const samples = await drawing.evaluate(async svg => {
    const [clock] = svg.getAnimations();
    clock.pause();
    await clock.ready;
    const position = selector => new DOMMatrix(getComputedStyle(svg.querySelector(selector)).transform);
    return [0, 750, 1749, 1750, 3000, 4500].map(ms => {
      clock.currentTime = ms;
      const avatar = position('.avatar-frames');
      return { tile: [-avatar.e / 186, -avatar.f / 248].map(Math.round),
        shift: position('.validation-sweep').e };
    });
  });
  for (const [i, ms] of [0, 750, 1749, 1750, 3000, 4500].entries()) {
    const tile = Math.floor(ms * 12 / 1000) % 54;
    assert.deepEqual(samples[i].tile.map(v => v || 0), [tile % 9, Math.floor(tile / 9)],
      'The worn instruments and avatar must advance through the rendered breathing cycle');
    assert.ok(Math.abs(samples[i].shift + 160 * (ms % 4500) / 4500) < .01,
      'The phone must receive samples on the same clock as the avatar');
  }
  // Measure the actual rendered silhouettes at their inline display size.
  const poses = await drawing.evaluate(async svg => {
    const image = new Image();
    image.src = svg.querySelector('.avatar-frames').href.baseVal;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 186;
    canvas.height = 248;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const tileW = image.width / 9, tileH = image.height / 6;
    return [0, 10, 21, 35, 53].map(tile => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, tile % 9 * tileW, Math.floor(tile / 9) * tileH, tileW, tileH,
        0, 0, canvas.width, canvas.height);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      function edge(y, fromRight = false) {
        for (let step = 0; step < canvas.width; step++) {
          const x = fromRight ? canvas.width - 1 - step : step;
          if (pixels[4 * (y * canvas.width + x) + 3] > 32) return x;
        }
        throw Error(`Missing silhouette at row ${y}`);
      }
      return { chest: edge(170), spirometerArm: edge(140), phoneArm: edge(180, true) };
    });
  });
  const [rest, rising, full, falling, finish] = poses;
  for (const part of Object.keys(rest)) {
    assert.ok(rest[part] - full[part] >= 5 && rising[part] < rest[part] &&
      falling[part] > full[part] && Math.abs(finish[part] - rest[part]) <= 1,
    `${part} must visibly travel with the breath and return at the loop boundary: ${poses.map(p => p[part])}`);
  }
}

async function checkBreathingPhases(drawing) {
  await drawing.evaluate(async svg => {
    const rig = svg.querySelector('.breathing-rig');
    const plot = rig.querySelector('.breath-plot');
    const cursor = rig.querySelector('.breath-cursor');
    const waves = rig.querySelector('.phone-waves');
    const phone = rig.querySelector('.phone-assembly rect');
    const belly = rig.querySelector('.abdomen-motion');
    const segments = [...plot.querySelectorAll('polyline')];
    const endX = segments.at(-1).points.getItem(segments.at(-1).points.length - 1).x;
    const [clock] = rig.getAnimations();
    const duration = clock.effect.getTiming().duration;
    clock.pause();
    await clock.ready;
    const seek = x => { clock.currentTime = duration * x / endX; };
    const edge = () => belly.getBoundingClientRect().right;
    // The middle of each stroke becomes visible only after the cursor reaches it.
    for (const line of segments) {
      const sample = line.getPointAtLength(line.getTotalLength() / 2);
      const screen = sample.matrixTransform(line.getScreenCTM());
      const painted = () => document.elementsFromPoint(screen.x, screen.y).includes(line);
      seek(sample.x - 4);
      if (painted()) throw Error('The waveform is visible ahead of the cursor');
      seek(sample.x + 4);
      if (!painted()) throw Error('The waveform is missing behind the cursor');
    }
    const airflow = rig.querySelector('.mouth-air');
    if (!airflow?.querySelector('path')) throw Error('The mouth needs visible airflow particles');
    const airOffset = () => parseFloat(getComputedStyle(airflow.querySelector('path')).strokeDashoffset);
    seek(0);
    let lastEdge = edge();
    const restEdge = lastEdge;
    const phoneWidth = phone.getBoundingClientRect().width;
    const restPhoneX = phone.getBoundingClientRect().x;
    const colors = new Set();
    for (const line of segments) {
      const ink = getComputedStyle(line).stroke;
      colors.add(ink);
      const rising = line.dataset.phase === 'inhale';
      let previousAir = airOffset();
      for (let i = 1; i < line.points.length; i++) {
        const a = line.points.getItem(i - 1), b = line.points.getItem(i);
        const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
        seek(x);
        const point = new DOMPoint().matrixTransform(cursor.getScreenCTM()).matrixTransform(plot.getScreenCTM().inverse());
        if (Math.abs(point.x - x) > .05 || Math.abs(point.y - y) > .05) throw Error('Cursor left the breath trace');
        if (getComputedStyle(waves).stroke !== ink || getComputedStyle(cursor).fill !== ink) throw Error('Breath phase color mismatch');
        const air = airOffset();
        if (getComputedStyle(airflow).stroke !== ink || !(rising ? air > previousAir : air < previousAir)) {
          throw Error('Air particles must move toward the mouth on inhale and away on exhale in the phase color');
        }
        previousAir = air;
        const currentEdge = edge();
        if (rising ? currentEdge <= lastEdge : currentEdge >= lastEdge) throw Error('Belly movement reversed relative to the graph');
        if (Math.abs((phone.getBoundingClientRect().x - restPhoneX) - (currentEdge - restEdge)) > .05) throw Error('Phone drifted from the belly');
        if (Math.abs(phone.getBoundingClientRect().width - phoneWidth) > .05) throw Error('The phone changed shape');
        lastEdge = currentEdge;
      }
      // Start the next direction comparison at the actual turning point.
      seek(line.points.getItem(line.points.length - 1).x);
      lastEdge = edge();
    }
    if (colors.size !== 2 || Math.abs(lastEdge - restEdge) > .05 ||
        getComputedStyle(waves).stroke !== getComputedStyle(segments[0]).stroke) throw Error('Breath did not loop back to inhalation');
    clock.play();
  });
}

async function checkMapMotion(map) {
  await map.evaluate(async figure => {
    const wave = figure.querySelector('.map-ecg-wave');
    const curve = figure.querySelector('.map-spoke.signal-ecg');
    const trace = document.querySelector('.signal-figure.signal-ecg .signal-trace');
    const breath = figure.getAnimations()[0];
    const lungs = document.querySelector('.signal-resp .organ-motion').getAnimations()[0];
    const nodes = [...figure.querySelectorAll('.idea-node, .map-hub')];
    const paths = [...figure.querySelectorAll('.map-spoke')];
    const paint = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    const periods = new Set();
    for (const node of nodes) {
      const axes = ['drift-across', 'drift-vertically'].map(name => node.getAnimations().find(a => a.animationName === name));
      if (axes.some(a => a?.playState !== 'running')) throw Error('Each node needs two running drift axes');
      const starts = axes.map(a => a.startTime);
      periods.add(axes[0].effect.getTiming().duration);
      axes.forEach(a => a.pause());
      await Promise.all(axes.map(a => a.ready));
      const positions = [];
      for (const phase of [0, .5]) {
        for (const a of axes) {
          const { duration, delay } = a.effect.getTiming();
          a.currentTime = duration * (1 + phase) + delay;
        }
        await paint();
        const frame = figure.getBoundingClientRect();
        for (const part of node.querySelectorAll('[data-measure], .map-icon')) {
          const r = part.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          if (r.left < frame.left - 1 || r.right > frame.right + 1 ||
              r.top < frame.top - 1 || r.bottom > frame.bottom + 1) throw Error('Floating labels and icons must fit inside the map');
        }
        const isHub = node.classList.contains('map-hub');
        const icon = node.querySelector('.map-icon').getBoundingClientRect();
        for (const path of isHub ? paths : [paths[nodes.indexOf(node) - 1]]) {
          const point = path.getPointAtLength(isHub ? path.getTotalLength() : 0).matrixTransform(path.getScreenCTM());
          const offset = Math.hypot(point.x - (icon.left + icon.width / 2), point.y - (icon.top + icon.height / 2));
          if (offset > 1) throw Error(`${path.classList} must meet the ${isHub ? 'hub' : 'node'} center while floating (${offset.toFixed(2)}px off)`);
        }
        const css = getComputedStyle(node);
        positions.push({ x: new DOMMatrix(css.transform).e, y: parseFloat(css.translate.split(' ')[1]) || 0 });
      }
      const [a, b] = positions;
      if (a.x - b.x < 3 || b.y - a.y < 8) {
        throw Error('Each node must visibly float on both axes');
      }
      axes.forEach((animation, i) => { animation.startTime = starts[i]; });
    }
    if (periods.size !== 6) throw Error('All six nodes must float at independent speeds');
    if (Math.abs(breath.startTime - lungs.startTime) > 1 || breath.effect.getTiming().duration !== lungs.effect.getTiming().duration) {
      throw Error('The whole map and lungs must share the breathing cycle');
    }
    const ecg = figure.querySelector('.signal-ecg .organ-motion').getAnimations()[0];
    const breathStart = breath.startTime, ecgStart = ecg.startTime;
    breath.pause();
    ecg.pause();
    await Promise.all([breath.ready, ecg.ready]);
    try {
      const duration = breath.effect.getTiming().duration;
      breath.currentTime = duration * .17;
      const rest = figure.getBoundingClientRect();
      breath.currentTime = duration * .083;
      const full = figure.getBoundingClientRect();
      if (full.width < rest.width * 1.035 || full.height < rest.height * 1.035 ||
          Math.abs(full.x + full.width / 2 - rest.x - rest.width / 2) > 1) throw Error('The map must breathe around its center');

      const source = trace.querySelector('use').getAttribute('href');
      const svg = new DOMParser().parseFromString(await (await fetch(source)).text(), 'image/svg+xml');
      const samples = Array.from(svg.getElementById('ecg').points);
      const peak = samples.filter(p => p.x > 440 && p.x < 520).reduce((a, b) => a.y < b.y ? a : b);
      const length = curve.getTotalLength();
      const links = curve.ownerSVGElement;
      const sx = links.clientWidth / links.viewBox.baseVal.width;
      const sy = links.clientHeight / links.viewBox.baseVal.height;
      function hasPeakAt(fraction) {
        const distance = length * fraction;
        const base = curve.getPointAtLength(distance);
        const before = curve.getPointAtLength(distance - .5), after = curve.getPointAtLength(distance + .5);
        const dx = (after.x - before.x) * sx, dy = (after.y - before.y) * sy;
        const amplitude = (66 - peak.y) * .32 / Math.hypot(dx, dy);
        const x = (base.x * sx - wave.offsetLeft + dy * amplitude) * wave.width / wave.clientWidth;
        const y = (base.y * sy - wave.offsetTop - dx * amplitude) * wave.height / wave.clientHeight;
        const pixels = wave.getContext('2d').getImageData(Math.round(x) - 2, Math.round(y) - 2, 5, 5).data;
        return pixels.some((value, i) => i % 4 === 3 && value > 60);
      }
      for (const fraction of [.3, .7]) {
        // A sample takes a quarter of the eight-beat loop to cross the whole spoke.
        ecg.currentTime = ecg.effect.getTiming().duration * ((peak.x - 440) / 880 + fraction / 4);
        await paint();
        if (!hasPeakAt(fraction) || hasPeakAt(fraction - .075)) {
          throw Error('The sampled R peak must travel from ECG toward the hub on the original curve');
        }
      }
    } finally {
      ecg.startTime = ecgStart;
      breath.startTime = breathStart;
    }
  });
}

async function checkLayout(page) {
  const issues = await page.evaluate(() => {
    const issues = [];
    const centeredX = rect => (rect.left + rect.right) / 2;
    const centeredY = rect => (rect.top + rect.bottom) / 2;
    const evenlySpaced = distances => Math.max(...distances) - Math.min(...distances) <= 1.5;
    const team = document.querySelector('#team .box-grid');
    const people = [...team.children];
    const frames = people.map(card => card.getBoundingClientRect());
    const columns = matchMedia('(max-width: 680px)').matches ? 1 : 2;
    const gridGap = parseFloat(getComputedStyle(team).gap);
    const close = (a, b) => Math.abs(a - b) <= 1;
    if (people.length !== 4) issues.push('The team grid must contain four profiles');
    for (const [i, frame] of frames.entries()) {
      const rowStart = frames[i - i % columns];
      const column = frames[i % columns];
      if (!close(frame.width, frames[0].width) || !close(frame.left, column.left) ||
          !close(frame.top, rowStart.top) || !close(frame.height, rowStart.height) ||
          (i >= columns && !close(frame.top - frames[i - columns].bottom, gridGap)) ||
          (i % columns && !close(frame.left - frames[i - 1].right, gridGap))) {
        issues.push('Team cards must form evenly spaced, matching columns and aligned rows in reading order');
        break;
      }
    }
    for (const [i, card] of people.entries()) {
      const frame = frames[i];
      const name = card.querySelector('h3');
      const portrait = card.querySelector('.portrait');
      const inset = gridGap * (1 + Math.sqrt(5)) / 2;
      const contentWidth = frame.width - 2 * (inset + card.clientLeft);
      if (!portrait) {
        issues.push(`Missing portrait for ${name.textContent}`);
        continue;
      }
      const photo = portrait.getBoundingClientRect();
      const rowTitle = people[i - i % columns].querySelector('h3').getBoundingClientRect();
      if (!close(centeredX(photo), centeredX(frame)) || !close(photo.top - frame.top - card.clientTop, inset) ||
          !close(photo.width, contentWidth * (3 - Math.sqrt(5)) / 2) || !close(photo.width, photo.height) ||
          !close(name.getBoundingClientRect().top, rowTitle.top)) {
        issues.push(`Misaligned portrait or name for ${name.textContent}`);
      }
    }
    for (const entry of team.querySelectorAll('.publication-card, .person-projects li')) {
      const frame = entry.getBoundingClientRect();
      for (const child of entry.children) {
        const rect = child.getBoundingClientRect();
        if (rect.left < frame.left || rect.right > frame.right + 1 ||
            child.scrollWidth > child.clientWidth + 1) {
          issues.push(`Team entry text overflows: ${child.textContent.trim()}`);
        }
      }
    }
    const danielPortrait = team.querySelector('#daniel-artamendi')?.previousElementSibling;
    if (!danielPortrait?.matches('img.portrait[src="assets/team/daniel-artamendi.webp"][alt=""]') ||
        !danielPortrait.complete || !danielPortrait.naturalWidth) {
      issues.push('Daniel’s portrait must load and leave his name to the adjacent heading');
    }
    for (const card of document.querySelectorAll('.box-grid > .knowledge-box')) {
      const frame = card.getBoundingClientRect();
      let previousBottom = frame.top + card.clientTop;
      const gaps = [];
      for (const child of card.children) {
        const rect = child.getBoundingClientRect();
        const style = getComputedStyle(child);
        gaps.push(rect.top - parseFloat(style.marginTop) - previousBottom);
        previousBottom = rect.bottom + parseFloat(style.marginBottom);
        if (Math.abs(centeredX(frame) - centeredX(rect)) > 1) {
          issues.push(`Off-center group in ${card.querySelector('h3').textContent}`);
        }
      }
      gaps.push(frame.bottom - card.clientTop - previousBottom);
      if (!card.classList.contains('person') && !evenlySpaced(gaps)) {
        issues.push(`Uneven vertical gaps in ${card.querySelector('h3').textContent}: ${gaps}`);
      }
    }
    const logoRow = document.querySelector('.affiliation-logos');
    const edges = logoRow.closest('article').getBoundingClientRect();
    const [mpi, konstanz] = [...logoRow.querySelectorAll('img')].map(img => img.getBoundingClientRect());
    if (konstanz.top >= mpi.bottom) {
      if ([mpi, konstanz].some(logo => Math.abs(centeredX(edges) - centeredX(logo)) > 1)) {
        issues.push('Each stacked wordmark must be centered in the card');
      }
    } else if (!evenlySpaced([mpi.left - edges.left, konstanz.left - mpi.right, edges.right - konstanz.right]) ||
               Math.abs(centeredY(mpi) - centeredY(konstanz)) > 1) {
      issues.push('Both wordmarks must share a centerline and equal visible gaps to each other and the card edges');
    }
    for (const row of document.querySelectorAll('.milestone-layout')) {
      const frame = row.getBoundingClientRect();
      const [copy, art] = [...row.children].map(el => el.getBoundingClientRect());
      if (art.top >= copy.bottom) {
        if ([copy, art].some(rect => Math.abs(centeredX(rect) - centeredX(frame)) > 1)) issues.push('Off-center stacked milestone');
      } else if (!evenlySpaced([centeredX(copy) - frame.left, frame.right - centeredX(art)]) ||
                 Math.abs(centeredY(copy) - centeredY(art)) > 1) {
        issues.push('Milestone copy and illustration must be centered in opposing cells');
      }
    }
    const map = document.querySelector('.idea-map');
    const nodes = [...map.querySelectorAll('.idea-node')];
    const expectedIcons = ['open-source', 'lungs', 'local-data', 'heart', 'biofeedback'];
    const spokes = [...map.querySelectorAll('.map-spoke')];
    if (nodes.length !== 5 || spokes.length !== 5) issues.push('Each of the five ideas needs its own spoke');
    const hub = map.querySelector('.map-hub');
    const hubRect = hub.querySelector('.map-icon').getBoundingClientRect();
    if (!hub.querySelector('use[href$="#suite"]')?.getBBox().width) issues.push('The suite pictogram must render');
    const ring = map.querySelector('circle.map-ring');
    const rim = ring.getBoundingClientRect();
    if (Math.abs(rim.width - rim.height) > 1 || getComputedStyle(ring).strokeDasharray === 'none') {
      issues.push('One circular dashed perimeter must enclose the project nodes');
    }
    const boxes = [hub.getBoundingClientRect()];
    for (const [i, node] of nodes.entries()) {
      if (!document.getElementById(node.getAttribute('aria-controls') ?? node.hash.slice(1))) issues.push('Missing concept link destination');
      const use = node.querySelector('use');
      if (!use?.getAttribute('href').endsWith('#' + expectedIcons[i]) || !use.getBBox().height) {
        issues.push('Each concept needs its own visible SVG symbol');
      }
      const box = node.getBoundingClientRect();
      const label = node.querySelector('[data-measure]');
      // A rotated 44px target can lose a fraction of a pixel in its bounding rect.
      const touchTargetFits = box.width >= 43.99 && box.height >= 43.99;
      if ((!map.classList.contains('compact-labels') && label.scrollWidth > label.clientWidth + 1) || !touchTargetFits) {
        issues.push('Each concept needs a readable label and a full touch target');
      }
      if (boxes.some(b => box.left < b.right - 1 && box.right > b.left + 1 && box.top < b.bottom - 1 && box.bottom > b.top + 1)) {
        issues.push('The suite and its five concepts must remain distinct');
      }
      boxes.push(box);
      const path = spokes[i];
      if (!path) continue;
      const start = path.getPointAtLength(0).matrixTransform(path.getScreenCTM());
      const end = path.getPointAtLength(path.getTotalLength()).matrixTransform(path.getScreenCTM());
      const icon = node.querySelector('.map-icon').getBoundingClientRect();
      if (Math.hypot(centeredX(icon) - centeredX(rim), centeredY(icon) - centeredY(rim)) + icon.width / 2 > rim.width / 2 + 1)
        issues.push('Every node must sit inside the perimeter');
      if (Math.hypot(start.x - icon.x - icon.width / 2, start.y - icon.y - icon.height / 2) > 4 ||
          Math.hypot(end.x - hubRect.x - hubRect.width / 2, end.y - hubRect.y - hubRect.height / 2) > 1) {
        issues.push('Each branch must connect its concept to the central software suite');
      }
    }
    const frame = map.getBoundingClientRect();
    const visibleParts = map.classList.contains('compact-labels') ? '.map-icon' : '.map-icon, [data-measure]';
    const items = [...map.querySelectorAll(visibleParts)].map(el => el.getBoundingClientRect()).filter(r => r.width && r.height);
    for (const [i, item] of items.entries()) {
      if (item.left < frame.left - 1 || item.right > frame.right + 1 || item.bottom > frame.bottom + 1 ||
          items.slice(0, i).some(b => item.left < b.right - 1 && item.right > b.left + 1 &&
            item.top < b.bottom - 1 && item.bottom > b.top + 1)) {
        issues.push('Map labels and pictograms must fit without overlapping');
      }
    }
    for (const section of document.querySelectorAll('main > section:not(#projekt)')) {
      const boxes = [...section.querySelectorAll('.knowledge-box')];
      if (boxes.length < 2) issues.push(`${section.id} needs separate content boxes`);
      let previous;
      for (const box of boxes) {
        const label = box.querySelector('h2, h3');
        const bounds = box.getBoundingClientRect();
        const css = getComputedStyle(box);
        if (!label?.textContent.trim() || !label.getClientRects().length) issues.push(`${section.id} has an unlabeled box`);
        if (!Number.parseFloat(css.borderTopWidth) || css.borderTopStyle === 'none') issues.push(`${section.id} has a box without a visible border`);
        if (box.scrollWidth > box.clientWidth + 1 || box.scrollHeight > box.clientHeight + 1) {
          issues.push(`Content overflows its box: ${label?.textContent.trim()}`);
        }
        if (innerWidth <= 680 && previous && previous.bottom >= bounds.top) {
          issues.push(`${section.id} boxes must stack with space between them`);
        }
        previous = bounds;
      }
    }
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) {
      issues.push('Page horizontal overflow');
    }
    const navigation = document.querySelector('.site-header nav');
    const header = navigation.parentElement;
    const brand = header.querySelector('.wordmark').getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const padding = getComputedStyle(header);
    const leadingEdge = headerRect.left + parseFloat(padding.paddingLeft);
    if (Math.abs(brand.left - leadingEdge) > 1) issues.push('The brand must start at the leading header inset');
    const sidebar = matchMedia('(min-width: 52rem) and (pointer: fine)').matches;
    if (sidebar) {
      if (Math.abs(brand.top - headerRect.top - parseFloat(padding.paddingTop)) > 1) issues.push('The sidebar must start at the top inset');
      for (const link of navigation.querySelectorAll('a')) {
        const text = document.createRange();
        text.selectNodeContents(link.querySelector('span'));
        const inset = link.getBoundingClientRect().left + parseFloat(getComputedStyle(link).paddingLeft);
        if (Math.abs(text.getClientRects()[0].left - inset) > 1) issues.push('Sidebar link labels must start at their leading inset');
      }
    }
    const switches = [...header.querySelectorAll('.menu-switch:not([hidden])')];
    if (switches.length) {
      const menu = navigation.getBoundingClientRect();
      const [theme, language] = switches.map(control => control.getBoundingClientRect());
      const links = [...navigation.querySelectorAll('a')].map(link => link.getBoundingClientRect());
      if (!sidebar && !matchMedia('(width < 23rem)').matches &&
          links.some(link => Math.abs(link.top - links[0].top) > 1)) {
        issues.push('The wide phone menu links must share a row');
      }
      if (switches.some(control => !navigation.contains(control)) ||
          Math.min(theme.top, language.top) < Math.max(...links.map(link => link.bottom)) - 1) {
        issues.push('The theme and language switches must sit below the menu links');
      }
      if (Math.abs(theme.top - language.top) > 1 || theme.right >= language.left ||
          Math.abs(theme.left + language.right - menu.left - menu.right) > 2) {
        issues.push('The switch pair must be centered side by side in the menu');
      }
    }
    if (navigation.scrollWidth > navigation.clientWidth + 1) issues.push('Navigation horizontal overflow');
    for (const element of header.querySelectorAll('nav a, .menu-switch:not([hidden])')) {
      if (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1) {
        issues.push(`Navigation label overflows: ${element.textContent.trim()}`);
      }
    }
    return issues;
  });
  assert.deepEqual(issues, []);
}

async function checkNavigation(page, phone) {
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  const initial = await navigation.boundingBox();
  for (const anchor of ['#bausteine', '#projektverlauf']) {
    const link = navigation.locator(`a[href="${anchor}"]`);
    if (phone && anchor === '#projektverlauf') await link.tap();
    else await link.press('Enter');
    assert.equal(new URL(page.url()).hash, anchor);
    const heading = await page.locator(`${anchor} h2`).boundingBox();
    assert.ok(heading.y >= 0 && heading.y < page.viewportSize().height, 'Navigation must reveal the destination heading');
  }
  const teamLink = navigation.getByRole('link', { name: 'Team' });
  await teamLink.focus();
  await teamLink.press('Enter');
  assert.equal(new URL(page.url()).hash, '#team');
  const teamScroll = await page.evaluate(() => window.scrollY);
  assert.ok(teamScroll > 0, 'Section links must scroll the page');

  const pinned = await navigation.boundingBox();
  assert.ok(Math.abs(pinned.y - initial.y) < 2, 'The main menu must stay in place when the page scrolls');
  if (!phone) {
    const content = await page.getByRole('main').boundingBox();
    assert.ok(pinned.x + pinned.width <= content.x, 'The desktop menu must sit to the left of the content');
  } else {
    const teamHeading = await page.locator('#team-title').boundingBox();
    assert.ok(Math.abs(pinned.y + pinned.height - page.viewportSize().height) < 2, 'The phone menu must sit at the bottom');
    assert.ok(teamHeading.y >= 0 && teamHeading.y + teamHeading.height <= pinned.y, 'The phone menu must leave the destination heading visible');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const footerLink = await page.locator('footer a').last().boundingBox();
    assert.ok(footerLink.y + footerLink.height <= pinned.y + 1, 'The phone menu must leave the footer links reachable');
  }

  const projectLink = navigation.getByRole('link', { name: 'Auf einen Blick', exact: true });
  await projectLink.focus();
  await projectLink.press('Enter');
  assert.equal(new URL(page.url()).hash, '#projekt');
  assert.ok(await page.evaluate(() => window.scrollY) < teamScroll, 'The project link must scroll back up');
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function checkOverviewAutoplay(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    const start = new Date('2026-01-01T12:00:00Z');
    await page.clock.install({ time: start });
    await page.clock.pauseAt(new Date(+start + 1000));
    await page.goto(url);
    await page.locator('.hero.in-view').waitFor();
    const hero = page.locator('.hero');
    const title = hero.locator('h1');
    const details = hero.locator('.overview-details');
    const selection = () => hero.locator('button[aria-expanded="true"]').getAttribute('aria-controls', { timeout: 1000 });
    const intro = await title.boundingBox();
    const introScroll = await page.evaluate(() => window.scrollY);
    await hero.screenshot({ path: `${screenshots}/overview-intro.png` });
    await page.clock.runFor(14999);
    assert.ok(await details.isHidden(), 'The introduction must have a full 15 seconds');
    await page.clock.runFor(1);
    assert.equal(await selection(), 'anwendungen');
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'BODY', 'Autoplay must preserve focus');
    assert.equal(await page.evaluate(() => window.scrollY), introScroll, 'Autoplay must preserve scroll position');
    const turnWithTopic = await hero.locator('.map-wheel').evaluate(wheel => getComputedStyle(wheel).getPropertyValue('--turn'));
    assert.notEqual(turnWithTopic, '0deg', 'Autoplay must turn the wheel');
    await title.evaluate(async heading => {
      const [morph] = heading.getAnimations();
      if (!morph) throw Error('The same title must animate into the reading position');
      morph.pause();
      await morph.ready;
      morph.currentTime = morph.effect.getTiming().duration / 2;
    });
    const mid = await title.boundingBox();
    await hero.screenshot({ path: `${screenshots}/overview-morph.png` });
    await title.evaluate(heading => heading.getAnimations()[0].finish());
    const compact = await title.boundingBox();
    assert.ok(intro.width > mid.width && mid.width > compact.width &&
      intro.y > mid.y && mid.y > compact.y, 'The title must move and shrink through an intermediate frame');
    await details.evaluate(panel => Promise.all(panel.getAnimations().map(animation => animation.finished)));
    await hero.screenshot({ path: `${screenshots}/overview-autoplay.png` });

    for (const id of ['lokale-daten', 'kreatives-biofeedback', 'herzsignal', 'atemsignal', 'anwendungen']) {
      await page.clock.runFor(15000);
      assert.equal(await selection(), id, 'Autoplay must visit the spokes in order and wrap around');
    }

    await page.clock.runFor(14000);
    const ecg = await hero.locator('button.signal-ecg .map-icon').boundingBox();
    await page.mouse.click(ecg.x + ecg.width / 2, ecg.y + ecg.height / 2);
    assert.equal(await selection(), 'herzsignal', 'Clicking a topic must select it immediately');
    await page.clock.runFor(14999);
    assert.equal(await selection(), 'herzsignal', 'A click must give the new topic a full 15 seconds');
    await page.clock.runFor(1);
    assert.equal(await selection(), 'atemsignal');

    await hero.locator('button[aria-expanded="true"]').press('Enter');
    assert.ok(await details.isHidden(), 'The selected topic must remain dismissible');
    assert.equal(await title.evaluate(heading => heading.getAnimations().length), 1, 'The title must also morph back');
    await hero.locator('button.signal-ecg').press('Enter');
    await page.clock.runFor(15000);
    assert.equal(await selection(), 'herzsignal', 'Autoplay must preserve a topic with keyboard focus inside it');
    await page.keyboard.press('Escape');
    assert.ok(await details.isHidden());

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.runFor(30000);
    assert.ok(await details.isHidden(), 'Reduced motion must disable automatic topic changes');
    assert.equal(await title.evaluate(heading => heading.getAnimations().length), 0);
    console.log('chromium desktop overview autoplay and title morph: passed');
  } finally {
    await page.close();
  }
}

async function checkTopicTeam(details, topic, { english = false, measured = true } = {}) {
  const scientists = ['George Fejer', 'Dr. Alexandros Kastrinogiannis'];
  const hardware = 'Alex Cuthbertson';
  const software = 'Daniel Artamendi';
  const teams = {
    anwendungen: [software],
    'lokale-daten': [software],
    atemsignal: [...scientists, hardware],
    herzsignal: [...scientists, hardware],
    'kreatives-biofeedback': [...scientists, software],
    signale: [...scientists, hardware, software],
  };
  const team = details.getByRole('list', { name: english ? 'Responsible team members' : 'Verantwortliche Teammitglieder' });
  assert.equal(await team.count(), 1, `${topic} must show its own team at the bottom`);
  assert.deepEqual(await team.locator('.topic-person-name:visible').allInnerTexts(), teams[topic]);
  const rows = await team.locator('li:visible').evaluateAll((items, software) => items.map(item => {
    const portrait = item.querySelector('.portrait');
    const name = item.querySelector('.topic-person-name').textContent;
    const danielPortrait = document.querySelector('#daniel-artamendi')?.previousElementSibling;
    const bio = item.querySelector('p:last-child');
    const photo = portrait.getBoundingClientRect();
    const text = bio.getBoundingClientRect();
    return {
      sideBySide: photo.width > 0 && Math.abs(photo.width - photo.height) < 1 && photo.right < text.left,
      avatar: portrait.matches('img[alt=""]') && portrait.complete && portrait.naturalWidth > 0 &&
        (name !== software || portrait.currentSrc === danielPortrait?.currentSrc),
      fits: bio.scrollWidth <= bio.clientWidth + 1 && bio.scrollHeight <= bio.clientHeight + 1,
      measured: Number(bio.dataset.measuredLines) > 0,
      translated: bio.textContent === bio.dataset.en,
    };
  }), software);
  assert.ok(rows.every(row => row.sideBySide && row.avatar && row.fits &&
    (!measured || row.measured) && row.translated === english), `${topic} must show readable, localized profiles beside portraits`);
}

async function checkPage(browser, name, width, height, mode = 'default') {
  const phone = width <= 844;
  const page = await browser.newPage({
    viewport: { width, height },
    hasTouch: phone,
    isMobile: phone,
    colorScheme: mode === 'dark' ? 'dark' : 'light',
    reducedMotion: 'reduce',
    javaScriptEnabled: mode !== 'no-js',
  });
  page.setDefaultTimeout(7000);
  const failed = [];
  page.on('pageerror', error => failed.push(error.message));
  page.on('request', request => {
    if (new URL(request.url()).origin !== new URL(url).origin) failed.push(request.url());
  });
  page.on('response', response => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    assert.ok(response?.ok(), 'Website must load successfully');
    const sections = page.locator('main > section > div:first-child :is(h1, h2)');
    assert.deepEqual(await sections.allTextContents(), ['Pulsraum', 'Grundlagen', 'Projektverlauf', 'Team']);
    if (mode === 'default' && [844, 900].includes(width)) {
      const heading = await page.locator('.hero-heading').boundingBox();
      const map = await page.locator('.idea-map').boundingBox();
      assert.ok(heading.x + heading.width <= map.x, 'The overview should use available width on tablet and small desktop');
      if (phone) {
        const menu = await page.locator('.site-header nav').boundingBox();
        const lastNode = await page.locator('.idea-node, .map-hub').evaluateAll(nodes =>
          Math.max(...nodes.map(node => node.getBoundingClientRect().bottom)));
        assert.ok(lastNode <= menu.y, 'All overview topics should clear the bottom menu in landscape');
      }
      const foundations = await page.locator('.building-blocks .knowledge-box').evaluateAll(cards =>
        cards.map(card => card.getBoundingClientRect().top));
      assert.equal(new Set(foundations).size, 1, 'The three foundation cards should fill a single row');
      const copy = await page.locator('.milestone-layout > div').first().boundingBox();
      const art = await page.locator('.milestone-figure').first().boundingBox();
      assert.ok(copy.x + copy.width <= art.x, 'Milestone illustrations should sit beside the text at this width');
    }
    const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
    assert.deepEqual(await navigation.getByRole('link').allTextContents(), ['Auf einen Blick', 'Grundlagen', 'Projektverlauf', 'Team']);
    assert.equal(await page.getByRole('contentinfo').getByRole('link', { name: 'Auf GitHub mitmachen' }).getAttribute('href'),
      'https://github.com/GeorgeFejer91/Pulsraum/issues');
    const profiles = page.locator('#team .person');
    assert.ok(await profiles.count() >= 2, 'Each team member needs a profile box');
    for (const profile of await profiles.all()) {
      assert.equal(await profile.locator('h3').count(), 1);
      assert.ok(await profile.locator('.person-role').textContent());
      assert.ok(await profile.locator('a').count(), 'Each profile needs a relevant website');
    }
    const george = profiles.filter({ has: page.getByRole('heading', { name: 'George Fejer' }) });
    assert.equal(await george.locator('img.portrait').getAttribute('src'), 'assets/team/crop_selfie.png');
    const affiliations = george.locator('figure.affiliations');
    assert.equal(await affiliations.getByRole('link', { name: 'Max-Planck-Institut für Bildungsforschung' })
      .locator('img').getAttribute('src'), 'assets/team/mpib-de.svg');
    assert.equal(await affiliations.getByRole('link', { name: 'Universität Konstanz' })
      .locator('img').getAttribute('src'), 'assets/team/universitaet-konstanz.svg');
    assert.equal(await affiliations.locator('.affiliation-logos').evaluate(row => getComputedStyle(row).backgroundColor),
      'rgba(0, 0, 0, 0)', 'The profile surface must show through the affiliation row');
    const profileUrls = {
      'Forschungsprofil': 'https://www.georgefejer.com/',
      'Google Scholar': 'https://scholar.google.com/citations?user=GPARoloAAAAJ&hl=en',
      'GitHub': 'https://github.com/GeorgeFejer91',
      'LinkedIn': 'https://www.linkedin.com/in/george-fejer1/',
      'ORCID': 'https://orcid.org/0000-0002-4904-5504',
      'X': 'https://twitter.com/GeorgeFejer',
    };
    for (const [name, url] of Object.entries(profileUrls)) {
      const link = george.getByRole('link', { name, exact: true });
      assert.equal(await link.getAttribute('href'), url);
      assert.ok(await link.locator('svg').isVisible(), `${name} needs a visible icon`);
      const bounds = await link.boundingBox();
      assert.ok(bounds.width >= 44 && bounds.height >= 44, `${name} needs a full touch target`);
    }
    const kastrinogiannis = profiles.filter({ has: page.getByRole('heading', { name: 'Dr. Alexandros Kastrinogiannis' }) });
    assert.equal(await kastrinogiannis.count(), 1, 'Alexandros Kastrinogiannis needs his own profile');
    assert.equal(await kastrinogiannis.locator('.person-role').textContent(), 'Psychophysiologie und immersive Forschung');
    assert.equal(await kastrinogiannis.locator('img.portrait').getAttribute('src'), 'assets/team/alexandros-kastrinogiannis.webp');
    const leipzig = kastrinogiannis.getByRole('link', { name: 'Max-Planck-Institut für Kognitions- und Neurowissenschaften' });
    assert.equal(await leipzig.locator('img').getAttribute('src'), 'assets/team/mpi-cbs-de.svg');
    assert.equal(await kastrinogiannis.getByRole('link', { name: 'Google Scholar-Suche' })
      .locator('use').getAttribute('href'), '#link-scholar');
    assert.deepEqual(await profiles.evaluateAll(cards => cards.map(card =>
      [...card.querySelectorAll('.profile-links use')].map(icon => icon.getAttribute('href')))), [
      ['#link-website', '#link-scholar', '#link-github', '#link-linkedin', '#link-orcid', '#link-x'],
      ['#link-website'],
      ['#link-scholar', '#link-linkedin', '#link-orcid'],
      ['#link-website', '#link-linkedin', '#link-github'],
    ]);
    for (const link of await profiles.locator('.profile-links a, .publication-card a').all()) {
      const bounds = await link.boundingBox();
      assert.ok(bounds?.height >= 44 && bounds.width >= 44, 'Profile and publication links need full touch targets');
    }
    assert.deepEqual(await page.locator('a[href]').evaluateAll(links =>
      links.filter(link => !link.querySelector('svg, img')).map(link => link.getAttribute('href'))), [],
    'Every hyperlink needs an icon or institutional wordmark');
    const publications = page.locator('.publication-card');
    assert.deepEqual(await publications.locator('a').evaluateAll(links => links.map(link => link.href)), [
      'https://doi.org/10.1109/JBHI.2014.2307913',
      'https://doi.org/10.1145/3780045.3780061',
      'https://doi.org/10.18420/muc2025-mci-ws11-174',
      'https://doi.org/10.1111/psyp.70278',
      'https://doi.org/10.1177/25152459241297674',
      'https://nbn-resolving.org/urn:nbn:de:gbv:18-ediss-135173',
    ]);
    assert.equal(await publications.getByRole('heading').count(), await publications.count());
    assert.equal(await publications.locator('.publication-meta').count(), await publications.count());
    assert.deepEqual(await publications.locator('[data-measure]').evaluateAll(elements => elements
      .filter(element => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)
      .map(element => element.textContent)), [], 'Publication text must fit its card');
    if (mode !== 'no-js') {
      await page.locator('html[data-text-measurement="ready"]').waitFor({ state: 'attached' });
      assert.equal(await publications.locator('[data-measured-lines]').count(),
        await publications.locator('[data-measure]').count());
    }
    for (const image of await page.locator('#team img').all()) {
      await image.scrollIntoViewIfNeeded();
      assert.ok(await image.evaluate(element => element.complete && element.naturalWidth > 0), 'Published images must load');
    }
    const buildingBlocks = page.getByRole('region', { name: 'Grundlagen' });
    assert.equal(await buildingBlocks.count(), 1, 'The project must include a named research section');
    assert.equal(await buildingBlocks.getByRole('article').count(), 3);
    assert.equal(await buildingBlocks.getByRole('link', { name: 'DOI: 10.1109/JBHI.2014.2307913' }).getAttribute('href'),
      'https://doi.org/10.1109/JBHI.2014.2307913');
    const milestones = page.getByRole('region', { name: 'Projektverlauf' });
    if (mode !== 'no-js') {
      await page.locator('html[data-text-measurement="ready"]').waitFor({ state: 'attached' });
      if (name === 'chromium') await page.keyboard.press('Tab');
      else await page.locator('.skip-link').focus();
      assert.equal(await page.locator('.skip-link:focus-visible').count(), 1);
    }
    const map = page.locator('.idea-map');
    const details = page.locator('.overview-details');
    const hub = map.locator('.map-hub');
    if (mode !== 'no-js') {
      await page.locator('html[data-text-measurement="ready"]').waitFor({ state: 'attached' });
      assert.ok(await details.isHidden());
      for (const node of await map.locator('.idea-node').all()) {
        await node.press('Enter');
        const topic = await node.getAttribute('aria-controls');
        const target = page.locator('#' + topic);
        assert.ok(await target.isVisible());
        assert.equal(await node.getAttribute('aria-expanded'), 'true');
        assert.equal(await details.locator(':scope > article:visible').count(), 1);
        if (await target.evaluate(el => el.matches('.signal-figure'))) assert.equal(await details.locator('.signal-figure:visible').count(), 1);
        assert.ok(await target.locator('h2').evaluate(el => el === document.activeElement));
        await checkTopicTeam(details, topic);
      }
      await page.keyboard.press('Escape');
      assert.ok(await details.isHidden());
      assert.ok(await map.locator('.idea-node.map-creative').evaluate(el => el === document.activeElement));
      await hub.press('Space');
    } else {
      assert.ok(await details.isHidden());
      await map.locator('.idea-node.signal-ecg').click();
      assert.ok(await page.locator('#herzsignal').isVisible());
      assert.ok(await page.locator('#atemsignal').isHidden());
      await checkTopicTeam(details, 'herzsignal', { measured: false });
      await hub.click();
    }
    await checkTopicTeam(details, 'signale', { measured: mode !== 'no-js' });
    const signalPanel = page.locator('#projekt .signal-panel');
    assert.equal(await signalPanel.count(), 1, 'Both time series belong together');
    const signals = signalPanel.locator('.signal-figure');
    assert.equal(await signals.count(), 2);
    assert.deepEqual(await signals.locator('h2').allTextContents(), ['Atemsignal', 'EKG']);
    assert.deepEqual(await signals.locator('figcaption p').allTextContents(), ['Atembewegung per Smartphone', 'Herzsignal vom Polar H10']);
    assert.deepEqual(await signals.locator('.signal-rate').allTextContents(), ['Simuliert · 15 Atemzüge/min', 'Simuliert · 72 Schläge/min']);
    assert.equal(await signalPanel.locator('input, button').count(), 0);
    const [breathingPlot, ecgPlot] = await Promise.all((await signals.locator('.signal-drawing').all()).map(plot => plot.boundingBox()));
    assert.ok(breathingPlot.y + breathingPlot.height <= ecgPlot.y && Math.abs(breathingPlot.x - ecgPlot.x) < 1 &&
      Math.abs(breathingPlot.width - ecgPlot.width) < 1, 'Both plots must stack with aligned edges');
    if (mode === 'no-js') await page.emulateMedia({ reducedMotion: 'no-preference' });
    const wave = map.locator('.map-ecg-wave');
    const pauseOptions = page.locator('label').filter({
      hasText: /Bewegung der Karte pausieren|Animationen pausieren|Pause map motion|Pause animations/i,
    });
    assert.equal(await pauseOptions.count(), 0, 'The site must omit animation pause options');
    assert.equal(await map.evaluate(el => el.getAnimations().length), 0);
    assert.equal(await map.evaluate(el => el.getAnimations({ subtree: true }).length), 0);
    assert.ok(await wave.isHidden());
    for (const figure of await signals.all()) {
      const channel = await figure.evaluate(el => el.classList.contains('signal-resp') ? 'signal-resp' : 'signal-ecg');
      const organ = map.locator('.' + channel + ' .organ-motion');
      assert.ok(await organ.isVisible());
      const strip = figure.locator('.signal-trace');
      assert.ok(await strip.evaluate(g => g.getBBox().width >= 880 && g.getBBox().height > 40),
        'A full simulated trace must load even with motion or JavaScript disabled');
      assert.equal(await strip.evaluate(g => g.getAnimations().length), 0);
      assert.equal(await organ.evaluate(svg => svg.getAnimations({ subtree: true }).length), 0);
    }
    if (mode === 'no-js') {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await details.locator('.fallback-close').click();
    } else await details.locator('button.close-topic').press('Enter');
    const stages = milestones.getByRole('listitem');
    assert.equal(await stages.count(), 5);
    for (const [index, stage] of (await stages.all()).entries()) {
      const completed = index < 2;
      const status = stage.getByRole('checkbox', { name: completed ? 'Abgeschlossen' : 'Geplant', exact: true });
      assert.equal(await status.isChecked(), completed);
      assert.ok(await status.isDisabled(), 'Milestone progress is read-only');
      const card = await stage.locator('.milestone-card').boundingBox();
      const mark = await status.boundingBox();
      const heading = await stage.getByRole('heading').boundingBox();
      assert.ok(mark.width >= 44 && mark.height >= 44 && mark.y > card.y &&
        mark.y + mark.height <= heading.y && mark.x + mark.width < card.x + card.width &&
        mark.x > card.x + card.width / 2, 'Each card needs a large status checkbox at the upper right');
      assert.equal(await stage.getByRole('img', { name: /.+/ }).count(), 1,
        'Each milestone needs one named illustration');
      const drawing = stage.locator('.milestone-figure');
      assert.ok(await drawing.isVisible());
      assert.equal(await drawing.evaluate(svg => svg.getAnimations({ subtree: true }).length), 0,
        'Reduced motion must show a still illustration');
    }
    assert.equal(await stages.nth(2).getByRole('link', { name: 'Go Direct Spirometer von Vernier' }).getAttribute('href'),
      'https://www.vernier.com/product/go-direct-spirometer/');
    if (width === 1440 && mode === 'default') {
      assert.equal(await page.locator('a[href$=".blend"]').count(), 0);
      assert.deepEqual(await stages.nth(2).locator('.validation-phone text').allTextContents(),
        ['Smartphone', 'Polar H10', 'Spirometer']);
      const film = stages.nth(2).getByRole('link', { name: 'Animation ansehen', exact: true });
      assert.equal(await film.count(), 1, 'The synchronized film must be available from the validation card');
      const video = await page.request.get(new URL(await film.getAttribute('href'), url).href);
      assert.equal(video.status(), 200);
      assert.match(video.headers()['content-type'], /^video\/mp4/);
      assert.equal((await video.body()).toString('ascii', 4, 8), 'ftyp');
    }
    if (mode === 'dark') assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    if (mode === 'spacing') {
      await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-block-end: 2em !important; }' });
      await hub.press('Space');
      await checkTopicTeam(details, 'signale');
      await details.locator('button.close-topic').press('Enter');
    }
    if (mode === 'large-text') {
      await page.evaluate(() => {
        const elements = [...document.querySelectorAll('a, button, p, h1, h2, h3, figcaption, .milestone-status, .milestone-phase, .menu-switch, .topic-person-name')];
        const sizes = elements.map(element => Number.parseFloat(getComputedStyle(element).fontSize));
        elements.forEach((element, index) => { element.style.fontSize = `${sizes[index] * 2}px`; });
      });
      const picker = page.getByRole('combobox', { name: 'Thema auswählen' });
      await picker.waitFor({ state: 'visible' });
      await picker.selectOption('atemsignal');
      assert.ok(await page.locator('#atemsignal').isVisible());
      assert.ok(await page.locator('#herzsignal').isHidden());
      await checkTopicTeam(details, 'atemsignal');
      await details.locator('button.close-topic').press('Enter');
    }
    const phaseLabels = milestones.getByText('Phase', { exact: true });
    assert.equal(await phaseLabels.count(), 4, 'Every gap between timeline cards needs a Phase label');
    const cards = milestones.locator('.knowledge-box');
    for (const [index, phase] of (await phaseLabels.all()).entries()) {
      const label = await phase.boundingBox();
      const previous = await cards.nth(index).boundingBox();
      const next = await cards.nth(index + 1).boundingBox();
      assert.ok(label && previous.y + previous.height < label.y && label.y + label.height < next.y,
        'The Phase label must sit between the cards');
    }
    await checkNavigation(page, phone);
    if (mode === 'default' && (width === 1440 || (name === 'webkit' && width === 390))) {
      const scrollBehavior = () => page.locator('html').evaluate(root => getComputedStyle(root).scrollBehavior);
      assert.equal(await scrollBehavior(), 'auto');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForFunction(() => matchMedia('(prefers-reduced-motion: no-preference)').matches);
      await page.waitForFunction(() => getComputedStyle(document.documentElement).scrollBehavior === 'smooth');
      await map.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await wave.waitFor({ state: 'visible' });
      const ecgNode = map.locator('button.signal-ecg');
      const icon = await ecgNode.locator('.map-icon').boundingBox();
      await page.mouse.click(icon.x + icon.width / 2, icon.y + icon.height / 2);
      assert.ok(await page.locator('#herzsignal').isVisible());
      assert.ok(await page.locator('#atemsignal').isHidden());
      await map.locator('.map-wheel').evaluate(async wheel => {
        await Promise.all(wheel.getAnimations().map(a => a.finished));
        const matrix = new DOMMatrix(getComputedStyle(wheel).transform);
        if (Math.abs(matrix.b) < .1) throw Error('Choosing ECG must turn the cloud toward its detail');
        const node = wheel.querySelector('button.signal-ecg');
        const labelRotation = parseFloat(getComputedStyle(node).rotate) * Math.PI / 180;
        if (Math.cos(Math.atan2(matrix.b, matrix.a) + labelRotation) < .999)
          throw Error('The node labels must remain upright as the cloud turns');
      });
      await details.locator('button.close-topic').press('Enter');
      await hub.press('Enter');
      await map.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.waitForFunction(el => el.getAnimations()[0]?.playState === 'running', await map.elementHandle());
      await checkMapMotion(map);
      for (const figure of await signals.all()) {
        await figure.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
        const strip = await figure.locator('.signal-trace').elementHandle();
        await page.waitForFunction(g => g.getAnimations()[0]?.playState === 'running', strip);
        const channel = await figure.evaluate(el => el.classList.contains('signal-resp') ? 'signal-resp' : 'signal-ecg');
        const organ = map.locator('.' + channel + ' .organ-motion');
        await page.waitForFunction(g => g.getAnimations()[0]?.playState === 'running', await organ.elementHandle());
        const expandedAt = await figure.evaluate(el => el.classList.contains('signal-resp') ? .082 : .0316);
        const organWidths = await organ.evaluate(async (g, peak) => {
          const animation = g.getAnimations()[0];
          const trace = document.querySelector('.signal-figure.' + (g.closest('.signal-resp') ? 'signal-resp' : 'signal-ecg') + ' .signal-trace').getAnimations()[0];
          if (Math.abs(animation.startTime - trace.startTime) > 1 || animation.effect.getTiming().duration !== trace.effect.getTiming().duration)
            throw Error('The organ and trace must share their playback timing');
          animation.pause();
          await animation.ready;
          animation.currentTime = 0;
          const rest = g.getBoundingClientRect().width;
          animation.currentTime = peak * animation.effect.getTiming().duration;
          return [rest, g.getBoundingClientRect().width];
        }, expandedAt);
        assert.ok(organWidths[1] > organWidths[0] * 1.1, 'The lungs and heart must expand at their respective signal peaks');
        // Hold the actual endpoint so the second copy, before wraparound, is visible.
        await strip.evaluate(async g => {
          const animation = g.getAnimations()[0];
          animation.pause();
          await animation.ready;
          const effect = animation.effect;
          if (effect.getTiming().iterations !== Infinity) throw new Error('Signal must loop continuously');
          effect.updateTiming({ iterations: 1, fill: 'both' });
        });
        const seek = async cycles => {
          await strip.evaluate((g, offset) => {
            const animation = g.getAnimations()[0];
            animation.currentTime = animation.effect.getTiming().duration * offset;
          }, cycles);
        };
        const copies = figure.locator('.signal-trace use');
        assert.equal(await copies.first().getAttribute('href'), await copies.last().getAttribute('href'));
        const plotOffset = copy => copy.evaluate(el => {
          const r = el.getBoundingClientRect(), plot = el.closest('.signal-drawing').getBoundingClientRect();
          return { x: r.x - plot.x, y: r.y - plot.y };
        });
        await seek(0);
        const start = await plotOffset(copies.first());
        await seek(0.25);
        assert.ok((await plotOffset(copies.first())).x < start.x - 10, 'Samples must scroll left');
        await seek(1);
        const end = await plotOffset(copies.last());
        assert.ok(Math.abs(end.x - start.x) < 0.5 && Math.abs(end.y - start.y) < 0.5,
          'The second copy must align with the first at the loop boundary');
      }
      await details.locator('button.close-topic').press('Enter');
      for (const stage of await stages.all()) {
        const drawing = stage.locator('.milestone-figure');
        await drawing.evaluate(svg => svg.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await page.waitForFunction(svg => {
          const animations = svg.getAnimations({ subtree: true });
          return animations.length > 0 && animations.every(animation => animation.playState === 'running' &&
            animation.effect.getTiming().iterations === Infinity);
        },
          await drawing.elementHandle());
        // Seek past the initial cycle and check that the browser keeps advancing.
        await drawing.evaluate(svg => {
          for (const animation of svg.getAnimations({ subtree: true })) {
            const { delay, duration } = animation.effect.getTiming();
            animation.currentTime = delay + duration * 2;
          }
        });
        await page.waitForFunction(svg => {
          const animations = svg.getAnimations({ subtree: true });
          return animations.length > 0 && animations.every(animation => {
            const { currentIteration, progress } = animation.effect.getComputedTiming();
            return currentIteration >= 2 && progress > 0;
          });
        }, await drawing.elementHandle());
        if (await drawing.evaluate(svg => svg.matches('.h10-transfer'))) await checkBluetoothBelt(drawing);
        if (await drawing.locator('.breathing-rig').count()) await checkBreathingPhases(drawing);
        if (await drawing.evaluate(svg => svg.matches('.validation-phone'))) await checkValidationBreath(drawing);
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    }
    await checkLayout(page);
    const validation = stages.nth(2).locator('.validation-phone');
    const streams = await validation.locator('.trace').evaluateAll(paths => paths.map(path => {
      const label = path.parentElement.parentElement.querySelector('.plot-label');
      return {
        color: getComputedStyle(path).stroke,
        pattern: getComputedStyle(path).strokeDasharray,
        labelColor: getComputedStyle(label).fill,
        labelFits: label.getBoundingClientRect().bottom < path.getBoundingClientRect().top + 1,
      };
    }));
    assert.equal(streams.length, 3);
    assert.equal(new Set(streams.map(stream => stream.color)).size, 3, 'Each device needs a distinct trace color');
    assert.equal(new Set(streams.map(stream => stream.pattern)).size, 3, 'Each device needs a distinct line pattern');
    assert.ok(streams.every(stream => stream.labelFits && stream.labelColor === stream.color),
      'Each phone label must match its trace and leave the plot clear');
    const phoneShell = await validation.locator('.device-shell').boundingBox();
    const avatarEdge = await validation.locator('#validation-avatar-frame rect').evaluate(rect => {
      const group = document.querySelector('.validation-avatar');
      return new DOMPoint(rect.width.baseVal.value, 0).matrixTransform(group.getScreenCTM()).x;
    });
    assert.ok(avatarEdge < phoneShell.x, 'The unified breathing model must appear to the left of the phone');
    assert.deepEqual(await buildingBlocks.locator('[data-measure]').evaluateAll(elements => elements
      .filter(element => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)
      .map(element => element.textContent.trim())), [], 'Research text must fit inside its boxes');
    if (mode !== 'no-js') {
      const stageText = milestones.locator('[data-measure]:visible');
      assert.equal(await stageText.locator('xpath=self::*[@data-measured-lines]').count(), await stageText.count());
    }
    const prefix = `${screenshots}/${name}-${width}x${height}-${mode}`;
    await page.screenshot({ path: `${prefix}.png`, fullPage: true });
    const language = navigation.getByRole('switch', { name: 'Website auf Englisch', checked: false });
    const theme = navigation.getByRole('switch', { name: 'Dunkelmodus', checked: mode === 'dark' });
    if (mode === 'no-js') {
      assert.equal(await page.getByRole('switch').count(), 0);
    } else {
      assert.equal(await language.count(), 1, 'The menu must expose a language switch with German selected');
      assert.equal(await theme.count(), 1, 'The theme switch must reflect the system theme');
      for (const control of [language, theme]) {
        const target = await control.boundingBox();
        assert.ok(target.width >= 44 && target.height >= 44, 'Each switch needs a full touch target');
      }
      const languageLabels = navigation.locator('.menu-switch-track [data-measure]');
      assert.deepEqual(await languageLabels.allTextContents(), ['DE', 'EN']);
      assert.deepEqual(await languageLabels.evaluateAll(labels => labels.map(label => label.dataset.measuredLines)), ['1', '1']);
      const [deLabel, enLabel] = await Promise.all((await languageLabels.all()).map(label => label.boundingBox()));
      assert.ok(deLabel.x + deLabel.width + 4 <= enLabel.x, 'DE and EN need clear space between their letters');
      if (phone) {
        await language.tap();
      } else {
        await navigation.getByRole('link', { name: 'Team' }).focus();
        await page.keyboard.press('Tab');
        assert.ok(await theme.evaluate(control => control.matches(':focus-visible')));
        await page.keyboard.press('Tab');
        assert.ok(await language.evaluate(control => control.matches(':focus-visible')));
        await page.keyboard.press('Space');
      }
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      assert.equal(await pauseOptions.count(), 0, 'The English site must omit animation pause options');
      assert.match(await page.title(), /Open biosensing/i);
      assert.deepEqual(await sections.allTextContents(), ['Pulsraum', 'Foundations', 'Project timeline', 'Team']);
      const englishMenu = page.getByRole('navigation', { name: 'Main navigation' });
      const german = englishMenu.getByRole('switch', { name: 'Website in English', checked: true });
      assert.ok(await german.isVisible(), 'The switch must show English as selected');
      assert.ok(await englishMenu.getByRole('switch', { name: 'Dark mode', checked: mode === 'dark' }).isVisible());
      if (!phone) assert.equal(await german.evaluate(control => control.matches(':focus-visible')), true);
      const timeline = englishMenu.getByRole('link', { name: 'Project timeline' });
      assert.equal(await timeline.getAttribute('href'), '#projektverlauf');
      const englishStages = page.getByRole('region', { name: 'Project timeline' }).getByRole('listitem');
      assert.equal(await englishStages.getByRole('checkbox', { name: 'Completed', checked: true }).count(), 2);
      assert.equal(await englishStages.getByRole('checkbox', { name: 'Planned', checked: false }).count(), 3);
      assert.equal(await page.getByRole('link', { name: 'Vernier Go Direct Spirometer' }).count(), 1);
      assert.match(await page.locator('#h10-figure').textContent(), /ECG/);
      assert.deepEqual(await signals.locator('h2').allTextContents(), ['Breathing signal', 'ECG']);
      assert.deepEqual(await signals.locator('.signal-rate').allTextContents(), ['Simulated · 15 breaths/min', 'Simulated · 72 beats/min']);
      assert.equal(await page.getByRole('link', { name: 'Research profile' }).count(), 1);
      assert.equal(await kastrinogiannis.locator('.person-role').textContent(), 'Psychophysiology and immersive research');
      const leipzigEnglish = kastrinogiannis.getByRole('link', { name: 'Max Planck Institute for Human Cognitive and Brain Sciences' });
      assert.equal(await leipzigEnglish.locator('img').getAttribute('src'), 'assets/team/mpi-cbs-en.svg');
      await leipzigEnglish.locator('img').evaluate(image => image.decode());
      assert.ok(await kastrinogiannis.getByRole('link', { name: 'Google Scholar search' }).isVisible());
      assert.ok(await kastrinogiannis.getByText('Kastrinogiannis · Doctoral dissertation, University of Hamburg · 2025').isVisible());
      const institute = affiliations.getByRole('link', { name: 'Max Planck Institute for Human Development' });
      assert.equal(await institute.locator('img').getAttribute('src'), 'assets/team/mpib-en.svg');
      await institute.locator('img').evaluate(image => image.decode());
      assert.equal(await institute.getAttribute('href'), 'https://www.mpib-berlin.mpg.de/en');
      assert.equal(await institute.getAttribute('title'), 'Max Planck Institute for Human Development');
      assert.equal(await affiliations.getByRole('link', { name: 'University of Konstanz' })
        .getAttribute('href'), 'https://www.uni-konstanz.de/en/');
      const creative = page.locator('.idea-map').getByRole('button', { name: 'Creative biofeedback' });
      assert.equal(await creative.getAttribute('aria-controls'), 'kreatives-biofeedback');
      if (phone) await creative.tap();
      else await creative.press('Enter');
      assert.equal(await creative.getAttribute('aria-expanded'), 'true');
      assert.ok(await page.locator('#kreatives-biofeedback').isVisible());
      assert.equal(await page.locator('#kreatives-biofeedback h2').innerText(), 'Creative biofeedback');
      await checkTopicTeam(details, 'kreatives-biofeedback', { english: true });
      await page.evaluate(() => window.scrollTo(0, 0));
      await checkLayout(page);
      await page.screenshot({ path: `${prefix}-en.png`, fullPage: true });
      await page.reload({ waitUntil: 'networkidle' });
      assert.ok(await german.isVisible(), 'The language choice must survive a reload');
      if (phone) await german.tap();
      else await german.press('Space');
      assert.equal(await page.locator('html').getAttribute('lang'), 'de');
      assert.ok(await language.isVisible());
      assert.equal(await page.getByRole('link', { name: 'Go Direct Spirometer von Vernier' }).count(), 1);
    }
    if (mode === 'dark') {
      if (phone) await theme.tap();
      else await theme.press('Space');
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
      await page.reload({ waitUntil: 'networkidle' });
      const light = navigation.getByRole('switch', { name: 'Dunkelmodus', checked: false });
      assert.ok(await light.isVisible(), 'The theme choice must survive a reload');
      if (phone) await light.tap();
      else await light.press('Space');
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    }
    if (width === 1440) {
      const link = kastrinogiannis.getByRole('link', { name: 'Google Scholar-Suche' });
      const icon = link.locator('svg');
      const rest = await icon.evaluate(svg => getComputedStyle(svg).color);
      await link.hover();
      assert.notEqual(await icon.evaluate(svg => getComputedStyle(svg).color), rest, 'Profile icons must respond to hover');
      const paper = kastrinogiannis.getByRole('link', { name: 'DOI: 10.1111/psyp.70278' });
      const card = paper.locator('..');
      const background = await card.evaluate(box => getComputedStyle(box).backgroundColor);
      await paper.hover();
      assert.notEqual(await card.evaluate(box => getComputedStyle(box).backgroundColor), background,
        'Publication cards must respond to link hover');
      await link.focus();
      await page.keyboard.press('Tab');
      assert.equal(await kastrinogiannis.getByRole('link', { name: 'LinkedIn' })
        .evaluate(anchor => anchor.matches(':focus-visible')), true, 'Profile links need a visible keyboard focus state');
    }
    assert.deepEqual(failed, [], 'Website resources and scripts must load locally without errors');
    console.log(`${name} ${width}×${height} ${mode}: passed`);
  } finally {
    await page.close();
  }
}

await mkdir(screenshots, { recursive: true });
try {
  const browser = await chromium.launch();
  try {
    await checkOverviewAutoplay(browser);
    await checkPage(browser, 'chromium', 320, 568);
    await checkPage(browser, 'chromium', 390, 640);
    await checkPage(browser, 'chromium', 390, 932);
    await checkPage(browser, 'chromium', 480, 800);
    await checkPage(browser, 'chromium', 844, 390);
    await checkPage(browser, 'chromium', 900, 900);
    await checkPage(browser, 'chromium', 1440, 900);
    await checkPage(browser, 'chromium', 390, 844, 'spacing');
    await checkPage(browser, 'chromium', 390, 844, 'large-text');
    await checkPage(browser, 'chromium', 390, 844, 'no-js');
    await checkPage(browser, 'chromium', 390, 844, 'dark');
    await checkPage(browser, 'chromium', 1440, 900, 'dark');
  } finally {
    await browser.close();
  }
  const safari = await webkit.launch();
  try {
    await checkPage(safari, 'webkit', 390, 844);
    await checkPage(safari, 'webkit', 844, 390);
    await checkPage(safari, 'webkit', 390, 844, 'dark');
  } finally {
    await safari.close();
  }
} finally {
  server.close();
}
