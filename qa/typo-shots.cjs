const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const tag = process.argv[2];
  for (const w of [390, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, ...(w === 390 ? { isMobile: true, hasTouch: true } : {}) });
    const p = await ctx.newPage();
    await p.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    /* 触发 reveal + 展开一个 case 取中文密集区 */
    await p.evaluate(async () => {
      const h = document.body.scrollHeight;
      for (let y = 0; y < h; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); }
      scrollTo(0, 0); await new Promise(r => setTimeout(r, 300));
    });
    await p.evaluate(() => document.querySelector('#work').scrollIntoView());
    await p.waitForTimeout(600);
    await p.evaluate(() => document.querySelectorAll('.work-row-head')[1].click());
    await p.waitForTimeout(800);
    await p.screenshot({ path: `qa/typo/${tag}-${w}-work.png` });
    await p.evaluate(() => document.querySelector('#manifesto').scrollIntoView());
    await p.waitForTimeout(900);
    await p.screenshot({ path: `qa/typo/${tag}-${w}-manifesto.png` });
    await p.evaluate(() => document.querySelector('#evidence').scrollIntoView());
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `qa/typo/${tag}-${w}-evidence.png` });
    await ctx.close();
  }
  await browser.close();
  console.log('shots done:', tag);
})();
