import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '../apps/web');
const authModule = path.resolve(webRoot, 'src/utils/AuthContext.tsx');
const storageModule = path.resolve(webRoot, 'src/utils/storage.ts');
const firebaseModule = path.resolve(webRoot, 'src/utils/firebase.ts');
const sessionStorageModule = path.resolve(webRoot, 'src/utils/sessionStorage.ts');
const authMock = path.resolve(here, 'fixtures/qaAuthContext.tsx');
const storageMock = path.resolve(here, 'fixtures/qaStorage.ts');
const firebaseMock = path.resolve(here, 'fixtures/qaFirebase.ts');
const sessionStorageMock = path.resolve(here, 'fixtures/qaSessionStorage.ts');

function normalize(id: string) {
  return path.normalize(id.split('?')[0]);
}

/**
 * Resolve the real app normally, then replace only the two browser-bound
 * Firebase modules needed by authenticated QA. This config is never used by
 * the production build, so the shipping application contains no QA auth path.
 */
function authenticatedQaMocks(): Plugin {
  return {
    name: 'authenticated-qa-mocks',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || source.startsWith('\0')) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved) return null;
      const id = normalize(resolved.id);
      if (id === normalize(authModule)) return authMock;
      if (id === normalize(storageModule)) return storageMock;
      if (id === normalize(firebaseModule)) return firebaseMock;
      if (id === normalize(sessionStorageModule)) return sessionStorageMock;
      return null;
    },
  };
}

export default defineConfig({
  root: webRoot,
  plugins: [authenticatedQaMocks(), react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 3100,
    strictPort: true,
  },
  resolve: {
    alias: { '@': webRoot },
  },
});
