# RYAN.WANG — 个人网站 v2「墨点成字 PARTICLE PRESS」

暗色排版机隐喻的个人作品集：巨字由上万个墨点粒子铸成，
滚动即解体重组为宣言，鼠标划过炸开回流。每条宣称挂验收数据。

Astro 7 静态站 · 零运行时框架 · Lighthouse 99/100/100/100。

## 启动

```bash
npm install        # 首次
npm run dev        # 开发：http://localhost:4321（热更新）
npm run build      # 构建静态站到 dist/
npm run preview    # 本地预览构建产物
```

部署：`dist/` 是纯静态目录，Netlify / Vercel / GitHub Pages 皆可。

## 改内容：只动一个文件

**`src/data/site.ts`**（中英双语真源）。v2 字段对照：

| 字段 | 页面位置 |
|---|---|
| `hero.morphs` | 首屏粒子文字随滚动依次变形的短语（引擎自动适配屏宽，短语越短粒子越密） |
| `hero.corner*` | 首屏四角 mono HUD |
| `manifesto` | 宣言巨字两行 + CLAIM/PROOF 三对人声 |
| `work.entries` | 四件交付物（hover 整页反色，click 展开检验详情） |
| `evidence` | 巨字数字跑马灯 + 0/10 诚实披露格 |
| `method` | 方法论巨字 + 流程条 + 描边字工具链跑马灯 |
| `timeline.items` | 紧凑时间线（now:true 高亮钴蓝行） |
| `footer` | 巨字 CTA + 联系方式 |

换头像：`src/assets/avatar-320.webp`。改配色：`src/styles/global.css` 令牌
（碳黑 `#0B0B0C` / 骨白 `#F1EEE7` / 钴蓝 `#2438FF`）。正文字体用 Apple 官方栈（SF Pro / 苹方），标注用 Space Mono。

## 招牌交互的实现

- **粒子排版机** `src/motion/press.ts`：巨字离屏渲染 → 像素采样成目标点 →
  typed-array 粒子池（Float32Array，6k–20k 按屏宽自适应）弹簧物理飞入。
  `morph()` 重采样即换字；粒子飞行途中注入湍流爆发（滚动速度越快越乱）。
  鼠标斥力场 110px；DPR ≤1.75；离屏/切页停帧。
- **滚动调度** `src/motion/index.ts`：首屏 pin 260%，滚动进度切成 morph 段落；
  底部钴蓝进度条同步。原生 scroll 兜底监听（否则深链/键盘翻页不触发 reveal）。
- **整页反色 hover**：作品行 hover 给 body 加 `.flip`，CSS 令牌整体反转——
  布局层回应而非元素变色。注意 `body` 不能设 `height:100%`（会露出 html 黑底）。

## 性能与降级

- 入场与滚动动画只用 transform/opacity/clip-path；canvas 是唯一的逐帧绘制
- 动效包（GSAP+Lenis+引擎）`requestIdleCallback` 动态加载，首屏 JS 极小
- Lighthouse（移动端节流）：**Perf 99 · A11y 100 · BP 100 · SEO 100**，
  FCP 1.09s · LCP 1.79s · CLS 0 · TBT 95ms（`qa/lh-press.json`）
- `prefers-reduced-motion`：粒子引擎不启动，静态巨字 h1 兜底（保住无障碍树），
  reveal/marquee 全部静态终态
- 无 JS：内容直接可见（`html.anim` 类由内联脚本添加，无 JS 即无预藏）

## 自测

```bash
npm run preview &
node qa/press.cjs   # 逐屏截图（首屏/morph/宣言/反色/案例/跑马灯/页脚/移动端）
```

## 设计基准

对齐 Awwwards SOTD 评委三法则：① 全站一条缓动 `cubic-bezier(.19,1,.22,1)`；
② 3 秒内可见且只做一个的记忆点交互（粒子铸字）；③ 完成度（性能分 + 降级 +
排印细节：12px↔15vw 十倍级差、CLAIM/PROOF 人声、mono HUD）。
