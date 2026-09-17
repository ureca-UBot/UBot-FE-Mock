import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/UBot-FE-Mock/',
  plugins: [react()],
});
