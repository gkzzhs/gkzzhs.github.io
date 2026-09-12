import { defineConfig } from 'astro/config';

// 静态输出：首屏纯 HTML/CSS，动效 JS 全部按需
export default defineConfig({
  site: 'https://gkzzhs.github.io',
  output: 'static',
  compressHTML: true,
  // CSS 全量内联：站点 CSS 总量约 22KB，内联省掉一次渲染阻塞请求。
  // 产物放项目树外（../site-dist）：生成物不该躺在源码目录里被当源码扫描，
  // 也避免每次 build 清空产物目录时连带毁掉部署用 .git
  outDir: '../site-dist',
  build: { inlineStylesheets: 'always', emptyOutDir: true },
});
