/* typography-scan.cjs — 构建期中文排版盘点（chinese-web-typography 技能第一步：inspect）
 * 1) 扫 src/data/site.ts 引号内的中文字符串，标出含 中英/数字边界 的文案（pangu 候选）
 * 2) 输出候选经过 pangu.spaceText 的前后对照，供人工审（pangu 对标点也有一键见，不能盲过）
 * 3) 顺带统计每个字段的字符长度，供后续孤字尾行分析
 */
const fs = require('fs');
const pangu = require('pangu');

const src = fs.readFileSync('src/data/site.ts', 'utf8');
/* 提取所有单引号字符串（site.ts 的文案约定是单引号） */
const strings = [...src.matchAll(/'([^']*)'/g)].map((m) => m[1]).filter((s) => /[\u4e00-\u9fff]/.test(s));

const boundary = /[\u4e00-\u9fff][A-Za-z0-9]|[A-Za-z0-9][\u4e00-\u9fff]/;
const candidates = [];
const stable = [];
for (const s of strings) {
  if (/\d/.test(s) === false && boundary.test(s) === false) continue;
  const spaced = pangu.spaceText(s);
  if (spaced !== s) candidates.push([s, spaced]);
  else stable.push(s);
}

console.log('=== pangu 候选（前 → 后）：' + candidates.length + ' 条');
for (const [a, b] of candidates) console.log(`- ${JSON.stringify(a)}\n  → ${JSON.stringify(b)}`);
console.log('\n=== 已含空格/无需变化的边界文案：' + stable.length + ' 条');
for (const s of stable.slice(0, 30)) console.log(`- ${JSON.stringify(s)} (${s.length}字)`);
