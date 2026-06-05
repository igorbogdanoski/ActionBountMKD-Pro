import { useState, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import { User, Palette, CreditCard, Check, Loader2, Sun, Moon, Globe, Shield, LogOut, ChevronRight, BellRing } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { upsertUserProfile, getUserTheme, getUserSettings, saveUserTheme } from '../../utils/storage';
import { sendTestPushNotification } from '../../utils/pushNotifications';
import { readOutdoorPref, outdoorPrefValue, OUTDOOR_STORAGE_KEY, OUTDOOR_CLASS } from '../../utils/displayPrefs';
import { Toggle } from '../ui';
import { LANGUAGES, type SupportedLang } from '../../i18n';
import { PAYMENT_CONFIG } from '../../config/payment';
import type { PlanId } from 'shared';

const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const PLAN_COLORS: Record<PlanId, string> = {
  free:       'bg-slate-500/20 text-slate-300 border-slate-500/30',
  starter:    'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  pro:        'bg-violet-500/20 text-violet-300 border-violet-500/30',
  enterprise: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('mk-MK', { year: 'numeric', month: 'long', day: 'numeric' });
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-700 bg-slate-800/60 divide-y divide-slate-700 ${className}`}>
      {children}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const { user, profile, logout } = useAuth();
  const { planId, limits } = usePlan();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'profile' | 'appearance' | 'account'>('profile');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [outdoor, setOutdoor] = useState(() => readOutdoorPref(typeof window !== 'undefined' ? window.localStorage : null));
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPermission, setPushPermission] = useState<string>('undetermined');
  const [pushError, setPushError] = useState<string | null>(null);
  const [sendingPush, setSendingPush] = useState(false);

  const isAdmin = user ? (PAYMENT_CONFIG.adminUids as readonly string[]).includes(user.uid) : false;

  useEffect(() => {
    if (user) {
      getUserTheme(user.uid).then(t => setIsDark(t !== 'light'));
      getUserSettings(user.uid).then(settings => {
        setPushToken(settings?.expoPushToken ?? null);
        setPushEnabled(Boolean(settings?.notificationsEnabled && settings?.expoPushToken));
        setPushPermission(settings?.notificationPermissionStatus ?? 'undetermined');
        setPushError(settings?.notificationError ?? null);
      });
    }
  }, [user]);

  const saveDisplayName = async () => {
    if (!user || !displayName.trim() || displayName === user.displayName) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      if (profile) {
        await upsertUserProfile({ ...profile, displayName: displayName.trim() });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleTheme = async () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    if (user) await saveUserTheme(user.uid, newDark ? 'dark' : 'light');
  };

  const switchLang = (code: SupportedLang) => i18n.changeLanguage(code);

  const toggleOutdoor = (next: boolean) => {
    setOutdoor(next);
    try { window.localStorage.setItem(OUTDOOR_STORAGE_KEY, outdoorPrefValue(next)); } catch { /* ignore */ }
    document.documentElement.classList.toggle(OUTDOOR_CLASS, next);
  };

  const sendPushTest = async () => {
    if (!pushToken) return;
    setSendingPush(true);
    setPushError(null);
    try {
      await sendTestPushNotification(pushToken);
    } catch (error) {
      setPushError(error instanceof Error ? error.message : 'Не успеа тест push барањето.');
    } finally {
      setSendingPush(false);
    }
  };

  const TABS = [
    { id: 'profile' as const,    label: 'Профил',   icon: User },
    { id: 'appearance' as const, label: 'Изглед',   icon: Palette },
    { id: 'account' as const,    label: 'Сметка',   icon: CreditCard },
  ];

  return (
    <div className="max-w-2xl mx-auto w-full p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Поставки</h1>
        <p className="text-sm text-slate-400 mt-1">Управувај со профилот, изгледот и сметката.</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-slate-700">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── ПРОФИЛ ─────────────────────────────────────────────────────────── */}
      {tab === 'profile' && (
        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 rounded-2xl border border-slate-700 bg-slate-800/60 p-4 sm:p-5 text-center sm:text-left">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Профил" className="w-14 h-14 sm:w-16 sm:h-16 rounded-full ring-2 ring-indigo-500/40 shrink-0" />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {(displayName || user?.email || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-white text-lg truncate">{user?.displayName || 'Без ime'}</p>
              <p className="text-sm text-slate-400 truncate">{user?.email}</p>
              <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${PLAN_COLORS[planId]}`}>
                {PLAN_LABELS[planId]}
              </span>
            </div>
          </div>

          {/* Display name */}
          <SectionCard>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Прикажано ime
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveDisplayName()}
                    placeholder="Твое iмe"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={saveDisplayName}
                    disabled={saving || !displayName.trim() || displayName === user?.displayName}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors flex items-center gap-1.5 justify-center"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><Check className="w-4 h-4" /> Зачувано</> : 'Зачувај'}
                  </button>
                </div>
              </div>
            </div>
            <Row label="Email" hint="Не може да се менува — поврзано со Google">
              <span className="text-sm text-slate-400">{user?.email}</span>
            </Row>
            <Row label="Лозинка" hint="Пријавен си преку Google OAuth">
              <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded-lg">Google SSO</span>
            </Row>
          </SectionCard>

          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-indigo-400" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-indigo-300">Admin панел</p>
                  <p className="text-xs text-slate-500">Управувај со плаќања и шаблони</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          )}
        </div>
      )}

      {/* ── ИЗГЛЕД ─────────────────────────────────────────────────────────── */}
      {tab === 'appearance' && (
        <div className="space-y-4">
          <SectionCard>
            <Row label="Тема" hint="Темна или светла позадина">
              <button
                type="button"
                onClick={toggleTheme}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                  isDark
                    ? 'bg-slate-700 text-slate-200'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {isDark ? 'Темна' : 'Светла'}
              </button>
            </Row>
            <Row label="Режим за надвор" hint="Висок контраст за читливост на сонце">
              <Toggle checked={outdoor} onChange={toggleOutdoor} label="Режим за надвор" />
            </Row>
            <Row label="Јазик" hint="Јазик на интерфејсот">
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => switchLang(lang.code)}
                    title={lang.label}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      i18n.language === lang.code
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {lang.flag} {lang.code.toUpperCase()}
                  </button>
                ))}
              </div>
            </Row>
          </SectionCard>
        </div>
      )}

      {/* ── СМЕТКА ─────────────────────────────────────────────────────────── */}
      {tab === 'account' && (
        <div className="space-y-4">
          <SectionCard>
            <Row label="Тековен план">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${PLAN_COLORS[planId]}`}>
                  {PLAN_LABELS[planId]}
                </span>
                {(planId === 'free' || planId === 'starter') && (
                  <button
                    type="button"
                    onClick={() => navigate('/pricing')}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Надгради →
                  </button>
                )}
              </div>
            </Row>
            <Row label="Авантури" hint="Искористено / максимум">
              <span className="text-sm font-mono text-slate-300">
                — / {limits.maxQuests === -1 ? '∞' : limits.maxQuests}
              </span>
            </Row>
            <Row label="CSV извоз">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${limits.canExportCSV ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                {limits.canExportCSV ? '✓ Активно' : '✗ Недостапно'}
              </span>
            </Row>
            <Row label="Соработка">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${limits.canCollaborate ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                {limits.canCollaborate ? '✓ Активно' : '✗ Недостапно'}
              </span>
            </Row>
          </SectionCard>

          <SectionCard>
            <Row label="Член од" hint={profile?.createdAt ? formatDate(profile.createdAt) : '—'}>
              <span className="text-xs text-slate-500">
                {profile?.createdAt ? new Date(profile.createdAt).getFullYear() : '—'}
              </span>
            </Row>
            <Row label="Kориснички ID" hint="За поддршка и debug">
              <code className="text-[10px] font-mono bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg text-slate-400 select-all max-w-[160px] truncate block">
                {user?.uid}
              </code>
            </Row>
          </SectionCard>

          <SectionCard>
            <Row label="Mobile push" hint="Статус на регистрираниот мобилен уред за известувања">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pushEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                {pushEnabled ? '✓ Активно' : `✗ ${pushPermission}`}
              </span>
            </Row>
            <div className="px-5 py-4 space-y-3">
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Expo Push Token</p>
                <code className="block text-[11px] leading-5 text-slate-300 break-all min-h-[20px]">
                  {pushToken || 'Нема регистриран token. Вклучи известувања од mobile Settings.'}
                </code>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Тестот праќа push кон тековниот мобилен уред и отвора `/settings` при tap.
                </p>
                <button
                  type="button"
                  onClick={sendPushTest}
                  disabled={!pushToken || sendingPush}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sendingPush ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
                  Испрати тест push
                </button>
              </div>
              {pushError && <p className="text-xs text-rose-400">{pushError}</p>}
            </div>
          </SectionCard>

          <SectionCard>
            <div className="px-5 py-4">
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-2.5 text-sm font-semibold text-red-400 hover:text-red-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Одјави се
              </button>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

