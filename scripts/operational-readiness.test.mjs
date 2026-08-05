import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  findCredentialPatterns,
  isSecretInPublicEnvironmentName,
  referencedApplicationEnvironment,
} from './operational-readiness-lib.mjs';

describe('operational readiness secret boundaries', () => {
  test('rejects secret-shaped client environment names', () => {
    assert.equal(isSecretInPublicEnvironmentName(['VITE_STRIPE', 'SECRET_KEY'].join('_')), true);
    assert.equal(isSecretInPublicEnvironmentName(['EXPO_PUBLIC_GEMINI', 'API_KEY'].join('_')), true);
    assert.equal(isSecretInPublicEnvironmentName('VITE_FIREBASE_API_KEY'), false);
    assert.equal(isSecretInPublicEnvironmentName('VITE_SENTRY_DSN'), false);
  });

  test('finds live credential formats but permits explicit placeholders', () => {
    assert.deepEqual(findCredentialPatterns('api/config.js', `const key = "${'sk_live_'}${'1234567890abcdef'}";`), ['Stripe live secret']);
    assert.deepEqual(findCredentialPatterns('api/key.pem', ['-----BEGIN', 'PRIVATE KEY-----'].join(' ')), ['private key material']);
    const placeholder = `FIREBASE_SERVICE_ACCOUNT={"private_key":"${['-----BEGIN', 'PRIVATE KEY-----'].join(' ')}\\n..."}`;
    assert.deepEqual(findCredentialPatterns('.env.example', placeholder), []);
  });

  test('extracts application environment references from both runtimes', () => {
    const names = referencedApplicationEnvironment(`
      process.env.STRIPE_SECRET_KEY;
      import.meta.env.VITE_FIREBASE_PROJECT_ID;
      process.env.EXPO_PUBLIC_APP_URL;
    `);
    assert.deepEqual([...names].sort(), [
      'EXPO_PUBLIC_APP_URL',
      'STRIPE_SECRET_KEY',
      'VITE_FIREBASE_PROJECT_ID',
    ]);
  });
});
