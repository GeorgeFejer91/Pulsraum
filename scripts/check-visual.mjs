import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { join } from 'node:path';
import { chromium, webkit } from 'playwright';

const site = process.argv[2] ?? '.';
const screenshots = process.env.PULSRAUM_VISUAL_DIR ?? '.for-ai-local/visual';
const contentTypes = { html: 'text/html', css: 'text/css', js: 'text/javascript', webp: 'image/webp', png: 'image/png', svg: 'image/svg+xml' };
const server = createServer(async (request, response) => {
  const pathname = request.url === '/' ? '/index.html' : request.url;
  if (!/^\/(?:index\.html|styles\.css|site\.js|theme\.js|assets\/pretext\/[\w/-]+\.js|assets\/illustrations\/(?:polar-h10\.webp|vernier-go-direct-spirometer\.svg)|assets\/team\/[\w-]+\.(?:webp|png))$/.test(pathname)) {
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
    for (const element of navigation.querySelectorAll('a')) {
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
        const elements = [...document.querySelectorAll('a, p, h1, h2, h3, figcaption')];
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
      assert.equal(await scrollBehavior(), 'smooth');
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
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    }
    await checkLayout(page);
    assert.deepEqual(await buildingBlocks.locator('[data-measure]').evaluateAll(elements => elements
      .filter(element => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)
      .map(element => element.textContent.trim())), [], 'Research text must fit inside its boxes');
    if (mode !== 'no-js') {
      const stageText = milestones.locator('[data-measure]:visible');
      assert.equal(await stageText.locator('xpath=self::*[@data-measured-lines]').count(), await stageText.count());
    }
    const prefix = `${screenshots}/${name}-${width}x${height}-${mode}`;
    await page.screenshot({ path: `${prefix}.png`, fullPage: true });
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
