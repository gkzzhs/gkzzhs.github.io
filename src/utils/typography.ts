/* ============================================================
 * typography.ts — 中文排版渲染助手
 * ------------------------------------------------------------
 * keepTail：文案末尾命中防孤白名单时拆出「正文 + 保护组」，
 * 组件把保护组渲染为 <span class="t-keep">（white-space: nowrap）。
 * 文本内容零改动（复制/读屏与原文一致），只改变断行机会。
 * 白名单真源：site.ts 的 KEEP_TAILS（附实测宽度注释）。
 * ============================================================ */
import { KEEP_TAILS } from '../data/site';

export interface KeptText {
  head: string;
  tail?: string;
}

export function keepTail(text: string): KeptText {
  for (const t of KEEP_TAILS) {
    if (t.length < text.length && text.endsWith(t)) {
      return { head: text.slice(0, -t.length), tail: t };
    }
  }
  return { head: text };
}
