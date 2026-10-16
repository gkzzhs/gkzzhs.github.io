/* gauges.cjs — 遥测仪表断言与截图
 * 断言：弧长比例 = value/max × 270°；双主题下 stroke 颜色跟随令牌；
 *       双语（/ 与 /en/）；reduced-motion 落终态；移动端无溢出；零报错。
 * 用无头模式跑（SVG 弧长/颜色/布局均与渲染模式无关）；
 * 唯一需要有头的是亚像素边框断言（见 qa/hairline.cjs 注释），不在此脚本内。
 */
const { chromium } = require('playwright');
const HEADLESS = true;
const C = 2 * Math.PI * 48;
const SWEEP = C * 0.75;

let fails = 0;
const check = (n, ok, x = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${x ? ' | ' + x : ''}`); if (!ok) fails++; };

async function probe(p, tag) {
  const r = await p.evaluate(({ C, SWEEP }) => {
    const out = [];
    for (const g of document.querySelectorAll('[data-gauge]')) {
      const arc = g.querySelector('.tlm-arc');
      const val = g.querySelector('[data-gauge-value]');
      const cs = getComputedStyle(arc);
      /* computed strokeDasharray 带 px 后缀（如 "194.53px, 301.59px"），
         取数值必须剥单位——首版直接用 Number() 得 NaN 是断言脚本的 bug */
      const da = cs.strokeDasharray.split(/[\s,]+/).map((s) => parseFloat(s)).filter((n) => Number.isFinite(n));
      const track = g.querySelector('.tlm-track');
      const trackDash = track ? getComputedStyle(track).strokeDasharray : 'none';
      out.push({
        value: Number(g.dataset.value),
        max: Number(g.dataset.max),
        suffix: g.dataset.suffix,
        dash: da[0],
        gap: da[1],
        stroke: cs.stroke,
        trackDash,
        text: val.textContent.trim(),
        label: g.querySelector('.tlm-label').textContent.trim(),
      });
    }
    return { gauges: out, scrollW: document.documentElement.scrollWidth, innerW: innerWidth, C, SWEEP };
  }, { C, SWEEP });

    for (const g of r.gauges) {
    const want = (g.value / g.max) * SWEEP;
    check(`${tag} ${g.label} 弧长 = value/max × 270°`, Math.abs(g.dash - want) < 1.5, `got ${g.dash.toFixed(1)} want ${want.toFixed(1)}`);
    /* 暗段（满量程）由独立 .tlm-track 整圈绘制，dasharray 的 gap 只是
       把剩余弧"留空"；正确性 = gap 覆盖剩余周长（track 在下面透出来） */
    check(`${tag} ${g.label} 剩余弧留空(露出 track)`, Math.abs(g.gap - r.C) < 1.5, `gap ${g.gap.toFixed(1)} vs 周长 ${r.C.toFixed(1)}`);
    check(`${tag} ${g.label} track 整圈无 dash`, g.trackDash === 'none' || g.trackDash === 'none 0px', g.trackDash);
    check(`${tag} ${g.label} 读数 = ${g.value}${g.suffix}`, g.text === `${g.value}${g.suffix}`, `got ${g.text}`);
  }
  check(`${tag} 无水平溢出`, r.scrollW <= r.innerW + 1, `${r.scrollW} vs ${r.innerW}`);
  return r;
}

(async () => {
  const browser = await chromium.launch({ headless: HEADLESS });
  const errs = [];

  /* ---- 双主题 × 双语 × DPR2 ---- */
  for (const path of ['/', '/en/']) {
    for (const scheme of ['dark', 'light']) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme });
      const p = await ctx.newPage();
      p.on('pageerror', (e) => errs.push(`${path}${scheme}: ${e.message}`));
      p.on('console', (m) => { if (m.type() === 'error') errs.push(`${path}${scheme} c: ${m.text()}`); });
      await p.goto(`http://localhost:4321${path}`, { waitUntil: 'networkidle' });
      await p.evaluate(() => document.querySelector('#evidence').scrollIntoView());
      await p.waitForTimeout(2400); /* 等 1.5s 动画落定 */
      const tag = `${path}${scheme === 'dark' ? '深' : '浅'}`;
      const r = await probe(p, tag);
      /* 主题色断言：深色下弧线应为白，浅色下为黑 */
      const ink = r.gauges[0]?.stroke || '';
      if (scheme === 'dark') check(`${tag} 弧线跟随深色令牌(白)`, /255,\s*255,\s*255/.test(ink), ink);
      else check(`${tag} 弧线跟随浅色令牌(黑)`, /^rgb\(0,\s*0,\s*0\)$/.test(ink), ink);
      await p.screenshot({ path: `qa/gauges/evidence-${path === '/' ? 'zh' : 'en'}-${scheme}.png` });
      await ctx.close();
    }
  }

  /* ---- 移动端 390 ---- */
  for (const scheme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(`m${scheme}: ${e.message}`));
    await p.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
    await p.evaluate(() => document.querySelector('#evidence').scrollIntoView());
    await p.waitForTimeout(2400);
    await probe(p, `390${scheme === 'dark' ? '深' : '浅'}`);
    await p.screenshot({ path: `qa/gauges/mobile-390-${scheme}.png` });
    await ctx.close();
  }

  /* ---- reduced-motion 落终态 ---- */
  const rc = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage();
  rp.on('pageerror', (e) => errs.push('rm: ' + e.message));
  await rp.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await rp.evaluate(() => document.querySelector('#evidence').scrollIntoView());
  await rp.waitForTimeout(700);
  await probe(rp, 'reduced');
  await rc.close();

  check('console/pageerror 全零', errs.length === 0, errs.join(' ; ').slice(0, 200) || '0');
  await browser.close();
  console.log(fails === 0 ? 'ALL PASS' : `FAILURES: ${fails}`);
  process.exit(fails ? 1 : 0);
})();
