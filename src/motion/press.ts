/* ============================================================
 * press.ts — 粒子排版机（全站招牌交互）
 * ------------------------------------------------------------
 * 原理：把巨字画到离屏 canvas 上做像素采样，得到一列目标点；
 * 常驻粒子池（Float32Array，typed array 无对象开销）以弹簧物理
 * 飞向目标点。morph() 换文案 = 重采样目标点，粒子自然飞散重组。
 *
 * 性能预算：
 *  - 粒子数按画布面积自适应（6k–20k），typed array + 双循环 fillRect
 *  - DPR ≤ 1.75；requestAnimationFrame 单循环；离屏 / 切页停帧
 *  - reduced-motion 下引擎根本不启动（组件渲染静态 h1 兜底）
 * ============================================================ */

const BONE = '#ffffff';
const COBALT = '#0a84ff';
/* Apple 活动圆环三色：Move 粉 / Exercise 绿 / Stand 青 —— 点缀粒子四色轮转 */
const RING_COLORS = ['#0a84ff', '#fa114f', '#a6ff00', '#1ddbf2'];

/* 换字补间时长：炸开→咬合压进确定的 0.65s。
   不用纯弹簧做换字——弹簧收敛尾巴受 √damp 支配，调参压不进 1s 内 */
const MORPH_DUR = 650;

export class Press {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;

  /* 粒子池：px/py 位置，vx/vy 速度，tx/ty 目标，全部平行 Float32Array */
  private n = 0;
  private px!: Float32Array;
  private py!: Float32Array;
  private vx!: Float32Array;
  private vy!: Float32Array;
  private tx!: Float32Array;
  private ty!: Float32Array;
  private accent!: Uint8Array;

  /* 换字补间：morph 时刻的位置快照（起点），tick 据此做时间驱动插值 */
  private sx!: Float32Array;
  private sy!: Float32Array;
  private morphAt = -1e9; /* -1e9 = 从未换字，走纯弹簧 */

  private pointer = { x: -9999, y: -9999 };
  private raf = 0;
  private running = false;
  private lastFrame = 0;
  private inView = true;
  private disposed = false;

