// GEO（Generative Engine Optimization）：让 AI 搜索引擎（ChatGPT、Perplexity、豆包等）
// 找得到、读得懂、引得出这个作品集。只陈述页面里已有的事实，不新增宣称。
// 同一份定义服务两条路径：
//   1. build.mjs 构建时注入（重新构建不丢）；
//   2. node geo.mjs <构建目录> 直接给既有产物打补丁（幂等），用于更新已部署页面。
import {readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const ORIGIN='https://gkzzhs.github.io';
export const PAGE_URL=ORIGIN+'/renaissance-preview.html';
// 线上已发布资源的兜底地址；构建时通过 opts 覆盖为新哈希
const PORTRAIT=ORIGIN+'/assets/renaissance-perf/portrait.0259c428dd0ef3fa.webp';
const POSTER=ORIGIN+'/assets/renaissance-perf/poster.c81e5a1f016d7a78.webp';
const OG_COVER=ORIGIN+'/assets/renaissance-perf/og-cover.jpg';
const GITHUB='https://github.com/gkzzhs',X='https://x.com/Ryanwanggh';
// 移动端浏览器框色：跟随页面纸色/暗色底（与 CSS 的 --paper 一致）
const THEME_COLORS='<meta name="theme-color" content="#E9E4DA" media="(prefers-color-scheme: light)"/>\n<meta name="theme-color" content="#191C1B" media="(prefers-color-scheme: dark)"/>';
const abs=u=>u.startsWith('http')?u:ORIGIN+'/'+u.replace(/^\//,'');
const attr=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const ld=v=>JSON.stringify(v).replace(/</g,'\\u003c');
const unesc=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
// 主页判定：构建产物含作品网格；根目录的跳转壳页（noindex redirect）两者皆无，不应被打补丁
export const isMainHtml=html=>html.includes('<div class="work-grid">');

const WORKS=[
 {url:ORIGIN+'/assets/renaissance-perf/projects/lark-retro.html',name:'Lark-Retro',description:'回顾会前把材料找齐：自动化材料整理，示例数据下整理耗时 3 分钟内。'},
 {url:ORIGIN+'/assets/renaissance-perf/projects/xmind.html',name:'Xmind 用户反馈分类',description:'两类反馈、两套门控：14 条入库样本人工核对命中 12 条（86%），单次过滤约 94%，定时运行 10/10 成功。'},
 {url:ORIGIN+'/assets/renaissance-perf/projects/lark-dispatch.html',name:'Lark-Dispatch',description:'AI 先起草会议纪要、人工逐条确认：三场会议 25/25 核验，整理提速 17–25 倍（50–75 分钟 → 3 分钟）。'},
 {url:ORIGIN+'/assets/renaissance-perf/projects/life.html',name:'人生新起点',description:'独立开发的选择-后果叙事游戏，获全国三等奖。'},
];
const PERSON={'@type':'Person','@id':ORIGIN+'/#person',name:'王冠行',alternateName:['Ryan Wang','gkzzhs'],
 url:PAGE_URL,email:'mailto:gkzzhs@outlook.com',sameAs:[GITHUB,X],
 jobTitle:'软件工程本科生（2027 届），寻找 AI 产品方向实习',
 description:'AI 产品与自动化方向。做事方法：AI 辅助执行，人工把关决策点；每个项目附可核验的过程记录与结果口径。',
 knowsAbout:['AI 产品','工作流自动化','需求拆解','用户反馈分类','自动化采集','飞书 CLI','n8n','Gemini','Claude','Codex','豆包','PostgreSQL','Prometheus']};
const OG_TITLE='王冠行 Ryan Wang — AI 产品与自动化 · 寻找 AI 产品实习';
const OG_DESC='王冠行（Ryan Wang），2027 届软件工程本科生，寻找 AI 产品方向实习。作品集：Lark-Retro 材料整理、Xmind 用户反馈分类、Lark-Dispatch 会议纪要起草与人工确认、独立游戏《人生新起点》（全国三等奖）。AI 辅助执行，人工把关决策点。';

function mainHead({portraitUrl,ogImageUrl,dateModified}={}){
 const og=abs(ogImageUrl||OG_COVER);
 const graph=[
  {'@type':'WebSite','@id':ORIGIN+'/#website',url:ORIGIN+'/',name:'王冠行 Ryan Wang 作品集',inLanguage:'zh-CN'},
  {'@type':'ProfilePage','@id':PAGE_URL+'#webpage',url:PAGE_URL,name:'Ryan Wang — AI 产品与自动化',
   description:'王冠行 / Ryan Wang。2027 届软件工程本科，寻找 AI 产品实习。四个项目、工作方法与经历。',
   isPartOf:{'@id':ORIGIN+'/#website'},inLanguage:'zh-CN',dateModified,mainEntity:{'@id':ORIGIN+'/#person'}},
  {...PERSON,image:abs(portraitUrl||PORTRAIT),dateModified},
  {'@type':'ItemList','@id':PAGE_URL+'#work',name:'作品',
   itemListElement:WORKS.map((w,i)=>({'@type':'ListItem',position:i+1,url:w.url,name:w.name,description:w.description}))}];
 return `<!--GEO:BEGIN geo.mjs-->
<link rel="canonical" href="${PAGE_URL}"/>
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"/>
${THEME_COLORS}
<meta property="og:site_name" content="王冠行 Ryan Wang 作品集"/>
<meta property="og:type" content="profile"/>
<meta property="og:title" content="${attr(OG_TITLE)}"/>
<meta property="og:description" content="${attr(OG_DESC)}"/>
<meta property="og:url" content="${PAGE_URL}"/>
<meta property="og:image" content="${og}"/>
<meta property="og:locale" content="zh_CN"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${attr(OG_TITLE)}"/>
<meta name="twitter:description" content="${attr(OG_DESC)}"/>
<meta name="twitter:image" content="${og}"/>
<script type="application/ld+json">${ld({'@context':'https://schema.org','@graph':graph})}</script>
<!--GEO:END-->
`;
}

function projectGraph({url,title,description,dateModified}){
 return {'@context':'https://schema.org','@graph':[
  {'@type':'WebSite',url:ORIGIN+'/',name:'王冠行 Ryan Wang 作品集',inLanguage:'zh-CN'},
  {'@type':'CreativeWork','@id':url+'#work',url,name:title,description,inLanguage:'zh-CN',dateModified,
   author:{'@type':'Person',name:'王冠行',alternateName:'Ryan Wang',url:PAGE_URL,sameAs:[GITHUB,X]},
   creator:{'@type':'Person',name:'王冠行',alternateName:'Ryan Wang',url:PAGE_URL}}]};
}

const GEO_BLOCK=/<!--GEO:BEGIN[^\n>]*-->[\s\S]*?<!--GEO:END-->\n?/g;
// 幂等注入：先剥掉旧块再插入新块
export function applyGeo(html,opts={}){
 const kind=opts.kind??(isMainHtml(html)?'main':'project');
 const dateModified=opts.dateModified??new Date().toISOString().slice(0,10);
 html=html.replace(GEO_BLOCK,'');
 let block;
 if(kind==='main'){
  block=mainHead({...opts,dateModified});
 }else{
  const m=html.match(/<title>([\s\S]*?)<\/title>/);const title=m?m[1].trim():'王冠行 Ryan Wang 项目';
  const meta=html.match(/<meta[^>]*name="description"[^>]*>/);
  const description=unesc(meta?.[0].match(/content="([^"]*)"/)?.[1]||'王冠行（Ryan Wang）项目详情：背景、个人动作、真实输出与结果记录。');
  if(!html.includes('</head>'))throw new Error('Missing </head>');
  const canon=opts.url??ORIGIN+opts.path;
  const og=abs(opts.ogImageUrl||POSTER);
  block=`<!--GEO:BEGIN geo.mjs-->
<link rel="canonical" href="${canon}"/>
${THEME_COLORS}
<meta property="og:type" content="article"/>
<meta property="og:title" content="${attr(title)}"/>
<meta property="og:description" content="${attr(description)}"/>
<meta property="og:url" content="${canon}"/>
<meta property="og:image" content="${og}"/>
<meta property="og:locale" content="zh_CN"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${attr(title)}"/>
<meta name="twitter:description" content="${attr(description)}"/>
<meta name="twitter:image" content="${og}"/>
<script type="application/ld+json">${ld(projectGraph({url:canon,title,description,dateModified}))}</script>
<!--GEO:END-->
`;
 }
 if(!html.includes('</head>'))throw new Error('Missing </head>');
 return html.replace('</head>',block+'</head>');
}

const ROBOTS=`# gkzzhs.github.io — 王冠行 Ryan Wang 作品集
# 传统搜索引擎与 AI 检索引擎均欢迎抓取。

User-agent: *
Allow: /

# —— AI / LLM 爬虫：显式欢迎 ——
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: Bytespider
Allow: /
User-agent: Amazonbot
Allow: /
User-agent: meta-externalagent
Allow: /

Sitemap: https://gkzzhs.github.io/sitemap.xml
`;

function llms(dateModified){return `# 王冠行（Ryan Wang）作品集

> 2027 届软件工程本科生，寻找 AI 产品方向实习。作品集主题：AI 辅助执行，人工把关决策点——每个项目附可核验的过程记录与结果口径，并公开失败记录（如 Reddit 采集 0/10）。

主页：[renaissance-preview.html](${PAGE_URL})（中文；同一页面 URL 加 \`?lang=en\` 切换英文）。更新于 ${dateModified}。

## 项目

- [Lark-Retro](${ORIGIN}/assets/renaissance-perf/projects/lark-retro.html)：回顾会前自动找齐材料，示例数据下整理耗时 3 分钟内。
- [Xmind 用户反馈分类](${ORIGIN}/assets/renaissance-perf/projects/xmind.html)：两类反馈、两套门控。14 条入库样本人工核对命中 12 条（86%），单次过滤约 94%（18 条候选 → 1 条入库），定时运行 10/10 成功。
- [Lark-Dispatch](${ORIGIN}/assets/renaissance-perf/projects/lark-dispatch.html)：AI 先起草会议纪要、人工逐条确认。三场会议 25/25 逐条核验，整理提速 17–25 倍（记录耗时 50–75 分钟 → 3 分钟）。
- [人生新起点](${ORIGIN}/assets/renaissance-perf/projects/life.html)：独立开发的选择-后果叙事游戏，获全国三等奖。

## 结果口径

- 分类核对：14 条入库样本中人工命中 12 条（86%）。
- 单次过滤：约 94%，单次 18 条候选 → 1 条入库。
- 定时运行：10 次全部成功（45s–8m33s），11 周产出 10 期周报。
- 整理提速：17–25 倍（50–75 分钟 → 3 分钟）。
- 人工核验：三场会议共 25 条，25/25 逐条核对。
- 采集边界：Reddit 链路受平台 API 商业授权限制，采集记录 0/10；10/10 定时运行完成不代表全平台采集成功。

## 经历

- 2026 · 飞书 CLI 官方直播嘉宾：5 位核心创作者之一，lark-retro 作者。
- 2026.06 · AIGC 歌曲 MV《灵感全开》：与威海人社局共创。
- 2026.05 · 百度秒哒金牌讲师：AI 应用开发教学，持续中。
- 2025.11–2026.05 · Xmind 用户反馈自动化：7 个月兼职，图形化流水线做到代码化 + 监控。
- 2025.09 · WaytoAGI 威海核心共建者：社区活动组织与内容共建，持续中。
- 2025.06 · Datawhale AI 春训营助教：带营员跑通 AI 应用项目。

## 联系

- Email：gkzzhs@outlook.com
- GitHub：${GITHUB}
- X（Twitter）：${X}
`;}

function sitemap(dateModified){return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${PAGE_URL}</loc><lastmod>${dateModified}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>
${WORKS.map(w=>`  <url><loc>${w.url}</loc><lastmod>${dateModified}</lastmod><changefreq>yearly</changefreq><priority>0.8</priority></url>`).join('\n')}
</urlset>
`;}

// 品牌化 404：GitHub Pages 对任意未知路径返回它。纸色/暗色跟随系统，无外部依赖。
const NOT_FOUND=`<!DOCTYPE html>
<html lang="zh-CN"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>404 — 王冠行 Ryan Wang</title>
<link rel="icon" href="/assets/identity/lamp-v2/favicon.svg" type="image/svg+xml"/>
<style>
:root{--paper:#E9E4DA;--ink:#252622;--muted:#77786E;--wine:#642B36;--serif:Baskerville,"Iowan Old Style","Times New Roman",serif;--sans:Arial,"PingFang SC","Microsoft YaHei",sans-serif}
@media(prefers-color-scheme:dark){:root{--paper:#191C1B;--ink:#E8E3D8;--muted:#A1A69B}}
*{box-sizing:border-box}html{background:var(--paper);color:var(--ink);font-family:var(--sans)}
body{margin:0;min-height:100svh;display:flex;flex-direction:column;justify-content:center;padding:clamp(24px,6vw,80px)}
p{margin:0}.mono{font-size:10px;letter-spacing:.18em;color:var(--muted);text-transform:uppercase}
h1{font:400 clamp(72px,14vw,180px)/.95 var(--serif);letter-spacing:-.055em;margin:18px 0 10px;font-weight:400}
h1 em{font-style:italic;color:var(--wine)}
p.note{font-size:13px;line-height:1.9;color:var(--muted);max-width:34em}
a{color:var(--ink);text-decoration:none;border-bottom:1px solid var(--muted);padding-bottom:4px;font-size:12px;letter-spacing:.06em;display:inline-block;margin-top:30px}
a:hover,a:focus-visible{color:var(--wine);border-color:var(--wine)}
</style></head>
<body>
<p class="mono">404 · Page not found</p>
<h1>这一页<em>还没画好</em>。</h1>
<p class="note">你要找的页面不在这里。作品集在下面等你。</p>
<a href="/renaissance-preview.html">回到作品集 →</a>
</body></html>
`;

// robots.txt / sitemap.xml / llms.txt / 404.html 写到站点根（构建产物目录或 gh-pages 检出目录）
export async function writeSiteFiles(dir,{dateModified}={}){
 const date=dateModified??new Date().toISOString().slice(0,10);
 await writeFile(path.join(dir,'robots.txt'),ROBOTS);
 await writeFile(path.join(dir,'sitemap.xml'),sitemap(date));
 await writeFile(path.join(dir,'llms.txt'),llms(date));
 await writeFile(path.join(dir,'404.html'),NOT_FOUND);
}

// CLI：node geo.mjs <构建目录>。给既有产物打补丁（幂等），跳过非作品集的 index.html 壳页。
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const dir=process.argv[2];
 if(!dir)throw new Error('用法：node geo.mjs <构建目录>（含 renaissance-preview.html 或 index.html）');
 const date=new Date().toISOString().slice(0,10);
 let mainCount=0,skipped=[];
 for(const name of ['renaissance-preview.html','index.html']){
  try{
   const p=path.join(dir,name);const html=await readFile(p,'utf8');
   if(!isMainHtml(html)){skipped.push(name);continue;}
   await writeFile(p,applyGeo(html,{kind:'main',date}));mainCount++;
  }catch{}
 }
 const pd=path.join(dir,'assets/renaissance-perf/projects');let projCount=0;
 try{
  for(const f of await readdir(pd)){
   if(!f.endsWith('.html'))continue;
   const p=path.join(pd,f);
   await writeFile(p,applyGeo(await readFile(p,'utf8'),{kind:'project',url:ORIGIN+`/assets/renaissance-perf/projects/${f}`,date}));
   projCount++;
  }
 }catch{}
 await writeSiteFiles(dir,{date});
 console.log(JSON.stringify({main:mainCount,projects:projCount,skipped,siteFiles:['robots.txt','sitemap.xml','llms.txt','404.html']}));
}
