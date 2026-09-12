/* ============================================================
 * metrics.ts — 标尺行数字滚动（Magic UI NumberTicker 内核的
 * vanilla 移植：进视口触发 + 计数补间 + tabular-nums）
 * ------------------------------------------------------------
 * [data-count-to] 目标值、[data-suffix] 后缀（"% / 10 / –25× / P0"）。
 * 触发即一次计数；reduced-motion 直接落终值。
 * ============================================================ */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initMetrics(): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-count-to]'));
  if (els.length === 0) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  for (const el of els) {
    const target = Number(el.dataset.countTo || '0');
    if (!Number.isFinite(target)) continue;
    const suffix = el.dataset.suffix ?? '';
    const finalText = `${target}${suffix}`;

    if (reduced || target === 0) {
      el.textContent = finalText;
      continue;
    }

    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        const state = { v: 0 };
        el.textContent = `0${suffix}`;
        gsap.to(state, {
          v: target,
          duration: 1.3,
          ease: 'power2.inOut',
          snap: { v: 1 },
          onUpdate: () => {
            el.textContent = `${Math.round(state.v)}${suffix}`;
          },
          onComplete: () => {
            el.textContent = finalText;
          },
        });
      },
    });
  }
}