  /* 滚动速度注入（Lenis velocity）：让粒子随滚动速度起湍流 */
  private boost = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('press: 2d context unavailable');
    this.ctx = ctx;
  }

  /* ---------- 生命周期 ---------- */

  start(): void {
    this.resize();
    this.bindPointer();
    this.observe();
    this.running = true;
    this.raf = requestAnimationFrame(this.tick);
  }

  dispose(): void {
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  pause(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  resume(): void {
    if (this.disposed || this.running || !this.inView) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.tick);
  }

  setPointer(x: number, y: number): void {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.x = x - r.left;
    this.pointer.y = y - r.top;
  }

  clearPointer(): void {
    this.pointer.x = -9999;
    this.pointer.y = -9999;
  }

  /* 滚动速度 → 湍流强度（0..1） */
  setBoost(v: number): void {
    this.boost = Math.min(1, Math.abs(v) / 60);
  }

  /* ---------- 主题配色 ---------- */
  private bone = BONE;
  private accents: readonly string[] = RING_COLORS;
  private dustColor = 'rgba(255,255,255,0.12)';

  /* 浅色/深色主题换装：墨点、四色点缀、浮尘的画布配色
     （index.ts 监听 themechange 时调用，见 Nav.astro 的主题切换） */
  setPalette(bone: string, accents: readonly string[], dust: string): void {
    this.bone = bone;
    this.accents = [...accents];
    this.dustColor = dust;
  }

  /* ---------- 尺寸与粒子池 ---------- */

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.w = Math.max(2, rect.width);
    this.h = Math.max(2, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    /* 池大小按面积自适应：粒子太多小屏撑不住，太少大屏不够密 */
    const target = Math.round(
      Math.min(20000, Math.max(6000, (this.w * this.h) / 110)),
    );
    if (target !== this.n) this.alloc(target);
  }

  private alloc(n: number): void {
    this.n = n;
    this.px = new Float32Array(n);
    this.py = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.tx = new Float32Array(n);
    this.ty = new Float32Array(n);
    this.accent = new Uint8Array(n);
    this.sx = new Float32Array(n);
    this.sy = new Float32Array(n);
    /* 池重建即作废进行中的补间：旧快照坐标已失效，不能从它起飞 */
    this.morphAt = -1e9;
    /* 出生：全屏随机散布 + 随机初速 —— 开场就是一场汇聚 */
    for (let i = 0; i < n; i++) {
      this.px[i] = Math.random() * this.w;
      this.py[i] = Math.random() * this.h;
      this.vx[i] = (Math.random() - 0.5) * 6;
      this.vy[i] = (Math.random() - 0.5) * 6;
      /* 约 9% 的彩色粒子：钴蓝 + Apple 三环色轮转（黑底上像撒了糖霜） */
      const r = Math.random();
      this.accent[i] = r < 0.09 ? (1 + (Math.floor(r * 100) % 4)) : 0;
    }
  }

  /* ---------- 文字采样 ---------- */

  /**
   * 把 text 渲染到离屏 canvas 并采样成目标点。
   * 字号自动适配：先量 100px 下的宽高，再等比缩到画布内。
   * 返回目标点数（≤ 池大小，多余粒子去压基线）。
   */
  private sample(text: string): { pts: Float32Array; m: number; cy: number; halfW: number } {
    /* 半分辨率采样：getImageData 是启动期最贵的同步调用，4 倍降本后点距 ×2 还原。
       注意：本方法内所有几何（画布/字号/圆心）都必须在半分辨率坐标系里自洽 */
    const DS = 0.5;
    const hw = Math.max(2, Math.ceil(this.w * DS));
    const hh = Math.max(2, Math.ceil(this.h * DS));
    const off = document.createElement('canvas');
    off.width = hw;
    off.height = hh;
    const octx = off.getContext('2d', { willReadFrequently: true })!;

    /* Apple 官方字体栈：Mac 上即 SF Pro / 苹方，粒子铸字与系统排版同源 */
    const family = 'system-ui, -apple-system, "SF Pro Display", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
    /* 字距与站内 .giant 一致：粒子字与兜底 h1 才能同宽互换（h1 为 -0.03em） */
    octx.letterSpacing = '-0.03em';
    let fontPx = 100;
    octx.font = `800 ${fontPx}px ${family}`;
    const m100 = octx.measureText(text);
    const w100 = Math.max(1, m100.width);
    const h100 = fontPx; /* 大写/汉字近似高 */
    const fit = Math.min((hw * 0.94) / w100, (hh * 0.60) / h100);
    fontPx = Math.max(14, Math.floor(100 * fit));

    octx.font = `800 ${fontPx}px ${family}`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillStyle = '#fff';
    const cx = hw / 2;
    const cy = hh / 2;
    octx.fillText(text, cx, cy);

    const img = octx.getImageData(0, 0, hw, hh).data;

    /* 点距自适应：长句字号被压小后，固定点距会让细笔画断成碎点、
       池上限随机丢点又造成斑驳空洞。从最密档向上找「粒子池装得下」
       的第一档——小字密采（笔画连通）、巨字疏采（密度均匀不吃池） */
    const cap = Math.round(this.n * 0.92);
    const countAt = (g: number): number => {
      let c = 0;
      for (let y = 0; y < hh; y += g) {
        for (let x = 0; x < hw; x += g) {
          if (img[(y * hw + x) * 4 + 3] > 128) c++;
        }
      }
      return c;
    };
    let gap = 1;
    for (; gap < 4; gap++) {
      if (countAt(gap) <= cap) break;
    }
    const pts: number[] = [];
    for (let y = 0; y < hh; y += gap) {
      for (let x = 0; x < hw; x += gap) {
        if (img[(y * hw + x) * 4 + 3] > 128) {
          pts.push(x + (Math.random() - 0.5) * gap * 0.5, y + (Math.random() - 0.5) * gap * 0.5);
        }
      }
    }

    let m = Math.min(pts.length / 2, this.n);
    m -= m % 1;
    const out = new Float32Array(m * 2);
    const INV = 1 / DS;
    /* 目标点乱序：粒子从四面八方交叉汇聚，而不是排队扫过 */
    const order = Array.from({ length: pts.length / 2 }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (let i = 0; i < m; i++) {
      out[i * 2] = pts[order[i] * 2] * INV;
      out[i * 2 + 1] = pts[order[i] * 2 + 1] * INV;
    }
    return { pts: out, m, cy: cy * INV, halfW: (w100 * fontPx) / 200 / DS };
  }

  /**
   * morph：把粒子群重组为新的字。
   * 多余粒子（池 > 采样点）散成全屏低透明度浮尘——提供空气感，
   * 又不会像"压印线"那样读成渲染故障。
   */
  private textCount = 0;
  morph(text: string): void {
    /* start()/resize() 之前（如 ScrollTrigger 创建期的首次 onUpdate）画布还没尺寸，
       采样会抛 IndexSizeError——直接忽略这次 morph，boot 后会重新铸字 */
    if (this.w < 2) return;
    const { pts, m } = this.sample(text);
    this.textCount = m;
    for (let i = 0; i < this.n; i++) {
      if (i < m) {
        this.tx[i] = pts[i * 2];
        this.ty[i] = pts[i * 2 + 1];
      } else {
        /* 浮尘：全屏随机落点，每次 morph 换一次落点 → 灰尘自然流动 */
        this.tx[i] = Math.random() * this.w;
        this.ty[i] = Math.random() * this.h;
      }
      /* 交接面清零：补间结束点速度≈0，弹簧从静止接管，不出缝 */
      this.vx[i] = 0;
      this.vy[i] = 0;
    }
    /* 起点快照 + 随机外踢：换字瞬间先炸开一拳，再被补间收拢咬合 */
    this.sx.set(this.px);
    this.sy.set(this.py);
    for (let i = 0; i < m; i++) {
      this.sx[i] += (Math.random() - 0.5) * 34;
      this.sy[i] += (Math.random() - 0.5) * 34;
    }
    this.morphAt = performance.now();
    /* 湍流爆发：补间前期目标点抖动、随咬合衰减（见 tick 的 turbScale） */
    this.boost = Math.max(this.boost, 2.5);
  }

  /* ---------- 指针与可见性 ---------- */

  private bindPointer(): void {
    window.addEventListener('pointermove', this.onPointer, { passive: true });
    window.addEventListener('pointerleave', this.onPointerLeave);
  }

  private onPointer = (e: PointerEvent): void => {
    this.setPointer(e.clientX, e.clientY);
  };

  private onPointerLeave = (): void => {
    this.clearPointer();
  };

  private observe(): void {
    new IntersectionObserver(
      ([en]) => {
        this.inView = en.isIntersecting;
        if (this.inView) this.resume();
        else this.pause();
      },
      { threshold: 0.02 },
    ).observe(this.canvas);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
      else this.resume();
    });
  }

  /* ---------- 主循环 ---------- */

  private tick = (): void => {
    if (!this.running) return;
    /* 40fps 限帧：粒子的运动速率对帧率不敏感，省一半主线程 */
    const now2 = performance.now();
    if (now2 - (this.lastFrame || 0) < 24) {
      this.raf = requestAnimationFrame(this.tick);
      return;
    }
    this.lastFrame = now2;
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);

    /* 弹簧只管「落定后」的闲时物理（指针搅墨、湍流跟随、浮尘漂移）；
       换字移动由下方时间驱动补间接管——弹簧的收敛尾巴受 √damp 支配，
       任何参数都压不进 1s，补间才能给出确定的咬合点 */
    const spring = 0.05;
    const damp = 0.84;
    const r = 110;
    const r2 = r * r;
    /* 滚动越快，目标点抖动越大：湍流 = 速度的可视化 */
    const turb = this.boost * 2.4;

    /* 换字补间：expo.out 在 MORPH_DUR 内咬合，结束点速度≈0，与弹簧段无缝 */
    const age = now2 - this.morphAt;
    const inTween = age < MORPH_DUR;
    const e = 1 - Math.pow(2, -10 * Math.min(1, age / MORPH_DUR));
    const turbScale = inTween ? 1 - e : 1;

    const ax = this.px;
    const ay = this.py;
    const avx = this.vx;
    const avy = this.vy;
    const atx = this.tx;
    const aty = this.ty;
    const mx = this.pointer.x;
    const my = this.pointer.y;
    const t = performance.now() * 0.001;

    for (let i = 0; i < this.n; i++) {
      let txi = atx[i];
      let tyi = aty[i];
      if (turb > 0) {
        /* 湍流：目标点本身按每粒子相位漂移；补间期幅度随咬合衰减 */
        txi += Math.sin(t * 2.1 + i * 0.7) * turb * turbScale;
        tyi += Math.cos(t * 1.7 + i * 1.3) * turb * turbScale;
      }

      if (inTween && i < this.textCount) {
        /* 补间段：起点→目标一次插值到位；指针斥力改为位置式直接顶开 */
        const bx = this.sx[i] + (txi - this.sx[i]) * e;
        const by = this.sy[i] + (tyi - this.sy[i]) * e;
        const mdx = bx - mx;
        const mdy = by - my;
        const d2 = mdx * mdx + mdy * mdy;
        if (d2 < r2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = ((r2 - d2) / r2) * 13; /* 位置式每帧重算不累积，×6 补偿手感 */
          ax[i] = bx + (mdx / d) * f;
          ay[i] = by + (mdy / d) * f;
        } else {
          ax[i] = bx;
          ay[i] = by;
        }
        continue;
      }

      const dx = txi - ax[i];
      const dy = tyi - ay[i];
      avx[i] = (avx[i] + dx * spring) * damp;
      avy[i] = (avy[i] + dy * spring) * damp;

      /* 鼠标斥力：圆内反比推力，插进字里像手指搅墨 */
      const mdx = ax[i] - mx;
      const mdy = ay[i] - my;
      const d2 = mdx * mdx + mdy * mdy;
      if (d2 < r2 && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const f = ((r2 - d2) / r2) * 2.2;
        avx[i] += (mdx / d) * f;
        avy[i] += (mdy / d) * f;
      }

      ax[i] += avx[i];
      ay[i] += avy[i];
    }

    /* Path2D 批量绘制：上万粒子合并成每色一次 fill 调用（比逐个 fillRect 快数倍） */
    const bone = new Path2D();
    const accents: Path2D[] = this.accents.map(() => new Path2D());
    for (let i = 0; i < this.textCount; i++) {
      const c = this.accent[i];
      const x = ax[i], y = ay[i];
      if (c) accents[c - 1].rect(x, y, 1.9, 1.9);
      else bone.rect(x, y, 1.7, 1.7);
    }
    ctx.fillStyle = this.bone;
    ctx.fill(bone);
    for (let c = 0; c < this.accents.length; c++) {
      ctx.fillStyle = this.accents[c];
      ctx.fill(accents[c]);
    }
    const dust = new Path2D();
    for (let i = this.textCount; i < this.n; i++) {
      dust.rect(ax[i], ay[i], 1.4, 1.4);
    }
    ctx.fillStyle = this.dustColor;
    ctx.fill(dust);

    /* boost 快速衰减（×0.86/帧 @40fps ≈ 0.4s 归零）：爆发要脆，拖尾要短 */
    this.boost *= 0.86;
    this.raf = requestAnimationFrame(this.tick);
  };
}
