const { chromium } = require('/Users/wangguanhang/.npm-global/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('c: ' + m.text()); });
  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'qa/p_hero0.png' });
  // scroll through pin stages
  for (let i = 1; i <= 3; i++) {
    await page.evaluate((f) => window.scrollTo(0, document.querySelector('.press').offsetTop + document.querySelector('.press-stage').offsetHeight * f), i * 0.8);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `qa/p_hero${i}.png` });
  }
  // manifesto
  await page.evaluate(() => document.querySelector('#manifesto').scrollIntoView());
  await page.waitForTimeout(1700);
  await page.screenshot({ path: 'qa/p_manifesto.png' });
  // work hover flip
  await page.evaluate(() => document.querySelector('#work').scrollIntoView());
  await page.waitForTimeout(1500);
  await page.hover('.work-row-head');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'qa/p_work_flip.png' });
  // click open
  await page.click('.work-row-head');
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'qa/p_case.png' });
  // ticker
  await page.evaluate(() => document.querySelector('#evidence').scrollIntoView());
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'qa/p_ticker.png' });
  // footer
  await page.evaluate(() => document.querySelector('#contact').scrollIntoView());
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'qa/p_footer.png' });
  // mobile
  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  m.on('pageerror', e => errs.push('M: ' + e.message));
  await m.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await m.waitForTimeout(3000);
  await m.screenshot({ path: 'qa/p_m_hero.png' });
  console.log('scrollWidth:', await m.evaluate(() => document.body.scrollWidth));
  console.log('ERRORS:', errs.length ? errs : 'none');
  await browser.close();
})();
