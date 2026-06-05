/**
 * gen-sitemap.mjs — Generates public/sitemap.xml without external dependencies.
 * Single source of truth for the public URL set; the pure builder is unit-tested
 * from src/test/sitemap.test.ts. Static routes live here; dynamic public quests
 * can be appended by passing extra entries to buildSitemapXml().
 * Run: node scripts/gen-sitemap.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE_ORIGIN = 'https://avantura.mismath.net';

/** Static, always-present routes. Paths are origin-relative. */
export const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/pricing', changefreq: 'monthly', priority: '0.9' },
  { path: '/play/demo', changefreq: 'monthly', priority: '0.7' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeLoc(origin, path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Builds a sitemap XML string from route entries. Pure: deterministic output for
 * deterministic input, no I/O. Each entry: { path|loc, changefreq?, priority? }.
 */
export function buildSitemapXml(routes, origin = SITE_ORIGIN) {
  const urls = routes
    .map((route) => {
      const loc = escapeXml(normalizeLoc(origin, route.loc ?? route.path));
      const lines = [`    <loc>${loc}</loc>`];
      if (route.changefreq) lines.push(`    <changefreq>${route.changefreq}</changefreq>`);
      if (route.priority) lines.push(`    <priority>${route.priority}</priority>`);
      return `  <url>\n${lines.join('\n')}\n  </url>`;
    })
    .join('\n\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n${urls}\n\n</urlset>\n`;
}

function isMain() {
  return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
}

if (isMain()) {
  const __dir = dirname(fileURLToPath(import.meta.url));
  const out = join(__dir, '..', 'public', 'sitemap.xml');
  writeFileSync(out, buildSitemapXml(STATIC_ROUTES), 'utf8');
  console.log(`sitemap.xml written: ${STATIC_ROUTES.length} URLs -> ${out}`);
}
