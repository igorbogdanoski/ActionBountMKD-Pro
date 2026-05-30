import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import mk from './mk.json';
import en from './en.json';

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
