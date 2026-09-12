import { defineConfig } from 'astro/config';

// 静态输出：首屏纯 HTML/CSS，动效 JS 全部按需
export default defineConfig({
  site: 'https://gkzzhs.github.io',
  output: 'static',
  compressHTML: true,
  // CSS 全量内联：站点 CSS 总量约 22KB，内联省掉一次渲染阻塞请求
  build: { inlineStylesheets: 'always' },
});
