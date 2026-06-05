import { describe, expect, it } from 'vitest';
import { buildSitemapXml, STATIC_ROUTES, SITE_ORIGIN } from '../../scripts/gen-sitemap.mjs';

describe('buildSitemapXml', () => {
  it('emits one <url> block per route with absolute locs', () => {
    const xml = buildSitemapXml(STATIC_ROUTES);
    const count = (xml.match(/<url>/g) ?? []).length;
    expect(count).toBe(STATIC_ROUTES.length);
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/</loc>`);
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/pricing</loc>`);
    expect(xml.startsWith('<?xml')).toBe(true);
  });

  it('normalises relative paths against the origin and keeps absolute URLs', () => {
    const xml = buildSitemapXml(
      [{ path: 'play/abc' }, { loc: 'https://other.example/x' }],
      'https://example.test',
    );
    expect(xml).toContain('<loc>https://example.test/play/abc</loc>');
    expect(xml).toContain('<loc>https://other.example/x</loc>');
  });

  it('escapes XML-special characters in the loc', () => {
    const xml = buildSitemapXml([{ path: '/q?a=1&b=2' }], 'https://example.test');
    expect(xml).toContain('<loc>https://example.test/q?a=1&amp;b=2</loc>');
    expect(xml).not.toContain('a=1&b=2');
  });

  it('omits optional changefreq/priority when absent', () => {
    const xml = buildSitemapXml([{ path: '/bare' }], 'https://example.test');
    expect(xml).toContain('<loc>https://example.test/bare</loc>');
    expect(xml).not.toContain('<changefreq>');
    expect(xml).not.toContain('<priority>');
  });
});
