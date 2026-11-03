// Run with: node tests/screenshots.cjs (requires playwright-core and system Chrome).
// Deterministic reference fixture: no network and no curated puzzle API dependency.
const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const puzzle = '"0 3 3 2 1 2 2 0 0 3 0 0 3 0 2 0 2 2 0 0" "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 4 0 0 0 0"';
const sizes = [
  ['desktop-1440x900', 1440, 900, false],
  ['laptop-1366x768', 1366, 768, false],
  ['desktop-short-1440x400', 1440, 400, false],
  ['desktop-1920x1080', 1920, 1080, false],
  ['tablet-768x1024', 768, 1024, true],
  ['phone-390x844', 390, 844, true],
  ['phone-small-375x667', 375, 667, true],
  ['phone-narrow-320x568', 320, 568, true],
];
const output = path.resolve(__dirname, '../artifacts/screenshots');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', args: ['--no-sandbox']});
  const failures = [];
  try {
    for (const [name, width, height, stacked] of sizes) {
      let page;
      try {
      page = await browser.newPage({viewport: {width, height}, deviceScaleFactor: 1});
      // Stub the remote API; use the provided reference puzzle instead.
      await page.route('https://tonycongqianwang.github.io/**', route => route.abort());
      await page.goto('file://' + path.resolve(__dirname, '../index.html'));
      // Let the automatic startup fallback finish before importing the fixture.
      await page.waitForFunction(() => document.querySelectorAll('.cell').length > 0, {timeout: 5000});
      await page.locator('#puzzle').fill(puzzle);
      await page.locator('#load').click();
      await page.waitForFunction(() => document.querySelectorAll('.cell').length === 25);
      // Capture before checking; preserve screenshots even when a viewport fails.
      const metrics = await page.evaluate(() => ({
        viewportWidth: innerWidth, viewportHeight: innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        columns: getComputedStyle(document.querySelector('.layout')).gridTemplateColumns.split(' ').length,
        gameHeight: Math.ceil(document.querySelector('.game-panel').getBoundingClientRect().height),
        controlsHeight: Math.ceil(document.querySelector('.controls').getBoundingClientRect().height),
        boardWidth: document.querySelector('#board').getBoundingClientRect().width,
        titleToGridGap: Math.round(document.querySelector('#board').getBoundingClientRect().top -
          document.querySelector('.panel-head').getBoundingClientRect().bottom),
        gameTopPadding: Math.round(parseFloat(getComputedStyle(document.querySelector('.game-panel')).paddingTop)),
      }));
      await page.screenshot({path: path.join(output, name + '.png'), fullPage: true});
      // Centered overlay, disabled puzzle controls, and a working toggle.
      await page.locator('#stats-toggle').click();
      const overlay = await page.evaluate(() => {
        const board = document.querySelector('#board').getBoundingClientRect();
        const stats = document.querySelector('#statistics').getBoundingClientRect();
        const game = document.querySelector('.game-panel').getBoundingClientRect();
        const sidebar = document.querySelector('.controls').getBoundingClientRect();
        const center = r => ({x:(r.left+r.right)/2,y:(r.top+r.bottom)/2});
        const buttons = [...document.querySelectorAll('.actions button')];
        return {
          centerErrorX:Math.abs(center(board).x-center(stats).x),
          centerErrorY:Math.abs(center(board).y-center(stats).y),
          locked:buttons.slice(0,4).every(b=>b.disabled) && [...document.querySelectorAll('#pad button,#board button')].every(b=>b.disabled),
          panelBottomDelta:Math.abs(game.bottom-sidebar.bottom),
          buttonRows:[...new Set(buttons.map(b=>Math.round(b.getBoundingClientRect().top)))].map(y=>buttons.filter(b=>Math.abs(b.getBoundingClientRect().top-y)<2).length),
        };
      });
      await page.screenshot({path: path.join(output, name + '-stats.png'), fullPage: true});
      if (overlay.centerErrorX > 2 || overlay.centerErrorY > 2)
        failures.push(name + ': statistics overlay not centered on board (' +
          overlay.centerErrorX.toFixed(1) + ', ' + overlay.centerErrorY.toFixed(1) + 'px)');
      if (!overlay.locked) failures.push(name + ': gameplay remains interactive while statistics is open');
      if (!stacked && overlay.panelBottomDelta > 2)
        failures.push(name + ': outer panel bottoms differ by ' + overlay.panelBottomDelta.toFixed(1) + 'px');
      if (overlay.buttonRows.length===2 && overlay.buttonRows[1]===1 && overlay.buttonRows[0]===4)
        failures.push(name + ': ugly 4-1 gameplay button wrapping');
      await page.locator('#stats-toggle').click();
      const unlocked = await page.locator('#undo').isEnabled();
      if (!unlocked) failures.push(name + ': gameplay controls remain locked after hiding statistics');
      // Puzzle metadata must occupy the same space with or without an ID.
      const idLayout = await page.evaluate(() => {
        const panel = document.querySelector('.game-panel');
        const help = document.querySelector('#help-toggle');
        const size = () => ({
          height: panel.getBoundingClientRect().height,
          helpTop: help.getBoundingClientRect().top,
          helpLeft: help.getBoundingClientRect().left,
          idTop: document.querySelector('#puzzle-id').getBoundingClientRect().top,
        });
        const before = size();
        setPuzzleIdentity('v1:5:easy:reference');
        const withId = size();
        setPuzzleIdentity(null);
        return {before,withId};
      });
      if (Math.abs(idLayout.before.height-idLayout.withId.height)>1 ||
          Math.abs(idLayout.before.helpTop-idLayout.withId.helpTop)>1)
        failures.push(name + ': puzzle ID changes game panel height or help-link position');
      if (idLayout.withId.helpTop < idLayout.withId.idTop)
        failures.push(name + ': help link should appear directly below puzzle ID');
      // Reduced single-column spacing intentionally allows 22px top padding on narrow phones.
      if (stacked && (metrics.titleToGridGap < 32 || metrics.gameTopPadding < 22))
        failures.push(name + ': stacked game lacks intentional spacing (gap ' +
          metrics.titleToGridGap + 'px; top padding ' + metrics.gameTopPadding + 'px)');
      if (metrics.documentWidth > metrics.viewportWidth + 1)
        failures.push(name + ': horizontal overflow by ' + (metrics.documentWidth - metrics.viewportWidth) + 'px');
      if (!stacked && height >= 450 && metrics.documentHeight > metrics.viewportHeight + 1)
        failures.push(name + ': desktop vertical overflow by ' + (metrics.documentHeight - metrics.viewportHeight) +
          'px (game ' + metrics.gameHeight + 'px, controls ' + metrics.controlsHeight + 'px)');
      if (!stacked && height < 450 && (metrics.documentHeight <= height || metrics.boardWidth < 250))
        failures.push(name + ': short desktop viewport should scroll rather than shrink board below 250px');
      if (metrics.columns !== (stacked ? 1 : 2))
        failures.push(name + ': expected ' + (stacked ? 1 : 2) + ' columns, got ' + metrics.columns);
      if (name === 'desktop-1440x900') {
        // Exercise real browser load/undo flow with a mocked curated record.
        await page.evaluate(() => {
          setStatus('Ready to continue.');
          curatedApi=Promise.resolve({getPuzzleById:async()=>({
            size:5,difficulty:'easy',puzzle_id:'v1:5:easy:demo',
            clues:Array(20).fill(0),givens:Array(25).fill(0),
            canonical_solution:[1,2,3,4,5,2,3,4,5,1,3,4,5,1,2,4,5,1,2,3,5,1,2,3,4]
          })});
        });
        const beforeGrid=await page.locator('#board .cell').allTextContents();
        await page.locator('#puzzle').fill('v1:5:easy:demo');
        await page.locator('#load').click();
        await page.waitForFunction(() => document.querySelector('#load').textContent.startsWith('Undo load'));
        await page.locator('#load').click();
        const restored=await page.locator('#board .cell').allTextContents();
        if (JSON.stringify(beforeGrid)!==JSON.stringify(restored))
          failures.push(name + ': undo shared puzzle ID did not restore previous grid');
        const message=await page.locator('#status').innerText();
        if (!/Previous puzzle restored/.test(message) || /Loading shared/.test(message))
          failures.push(name + ': undo shared puzzle ID displays confusing loading status');
      }
      process.stdout.write(name + ': captured (' + JSON.stringify(metrics) + ')\n');
      } catch (err) {
        failures.push(name + ': capture failed: ' + err.message);
      } finally {
        if (page) await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(output, 'layout-results.json'), JSON.stringify({failures}, null, 2));
  if (failures.length) {
    console.error('Layout failures (' + failures.length + '):\n' + failures.join('\n'));
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
