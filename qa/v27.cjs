/* v2.7 验证：入口无闪现 / 后段长句清晰 / 手套光标 / 移动端惯性换段 */
const { chromium } = require('/Users/wangguanhang/.npm-global/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const errs = [];

  /* ---- 桌面 ---- */
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('c: ' + m.text()); });
  await page.goto('http://localhost:4321/', { waitUntil: 'domcontentloaded' });
  /* 入口割裂检查：boot 之前 h1 就应被剪裁隐藏（首绘即隐藏） */
  const early = await page.evaluate(() => {
    const f = document.querySelector('.press-fallback');
    const cs = getComputedStyle(f);
    return { clip: cs.clip, clipPath: cs.clipPath, w: cs.width, visible: cs.visibility };
  });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: 'qa/v27_entry.png' });

  /* 手套光标：移到页面中央 + 悬停导航链接 */
  await page.mouse.move(720, 450);
  await page.waitForTimeout(150);
  await page.screenshot({ path: 'qa/v27_cursor_idle.png', clip: { x: 600, y: 350, width: 240, height: 200 } });
  await page.mouse.move(1046, 32);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'qa/v27_cursor_hot.png', clip: { x: 940, y: 0, width: 220, height: 120 } });

  /* 后段长句：seg7 把模糊需求 / seg8 86·94·10/10，等补间完全咬合 */
  const pin = await page.evaluate(() => {
    const s = document.querySelector('.press');
    return s.offsetTop + s.offsetHeight - innerHeight;
  });
  for (const [seg, name] of [[7, 'q'], [8, 'f']]) {
    await page.evaluate((y) => window.scrollTo(0, y), pin * (seg - 0.4) / 9);
    await page.waitForTimeout(500);
    await page.evaluate((y) => window.scrollTo(0, y), pin * (seg + 0.3) / 9);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `qa/v27_seg${seg}.png` });
  }

  /* ---- 移动端：模拟惯性连跳（快速连滚三段），看最终是否清晰落定 ---- */
  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  m.on('pageerror', e => errs.push('M: ' + e.message));
  await m.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await m.waitForTimeout(2500);
  const mPin = await m.evaluate(() => {
    const s = document.querySelector('.press');
    return s.offsetTop + s.offsetHeight - innerHeight;
  });
  /* 快速连跳 seg0 → seg3（模拟大力滑动跨 3 段） */
  for (const f of [1.5, 2.5, 3.4]) {
    await m.evaluate((y) => window.scrollTo(0, y), mPin * f / 9);
    await m.waitForTimeout(90);
  }
  await m.waitForTimeout(700); // 防抖窗口后补间应已完成大半
  await m.screenshot({ path: 'qa/v27_m_chained.png' });
  await m.waitForTimeout(1200);
  await m.screenshot({ path: 'qa/v27_m_chained_settled.png' });
  /* 长句段（seg7）在 390px 的可读性 */
  await m.evaluate((y) => window.scrollTo(0, y), mPin * 7.3 / 9);
  await m.waitForTimeout(1600);
  await m.screenshot({ path: 'qa/v27_m_seg7.png' });

  console.log('early fallback:', JSON.stringify(early));
  console.log('ERRORS:', errs.length ? errs : 'none');
  await browser.close();
})();
