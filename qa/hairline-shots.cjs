/* hairline-shots.cjs — 视觉证据
 * 1) DPR2：.work-row 第一条分割线 clip 截图 before（注入 border-width:1px）/ after（撤除），
 *    sips ×8 放大供人工比对
 * 2）DPR1：全页 before/after，字节级一致断言
 */
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const CHROME = '/Users/ryan/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const DIR = 'qa/hairline';

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const browser = await chromium.launch({ headless: false, executablePath: CHROME });

  /* ---- DPR2 clip：work 第一条分割线 ---- */
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const p2 = await ctx2.newPage();
  await p2.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await p2.evaluate(() => document.querySelector('#work').scrollIntoView());
  await p2.waitForTimeout(1200);

  /* 锁定 .work-list 上边框（第一条分割线）的页面坐标 */
  const rect = await p2.evaluate(() => {
    const el = document.querySelector('.work-list');
    const r = el.getBoundingClientRect();
    return { x: Math.max(80, r.left + 40), y: r.top - 6, w: 600, h: 14 };
  });
  const clip = { x: rect.x, y: rect.y, width: rect.w, height: rect.h };

  /* before：注入 1px */
  await p2.addStyleTag({ content: '.work-list{border-top-width:1px !important}' });
  await p2.waitForTimeout(150);
  await p2.screenshot({ path: `${DIR}/dpr2-workline-before.png`, clip });
  /* after：撤除注入（移除该 style 标签） */
  await p2.evaluate(() => document.querySelectorAll('style').forEach(s => { if (s.textContent.includes('border-top-width:1px !important')) s.remove(); }));
  await p2.waitForTimeout(150);
  await p2.screenshot({ path: `${DIR}/dpr2-workline-after.png`, clip });
  await ctx2.close();

  /* ×8 放大 */
  for (const f of ['dpr2-workline-before.png', 'dpr2-workline-after.png']) {
    execSync(`sips -z 112 4800 ${DIR}/${f} --out ${DIR}/zoom8x-${f} >/dev/null 2>&1`);
  }

  /* ---- DPR1 全页 before/after 字节级断言 ---- */
  const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const p1 = await ctx1.newPage();
  await p1.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  /* 触发所有 reveal，两帧状态一致 */
  await p1.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); }
    scrollTo(0, 0);
  });
  await p1.waitForTimeout(1200);
  await p1.addStyleTag({ content: '.work-list,.work-row,.section-head,.timeline-item,.metric-row,.work-chip,.tag,.nav{border-width:1px !important}' });
  await p1.waitForTimeout(150);
  await p1.screenshot({ path: `${DIR}/dpr1-full-before.png`, fullPage: true });
  await p1.evaluate(() => document.querySelectorAll('style').forEach(s => { if (s.textContent.includes('border-width:1px !important')) s.remove(); }));
  await p1.waitForTimeout(150);
  await p1.screenshot({ path: `${DIR}/dpr1-full-after.png`, fullPage: true });
  await ctx1.close();
  await browser.close();

  const b = fs.readFileSync(`${DIR}/dpr1-full-before.png`);
  const a = fs.readFileSync(`${DIR}/dpr1-full-after.png`);
  const same = b.equals(a);
  console.log('DPR1 fullpage byte-identical:', same ? 'YES' : `NO (before ${b.length}B vs after ${a.length}B)`);
  console.log('files:', fs.readdirSync(DIR).join(', '));
  process.exit(same ? 0 : 1);
})();
