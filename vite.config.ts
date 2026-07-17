import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  // Vite doesn't expose .env to the config via process.env — load it explicitly so
  // VITE_API_PROXY_TARGET (which points the dev proxy at the backend that has the
  // seeded accounts) is picked up from .env, not just the shell environment.
  const env = {...process.env, ...loadEnv(mode, process.cwd(), '')};
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'https://atria-api.eaysdev.online';
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Dev-only reverse proxy: the browser calls same-origin /api/* and Vite forwards
      // it to the backend, sidestepping the missing CORS headers. In dev the API client
      // uses an empty base URL so requests hit this proxy.
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          // Only verify TLS for https targets; a local http backend has no cert.
          secure: proxyTarget.startsWith('https'),
        },
        // Media (property photos / documents) is served without CORS headers, so a
        // browser can't read it into a canvas or fetch it for the realtor PDF brochure.
        // Proxying keeps it same-origin in dev.
        '/media': {
          target: proxyTarget,
          changeOrigin: true,
          secure: proxyTarget.startsWith('https'),
        },
      },
    },
  };
});
