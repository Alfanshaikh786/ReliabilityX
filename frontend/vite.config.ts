import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Ambient process declaration for TypeScript
declare const process: {
  env: Record<string, string | undefined>;
  cwd: () => string;
};

export default defineConfig(({ mode }) => {
  const env = typeof process !== 'undefined' && process.cwd ? loadEnv(mode, process.cwd(), '') : {};
  const backendUrl = env.APP_URL || (typeof process !== 'undefined' ? process.env.APP_URL : undefined) || 'http://127.0.0.1:8000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true
        }
      }
    }
  };
});
