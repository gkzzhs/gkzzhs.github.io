# RYAN-SITE 组件契约与动效规格 v1

> 所有并行开发的 agent 必须遵守本文件。主题 token 见 `src/styles/global.css`（唯一真源）。
> 文案唯一真源：`src/data/site.ts`（zh/en 双语）。组件**禁止硬编码文案**，一切从 props 取。

## 0. 设计概念（一句话）

「出厂检验单」——把 Ryan 本人当成一件通过验收的产品来展示：每一条宣称（claim）旁边都挂着
验收数据（evidence chips），全站使用检验单/票据/规格表的视觉词汇（mono 标注、锯齿边、✓、
编号、检验章）。暖纸白 + 墨黑 + 国际橙，纸张噪点一层。

**绝对禁止**（审美疲劳清单）：WebGL 粒子、aurora/渐变光斑、meteors、sparkles、
模板化 custom cursor、连续大段渐变、emoji 装饰、Inter/Roboto。

## 1. 文件所有权（并行分工边界）

| 文件 | 归属 |
|---|---|
| `src/data/site.ts` | 内容 agent 已写好，**只读**，发现文案问题报告不要自行改 |
| `src/motion/*.ts` | 动效 agent 独占写入 |
| `src/components/*.astro`, `src/pages/*.astro`, `src/layouts/Base.astro`(微调) | 组件 agent 独占写入 |
| `src/styles/global.css` | 已定稿，**组件 agent 可以追加组件级样式到 `src/styles/components.css`**（新建文件，在 Base.astro import），禁止改 global.css |
| `public/` | 骨架已就绪 |

## 2. 页面结构（两个语言页共享组件，仅 props 不同）

```
<Base lang>
  <Nav />            固定顶栏：品牌 RYAN.WANG® · 锚点链接 · 主题切换 · 语言切换
  <main>
    <Hero />             #top      出厂检验单 + 大字陈述 + 流水线 canvas + NOW 状态
    <WorkIndex />        #work     4 行编辑式索引，点击展开案例面板（手风琴）
    <EvidenceScroll />   #evidence 滚动叙事长卷（仅这一段做 pin+scrub）
    <Method />           #method   方法论两条大字 + 工具链 marquee + 流程条
    <Timeline />         #timeline 纵向时间线（NOW 置顶徽标）
  </main>
  <ContactFooter />    #contact  大字 CTA + 链接 + 页脚检验单
</Base>
```

锚点在 zh/en 两页必须同名（#work #evidence #method #timeline #contact），
语言切换按钮 = `<a href>` 到另一语言同一 hash。

## 3. 动效 API 契约（src/motion/，组件 agent 按此调用）

```ts
// motion/index.ts
export function initMotion(): void
  // 1. reduced-motion 或触摸设备 → 不装 Lenis，直接 return（组件仍可用 data-reveal 的 CSS 兜底）
  // 2. Lenis + gsap.ticker 集成（lenis.on('scroll', ScrollTrigger.update)；gsap.ticker.add(t => lenis.raf(t*1000))；gsap.ticker.lagSmoothing(0)）
  // 3. 调用 reveal()/counters()/hero()/scenes() 各模块 init

// motion/reveal.ts
export function initReveal(): void
  // 扫 [data-reveal]：y:28→0, autoAlpha:0→1, duration:.9, ease:"power3.out"(即 var(--ease) 对应),
  // [data-reveal-group] 容器内自动 stagger 0.08s；ScrollTrigger start "top 85%"，once:true
  // reduced-motion → 直接 set final state（补丁：html.rm 类下 CSS 也兜底）

// motion/counters.ts
export function initCounters(): void
  // [data-count-to="86"] [data-count-suffix="%"]：进入视口一次，0→目标，
  // snap:1, duration:1.4, ease:"power2.out"；完成后触发一次 opacity 脉冲
  // reduced-motion → 直接写终值

// motion/hero.ts
export function initHero(): void
  // a. 入场时间轴：检验单行→大字两行(clip-path 掩膜上升)→chips stagger→NOW 状态，总长 ≤1.6s
  // b. pipeline canvas：#pipeline-canvas，rAF 绘制「INPUT→BUILD→VERIFY→SHIP」四节点
  //    流线 + 脉冲包（沿路径移动的短线段），鼠标靠近节点时该节点发光、包加速；
  //    DPR≤2；IntersectionObserver 离屏暂停；document.hidden 暂停
  // c. hero 滚离时整体 y 视差 + opacity 渐隐（scrub）

// motion/scenes.ts
export function initScenes(): void
  // EvidenceScroll：仅桌面(≥1024px)且 !reduced 时 pin + scrub，步骤交叉淡入 + 大数字
  // 计数联动 counters；移动/reduced → 静态堆叠（CSS 已处理，这里跳过即可）
  // Timeline：每项进入视口画线延伸（scaleY origin top）
```

