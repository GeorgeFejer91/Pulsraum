import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { join } from 'node:path';
import { chromium, webkit } from 'playwright';

const site = process.argv[2] ?? '.';
const screenshots = process.env.PULSRAUM_VISUAL_DIR ?? '.for-ai-local/visual';
const contentTypes = { html: 'text/html', css: 'text/css', js: 'text/javascript', webp: 'image/webp' };
const server = createServer(async (request, response) => {
  const pathname = request.url === '/' ? '/index.html' : request.url;
  if (!/^\/(?:index\.html|styles\.css|site\.js|theme\.js|assets\/pretext\/[\w/-]+\.js|assets\/team\/[\w-]+\.webp)$/.test(pathname)) {
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
    const panel = document.querySelector('#anwendungen');
    const groups = panel.querySelector('.applications');
    const issues = [];
    for (const section of document.querySelectorAll('main > section')) {
      const boxes = [...section.querySelectorAll('.knowledge-box')];
      if (boxes.length < 2) issues.push(`${section.id} needs separate content boxes`);
      let previous;
      for (const box of boxes) {
        const label = box.querySelector('h2, h3, summary');
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
    for (const element of [document.documentElement, panel, groups, ...groups.querySelectorAll('summary')]) {
      if (element.scrollWidth > element.clientWidth + 1) issues.push(`${element.className || element.tagName} horizontal overflow`);
      if (element !== document.documentElement && element.scrollHeight > element.clientHeight + 1) {
        issues.push(`${element.className || element.tagName} internal vertical overflow`);
      }
    }
    for (const element of groups.querySelectorAll('summary [data-measure], details[open] p')) {
      const range = document.createRange();
      range.selectNodeContents(element);
      const text = range.getBoundingClientRect();
      const box = element.getBoundingClientRect();
      if (text.left < box.left - 1 || text.right > box.right + 1 || text.bottom > box.bottom + 1) {
        issues.push(`Text exceeds its box: ${element.textContent.trim()}`);
      }
    }
    const headingEnd = panel.querySelector('h2').lastChild;
    if (headingEnd.nodeType === Node.TEXT_NODE && /[.!?]$/.test(headingEnd.data)) {
      const range = document.createRange();
      range.setStart(headingEnd, headingEnd.length - 2);
      range.setEnd(headingEnd, headingEnd.length);
      if (range.getClientRects().length > 1) issues.push('Application heading ends with punctuation on its own line');
    }
    const [heading, body, note] = [...panel.children].map(element => element.getBoundingClientRect());
    if (heading.bottom > body.top || body.bottom > note.top) issues.push('Accordion groups overlap the heading or note');
    return issues;
  });
  assert.deepEqual(issues, []);
}

async function checkPage(browser, name, width, height, mode = 'default') {
  const page = await browser.newPage({
    viewport: { width, height },
    hasTouch: width <= 844,
    isMobile: width <= 844,
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
    assert.equal(await page.locator('main > section').count(), 4);
    const profiles = page.locator('#team .person');
    assert.ok(await profiles.count() >= 2, 'Each team member needs a profile box');
    for (const profile of await profiles.all()) {
      assert.equal(await profile.locator('h3').count(), 1);
      assert.ok(await profile.locator('.person-role').textContent());
      assert.ok(await profile.locator('a').count(), 'Each profile needs a relevant website');
    }
    for (const image of await page.locator('main img').all()) {
      await image.scrollIntoViewIfNeeded();
      assert.ok(await image.evaluate(element => element.complete && element.naturalWidth > 0), 'Published portraits must load');
    }
    const accordion = page.locator('#anwendungen');
    const summaries = accordion.locator('details > summary');
    assert.equal(await summaries.count(), 3, 'The three application areas must use native disclosures');
    assert.equal(await accordion.locator('details:first-child[open]').count(), 1);
    if (mode === 'dark') assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    if (mode === 'spacing') {
      await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-block-end: 2em !important; }' });
    }
    if (mode === 'large-text') {
      await page.evaluate(() => {
        const elements = [...document.querySelectorAll('a, p, h1, h2, h3, summary span, .figure-heading span, figcaption span')];
        const sizes = elements.map(element => Number.parseFloat(getComputedStyle(element).fontSize));
        elements.forEach((element, index) => { element.style.fontSize = `${sizes[index] * 2}px`; });
      });
    }
    if (mode !== 'no-js') {
      await page.locator('html[data-text-measurement="ready"]').waitFor({ state: 'attached' });
      if (name === 'chromium') await page.keyboard.press('Tab');
      else await page.locator('.skip-link').focus();
      assert.equal(await page.locator('.skip-link:focus-visible').count(), 1);
      const navigation = page.getByRole('navigation').getByRole('link');
      const anchors = ['#projekt', '#anwendungen', '#team', '#mitmachen'];
      assert.equal(await navigation.count(), anchors.length);
      for (const [index, anchor] of anchors.entries()) {
        const link = navigation.nth(index);
        await link.focus();
        await link.press('Enter');
        assert.equal(new URL(page.url()).hash, anchor);
      }
    }
    await checkLayout(page);
    const geometry = await accordion.evaluate(element => {
      const rows = [...element.querySelectorAll('summary')].map(summary => summary.getBoundingClientRect());
      const label = element.querySelector('summary span');
      return {
        rowGap: rows[2].top - rows[1].bottom,
        inset: label.getBoundingClientRect().left - rows[0].left,
        fontSize: Number.parseFloat(getComputedStyle(label).fontSize),
      };
    });
    const prefix = `${screenshots}/${name}-${width}x${height}-${mode}`;
    await page.screenshot({ path: `${prefix}.png`, fullPage: true });
    for (let index = 0; index < 3; index++) {
      const summary = summaries.nth(index);
      const details = summary.locator('..');
      const paragraph = details.locator('p');
      if (await details.getAttribute('open') === null) {
        if (index === 1 && width <= 844) await summary.tap();
        else await summary.press('Enter');
      }
      assert.ok(await paragraph.isVisible(), 'Every accordion description must be readable after activation');
      assert.equal(await accordion.locator('details[open]').count(), 1);
      if (mode !== 'no-js') {
        await paragraph.locator('xpath=self::*[@data-measured-lines]').waitFor({ state: 'attached' });
      }
      await checkLayout(page);
    }
    await accordion.screenshot({ path: `${prefix}-accordion.png` });
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
    return geometry;
  } finally {
    await page.close();
  }
}

await mkdir(screenshots, { recursive: true });
try {
  const browser = await chromium.launch();
  try {
    const narrow = await checkPage(browser, 'chromium', 320, 568);
    const short = await checkPage(browser, 'chromium', 390, 640);
    const tall = await checkPage(browser, 'chromium', 390, 932);
    await checkPage(browser, 'chromium', 480, 800);
    await checkPage(browser, 'chromium', 844, 390);
    const wide = await checkPage(browser, 'chromium', 1440, 900);
    assert.ok(tall.rowGap > short.rowGap, 'Accordion groups must separate as viewport height grows');
    assert.ok(wide.inset > narrow.inset && wide.fontSize > narrow.fontSize, 'Accordion insets and type must stretch when space permits');
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
