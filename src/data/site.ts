/* ============================================================
 * site.ts — 全站文案唯一真源（中英双语）
 * ------------------------------------------------------------
 * v2「墨点成字 PARTICLE PRESS」：暗色排版机隐喻。
 * 改内容只改这个文件；改完 npm run build 生效。
 * 数据口径：全部来自已核实经历；内部代号不上站。
 * ============================================================ */

export type Locale = 'zh' | 'en';

export interface StackTool {
  name: string;
  /** 官方品牌主色（hover 填充） */
  color?: string;
  /** 官方品牌渐变（如 Gemini），hover 时以渐变填充文字 */
  gradient?: string;
}

export interface WorkEntry {
  id: string;
  index: string;
  name: string;
  kind: string;
  tagline: string;
  year: string;
  chips: string[];
  link?: { label: string; href: string };
  details: {
    context: string;
    actions: string[];
    results: { label: string; value: string }[];
  };
}

export const site = {
  /* ---------------- meta ---------------- */
  meta: {
    zh: {
      title: '王冠行 Ryan — AI Agent & 自动化',
      description:
        '王冠行（Ryan）：AI Agent 与自动化 Builder。开源 lark-retro / lark-dispatch，用户反馈自动化流水线，兴智杯全国三等奖。每条宣称带验收数据。',
    },
    en: {
      title: 'Ryan Wang — AI Agent & Automation',
      description:
        'Ryan Wang builds AI agents and automation: open-source lark-retro / lark-dispatch, a user-feedback pipeline, and a national-award AI game. Every claim ships with evidence.',
    },
  },

  /* ---------------- nav ---------------- */
  nav: {
    zh: {
      brand: 'RYAN.WANG',
      links: [
        { label: '宣言', href: '#manifesto' },
        { label: '交付', href: '#work' },
        { label: '数据', href: '#evidence' },
        { label: '轨迹', href: '#timeline' },
        { label: '联系', href: '#contact' },
      ],
      langSwitch: { label: 'EN', href: '/en/' },
    },
    en: {
      brand: 'RYAN.WANG',
      links: [
        { label: 'Manifesto', href: '#manifesto' },
        { label: 'Work', href: '#work' },
        { label: 'Evidence', href: '#evidence' },
        { label: 'Timeline', href: '#timeline' },
        { label: 'Contact', href: '#contact' },
      ],
      langSwitch: { label: '中文', href: '/' },
    },
  },

  /* ---------------- hero：粒子排版机 ---------------- */
  hero: {
    zh: {
      /* fit = 开场词的 100px 基准宽（em 系数，实测你好=1.94，含 -0.03em 字距）。
         CSS 用它把兜底 h1 缩放到与粒子字同尺寸（粒子引擎采样上限 0.94W/0.60H）——
         改开场词时需重测：canvas measureText('开场词', font 800 100px 站点字体栈) */
      fit: 1.94,
      /* 滚动时粒子文字依次变形：世界各语言的「你好」→ 宣言 → 数据
         （问候语两页共用；引擎自动缩放适配屏宽） */
      morphs: [
        '你好',
        'Hello',
        'Bonjour',
        'Hola',
        'こんにちは',
        '안녕하세요',
        '把模糊需求',
        '落成可验证',
        '86·94·10/10',
      ],
      cornerTL: 'RYAN.WANG — 排版机 PRESS v2',
      cornerTR: 'AI AGENT & 自动化',
      cornerBL: '威海 · GMT+8 · 2004 起',
      cornerBR: '滚动 · 滚动即铸字',
    },
    en: {
      fit: 1.94,
      morphs: [
        '你好',
        'Hello',
        'Bonjour',
        'Hola',
        'こんにちは',
        '안녕하세요',
        'VAGUE INTENT',
        'VERIFIED OUT',
        '86 · 94 · 10/10',
      ],
      cornerTL: 'RYAN.WANG — PRESS v2',
      cornerTR: 'AI AGENT & AUTOMATION',
      cornerBL: 'WEIHAI · GMT+8 · SINCE 2004',
      cornerBR: 'SCROLL — TYPE IS CAST',
    },
  },

  /* ---------------- manifesto：人声宣言 ---------------- */
  manifesto: {
    zh: {
      eyebrow: 'MANIFESTO / 宣言',
      lines: ['把模糊需求，', '落成可验证的产品。'],
      pairs: [
        {
          claim: '「我的流水线很稳。」',
          proof: '10 次定时运行 10/10 成功（45s–8m33s），11 周产出 10 期周报。',
        },
        {
          claim: '「分类做得准。」',
          proof: '14 条入库样本人工逐条核对命中 12 条 = 86%，偏差模式有记录：支付/流程类缺陷被误归 Feature request。',
        },
        {
          claim: '「我说的都交付了。」',
          proof: 'Reddit 链路 0/10——平台 API 商业授权所致，如实披露，和 86% 放在同一页。',
        },
      ],
    },
    en: {
      eyebrow: 'MANIFESTO',
      lines: ['Vague intent in,', 'verified product out.'],
      pairs: [
        { claim: '"My pipelines are stable."', proof: '10 scheduled runs, 10 successes (45s–8m33s). 11 weeks, 10 reports.' },
        { claim: '"Classification is accurate."', proof: '12 of 14 stored samples verified by hand = 86%. Failure mode logged.' },
        { claim: '"I ship what I say."', proof: 'The Reddit pipeline went 0/10 — platform API licensing. Disclosed, same page as the 86%.' },
      ],
    },
  },

  /* ---------------- work：交付物 ---------------- */
  work: {
    zh: {
      eyebrow: 'SELECTED WORK / 交付',
      heading: '四件交付物',
      note: 'HOVER 换气 · CLICK 展开',
      openLabel: '展开',
      closeLabel: '收起',
      entries: [
        {
          id: 'lark-retro',
          index: '01',
          name: 'lark-retro',
          kind: '开源 · 飞书 CLI',
          tagline: '一句话触发周期回顾，纯 Skill 零代码，1–2 小时变成 3 分钟。',
          year: '2026',
          chips: ['1–2h → 3min', '渐进增强 4 层', '非阻塞降级'],
          link: { label: 'GitHub ↗', href: 'https://github.com/gkzzhs' },
          details: {
            context: '飞书 CLI 创作者大赛 2026 参赛作品。周期回顾靠人工翻群聊拼材料，每人每次吞掉 1–2 小时。',
            actions: [
              '把「回顾」做成一条飞书 Skill：一句话拉取日历、文档、任务、消息、OKR、会议室六类上下文',
              '渐进增强 4 层（🟢 日历文档 → 🔵 任务 → 🟣 消息/OKR → 🟠 Bot/会议室），上层缺失自动降级、永不阻塞',
              'v2.0 行动项闭环：回顾产出的 action 有跟踪、有回访',
            ],
            results: [
              { label: '准备耗时', value: '1–2 小时 → 3 分钟内' },
              { label: '能力分层', value: '渐进增强 4 层 · 非阻塞降级' },
              { label: '形态', value: '纯 Skill 零代码 · v2.6.7' },
            ],
          },
        },
        {
          id: 'lark-dispatch',
          index: '02',
          name: 'lark-dispatch',
          kind: '开源 · 飞书 AI 校园挑战赛 2026',
          tagline: '会后知识智能分发：50–75 分钟压缩到 3 分钟，每条分发先过确认门控。',
          year: '2026',
          chips: ['≈17–25×', '提取 100%', '确认门控'],
          link: { label: 'GitHub ↗', href: 'https://github.com/gkzzhs' },
          details: {
            context: 'OpenClaw 赛道作品。会开完，知识躺在录音里：谁该拿到什么、派什么任务，全靠人肉对名单。',
            actions: [
              '三场真实会议实测：提取 25 条（10+12+3），逐条人工核验',
              '确认门控——草稿先给人看，无人值守自动分发被明确禁用',
              '跨租户 14 条（6+8）全部正确降级，不越权、不中断',
            ],
            results: [
              { label: '整理耗时', value: '50–75 分钟 → 3 分钟（≈17–25×）' },
              { label: '提取准确率', value: '25/25 · 100%（人工核验）' },
              { label: '任务闭环', value: '2/2 完成 · 平均 6.8 天' },
              { label: '实现', value: '591 行纯 SKILL.md · 0 中断' },
            ],
          },
        },
        {
          id: 'feedback-ops',
          index: '03',
          name: '反馈自动化',
          kind: 'Xmind（爱思软件）· 兼职 7 个月',
          tagline: '五个平台 + 内部工单的用户声音，汇成一条带分类门控和周报的流水线。',
          year: '2025.11–2026.05',
          chips: ['86% 准确', '94% 拦截', '10/10 稳定'],
          details: {
            context: '反馈散落在 LinkedIn / Reddit / Facebook / X / Discord 和内部工单两套体系，产品团队没有统一视角。',
            actions: [
              '两条链路统一汇入 PostgreSQL：外部舆情采集 + 内部工单',
              '内部走 Gemini 6 类，外部单独设 8 类意图门控——两套体系分开设计、分开验证',
              '11 周周报后把图形化流程重写为代码化采集器，补 Dashboard 与 Prometheus，5 月合并 8 个 PR',
            ],
            results: [
              { label: '分类准确率', value: '86%（12/14 人工核对）' },
              { label: '噪音拦截', value: '单次 18 条候选 → 1 条（≈94%）' },
              { label: '稳定性', value: '10 次定时运行 10/10' },
              { label: '修复闭环', value: '3 个 P0 缺陷经此定位并修复' },
            ],
          },
        },
        {
          id: 'life-sim',
          index: '04',
          name: '人生新起点',
          kind: '兴智杯全国人工智能创新应用大赛',
          tagline: 'AI 人生模拟游戏：一个人从产品设计扛到开发，6000+ 团队里拿回全国三等奖。',
          year: '2025',
          chips: ['全国三等奖', '6000+ 团队', '赛道 20 强'],
          details: {
            context: '全国性 AI 应用赛事，同赛道 6000+ 支团队。个人参赛，没有队友。',
            actions: ['独立完成产品设计、Prompt 体系、开发与调优', '打磨一个核心机制——人生决策模拟——而不是堆功能'],
            results: [
              { label: '名次', value: '全国三等奖' },
              { label: '赛道', value: '20 强' },
              { label: '分工', value: '个人主导全流程' },
            ],
          },
        },
      ],
    },
    en: {
      eyebrow: 'SELECTED WORK',
      heading: 'Four deliveries',
      note: 'HOVER FLIPS · CLICK OPENS',
      openLabel: 'Open',
      closeLabel: 'Close',
      entries: [
        {
          id: 'lark-retro',
          index: '01',
          name: 'lark-retro',
          kind: 'Open source · Feishu CLI',
          tagline: 'One sentence triggers a sprint retro — pure Skill, zero code. 1–2 hours become 3 minutes.',
          year: '2026',
          chips: ['1–2h → 3min', '4-layer progressive', 'Non-blocking'],
          link: { label: 'GitHub ↗', href: 'https://github.com/gkzzhs' },
          details: {
            context: 'Feishu CLI Creator Contest 2026 entry. Retro prep meant combing chats and docs — 1–2 hours per person, every cycle.',
            actions: [
              'Packaged "retro" as one Feishu Skill: a sentence pulls calendar, docs, tasks, messages, OKR and rooms',
              'Progressive enhancement in 4 layers — graceful fallback, never blocking',
              'v2.0 closes the loop: action items get tracked and followed up',
            ],
            results: [
              { label: 'Prep time', value: '1–2 h → under 3 min' },
              { label: 'Tiers', value: '4-layer progressive' },
              { label: 'Form', value: 'Pure Skill, zero code · v2.6.7' },
            ],
          },
        },
        {
          id: 'lark-dispatch',
          index: '02',
          name: 'lark-dispatch',
          kind: 'Open source · Feishu AI Campus Challenge 2026',
          tagline: 'Post-meeting knowledge dispatch: 50–75 minutes compressed to 3, every send gated by a human.',
          year: '2026',
          chips: ['≈17–25×', '100% extraction', 'Confirm-gated'],
          link: { label: 'GitHub ↗', href: 'https://github.com/gkzzhs' },
          details: {
            context: 'OpenClaw track. After each meeting, knowledge sat idle: who needs what, which tasks go where — matched by hand.',
            actions: [
              'Three real meetings: 25 items extracted (10+12+3), each manually verified',
              'Confirmation gate — drafts reviewed by humans; unattended auto-send explicitly disabled',
              '14 cross-tenant targets (6+8) correctly degraded — no leaks, no interruptions',
            ],
            results: [
              { label: 'Routing', value: '50–75 min → 3 min (≈17–25×)' },
              { label: 'Accuracy', value: '25/25 · 100% verified' },
              { label: 'Closure', value: '2/2 done · avg 6.8 days' },
              { label: 'Implementation', value: '591 lines of pure SKILL.md' },
            ],
          },
        },
        {
          id: 'feedback-ops',
          index: '03',
          name: 'Feedback automation',
          kind: 'Xmind (Aisi Software) · 7-month contract',
          tagline: 'User voices from five platforms plus internal tickets — one pipeline with gating and weekly reports.',
          year: '2025.11–2026.05',
          chips: ['86% accuracy', '94% filtered', '10/10 stable'],
          details: {
            context: 'Feedback lived in two worlds: LinkedIn / Reddit / Facebook / X / Discord and internal tickets. No unified view.',
            actions: [
              'Two pipelines into one PostgreSQL layer: public signals + internal tickets',
              'Internal: Gemini across 6 categories; public: a separate 8-class intent gate — designed and verified apart',
              'After 11 weeks of reports: visual flows rewritten as code collectors, dashboard + Prometheus, 8 PRs merged in May',
            ],
            results: [
              { label: 'Accuracy', value: '86% (12/14 checked by hand)' },
              { label: 'Noise filter', value: '18 candidates → 1 per run (≈94%)' },
              { label: 'Reliability', value: '10/10 scheduled runs' },
              { label: 'Fix loop', value: '3 P0 defects located and fixed' },
            ],
          },
        },
        {
          id: 'life-sim',
          index: '04',
          name: 'New Start',
          kind: 'XingZhi Cup National AI Competition',
          tagline: 'An AI life-simulation game: solo from product design to build, national third prize out of 6,000+ teams.',
          year: '2025',
          chips: ['National 3rd prize', '6,000+ teams', 'Top 20'],
          details: {
            context: 'A national competition with 6,000+ teams in track. Solo entry.',
            actions: ['Owned product design, prompt system, development, tuning', 'Polished one mechanic — simulated life decisions — instead of stacking features'],
            results: [
              { label: 'Rank', value: 'National 3rd prize' },
              { label: 'Track', value: 'Top 20' },
              { label: 'Role', value: 'Solo, end to end' },
            ],
          },
        },
      ],
    },
  },

  /* ---------------- evidence：标尺行指标 ---------------- */
  evidence: {
    zh: {
      eyebrow: 'EVIDENCE / 数据',
      heading: '盖过章的数字',
      metrics: [
        { value: 86, suffix: '%', label: '分类准确', note: '14 条入库样本人工逐条核对 12/14' },
        { value: 94, suffix: '%', label: '噪音拦截', note: '单次 18 条候选 → 1 条入库' },
        { value: 10, suffix: '/10', label: '稳定运行', note: '定时运行 45s–8m33s · 11 周 10 期' },
        { value: 17, suffix: '–25×', label: '分发提速', note: '50–75 分钟 → 3 分钟' },
        { value: 100, suffix: '%', label: '提取准确', note: '25/25 逐条人工核验' },
        { value: 3, suffix: ' P0', label: '修复闭环', note: '经此流水线定位并修复' },
      ],
      disclosure: 'Reddit 链路因平台 API 商业授权全部失联——这不是技术失败，但它是结果：如实披露，和 86% 放在一起。',
    },
    en: {
      eyebrow: 'EVIDENCE',
      heading: 'Stamped numbers',
      metrics: [
        { value: 86, suffix: '%', label: 'Classification', note: '12/14 stored samples verified by hand' },
        { value: 94, suffix: '%', label: 'Noise filtered', note: '18 candidates → 1 per run' },
        { value: 10, suffix: '/10', label: 'Reliability', note: '45s–8m33s · 11 weeks, 10 reports' },
        { value: 17, suffix: '–25×', label: 'Dispatch speed', note: '50–75 minutes → 3' },
        { value: 100, suffix: '%', label: 'Extraction', note: '25/25 verified one by one' },
        { value: 3, suffix: ' P0', label: 'Fix loop', note: 'Located and fixed via this pipeline' },
      ],
      disclosure: "The Reddit pipeline went dark on platform API licensing — not a technical failure, but a result. Disclosed, same page as the 86%.",
    },
  },

  /* ---------------- method ---------------- */
  method: {
    zh: {
      eyebrow: 'METHOD / 方法',
      principles: [
        { text: 'AI 辅助执行，', highlight: '人工把关决策点。' },
        { text: '能力验证', highlight: '优先于功能宣称。' },
      ],
      flow: ['AI 执行', '人工把关', '验证交付'],
      stack: [
        { name: '飞书 CLI', gradient: 'linear-gradient(120deg,#4fe3c1 0%,#38b6e8 48%,#3370ff 100%)' },
        { name: 'n8n', color: '#EA4B71' },
        { name: 'Gemini', gradient: 'linear-gradient(100deg,#4285F4 10%,#9B72CB 50%,#D96570 90%)' },
        { name: 'Claude', color: '#D97757' },
        { name: 'Codex', gradient: 'linear-gradient(120deg,#9ba9f8 0%,#5f6cf0 52%,#4438d8 100%)' },
        { name: '豆包', gradient: 'linear-gradient(120deg,#9ed4fb 0%,#4d9df8 55%,#2e6fe8 100%)' },
        { name: 'PostgreSQL', color: '#336791' },
        { name: 'Prometheus', color: '#E6522C' },
      ],
    },
    en: {
      eyebrow: 'METHOD',
      principles: [
        { text: 'AI executes,', highlight: 'humans gatekeep.' },
        { text: 'Verified capability', highlight: 'beats claimed features.' },
      ],
      flow: ['AI runs', 'Human gates', 'Verify & ship'],
      stack: [
        { name: 'Feishu CLI', gradient: 'linear-gradient(120deg,#4fe3c1 0%,#38b6e8 48%,#3370ff 100%)' },
        { name: 'n8n', color: '#EA4B71' },
        { name: 'Gemini', gradient: 'linear-gradient(100deg,#4285F4 10%,#9B72CB 50%,#D96570 90%)' },
        { name: 'Claude', color: '#D97757' },
        { name: 'Codex', gradient: 'linear-gradient(120deg,#9ba9f8 0%,#5f6cf0 52%,#4438d8 100%)' },
        { name: 'Doubao', gradient: 'linear-gradient(120deg,#9ed4fb 0%,#4d9df8 55%,#2e6fe8 100%)' },
        { name: 'PostgreSQL', color: '#336791' },
        { name: 'Prometheus', color: '#E6522C' },
      ],
    },
  },

  /* ---------------- timeline ---------------- */
  timeline: {
    zh: {
      eyebrow: 'TIMELINE / 轨迹',
      items: [
        { date: 'NOW', title: 'OPEN TO WORK', body: '2027 届软件工程本科，寻找 AI 产品方向实习。', now: true },
        { date: '2026', title: '飞书 CLI 官方直播嘉宾', body: '5 位核心创作者之一，lark-retro 作者。' },
        { date: '2026.06', title: 'AIGC 歌曲 MV《灵感全开》', body: '与威海人社局共创。' },
        { date: '2026.05', title: '百度秒哒金牌讲师', body: 'AI 应用开发教学，持续中。' },
        { date: '2025.11–2026.05', title: 'Xmind 用户反馈自动化', body: '7 个月兼职，图形化流水线做到代码化 + 监控。' },
        { date: '2025.09', title: 'WaytoAGI 威海核心共建者', body: '社区活动组织与内容共建，持续中。' },
        { date: '2025.06', title: 'Datawhale AI 春训营助教', body: '带营员跑通 AI 应用项目。' },
        { date: '2023.09', title: '软件工程本科入学', body: '2027 年 6 月毕业。' },
      ],
    },
    en: {
      eyebrow: 'TIMELINE',
      items: [
        { date: 'NOW', title: 'OPEN TO WORK', body: 'Class of 2027, software engineering. Looking for an AI product internship.', now: true },
        { date: '2026', title: 'Feishu CLI official livestream guest', body: 'One of 5 core creators; author of lark-retro.' },
        { date: '2026.06', title: 'AIGC music video', body: 'Co-created with Weihai Human Resources Bureau.' },
        { date: '2026.05', title: 'Baidu Miaoda gold-medal instructor', body: 'Teaching AI app building — ongoing.' },
        { date: '2025.11–2026.05', title: 'Xmind feedback automation', body: '7-month contract, from visual flows to code + monitoring.' },
        { date: '2025.09', title: 'WaytoAGI Weihai core builder', body: 'Community events and content — ongoing.' },
        { date: '2025.06', title: 'Datawhale AI spring camp TA', body: 'Coached campers through AI app projects.' },
        { date: '2023.09', title: 'Started software engineering', body: 'Graduating June 2027.' },
      ],
    },
  },

  /* ---------------- footer ---------------- */
  footer: {
    zh: {
      ctaA: '有想法？',
      ctaB: '我们来验证它。',
      mailLabel: 'gkzzhs@outlook.com',
      mailHref: 'mailto:gkzzhs@outlook.com',
      links: [
        { label: 'GitHub', href: 'https://github.com/gkzzhs' },
        { label: 'X / @Ryanwanggh', href: 'https://x.com/Ryanwanggh' },
      ],
      colophon: '© 2026 王冠行 · 手工铸字 · 无模板',
      backTop: '顶部',
    },
    en: {
      ctaA: 'Got an idea?',
      ctaB: "Let's verify it.",
      mailLabel: 'gkzzhs@outlook.com',
      mailHref: 'mailto:gkzzhs@outlook.com',
      links: [
        { label: 'GitHub', href: 'https://github.com/gkzzhs' },
        { label: 'X / @Ryanwanggh', href: 'https://x.com/Ryanwanggh' },
      ],
      colophon: '© 2026 Ryan Wang · Type cast by hand · No template',
      backTop: 'Top',
    },
  },
} as const;

export type SiteData = typeof site;
