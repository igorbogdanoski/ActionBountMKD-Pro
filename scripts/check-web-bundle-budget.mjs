import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  collectInitialAssetPaths,
  evaluateBudgetRows,
  formatKiB,
} from './bundle-budget-lib.mjs';

const distDir = fileURLToPath(new URL('../apps/web/dist/', import.meta.url));
const assetsDir = path.join(distDir, 'assets');
const html = await readFile(path.join(distDir, 'index.html'), 'utf8');
const initialPaths = collectInitialAssetPaths(html);
const initialAssets = await Promise.all(initialPaths.map(async relativePath => {
  const absolutePath = path.join(distDir, relativePath);
  const content = await readFile(absolutePath);
  return { relativePath, content, rawBytes: content.byteLength, gzipBytes: gzipSync(content).byteLength };
}));

const assetNames = (await readdir(assetsDir)).filter(name => name.endsWith('.js'));
const assetMetric = async prefix => {
  const matches = assetNames.filter(name => name.startsWith(`${prefix}-`));
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one ${prefix}-*.js asset, found ${matches.length}`);
  }
  const content = await readFile(path.join(assetsDir, matches[0]));
  return { name: matches[0], rawBytes: content.byteLength, gzipBytes: gzipSync(content).byteLength };
};

const entry = initialAssets.find(asset => asset.relativePath.endsWith('.js') && /\/index-[^/]+\.js$/.test(asset.relativePath));
if (!entry) throw new Error('Entry index-*.js was not found in dist/index.html');

const initialJs = initialAssets.filter(asset => asset.relativePath.endsWith('.js'));
const initialCss = initialAssets.filter(asset => asset.relativePath.endsWith('.css'));
const sum = (assets, key) => assets.reduce((total, asset) => total + asset[key], 0);

const namedBudgets = [
  ['vendor-react', 245, 80],
  ['vendor-firebase-auth', 185, 40],
  ['vendor-firebase-firestore', 340, 90],
  ['vendor-firebase-storage', 55, 15],
  ['vendor-charts', 390, 120],
  ['vendor-qr', 410, 125],
  ['vendor-maps', 170, 55],
  ['vendor-motion', 110, 40],
  ['vendor-dnd', 55, 20],
  ['MathRenderer', 280, 85],
  ['jspdf.es.min', 410, 135],
  ['html2canvas.esm', 215, 55],
  ['module', 245, 85],
  ['index.es', 175, 60],
];

const namedMetrics = await Promise.all(namedBudgets.map(async ([prefix, rawLimit, gzipLimit]) => ({
  prefix,
  rawLimit,
  gzipLimit,
  metric: await assetMetric(prefix),
})));

const routePrefixes = [
  'LandingPage', 'DashboardLayout', 'BoundsDashboard', 'BoundCreator',
  'MobilePlayer', 'ResultsDashboard', 'TemplatesLibrary', 'ClassGroups',
  'SettingsPage', 'PricingPage', 'AdminPanel', 'PublicLeaderboard',
  'LiveSessionHost', 'JoinSession', 'PrivacyPolicy', 'TermsOfService',
  'ExplorePage', 'ChangelogPage',
];
const routeMetrics = await Promise.all(routePrefixes.map(prefix => assetMetric(prefix)));

const rows = [
  { label: 'initial JS raw', actualBytes: sum(initialJs, 'rawBytes'), limitKiB: 650 },
  { label: 'initial JS gzip', actualBytes: sum(initialJs, 'gzipBytes'), limitKiB: 190 },
  { label: 'initial CSS raw', actualBytes: sum(initialCss, 'rawBytes'), limitKiB: 125 },
  { label: 'initial CSS gzip', actualBytes: sum(initialCss, 'gzipBytes'), limitKiB: 20 },
  { label: 'entry raw', actualBytes: entry.rawBytes, limitKiB: 215 },
  { label: 'entry gzip', actualBytes: entry.gzipBytes, limitKiB: 70 },
  ...namedMetrics.flatMap(({ prefix, rawLimit, gzipLimit, metric }) => [
    { label: `${prefix} raw`, actualBytes: metric.rawBytes, limitKiB: rawLimit },
    { label: `${prefix} gzip`, actualBytes: metric.gzipBytes, limitKiB: gzipLimit },
  ]),
  ...routeMetrics.flatMap(metric => [
    { label: `${metric.name} raw`, actualBytes: metric.rawBytes, limitKiB: 125 },
    { label: `${metric.name} gzip`, actualBytes: metric.gzipBytes, limitKiB: 35 },
  ]),
];

const evaluated = evaluateBudgetRows(rows);
const failures = evaluated.filter(row => !row.passed);

console.log('Bundle budget report');
for (const row of evaluated) {
  const marker = row.passed ? 'PASS' : 'FAIL';
  console.log(`${marker} ${row.label}: ${formatKiB(row.actualBytes)} KiB / ${row.limitKiB.toFixed(2)} KiB`);
}

if (failures.length > 0) {
  console.error(`Bundle budget failed: ${failures.length} limit(s) exceeded.`);
  process.exitCode = 1;
} else {
  console.log(`Bundle budget passed: ${evaluated.length} limits checked.`);
}
