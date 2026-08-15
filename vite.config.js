import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    modulePreload: { polyfill: false },
  },
});
