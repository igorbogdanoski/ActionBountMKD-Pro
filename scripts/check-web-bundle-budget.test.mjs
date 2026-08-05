import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectInitialAssetPaths,
  evaluateBudgetRows,
  formatKiB,
} from './bundle-budget-lib.mjs';

test('collectInitialAssetPaths returns only emitted JS and CSS assets', () => {
  const html = `
    <script type="module" src="/assets/index-abc.js"></script>
    <link rel="modulepreload" href="/assets/vendor-react-def.js">
    <link rel="stylesheet" href="/assets/index-ghi.css">
    <link rel="manifest" href="/manifest.json">
  `;
  assert.deepEqual(collectInitialAssetPaths(html), [
    'assets/index-abc.js',
    'assets/vendor-react-def.js',
    'assets/index-ghi.css',
  ]);
});

test('evaluateBudgetRows accepts the exact limit and fails closed above it', () => {
  const [exact, exceeded] = evaluateBudgetRows([
    { label: 'exact', actualBytes: 10 * 1024, limitKiB: 10 },
    { label: 'exceeded', actualBytes: 10 * 1024 + 1, limitKiB: 10 },
  ]);
  assert.equal(exact.passed, true);
  assert.equal(exceeded.passed, false);
});

test('formatKiB produces stable two-decimal evidence', () => {
  assert.equal(formatKiB(1536), '1.50');
});
