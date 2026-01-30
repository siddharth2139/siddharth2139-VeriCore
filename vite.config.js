
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    // We use a fallback to empty string to ensure the variable is never the literal string "undefined"
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env.VITE_API_KEY': JSON.stringify(process.env.VITE_API_KEY || process.env.API_KEY || ''),
  },
  build: {
    outDir: 'dist',
    target: 'esnext'
  }
});
