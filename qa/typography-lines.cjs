/* typography-lines.cjs — 中文排版实测（chinese-web-typography 技能第 2/3 条验证）
 * 在 390 / 768 / 1440 三宽度下，取中文正文块的实际渲染行（innerText 的 \n 即真实换行），
 * 检测三类问题：
 *   A 孤字尾行：段落最后一行 ≤2 个有效字符（中文排版大忌「一字成行」）
 *   B 语义 token 跨行：数字/分数/区间/版本号等被行边界切开
 *   C 水平溢出：块宽超出视口
 * 只报问题，不改东西——修什么由实际断行决定。
 */
const { chromium } = require('playwright');

const PROTECTED = /\d+\s*\/\s*\d+|\d+\s*[–-]\s*\d+|v\d+(\.\d+)*|SKILL\.md|\d+\s*%|\d+\s*×|\d+s[–-]\d+m|\d+\s*\+\s*\d+/g;
const SEL = [
  '.manifesto .giant',
  '.manifesto-pair',
  '.timeline-title',
  '.timeline-body',
  '.work-tagline',
  '.work-case .body-zh',
  '.work-actions li',
  '.work-result',
  '.method-principles .giant',
  '.flow-step',
  '.metric-note',
  '.disclosure .body-zh',
  '.footer .body-zh',
  'footer .body-zh',
].join(',');

(async () => {
  const browser = await chromium.launch();
  for (const w of [390, 768, 1440]) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: w === 390 ? 844 : 900 },
      ...(w === 390 ? { isMobile: true, hasTouch: true } : {}),
    });
    const page = await ctx.newPage();
    await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    /* 展开所有 work case 让详情文本全部进 DOM 可测 */
    await page.evaluate(() => {
      document.querySelectorAll('.work-row-head').forEach((h) => h.click());
    });
    await page.waitForTimeout(400);
    const issues = await page.evaluate((sel) => {
      const out = [];
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        const label = (el.textContent || '').trim().slice(0, 18);
        if (r.width && r.right > innerWidth + 1) {
          out.push({ type: 'C 溢出', label, w: Math.round(r.right - innerWidth) });
        }
        const text = el.innerText || '';
        if (!text || !/[\u4e00-\u9fff]/.test(text)) continue;
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) continue;
        const last = lines[lines.length - 1];
        const cjk = last.replace(/[，。、：；）】》·—%\d\sA-Za-z/×+≈–.]/g, '');
        if (cjk.length > 0 && cjk.length <= 2 && last.length <= 4) {
          out.push({ type: 'A 孤字尾行', label: label + '…', last: last });
        }
        /* token 跨行：把行尾尾段+下一行首段拼起来查保护模式 */
        for (let i = 0; i < lines.length - 1; i++) {
          const tail = lines[i].slice(-10);
          const head = lines[i + 1].slice(0, 10);
          const joined = tail + '\u0001' + head;
          for (const m of joined.matchAll(/\d[\d./%×+–\u0001\sm]*[\d%×]/g)) {
            if (m[0].includes('\u0001')) {
              out.push({ type: 'B token跨行', label: label + '…', frag: m[0].replace('\u0001', '⏎') });
            }
          }
        }
      }
      return out;
    }, SEL);
    console.log(`\n===== ${w}px：${issues.length} 个问题 =====`);
    for (const it of issues) console.log(JSON.stringify(it));
    await ctx.close();
  }
  await browser.close();
})();
