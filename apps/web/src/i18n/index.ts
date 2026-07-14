import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import mk from './mk.json';
import en from './en.json';

// Decision record (Phase 3 SEO audit): English stays UI-only, deliberately
// not promoted to crawlable /en content routes with hreflang. The language
// choice lives in localStorage — Googlebot never sees it, so 100% of organic
// search traffic can only ever reach the Macedonian content regardless of
// translation quality. That's accepted as correct for now: every other
// content decision in this app (the 15 curated templates, БРО curriculum
// alignment, МОН/БРО positioning) targets Macedonian schools specifically,
// so there's no real EN organic-search audience to capture yet. Revisit this
// if/when international expansion becomes an actual goal — at that point
// this needs real /en routes, hreflang tags, and localized content, not
// just a client-side string swap.
const STORAGE_KEY = 'ak_lang';

export type SupportedLang = 'mk' | 'en';

export const LANGUAGES: { code: SupportedLang; label: string; flag: string }[] = [
  { code: 'mk', label: 'Македонски', flag: '🇲🇰' },
  { code: 'en', label: 'English',    flag: '🇬🇧' },
];

const savedLang = (localStorage.getItem(STORAGE_KEY) as SupportedLang) || 'mk';

i18n
  .use(initReactI18next)
  .init({
    resources: { mk: { translation: mk }, en: { translation: en } },
    lng: savedLang,
    fallbackLng: 'mk',
    interpolation: { escapeValue: false }, // React already escapes
  });

// Persist language choice and update <html lang>
i18n.on('languageChanged', (lang) => {
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
});

// Set initial lang attribute
document.documentElement.lang = savedLang;

export default i18n;
