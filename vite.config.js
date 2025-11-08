import path from 'path'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  root: '.',  // Explicit: Treat monorepo root as base (ensures index.html scan)
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',  // Explicit output dir (for server static serve from ../dist)
    emptyOutDir: true,  // Clean dist before build (avoids stale assets)
    rollupOptions: {
      input: './index.html',  // Key: Forces Rollup to start from root index.html (resolves entry error)
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          radix: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-popover',
            '@radix-ui/react-slider'
          ],
          lucide: ['lucide-react'],
        }
      }
    },
    chunkSizeWarningLimit: 900
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})