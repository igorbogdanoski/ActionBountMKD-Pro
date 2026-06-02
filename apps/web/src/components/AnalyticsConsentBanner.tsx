import { useEffect, useState } from 'react';
import { hasAnalyticsConsent, isAnalyticsConfigured, setAnalyticsConsent, syncAnalyticsConsent } from '../utils/analytics';

const DISMISS_KEY = 'avk_analytics_banner_dismissed';

export function AnalyticsConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAnalyticsConfigured()) return;
    if (hasAnalyticsConsent()) return;
    if (window.localStorage.getItem(DISMISS_KEY) === '1') return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  const accept = async () => {
    setAnalyticsConsent(true);
    await syncAnalyticsConsent().catch(() => {});
    setVisible(false);
    window.localStorage.removeItem(DISMISS_KEY);
  };

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] md:inset-x-auto md:right-4 md:bottom-4 md:max-w-md rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">Аналитика</p>
      <p className="text-sm text-slate-200 leading-6">
        Можеме да собираме анонимни product analytics настани за подобрување на onboarding, pricing и player flow. Не праќаме име, email или други PII полиња.
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={accept}
          className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
        >
          Прифати
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="flex-1 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-700"
        >
          Не сега
        </button>
      </div>
    </div>
  );
}