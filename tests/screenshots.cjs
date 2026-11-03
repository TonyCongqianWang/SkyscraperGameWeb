// Run with: node tests/screenshots.cjs (requires playwright and Chromium).
// Deterministic reference fixture: no network and no curated puzzle API dependency.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const puzzle = '"0 3 3 2 1 2 2 0 0 3 0 0 3 0 2 0 2 2 0 0" "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 4 0 0 0 0"';
const sizes = [
  ['desktop-1440x900', 1440, 900, false],
  ['laptop-1366x768', 1366, 768, false],
  ['desktop-1920x1080', 1920, 1080, false],
  ['tablet-768x1024', 768, 1024, true],
  ['phone-390x844', 390, 844, true],
  ['phone-small-375x667', 375, 667, true],
  ['phone-narrow-320x568', 320, 568, true],
];
const output = path.resolve(__dirname, '../artifacts/screenshots');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({headless: true});
  try {
    for (const [name, width, height, stacked] of sizes) {
      const page = await browser.newPage({viewport: {width, height}, deviceScaleFactor: 1});
      // Stub the remote API; use the provided reference puzzle instead.
      await page.route('https://tonycongqianwang.github.io/**', route => route.abort());
      await page.goto('file://' + path.resolve(__dirname, '../index.html'));
      await page.locator('#puzzle').fill(puzzle);
      await page.locator('#load').click();
      await page.waitForFunction(() => document.querySelectorAll('.cell').length === 25);
      // Desktop should not scroll vertically; narrow/staked layouts can.
      const metrics = await page.evaluate(() => ({
        horizontal: document.documentElement.scrollWidth > innerWidth + 1,
        vertical: document.documentElement.scrollHeight > innerHeight + 1,
        columns: getComputedStyle(document.querySelector('.layout')).gridTemplateColumns.split(' ').length,
      }));
      assert.equal(metrics.horizontal, false, name + ': unexpected horizontal scroll');
      if (!stacked) assert.equal(metrics.vertical, false, name + ': unnecessary desktop vertical scroll');
      assert.equal(metrics.columns, stacked ? 1 : 2, name + ': incorrect column count');
      await page.screenshot({path: path.join(output, name + '.png'), fullPage: true});
      // Also capture the new statistics overlay.
      await page.locator('#stats-toggle').click();
      await page.screenshot({path: path.join(output, name + '-stats.png'), fullPage: true});
      await page.close();
      process.stdout.write(name + ': OK\n');
    }
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