约束：全部 transform/opacity（canvas 除外）；任何 rAF 循环必须离屏/隐藏可暂停；
每个 ts 文件顶部注释说明用途；禁用 ScrollSmoother（用 Lenis）。

## 4. 组件视觉规格（组件 agent 执行）

### Nav
- 固定顶栏，`backdrop-filter: blur(8px)`，底边 1px var(--line)；高度 60px
- 左：`RYAN.WANG<sup>®</sup>`（Clash 600 16px）；中/右：mono 链接
  WORK / EVIDENCE / METHOD / TIMELINE；最右：主题切换（☉/☾ 字符按钮，aria-label）
  + 语言切换（`ZH ⇄ EN` mono 链接）
- 移动端：只留品牌 + 语言 + 主题；锚点收进无动画的 `<details>` 下拉（轻量，不引菜单库）

### Hero（出厂检验单）
- 顶部：mono 规格行 `SPEC NO. RY-2027-001 · 品类 AI AGENT BUILDER · 威海 GMT+8`
- 大字两行（display-1）：zh「把模糊需求，/ 落成可验证的产品。」en "Vague intent in, / verified product out."
  第二行"可验证的"三字用 --signal 色
- 右侧/下方：出厂检验单表（`.spec-table`，mono，两列 dl）：
  型号 RYAN.WANG-2004 / 标准 能力验证优先于功能宣称 / 结论 ✅ 合格 — OPEN TO WORK
- `<canvas id="pipeline-canvas">` 横贯 hero 下部（高 ~180px），节点标签从 site.ts 取
- 底部 NOW 状态条：`● NOW BUILDING lark-retro v2.6.7` + 实时时钟（Asia/Shanghai，每秒）
- 检验章：绝对定位一枚旋转 -8° 的圆章「VERIFIED / 已验证」（CSS border + 双圈文字，不占布局流）

### WorkIndex
- 每行 grid：`[编号 mono] [名称 display-2 + 一句话 body-zh] [chips 组] [年份+↗]`
- 行间 1px var(--line) 分隔；hover：行背景 var(--card)，名称 translateX(8px)
- **点击展开**案例面板：`grid-template-rows: 0fr→1fr` 过渡 .55s var(--ease)（GPU 友好写法：
  内层 min-height:0; overflow:hidden），面板内：背景/动作/结果 三段 + `.spec-table` 数据表
  + 「查看源码/链接」外链（lark-retro→github.com/gkzzhs，无链接的项不显示）
- aria-expanded / button 语义完整

### EvidenceScroll（数据长卷）
- 结构：粘性左栏（大数字 + 标签，随步骤切换）+ 右侧步骤列表滚动
- 每步：mono 步骤号、标题、两行叙述、关键数据用 counters
- 最后一格「诚实披露」用特殊样式：--line 边框虚线 + 「NOT A FAILURE」章
- 移动端与 reduced：左栏变成每步内的行内大数字（CSS 处理）

### Method
- 两条方法论 display-2 陈述（zh 用中文引号），第二条signal色强调
- 流程条：AI 执行 ▸▸ 人工把关 ▸▸ 交付 —— 三段 mono + 箭头
- 工具链 marquee：一条无缝滚动带（CSS keyframes translateX -50%，内容复制两份，
  aria-hidden 第二份），项与项之间 · 分隔；hover 暂停；reduced 停止

### Timeline
- 左侧竖线（1px），节点圆点 --signal；年份 mono 大字；条目 title+一句
- NOW 项置顶：边框 --signal + 「NOW」章

### ContactFooter
- 深色反转底（bg var(--ink) 色，字 var(--paper) 色，注意 dark 模式下反转处理：用
  `[data-theme=dark] .footer{--paper:…}` 局部变量翻转）
- 大字 CTA 两行 + 邮箱大链接（hover 下划线从左划入）+ GitHub/X 小链接
- 底部检验单尾行：`PASSED QC · RY-2027-001 · 本站由 Astro 构建 · 0 依赖运行时`

## 5. 质量底线（两 agent 共同）

- 语义化标签、标题层级 h1→h2 唯一、按钮/链接语义正确、焦点可见
- 移动端 390px 宽逐段检查不破版、触摸目标 ≥44px
- 文案从 site.ts 取，禁止硬编码；数字一律用 site.ts 里的值（真实核实数据，禁止编造）
- 不引第三方 UI 库、不引 Tailwind、不引 React；图标用字符/内联 SVG
