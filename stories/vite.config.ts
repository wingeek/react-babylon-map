import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-babylon-map/maplibre': resolve(__dirname, '../src/maplibre.index.ts'),
      'react-babylon-map': resolve(__dirname, '../src/mapbox.index.ts'),
    }
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    fs: {
      strict: false,
      allow: ['/home/ney/os/react-babylon-map'],
    },
  },
  optimizeDeps: {
    exclude: ['react-babylon-map', '@ifc-lite/geometry', '@ifc-lite/wasm']
  },
  assetsInclude: ['**/*.wasm'],
})
