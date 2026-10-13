/* typography-visual-lines.cjs — 精确视觉行检测
 * innerText 拿不到 CSS 自动折行的断点；用 Range.getClientRects 逐字符
 * 测量 top 变化重建真实视觉行，再查：孤字尾行 / 语义 token 跨行 / 行首标点。
 */
const { chromium } = require('playwright');

const SEL = [
  '.manifesto-pair',
  '.timeline-body',
  '.work-case .body-zh',
  '.work-actions li',
  '.flow-step',
  '.metric-note',
  '.disclosure .body-zh',
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
    await page.evaluate(() => { document.querySelectorAll('.work-row-head').forEach((h) => h.click()); });
    await page.waitForTimeout(400);

    const report = await page.evaluate((sel) => {
      /* 逐字符 Range 按 top 分组 → 视觉行 */
      function visualLines(el) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const chars = [];
        let node;
        while ((node = walker.nextNode())) {
          for (let i = 0; i < node.data.length; i++) {
            const r = document.createRange();
            r.setStart(node, i);
            r.setEnd(node, i + 1);
            const rect = r.getBoundingClientRect();
            if (rect.width || rect.height) chars.push({ ch: node.data[i], top: Math.round(rect.top), right: rect.right, left: rect.left });
          }
        }
        if (!chars.length) return [];
        const lines = [];
        let cur = [chars[0]];
        for (let i = 1; i < chars.length; i++) {
          if (chars[i].top !== cur[cur.length - 1].top) { lines.push(cur); cur = [chars[i]]; }
          else cur.push(chars[i]);
        }
        lines.push(cur);
        return lines.map((l) => ({ text: l.map((c) => c.ch).join('').trim(), left: Math.round(l[0].left) }));
      }

      const out = [];
      for (const el of document.querySelectorAll(sel)) {
        const lines = visualLines(el).filter((l) => l.text);
        if (lines.length < 2) continue;
        const label = (el.textContent || '').trim().slice(0, 14);
        const last = lines[lines.length - 1].text;
        /* A 孤字尾行：末行 ≤3 字符且是前行的语义尾巴（排除 label/value 结构布局：末行 left 与首行 left 差 < 8px 视为正文流） */
        const flowTail = Math.abs(lines[lines.length - 1].left - lines[0].left) < 8;
        if (flowTail && last.length <= 3) {
          out.push({ type: 'A 孤字尾行', label: label + '…', last, prev: lines[lines.length - 2].text.slice(-8) });
        }
        /* B token 跨行 */
        for (let i = 0; i < lines.length - 1; i++) {
          const tail = lines[i].text.slice(-8);
          const head = lines[i + 1].text.slice(0, 8);
          const j = tail + '\u0001' + head;
          for (const m of j.matchAll(/\d[\d./%×+–\u0001\s]*[\d%×s]/g)) {
            if (m[0].includes('\u0001')) out.push({ type: 'B token跨行', label: label + '…', frag: m[0].replace('\u0001', '⏎') });
          }
        }
        /* C 行首禁则标点：行以 ，。、；：？！」）等开头 */
        for (let i = 1; i < lines.length; i++) {
          if (/^[，。、；：？！）》】」』]/.test(lines[i].text)) {
            out.push({ type: 'C 行首标点', label: label + '…', head: lines[i].text.slice(0, 4) });
          }
        }
      }
      return out;
    }, SEL);

    console.log(`\n===== ${w}px 视觉行检测：${report.length} 个问题 =====`);
    report.forEach((r) => console.log(JSON.stringify(r)));
    await ctx.close();
  }
  await browser.close();
})();
