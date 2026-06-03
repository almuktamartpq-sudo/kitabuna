import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  publicDir: 'public', // Copy public folder to dist
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        app: 'app.html'
      }
    }
  },
  server: {
    port: 1420,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    cors: true,
    hmr: {
      overlay: false // Disable error overlay
    }
  },
  preview: {
    port: 4173,
    host: '0.0.0.0', // Listen on all interfaces untuk preview
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['*']
    }
  }
});