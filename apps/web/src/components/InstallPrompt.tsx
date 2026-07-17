import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from './ui/Button';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'av_install_prompt_dismissed';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Don't show if user already dismissed recently (7 days)
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const since = Date.now() - Number(dismissed);
      if (since < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Don't show if already installed (running in standalone)
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((navigator as Navigator & { standalone?: boolean }).standalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Small delay so the page loads first
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setVisible(false);
        setDeferredPrompt(null);
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  if (!visible || !deferredPrompt) return null;

  return (
    <div
      role="banner"
      aria-label="Додај на почетен екран"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm
                 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
                 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 animate-slide-up"
    >
      {/* Icon */}
      <div className="shrink-0 w-11 h-11 rounded-xl bg-brand-500 flex items-center justify-center">
        <img src="/icon-192.png" alt="" className="w-8 h-8 rounded-lg" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
          Додај Авантура на почетниот екран
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
          Работи и без интернет · Нема App Store
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleInstall}
          disabled={installing}
          className="!font-semibold !shadow-none disabled:opacity-60"
        >
          {installing ? '…' : 'Инсталирај'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          aria-label="Затвори"
          colorClassName="text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-gray-400"
          className="!p-1.5"
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  );
}
