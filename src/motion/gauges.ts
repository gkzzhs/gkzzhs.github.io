/* ============================================================
 * gauges.ts — 遥测仪表动效（[data-gauge]）
 * ------------------------------------------------------------
 * 进视口时：弧线描边 0 → value/max（270° 弧长）+ 数字同步计数。
 * 与标尺行（metrics.ts）同一套触发线/缓动，保持全站运动系统统一。
 * reduced-motion：直接落终态，不建 ScrollTrigger。
 * 弧长：r=48 → 周长 2πr ≈ 301.59，270° 占 75% = 226.19。
 * ============================================================ */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const R = 48;
const C = 2 * Math.PI * R; /* 301.59 */
const SWEEP = C * 0.75; /* 270° 弧长 226.19 */
const START = 'top 85%';

export function initGauges(): void {
  const gauges = Array.from(document.querySelectorAll<HTMLElement>('[data-gauge]'));
  if (gauges.length === 0) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  for (const g of gauges) {
    const arc = g.querySelector<SVGCircleElement>('.tlm-arc');
    const valEl = g.querySelector<HTMLElement>('[data-gauge-value]');
    if (!arc || !valEl) continue;

    const value = Number(g.dataset.value || '0');
    const max = Number(g.dataset.max || '100');
    const suffix = g.dataset.suffix ?? '';
    if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) continue;

    const targetDash = (Math.min(1, value / max) * SWEEP).toFixed(2);
    const finalText = `${Math.round(value)}${suffix}`;

    /* reduced：直接落终态 */
    if (reduced) {
      arc.style.strokeDasharray = `${targetDash} ${C.toFixed(2)}`;
      valEl.textContent = finalText;
      continue;
    }

    ScrollTrigger.create({
      trigger: g,
      start: START,
      once: true,
      onEnter: () => {
        /* 弧线描边：dasharray 从 0 长到目标（expo-out，与全站唯一缓动同族） */
        const state = { d: 0 };
        gsap.to(state, {
          d: Number(targetDash),
          duration: 1.5,
          ease: 'power3.out',
          onUpdate: () => {
            arc.style.strokeDasharray = `${state.d.toFixed(2)} ${C.toFixed(2)}`;
          },
        });
        /* 数字计数：与弧线同时长同缓动，读数是弧线的伴生 */
        const num = { v: 0 };
        valEl.textContent = `0${suffix}`;
        gsap.to(num, {
          v: value,
          duration: 1.5,
          ease: 'power3.out',
          snap: { v: 1 },
          onUpdate: () => {
            valEl.textContent = `${Math.round(num.v)}${suffix}`;
          },
          onComplete: () => {
            valEl.textContent = finalText;
          },
        });
      },
    });
  }
}
