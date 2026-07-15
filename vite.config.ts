import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
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
          target: process.env.VITE_API_PROXY_TARGET || 'https://atria-api.eaysdev.online',
          changeOrigin: true,
          secure: true,
        },
        // Media (property photos / documents) is served without CORS headers, so a
        // browser can't read it into a canvas or fetch it for the realtor PDF brochure.
        // Proxying keeps it same-origin in dev.
        '/media': {
          target: process.env.VITE_API_PROXY_TARGET || 'https://atria-api.eaysdev.online',
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
