/**
 * set-admin-claim.mjs — Grants or revokes the `admin` custom claim on a
 * Firebase Auth user. This is the only source of truth for admin access
 * (see firestore.rules `isAdmin()` and utils/AuthContext.tsx) — there is no
 * client-side UID list to keep in sync anymore.
 *
 * Requires FIREBASE_SERVICE_ACCOUNT in the environment (same var used by
 * apps/web/api/*.ts) — never run this against production without reviewing
 * the target UID first, custom claims take effect on the user's *next*
 * token refresh (up to ~1h, or immediately after they sign out/in).
 *
 * Run:
 *   FIREBASE_SERVICE_ACCOUNT='{...}' node scripts/set-admin-claim.mjs <uid> [--revoke]
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const [, , uid, flag] = process.argv;

if (!uid) {
  console.error('Usage: node scripts/set-admin-claim.mjs <uid> [--revoke]');
  process.exit(1);
}

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT env var.');
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });

const grant = flag !== '--revoke';
const auth = getAuth();

const user = await auth.getUser(uid);
const nextClaims = { ...user.customClaims };
if (grant) {
  nextClaims.admin = true;
} else {
  delete nextClaims.admin;
}
await auth.setCustomUserClaims(uid, nextClaims);

console.log(
  grant
    ? `Granted admin claim to ${uid} (${user.email ?? 'no email'}).`
    : `Revoked admin claim from ${uid} (${user.email ?? 'no email'}).`,
);
console.log('Takes effect on next ID token refresh (user may need to sign out/in).');
