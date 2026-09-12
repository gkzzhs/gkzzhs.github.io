const { chromium } = require('/Users/wangguanhang/.npm-global/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  // evidence step C (86%)
  await page.evaluate(() => document.querySelectorAll('.evidence-step')[2].scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1800);
  await page.screenshot({ path: 'qa/evidence_c.png' });
  // evidence step F (disclosure)
  await page.evaluate(() => document.querySelectorAll('.evidence-step')[5].scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'qa/evidence_f.png' });
  // dark zh hero
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; localStorage.setItem('ryan-theme', 'dark'); window.dispatchEvent(new CustomEvent('ryan-theme-change')); });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1400);
  await page.screenshot({ path: 'qa/dark_hero.png' });
  // mobile after fixes
  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await m.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await m.waitForTimeout(2000);
  await m.screenshot({ path: 'qa/m_hero.png' });
  await m.evaluate(() => document.querySelector('#work')?.scrollIntoView());
  await m.waitForTimeout(900);
  await m.screenshot({ path: 'qa/m_work.png' });
  await browser.close();
  console.log('DONE');
})();
