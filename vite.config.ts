import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['pdfjs-dist']
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-pdf-lib': ['pdf-lib'],
          'vendor-jspdf': ['jspdf'],
          'vendor-jszip': ['jszip'],
          'vendor-images': ['heic2any', 'utif']
        }
      }
    }
  }
})
