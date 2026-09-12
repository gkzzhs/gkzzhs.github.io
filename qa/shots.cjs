const { chromium } = require('/Users/wangguanhang/.npm-global/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'qa/hero.png' });
  // scroll journey
  const H = await page.evaluate(() => document.body.scrollHeight);
  console.log('scrollHeight:', H);
  for (const [name, sel] of [['work', '#work'], ['evidence', '#evidence'], ['method', '#method'], ['timeline', '#timeline'], ['footer', '#contact']]) {
    await page.evaluate(s => document.querySelector(s)?.scrollIntoView(), sel);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `qa/${name}.png` });
  }
  // accordion test
  await page.evaluate(s => document.querySelector(s)?.scrollIntoView(), '#work');
  await page.waitForTimeout(800);
  await page.click('.index-row-head');
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'qa/case_open.png' });
  // dark mode
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => { localStorage.setItem('ryan-theme', 'dark'); document.documentElement.dataset.theme = 'dark'; });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'qa/dark_hero.png' });
  await page.evaluate(s => document.querySelector(s)?.scrollIntoView(), '#evidence');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'qa/dark_evidence.png' });
  // mobile
  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })).newPage();
  m.on('pageerror', e => errs.push('M: ' + e.message));
  await m.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await m.waitForTimeout(2200);
  await m.screenshot({ path: 'qa/m_hero.png' });
  const wide = await m.evaluate(() => document.body.scrollWidth);
  console.log('mobile scrollWidth:', wide);
  await m.evaluate(() => document.querySelector('#work')?.scrollIntoView());
  await m.waitForTimeout(1000);
  await m.screenshot({ path: 'qa/m_work.png' });
  await m.evaluate(() => document.querySelector('#contact')?.scrollIntoView());
  await m.waitForTimeout(1200);
  await m.screenshot({ path: 'qa/m_footer.png' });
  console.log('ERRORS:', errs.length ? errs : 'none');
  await browser.close();
})();
