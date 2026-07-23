import { describe, expect, it } from 'vitest';
import mk from '../i18n/mk.json';
import en from '../i18n/en.json';

describe('Landing translations', () => {
  it.each([
    ['mk', mk],
    ['en', en],
  ] as const)('provides complete featured-adventure copy for %s', (_locale, messages) => {
    const featured = messages.landing.featured;

    expect(featured.title).toBeTruthy();
    expect(featured.subtitle).toBeTruthy();
    expect(featured.viewAll).toBeTruthy();
    expect(featured.openLabel).toContain('{{title}}');
    expect(featured.duration).toContain('{{count}}');
    expect(featured.items).toHaveLength(3);

    for (const item of featured.items) {
      expect(item).toEqual(expect.objectContaining({
        emoji: expect.any(String),
        title: expect.any(String),
        subject: expect.any(String),
        grade: expect.any(String),
        desc: expect.any(String),
        time: expect.any(Number),
      }));
    }
  });

  it('provides an accessible language-group label in both locales', () => {
    expect(mk.landing.nav.language).toBe('Јазик');
    expect(en.landing.nav.language).toBe('Language');
  });
});
