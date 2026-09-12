/* 换字补间验证：抓「起爆 → 飞行中 → 咬合后」三帧 + 报错收集 */
const { chromium } = require('/Users/wangguanhang/.npm-global/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('c: ' + m.text()); });
  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // 开场 morph（650ms 补间）+ 入场动画落定
  await page.screenshot({ path: 'qa/t_settle0.png' });

  const pin = await page.evaluate(() => {
    const s = document.querySelector('.press');
    return s.offsetTop + s.offsetHeight - innerHeight;
  });
  /* 停在 seg0 中段，等它彻底咬合 */
  await page.evaluate((y) => window.scrollTo(0, y), pin * 0.5 / 9);
  await page.waitForTimeout(1200);
  /* 跳进 seg1 → 触发 morph，抓飞行中帧与咬合帧 */
  await page.evaluate((y) => window.scrollTo(0, y), pin * 1.5 / 9);
  await page.waitForTimeout(260);
  await page.screenshot({ path: 'qa/t_mid.png' });
  await page.waitForTimeout(1400); // 650ms 补间 + 余量
  await page.screenshot({ path: 'qa/t_settled.png' });
  console.log('pin distance:', pin, 'ERRORS:', errs.length ? errs : 'none');
  await browser.close();
})();
