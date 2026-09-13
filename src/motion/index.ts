/* ============================================================
 * index.ts — 动效总入口 initMotion()
 * ------------------------------------------------------------
 * 职责：
 *  1. 幂等保护；reduced-motion（html.rm）→ 引擎整体不启动，
 *     页面保持 CSS 默认可见态。
 *  2. Lenis × GSAP 单一心跳（ticker 驱动 raf + lagSmoothing(0)）。
 *  3. 粒子排版机：等 Archivo 就绪后启动 + 首个 morph；
 *     ScrollTrigger pin 首屏，滚动进度切成 morph 段落。
 *  4. 自定义光标（仅 fine pointer）：点 + 环双层跟随，可点元素悬停放大。
 *  5. 滚动 reveal / 巨字逐行。
 *  6. 站内锚点平滑滚动（Lenis offset 让开顶栏）。
 * ============================================================ */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Press } from './press';
import { initReveal } from './reveal';
import { initMetrics } from './metrics';

export function initMotion(): void {
  if (window.__ryanMotion) return;
  window.__ryanMotion = true;

  const root = document.documentElement;
  const reduced = root.classList.contains('rm');

  /* reduced：不做滚动/粒子动画，但三环要画出终态（rings.ts 内部有 reduced 分支） */
  if (reduced) {
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    try {
      initMetrics();
    } catch (err) {
      console.warn('[motion] 指标计数终态失败：', err);
    }
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Lenis × GSAP 单一心跳 ---------- */
  const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  /* 原生滚动兜底：scrollIntoView / 键盘翻页 / 深链跳转不走 Lenis 的
     事件流，但没有这条监听 ScrollTrigger 就永远不知道位置变了 */
  window.addEventListener('scroll', () => ScrollTrigger.update(), { passive: true });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ---------- 粒子排版机 ---------- */
  const canvas = document.querySelector<HTMLCanvasElement>('#press-canvas');
  if (canvas) {
    try {
      const press = new Press(canvas);
      /* 主题换装：粒子配色跟随 html.light（Nav.astro 的主题切换/跟随系统派发 themechange） */
      const PALETTES = {
        dark: { bone: '#ffffff', accents: ['#0a84ff', '#fa114f', '#a6ff00', '#1ddbf2'], dust: 'rgba(255,255,255,0.12)' },
        light: { bone: '#000000', accents: ['#0066cc', '#ff3b30', '#248a3d', '#0088aa'], dust: 'rgba(0,0,0,0.10)' },
      } as const;
      const paintPress = () => {
        const p = document.documentElement.classList.contains('light') ? PALETTES.light : PALETTES.dark;
        press.setPalette(p.bone, p.accents, p.dust);
      };
      paintPress();
      window.addEventListener('themechange', paintPress);
      const morphs = JSON.parse(canvas.dataset.morphs || '[]') as string[];
      const bar = document.querySelector<HTMLElement>('#press-bar');
      const fallback = document.querySelector<HTMLElement>('.press-fallback');
      let current = -1;
      let lastMorphAt = 0;
      let pendingSeg = -1;
      let pendingTimer: ReturnType<typeof setTimeout> | undefined;
      /* 惯性滚动一划连跳数段：280ms 防抖窗口内只认最新段、一次到位——
         连续重启补间会让文字永远在半路（移动端大惯性尤甚） */
      const MIN_MORPH_GAP = 280;
      const flushPending = () => {
        if (pendingSeg >= 0 && pendingSeg !== current) {
          current = pendingSeg;
          lastMorphAt = performance.now();
          press.morph(morphs[current]);
        }
        pendingSeg = -1;
      };

      const boot = () => {
        press.start();
        /* canvas 接管后，静态 h1 转 sr-only（保住无障碍树里的 h1；
           首绘期由 html.anim CSS 预藏，见 components.css） */
        fallback?.classList.add('sr-only');
        if (morphs.length) press.morph(morphs[0]);
        current = 0;
        lastMorphAt = performance.now();
      };
      /* 系统字体无需等待加载；给一帧时间让布局稳定后开演 */
      Promise.race([
        document.fonts.ready,
        new Promise((r) => setTimeout(r, 400)),
      ]).then(boot);

      /* 首屏 pin：滚动进度切成 morph 段落。
         pin 距离函数化 = .press 实际高度 - 舞台 100vh，任何断点都正确 */
      const pressSection = document.querySelector<HTMLElement>('.press');
      ScrollTrigger.create({
        trigger: '.press',
        start: 'top top',
        end: () => '+=' + Math.max(1, (pressSection?.offsetHeight || window.innerHeight * 4) - window.innerHeight),
        invalidateOnRefresh: true,
        pin: '.press-stage',
        anticipatePin: 1,
        onUpdate: (self) => {
          const seg = Math.min(morphs.length - 1, Math.floor(self.progress * morphs.length));
          if (seg !== current) {
            const now = performance.now();
            if (now - lastMorphAt >= MIN_MORPH_GAP) {
              current = seg;
              lastMorphAt = now;
              press.morph(morphs[seg]);
              pendingSeg = -1;
            } else {
              /* 窗口内不重启 tween，先记下目标段，窗口过了直接跳最新 */
              pendingSeg = seg;
              clearTimeout(pendingTimer);
              pendingTimer = setTimeout(flushPending, MIN_MORPH_GAP - (now - lastMorphAt) + 30);
            }
          }
          if (bar) bar.style.transform = `scaleX(${self.progress})`;
        },
      });

      /* Lenis 速度注入粒子湍流 */
      lenis.on('scroll', (e: { velocity: number }) => press.setBoost(e.velocity));
    } catch (err) {
      console.warn('[motion] 粒子排版机启动失败：', err);
    }
  }

  /* ---------- 自定义光标（fine pointer only） ---------- */
  const cursor = document.getElementById('cursor');
  if (cursor && root.classList.contains('no-touch')) {
    /* 光标替代品必须 1:1 跟手：真实指针没有缓动，滞后会让点击落空 */
    window.addEventListener('pointermove', (e) => {
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      /* 悬停可交互元素：手套放大一档（保持指尖热点锚定） */
      const hot = (e.target as HTMLElement).closest('a, button, [role="button"]');
      cursor.classList.toggle('is-hot', !!hot);
    }, { passive: true });
  }

  /* ---------- 滚动 reveal ---------- */
  initReveal();

  /* ---------- 标尺行数字滚动 ---------- */
  try {
    initMetrics();
  } catch (err) {
    console.warn('[motion] 指标计数初始化失败：', err);
  }

  /* ---------- 站内锚点 ---------- */
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href')!;
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target as HTMLElement, { offset: -64, duration: 1.4 });
  });

  /* 布局稳定后再校准一次触发器 */
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

declare global {
  interface Window { __ryanMotion?: boolean }
}
