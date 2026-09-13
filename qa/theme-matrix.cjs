/* 主题矩阵测试：
   1) 生效类正确（auto 跟随系统 / storage 优先于系统）
   2) 切换循环 + 持久化 + 跟随系统实时换装
   3) 双主题 × 双视口 全页截图（人审对比度）
   4) 粒子画布浅色配色 / work 反色在浅色下反到深色
   5) 无闪变：storage=light 时首绘即白底 */
const { chromium } = require('/Users/wangguanhang/.npm-global/lib/node_modules/playwright');
const OUT = 'qa/theme/';
(async () => {
  const browser = await chromium.launch();
  const fails = [];
  const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails.push(name); };

  const newPage = async (opts) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
    const p = await ctx.newPage();
    p.on('pageerror', e => fails.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') fails.push('console: ' + m.text()); });
    return { ctx, p };
  };
  const isLight = (p) => p.evaluate(() => document.documentElement.classList.contains('light'));
  const bg = (p) => p.evaluate(() => getComputedStyle(document.body).backgroundColor);

  /* ---- A: auto + 系统深色 → 深 ---- */
  let { ctx, p } = await newPage({ colorScheme: 'dark' });
  await p.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  check('A auto+dark 系统生效为深色', !(await isLight(p)), `bg=${await bg(p)}`);

  /* 跟随系统实时换装：切到浅色，不重载 */
  await p.emulateMedia({ colorScheme: 'light' });
  await p.waitForTimeout(200);
  check('A auto 跟随系统实时切浅', await isLight(p), `bg=${await bg(p)}`);
  /* 切回深色 */
  await p.emulateMedia({ colorScheme: 'dark' });
  await p.waitForTimeout(200);
  check('A auto 跟随系统实时切回深', !(await isLight(p)));
  await ctx.close();

  /* ---- B: auto + 系统浅色 → 浅（默认访客路径之一） ---- */
  ({ ctx, p } = await newPage({ colorScheme: 'light' }));
  await p.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  check('B auto+light 系统生效为浅色', await isLight(p), `bg=${await bg(p)}`);

  /* 切换循环：跟随→深色→浅色→跟随，label 与存储随之变 */
  const label = () => p.evaluate(() => document.querySelector('[data-theme-toggle]').textContent.trim());
  await p.click('[data-theme-toggle]');           // auto → dark
  check('B 循环1 label=深色', (await label()) === '深色', `now=${await label()}`);
  check('B 循环1 生效深色', !(await isLight(p)));
  await p.click('[data-theme-toggle]');           // dark → light
  check('B 循环2 label=浅色', (await label()) === '浅色');
  check('B 循环2 生效浅色', await isLight(p));
  await p.click('[data-theme-toggle]');           // light → auto
  check('B 循环3 label=跟随', (await label()) === '跟随');
  check('B 循环3 回到跟随(系统浅→浅)', await isLight(p));

  /* 持久化：手动选深色后重载仍深（系统是浅） */
  await p.click('[data-theme-toggle]');           // → dark
  await p.reload({ waitUntil: 'networkidle' });
  check('B 持久化：storage=dark 重载仍深（系统浅）', !(await isLight(p)));
  await ctx.close();

  /* ---- C: storage=light + 系统深 → 浅（手动优先于系统） ---- */
  ({ ctx, p } = await newPage({ colorScheme: 'dark' }));
  await p.addInitScript(() => { try { localStorage.setItem('theme', 'light'); } catch {} });
  await p.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  check('C storage=light 压过系统深', await isLight(p));

  /* 无闪变：domcontentloaded 后立即查 body 底色（head 脚本已生效） */
  await p.goto('about:blank');
  await p.goto('http://localhost:4321/', { waitUntil: 'domcontentloaded' });
  const earlyBg = await bg(p);
  check('C 首绘即浅底（无黑闪）', earlyBg === 'rgb(255, 255, 255)', earlyBg);
  await ctx.close();

  /* ---- 全页截图矩阵 ---- */
  for (const scheme of ['dark', 'light']) {
    const d = await newPage({ colorScheme: scheme, viewport: { width: 1440, height: 900 } });
    await d.p.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
    await d.p.waitForTimeout(2500);
    await d.p.screenshot({ path: `${OUT}${scheme}-desktop-full.png`, fullPage: true });
    /* 粒子画布特写（浅色应为黑点白底） */
    await d.p.screenshot({ path: `${OUT}${scheme}-desktop-hero.png` });
    /* work 反色：浅色主题下 hover 应反到深色 */
    await d.p.evaluate(() => document.querySelector('#work').scrollIntoView());
    await d.p.waitForTimeout(1000);
    await d.p.hover('.work-row:nth-child(2) .work-name');
    await d.p.waitForTimeout(700);
    await d.p.screenshot({ path: `${OUT}${scheme}-desktop-work-flip.png` });
    await d.ctx.close();

    const m = await newPage({ colorScheme: scheme, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await m.p.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
    await m.p.waitForTimeout(2200);
    await m.p.screenshot({ path: `${OUT}${scheme}-mobile-full.png`, fullPage: true });
    await m.ctx.close();
  }

  console.log(fails.length ? 'FAILURES: ' + fails.join(' | ') : 'ALL PASS');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
