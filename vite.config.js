import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'public',
  publicDir: 'assets',
  server: {
    port: 8080,
    open: true
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html')
      }
    }
  },
  optimizeDeps: {
    include: ['three']
  },
  resolve: {
    alias: {
      'three': resolve(__dirname, 'node_modules/three/build/three.module.js')
    }
  }
}); 