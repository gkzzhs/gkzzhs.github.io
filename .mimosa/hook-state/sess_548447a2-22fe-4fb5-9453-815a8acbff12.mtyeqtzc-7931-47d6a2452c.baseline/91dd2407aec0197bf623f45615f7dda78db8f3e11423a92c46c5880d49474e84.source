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
    let fontPx = 100;
    octx.font = `800 ${fontPx}px ${family}`;
    const m100 = octx.measureText(text);
    const w100 = Math.max(1, m100.width);
    const h100 = fontPx; /* 大写/汉字近似高 */
    const fit = Math.min((hw * 0.9) / w100, (hh * 0.52) / h100);
    fontPx = Math.max(14, Math.floor(100 * fit));

    octx.font = `800 ${fontPx}px ${family}`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillStyle = '#fff';
    const cx = hw / 2;
    const cy = hh / 2;
    octx.fillText(text, cx, cy);

    const img = octx.getImageData(0, 0, hw, hh).data;

    /* gap 在半分辨率坐标系里取 2（≈全尺寸 4px） */
    const gap = 2;
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
    }
    /* 换字的瞬间给一记湍流爆发：粒子先炸开、再飞向新目标——
       过渡本身成为一幕，而不是隐形的重排 */
    this.boost = Math.max(this.boost, 4);
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

    const spring = 0.016;
    const damp = 0.86;
    const r = 110;
    const r2 = r * r;
    /* 滚动越快，目标点抖动越大：湍流 = 速度的可视化 */
    const turb = this.boost * 2.4;

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
        /* 湍流：目标点本身按每粒子相位漂移，滚动时整行字"活"起来 */
        txi += Math.sin(t * 2.1 + i * 0.7) * turb;
        tyi += Math.cos(t * 1.7 + i * 1.3) * turb;
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
    const accents: Path2D[] = RING_COLORS.map(() => new Path2D());
    for (let i = 0; i < this.textCount; i++) {
      const c = this.accent[i];
      const x = ax[i], y = ay[i];
      if (c) accents[c - 1].rect(x, y, 1.9, 1.9);
      else bone.rect(x, y, 1.7, 1.7);
    }
    ctx.fillStyle = BONE;
    ctx.fill(bone);
    for (let c = 0; c < RING_COLORS.length; c++) {
      ctx.fillStyle = RING_COLORS[c];
      ctx.fill(accents[c]);
    }
    const dust = new Path2D();
    for (let i = this.textCount; i < this.n; i++) {
      dust.rect(ax[i], ay[i], 1.4, 1.4);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill(dust);

    /* boost 自然衰减 */
    this.boost *= 0.92;
    this.raf = requestAnimationFrame(this.tick);
  };
}
