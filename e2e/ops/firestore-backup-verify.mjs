import assert from 'node:assert/strict';
import {
  BACKUP_DRILL_DOCUMENTS,
  BACKUP_DRILL_PROJECT_ID,
} from './firestore-backup-fixture.mjs';

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
if (!emulatorHost) throw new Error('FIRESTORE_EMULATOR_HOST is required for restore verification');
const baseUrl = `http://${emulatorHost}/v1/projects/${BACKUP_DRILL_PROJECT_ID}/databases/(default)/documents`;

function decodeValue(value) {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields ?? {});
  throw new TypeError(`Unsupported Firestore REST value: ${JSON.stringify(value)}`);
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Firestore emulator REST ${response.status}: ${await response.text()}`);
  return response.json();
}

for (const fixture of BACKUP_DRILL_DOCUMENTS) {
  const encodedPath = fixture.path.split('/').map(encodeURIComponent).join('/');
  const restored = await readJson(`${baseUrl}/${encodedPath}`);
  assert.deepEqual(decodeFields(restored.fields ?? {}), fixture.data, `${fixture.path} payload changed during restore`);
}

const expectedCounts = new Map();
for (const fixture of BACKUP_DRILL_DOCUMENTS) {
  const collectionName = fixture.path.split('/')[0];
  expectedCounts.set(collectionName, (expectedCounts.get(collectionName) ?? 0) + 1);
}
for (const [collectionName, expectedCount] of expectedCounts) {
  const listing = await readJson(`${baseUrl}/${encodeURIComponent(collectionName)}?pageSize=1000`);
  assert.equal((listing.documents ?? []).length, expectedCount, `${collectionName} restored count mismatch`);
}

console.log(`Backup restore verification PASS: ${BACKUP_DRILL_DOCUMENTS.length} documents match exactly.`);
