import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

function normalizeBasePath(value: string | undefined): string {
  if (!value || value === '/') return '/';
  return `/${value.replace(/^\/+|\/+$/g, '')}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080';
  const configuredPort = Number.parseInt(env.VITE_DEV_PORT || '5173', 10);
  const port = Number.isFinite(configuredPort) ? configuredPort : 5173;

  return {
    base: normalizeBasePath(env.VITE_BASE_PATH),
    plugins: [react()],
    server: {
      port,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
