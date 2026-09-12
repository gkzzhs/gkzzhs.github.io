#!/bin/sh
# 一键部署：构建 → 快照式推送到 gh-pages。
# 产物输出到 ../site-dist（项目树外，见 astro.config.mjs 的 outDir），
# 每次部署在 /tmp 的 gh-pages 克隆里做整目录 rsync，避免产物目录与 git 仓库互相清理。
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

npm --prefix "$ROOT" run build

rm -rf /tmp/ryan-gh
git clone -q https://github.com/gkzzhs/gkzzhs.github.io.git /tmp/ryan-gh -b gh-pages
rsync -a --delete --exclude '.git' "$ROOT/../site-dist/" /tmp/ryan-gh/
cd /tmp/ryan-gh
git add -A
if git commit -q -m "build: $(date +%F\ %H:%M)"; then
  git push -q origin gh-pages
  echo "✓ 已部署，约 1 分钟后生效：https://gkzzhs.github.io/"
else
  echo "构建产物与线上一致，无需部署"
fi
