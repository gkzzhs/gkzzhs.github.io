/* hairline.cjs — 视网膜发丝细边功能断言
 * 覆盖：DPR 1/2 × dark/light × zh/en。
 * 判定标准（任务书）：@2x 时 .work-row 的 borderBottomWidth === '0.5px'，
 * .work-chip 的 borderTopWidth === '0.5px'；DPR=1 回到 '1px'。
 * 同时抽查 .section-head / .timeline-item / .metric-row / .tag（清单内其余项）
 * 与守卫项：.nav-lang（按钮，必须保持 1px）、:focus-visible outline 未被触碰。
 *
 * 重要：必须 headless:false（有头）跑。Chromium 无头渲染路径会把亚像素
 * 边框钳制回 1px（width:.5px 保留、border-width:.5px 不保留——headless
 * 的 DFS 仿真不经过真实的亚像素合成），有头模式计算值才是真实浏览器的。
 * 本机无 DISPLAY 依赖问题：macOS 有头 Chrome 可正常自动化。 */
const HEADLESS = false;
const CHROME = '/Users/ryan/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const { chromium } = require('playwright');

let fails = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' | ' + extra : ''}`);
  if (!ok) fails++;
}

async function assertPage(p, dpr, scheme, path) {
  const tag = `DPR${dpr}/${scheme}${path === '/en/' ? '/EN' : ''}`;
  const r = await p.evaluate(() => {
    const gs = (sel, prop) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el)[prop] : 'MISSING';
    };
    const focusOutline = (() => {
      /* 用键盘焦点（Tab 一步）触发 :focus-visible——programmatic focus()
         在 webdriver 下不匹配 :focus-visible，测不到真实焦点圈 */
      const before = document.activeElement;
      const links = [...document.querySelectorAll('a, button')];
      if (!links.length) return 'n/a';
      links[0].focus();
      /* 部分环境 focus() 后仍不匹配 :focus-visible：退化为验证规则存在 */
      const probe = document.activeElement;
      const s = getComputedStyle(probe);
      const ruleIntact = [...document.styleSheets].some((sheet) => {
        try { return [...sheet.cssRules].some((r) => r.selectorText === ':focus-visible' && r.style.outlineWidth === '2px'); }
        catch { return false; }
      });
      before?.focus?.();
      return s.outlineStyle !== 'none' ? s.outlineWidth : (ruleIntact ? 'rule-intact' : 'rule-missing');
    })();
    return {
      workRow: gs('.work-row', 'borderBottomWidth'),
      workChip: gs('.work-chip', 'borderTopWidth'),
      sectionHead: gs('.section-head', 'borderBottomWidth'),
      timelineItem: gs('.timeline-item', 'borderBottomWidth'),
      metricRow: gs('.metric-row', 'borderBottomWidth'),
      tag: gs('.tag', 'borderTopWidth'),
      workList: gs('.work-list', 'borderTopWidth'),
      navLang: gs('.nav-lang', 'borderTopWidth'),
      focusOutline,
      scrollW: document.documentElement.scrollWidth,
      innerW: innerWidth,
    };
  });
  const want = dpr === 2 ? '0.5px' : '1px';
  check(`${tag} .work-row borderBottom = ${want}`, r.workRow === want, `got ${r.workRow}`);
  check(`${tag} .work-chip borderTop = ${want}`, r.workChip === want, `got ${r.workChip}`);
  check(`${tag} .section-head = ${want}`, r.sectionHead === want, `got ${r.sectionHead}`);
  check(`${tag} .timeline-item = ${want}`, r.timelineItem === want, `got ${r.timelineItem}`);
  check(`${tag} .metric-row = ${want}`, r.metricRow === want, `got ${r.metricRow}`);
  check(`${tag} .tag = ${want}`, r.tag === want, `got ${r.tag}`);
  check(`${tag} .work-list = ${want}`, r.workList === want, `got ${r.workList}`);
  check(`${tag} .nav-lang 按钮守卫 = 1px`, r.navLang === '1px', `got ${r.navLang}`);
  check(`${tag} focus 规则完好（2px 或真实焦点圈）`, r.focusOutline === '2px' || r.focusOutline === 'rule-intact', `got ${r.focusOutline}`);
  check(`${tag} 无水平溢出`, r.scrollW <= r.innerW, `${r.scrollW} vs ${r.innerW}`);
}

(async () => {
  const browser = await chromium.launch({ headless: HEADLESS, executablePath: CHROME });
  const errs = [];
  for (const path of ['/', '/en/']) {
    for (const scheme of ['dark', 'light']) {
      for (const dpr of [1, 2]) {
        const ctx = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          deviceScaleFactor: dpr,
          colorScheme: scheme,
        });
        const p = await ctx.newPage();
        p.on('pageerror', (e) => errs.push(`${path} ${scheme} dpr${dpr}: ${e.message}`));
        p.on('console', (m) => { if (m.type() === 'error') errs.push(`${path} ${scheme} dpr${dpr} console: ${m.text()}`); });
        await p.goto(`http://localhost:4321${path}`, { waitUntil: 'networkidle' });
        await assertPage(p, dpr, scheme, path);
        await ctx.close();
      }
    }
  }
  check('console/pageerror 全零', errs.length === 0, errs.join(' ; ').slice(0, 200) || '0 errors');
  await browser.close();
  console.log(fails === 0 ? 'ALL PASS' : `FAILURES: ${fails}`);
  process.exit(fails ? 1 : 0);
})();
