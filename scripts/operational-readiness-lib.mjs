export const APPLICATION_ENVIRONMENT = [
  { name: 'VITE_FIREBASE_API_KEY', classification: 'public-client-config' },
  { name: 'VITE_FIREBASE_AUTH_DOMAIN', classification: 'public-client-config' },
  { name: 'VITE_FIREBASE_PROJECT_ID', classification: 'public-client-config' },
  { name: 'VITE_FIREBASE_STORAGE_BUCKET', classification: 'public-client-config' },
  { name: 'VITE_FIREBASE_MESSAGING_SENDER_ID', classification: 'public-client-config' },
  { name: 'VITE_FIREBASE_APP_ID', classification: 'public-client-config' },
  { name: 'VITE_FIREBASE_MEASUREMENT_ID', classification: 'public-client-config' },
  { name: 'VITE_FIREBASE_DATABASE_ID', classification: 'public-client-config' },
  { name: 'VITE_APP_URL', classification: 'public-client-config' },
  { name: 'VITE_POSTHOG_KEY', classification: 'public-client-config' },
  { name: 'VITE_POSTHOG_HOST', classification: 'public-client-config' },
  { name: 'VITE_SENTRY_DSN', classification: 'public-client-config' },
  { name: 'VITE_STRIPE_PUBLISHABLE_KEY', classification: 'public-client-config' },
  { name: 'EXPO_PUBLIC_FIREBASE_API_KEY', classification: 'public-client-config' },
  { name: 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', classification: 'public-client-config' },
  { name: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID', classification: 'public-client-config' },
  { name: 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', classification: 'public-client-config' },
  { name: 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', classification: 'public-client-config' },
  { name: 'EXPO_PUBLIC_FIREBASE_APP_ID', classification: 'public-client-config' },
  { name: 'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID', classification: 'public-client-config' },
  { name: 'EXPO_PUBLIC_APP_URL', classification: 'public-client-config' },
  { name: 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', classification: 'public-client-config' },
  { name: 'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID', classification: 'public-client-config' },
  { name: 'APP_URL', classification: 'server-config' },
  { name: 'STRIPE_PRICE_STARTER', classification: 'server-config' },
  { name: 'STRIPE_PRICE_PRO', classification: 'server-config' },
  { name: 'GEMINI_API_KEY', classification: 'server-secret' },
  { name: 'STRIPE_SECRET_KEY', classification: 'server-secret' },
  { name: 'STRIPE_WEBHOOK_SECRET', classification: 'server-secret' },
  { name: 'FIREBASE_SERVICE_ACCOUNT', classification: 'server-secret' },
];

const SECRET_WORDS = /(?:SECRET|SERVICE_ACCOUNT|PRIVATE_KEY|PASSWORD|TOKEN|GEMINI_API_KEY)/i;

export function isSecretInPublicEnvironmentName(name) {
  return /^(?:VITE_|EXPO_PUBLIC_)/.test(name) && SECRET_WORDS.test(name);
}

export function findCredentialPatterns(relativePath, source) {
  const findings = [];
  const normalizedPath = relativePath.replaceAll('\\', '/');
  const isPlaceholderFile = normalizedPath === '.env.example';

  if (!isPlaceholderFile && /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(source)) {
    findings.push('private key material');
  }
  if (/\bsk_live_[A-Za-z0-9]{16,}\b/.test(source)) findings.push('Stripe live secret');
  if (/\bwhsec_[A-Za-z0-9]{16,}\b/.test(source)) findings.push('Stripe webhook secret');
  if (/\bghp_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/.test(source)) {
    findings.push('GitHub access token');
  }
  if (/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/.test(source)) findings.push('Slack token');

  for (const match of source.matchAll(/\b(?:VITE_|EXPO_PUBLIC_)[A-Z0-9_]+/g)) {
    if (isSecretInPublicEnvironmentName(match[0])) {
      findings.push(`secret-shaped public environment name ${match[0]}`);
    }
  }

  return [...new Set(findings)];
}

export function referencedApplicationEnvironment(source) {
  const names = new Set();
  for (const match of source.matchAll(/(?:process\.env\.|import\.meta\.env\.)([A-Z][A-Z0-9_]*)/g)) {
    names.add(match[1]);
  }
  return names;
}
