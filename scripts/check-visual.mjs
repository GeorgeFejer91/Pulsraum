import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { join } from 'node:path';
import { chromium, webkit } from 'playwright';

const site = process.argv[2] ?? '.';
const screenshots = process.env.PULSRAUM_VISUAL_DIR ?? '.for-ai-local/visual';
const contentTypes = { html: 'text/html', css: 'text/css', js: 'text/javascript', webp: 'image/webp', png: 'image/png', svg: 'image/svg+xml', blend: 'application/octet-stream' };
const server = createServer(async (request, response) => {
  const pathname = request.url === '/' ? '/index.html' : request.url;
  if (!/^\/(?:index\.html|styles\.css|site\.js|theme\.js|assets\/pretext\/[\w/-]+\.js|assets\/models\/vernier-go-direct-spirometer\.blend|assets\/illustrations\/(?:polar-h10\.webp|vernier-go-direct-spirometer\.svg|spirometer-airflow\.webp|signals\.svg)|assets\/team\/[\w-]+\.(?:webp|png))$/.test(pathname)) {
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
      for (let i = 1; i < line.points.length; i++) {
        const a = line.points.getItem(i - 1), b = line.points.getItem(i);
        const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
        seek(x);
        const point = new DOMPoint().matrixTransform(cursor.getScreenCTM()).matrixTransform(plot.getScreenCTM().inverse());
        if (Math.abs(point.x - x) > .05 || Math.abs(point.y - y) > .05) throw Error('Cursor left the breath trace');
        if (getComputedStyle(waves).stroke !== ink || getComputedStyle(cursor).fill !== ink) throw Error('Breath phase color mismatch');
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

async function checkLayout(page) {
  const issues = await page.evaluate(() => {
    const issues = [];
    for (const section of document.querySelectorAll('main > section')) {
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
    if (navigation.scrollWidth > navigation.clientWidth + 1) issues.push('Navigation horizontal overflow');
    for (const element of navigation.querySelectorAll('a, button:not([hidden])')) {
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
    for (const image of await page.locator('main img').all()) {
      await image.scrollIntoViewIfNeeded();
      assert.ok(await image.evaluate(element => element.complete && element.naturalWidth > 0), 'Published portraits must load');
    }
    const buildingBlocks = page.getByRole('region', { name: 'Grundlagen' });
    assert.equal(await buildingBlocks.count(), 1, 'The project must include a named research section');
    assert.equal(await buildingBlocks.getByRole('article').count(), 3);
    assert.equal(await buildingBlocks.getByRole('link', { name: /SleepAp/ }).getAttribute('href'),
      'https://ieeexplore.ieee.org/document/6747332');
    const milestones = page.getByRole('region', { name: 'Projektverlauf' });
    const signals = page.locator('#projekt .signal-figure');
    assert.equal(await signals.count(), 2);
    if (mode === 'no-js') await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const figure of await signals.all()) {
      assert.match(await figure.locator('figcaption').innerText(), /Simuliert/);
      const strip = figure.locator('.signal-trace');
      assert.ok(await strip.evaluate(g => g.getBBox().width >= 880 && g.getBBox().height > 40),
        'A full simulated trace must load even with motion or JavaScript disabled');
      assert.equal(await strip.evaluate(g => g.getAnimations().length), 0);
      assert.equal(await figure.getByRole('checkbox').isVisible(), false);
    }
    if (mode === 'no-js') await page.emulateMedia({ reducedMotion: 'reduce' });
    const pause = milestones.getByRole('checkbox', { name: 'Animationen pausieren' });
    assert.equal(await pause.isVisible(), false);
    const stages = milestones.getByRole('listitem');
    assert.equal(await stages.count(), 5);
    for (const stage of await stages.all()) {
      assert.equal(await stage.getByRole('img', { name: /.+/ }).count(), 1,
        'Each milestone needs one named illustration');
      const drawing = stage.locator('svg');
      assert.ok(await drawing.isVisible());
      assert.equal(await drawing.evaluate(svg => svg.getAnimations({ subtree: true }).length), 0,
        'Reduced motion must show a still illustration');
    }
    assert.deepEqual(await stages.locator('.milestone-status').allTextContents(),
      ['✓ Abgeschlossen', '✓ Abgeschlossen', 'Geplant', 'Geplant', 'Geplant']);
    assert.equal(await stages.nth(2).getByRole('link', { name: 'Go Direct Spirometer von Vernier' }).getAttribute('href'),
      'https://www.vernier.com/product/go-direct-spirometer/');
    if (mode === 'dark') assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    if (mode === 'spacing') {
      await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-block-end: 2em !important; }' });
    }
    if (mode === 'large-text') {
      await page.evaluate(() => {
        const elements = [...document.querySelectorAll('a, button, p, h1, h2, h3, figcaption')];
        const sizes = elements.map(element => Number.parseFloat(getComputedStyle(element).fontSize));
        elements.forEach((element, index) => { element.style.fontSize = `${sizes[index] * 2}px`; });
      });
    }
    if (mode !== 'no-js') {
      await page.locator('html[data-text-measurement="ready"]').waitFor({ state: 'attached' });
      if (name === 'chromium') await page.keyboard.press('Tab');
      else await page.locator('.skip-link').focus();
      assert.equal(await page.locator('.skip-link:focus-visible').count(), 1);
    }
    await checkNavigation(page, phone);
    if (mode === 'default' && (width === 1440 || (name === 'webkit' && width === 390))) {
      const scrollBehavior = () => page.locator('html').evaluate(root => getComputedStyle(root).scrollBehavior);
      assert.equal(await scrollBehavior(), 'auto');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForFunction(() => matchMedia('(prefers-reduced-motion: no-preference)').matches);
      await page.waitForFunction(() => getComputedStyle(document.documentElement).scrollBehavior === 'smooth');
      for (const figure of await signals.all()) {
        await figure.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
        const strip = await figure.locator('.signal-trace').elementHandle();
        await page.waitForFunction(g => g.getAnimations()[0]?.playState === 'running', strip);
        const control = figure.getByRole('checkbox', { name: /Pause/ });
        if (phone) await control.tap();
        else await control.press('Space');
        await page.waitForFunction(g => g.getAnimations()[0]?.playState === 'paused', strip);
        // Hold the actual endpoint so the second copy, before wraparound, is visible.
        await strip.evaluate(g => {
          const effect = g.getAnimations()[0].effect;
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
        await seek(0);
        const start = await copies.first().boundingBox();
        await seek(0.25);
        assert.ok((await copies.first().boundingBox()).x < start.x - 10, 'Samples must scroll left');
        await seek(1);
        const end = await copies.last().boundingBox();
        assert.ok(Math.abs(end.x - start.x) < 0.5 && Math.abs(end.y - start.y) < 0.5,
          'The second copy must align with the first at the loop boundary');
        await strip.evaluate(g => g.getAnimations()[0].effect.updateTiming({ iterations: Infinity }));
        await control.press('Space');
        await page.waitForFunction(g => g.getAnimations()[0]?.playState === 'running', strip);
      }
      await pause.waitFor({ state: 'visible' });
      await pause.press('Space');
      assert.equal(await pause.isChecked(), true);
      const firstDrawing = stages.first().locator('svg');
      await firstDrawing.evaluate(svg => svg.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await stages.first().locator('svg.in-view').waitFor();
      assert.equal(await firstDrawing.evaluate(svg => svg.getAnimations({ subtree: true }).length), 0);
      if (phone) await pause.tap();
      else await pause.press('Space');
      assert.equal(await pause.isChecked(), false);
      for (const stage of await stages.all()) {
        const drawing = stage.locator('svg');
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
        if (await drawing.locator('.breathing-rig').count()) await checkBreathingPhases(drawing);
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    }
    await checkLayout(page);
    const validation = stages.nth(2).locator('.validation-phone');
    const streams = await validation.locator('.trace').evaluateAll(paths => paths.map(path => {
      const label = path.parentElement.querySelector('.plot-label');
      return {
        color: getComputedStyle(path).stroke,
        pattern: getComputedStyle(path).strokeDasharray,
        labelColor: getComputedStyle(label).fill,
        labelFits: label.getBoundingClientRect().right < path.getBoundingClientRect().left,
      };
    }));
    assert.equal(streams.length, 3);
    assert.equal(new Set(streams.map(stream => stream.color)).size, 3, 'Each device needs a distinct trace color');
    assert.equal(new Set(streams.map(stream => stream.pattern)).size, 3, 'Each device needs a distinct line pattern');
    assert.ok(streams.every(stream => stream.labelFits && stream.labelColor === stream.color),
      'Each label must match its trace and leave the plot clear');
    const phoneShell = await validation.locator('.device-shell').boundingBox();
    const spirometerLeft = await validation.locator('.spirometer-art').evaluate(g => g.getScreenCTM().e);
    assert.ok(spirometerLeft > phoneShell.x + phoneShell.width, 'The spirometer belongs to the right of the phone');
    assert.deepEqual(await buildingBlocks.locator('[data-measure]').evaluateAll(elements => elements
      .filter(element => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)
      .map(element => element.textContent.trim())), [], 'Research text must fit inside its boxes');
    if (mode !== 'no-js') {
      const stageText = milestones.locator('[data-measure]:visible');
      assert.equal(await stageText.locator('xpath=self::*[@data-measured-lines]').count(), await stageText.count());
    }
    const prefix = `${screenshots}/${name}-${width}x${height}-${mode}`;
    await page.screenshot({ path: `${prefix}.png`, fullPage: true });
    const language = navigation.getByRole('button', { name: 'English', exact: true });
    if (mode === 'no-js') {
      assert.equal(await language.isVisible(), false);
    } else {
      assert.ok(await language.isVisible(), 'The menu must offer the English version');
      const target = await language.boundingBox();
      assert.ok(target.width >= 44 && target.height >= 44, 'Language switch needs a full touch target');
      if (phone) await language.tap();
      else await language.press('Enter');
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      assert.match(await page.title(), /Open biosensing/i);
      assert.deepEqual(await sections.allTextContents(), ['Pulsraum', 'Foundations', 'Project timeline', 'Team']);
      const englishMenu = page.getByRole('navigation', { name: 'Main navigation' });
      const german = englishMenu.getByRole('button', { name: 'Deutsch', exact: true });
      assert.equal(await german.getAttribute('lang'), 'de');
      if (!phone) assert.equal(await german.evaluate(button => button.matches(':focus-visible')), true);
      const timeline = englishMenu.getByRole('link', { name: 'Project timeline' });
      assert.equal(await timeline.getAttribute('href'), '#projektverlauf');
      const englishStages = page.getByRole('region', { name: 'Project timeline' }).getByRole('listitem');
      assert.match(await englishStages.first().innerText(), /Completed/);
      assert.match(await englishStages.nth(2).innerText(), /Planned/);
      assert.equal(await page.getByRole('link', { name: 'Vernier Go Direct Spirometer' }).count(), 1);
      assert.match(await page.locator('#h10-figure').textContent(), /ECG/);
      assert.equal(await page.getByRole('link', { name: 'Research profile' }).count(), 1);
      await checkLayout(page);
      await page.screenshot({ path: `${prefix}-en.png`, fullPage: true });
      await page.reload({ waitUntil: 'networkidle' });
      assert.ok(await german.isVisible(), 'The language choice must survive a reload');
      await german.press('Enter');
      assert.equal(await page.locator('html').getAttribute('lang'), 'de');
      assert.ok(await language.isVisible());
      assert.equal(await page.getByRole('link', { name: 'Go Direct Spirometer von Vernier' }).count(), 1);
    }
    if (mode === 'dark') {
      const toggle = page.getByRole('button', { name: 'Dunkelmodus' });
      assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
      await toggle.press('Enter');
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
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
    await checkPage(browser, 'chromium', 320, 568);
    await checkPage(browser, 'chromium', 390, 640);
    await checkPage(browser, 'chromium', 390, 932);
    await checkPage(browser, 'chromium', 480, 800);
    await checkPage(browser, 'chromium', 844, 390);
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
