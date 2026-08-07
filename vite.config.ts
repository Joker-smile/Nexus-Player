import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // 设置相对路径，确保 Electron 与 Web 100% 正确加载静态资源
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue'],
          'vendor-player': ['artplayer', 'hls.js'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false, // 端口被占用时自动递增
    cors: true,
    proxy: {
      '/api/lz': {
        target: 'https://cj.lziapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/lz/, ''),
      },
      '/api/gs': {
        target: 'https://api.guangsuapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gs/, ''),
      },
      '/api/ff': {
        target: 'https://api.ffzyapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ff/, ''),
      },
    },
  },
});
