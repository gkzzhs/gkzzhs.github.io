/* ============================================================
 * reveal.ts — 滚动进入编排
 * ------------------------------------------------------------
 * 两条轨道：
 *  [data-reveal]       整块浮入（CSS 预置隐藏态，这里只负责演到可见）
 *  [data-reveal-lines] 掩膜逐行上升（宣言巨字）
 * 全站共用一条缓动 / 时长 / stagger —— 统一运动系统（评委法则 #1）。
 * ============================================================ */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const START = 'top 86%';

export function initReveal(): void {
  /* 整块浮入：CSS 已把 [data-reveal] 预置为 opacity:0/y26，这里演到可见。
     注意不能 clearProps——清掉内联样式元素会弹回 CSS 预藏态（v2 的坑） */
  const blocks = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  for (const el of blocks) {
    ScrollTrigger.create({
      trigger: el,
      start: START,
      once: true,
      onEnter: () =>
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
        }),
    });
  }

  /* 巨字逐行：掩膜内 yPercent 115 → 0，同组行间 0.12s 错峰 */
  const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal-lines]'));
  for (const group of groups) {
    const lines = Array.from(group.querySelectorAll<HTMLElement>('.line'));
    if (lines.length === 0) continue;
    gsap.set(lines, { yPercent: 115 });
    ScrollTrigger.create({
      trigger: group,
      start: START,
      once: true,
      onEnter: () =>
        gsap.to(lines, {
          yPercent: 0,
          duration: 1,
          ease: 'power4.out',
          stagger: 0.12,
        }),
    });
  }
}
