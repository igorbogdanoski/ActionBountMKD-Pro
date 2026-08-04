import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '../apps/web');
const authModule = path.resolve(webRoot, 'src/utils/AuthContext.tsx');
const firebaseModule = path.resolve(webRoot, 'src/utils/firebase.ts');
const authMock = path.resolve(here, 'fixtures/qaPublicAuthContext.tsx');
const firebaseMock = path.resolve(here, 'fixtures/qaFirebase.ts');

function normalize(id: string) {
  return path.normalize(id.split('?')[0]);
}

/**
 * Keep public browser smoke tests deterministic when local Firebase credentials
 * are absent or revoked. This config is QA-only and is never used by the
 * production build.
 */
function publicQaMocks(): Plugin {
  return {
    name: 'public-qa-mocks',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || source.startsWith('\0')) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved) return null;
      const id = normalize(resolved.id);
      if (id === normalize(authModule)) return authMock;
      if (id === normalize(firebaseModule)) return firebaseMock;
      return null;
    },
  };
}

export default defineConfig({
  root: webRoot,
  plugins: [publicQaMocks(), react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
  },
  resolve: {
    alias: { '@': webRoot },
  },
});
