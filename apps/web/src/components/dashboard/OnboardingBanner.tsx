import { useState } from 'react';
import { X, MapPin, Puzzle, Share2, CheckCircle } from 'lucide-react';

const STORAGE_KEY = 'ak_onboarding_dismissed';

interface OnboardingBannerProps {
  onCreateAdventure: () => void;
}

export function OnboardingBanner({ onCreateAdventure }: OnboardingBannerProps) {
  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== '1'; }
    catch { return true; }
  });

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  const steps = [
    { icon: CheckCircle, label: 'Се регистрира', done: true },
    { icon: MapPin, label: 'Создај авантура', done: false },
    { icon: Puzzle, label: 'Додај задачи', done: false },
    { icon: Share2, label: 'Сподели со ученици', done: false },
  ];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-brand-200 bg-gradient-to-br from-brand-50 to-indigo-50">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/60 transition-colors"
        aria-label="Затвори"
      >
        <X size={16} />
      </button>

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl">👋</span>
          <div>
            <h2 className="font-bold text-slate-900 text-lg leading-tight">
              Добредојде во Авантура МКД!
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Создај ја твојата прва интерактивна GPS авантура за 5 минути.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 mb-5">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex sm:flex-col items-center sm:flex-1 gap-2 sm:gap-1">
                <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 flex-shrink-0 ${
                  step.done
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  <Icon size={16} />
                </div>
                <span className={`text-xs font-medium text-center ${step.done ? 'text-green-700' : 'text-slate-500'}`}>
                  {step.label}
                </span>
                {i < steps.length - 1 && (
                  <div className="hidden sm:block flex-1 h-0.5 bg-slate-200 mx-1 mt-[-1.25rem]" />
                )}
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={onCreateAdventure}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
          >
            Создади прва авантура →
          </button>
          <button
            onClick={dismiss}
            className="text-sm text-slate-400 hover:text-slate-600 px-3 py-2 transition-colors"
          >
            Затвори
          </button>
        </div>
      </div>
    </div>
  );
}
