import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../utils/AuthContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'google' | 'email';
type EmailMode = 'login' | 'register' | 'reset';

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { t } = useTranslation();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, authError, clearAuthError, loading, user } = useAuth();

  const [tab, setTab] = useState<Tab>('google');
  const [mode, setMode] = useState<EmailMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // Close when auth succeeds
  useEffect(() => {
    if (user && isOpen) onClose();
  }, [user, isOpen, onClose]);

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setTab('google');
      setMode('login');
      setName('');
      setEmail('');
      setPassword('');
      setResetSent(false);
      clearAuthError();
    }
  }, [isOpen, clearAuthError]);

  useEffect(() => {
    if (tab === 'email') emailRef.current?.focus();
  }, [tab, mode]);

  const handleGoogleSignIn = async () => {
    setBusy(true);
    await signInWithGoogle();
    setBusy(false);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    clearAuthError();

    if (mode === 'login') {
      await signInWithEmail(email, password);
    } else if (mode === 'register') {
      await signUpWithEmail(email, password, name);
    } else {
      try {
        await resetPassword(email);
        setResetSent(true);
      } catch {
        // error set by context
      }
    }
    setBusy(false);
  };

  const switchMode = (next: EmailMode) => {
    setMode(next);
    setResetSent(false);
    clearAuthError();
    setPassword('');
  };

  const isEmailMode = tab === 'email';

  return (
    <Modal open={isOpen} onClose={onClose} showHeader={false}>
      <div className="relative overflow-hidden rounded-2xl">
        {/* Close button */}
        <Button
          type="button"
          onClick={onClose}
          size="icon"
          variant="ghost"
          className="absolute top-4 right-4 !p-1.5 text-slate-400 hover:text-slate-600 hover:!bg-slate-100"
          aria-label="Close"
        >
          <X size={18} />
        </Button>

        {/* Header */}
        <div className="bg-[#2a2522] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗺️</span>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Авантура МКД</h2>
              <p className="text-slate-400 text-xs">{t('auth.modal.title')}</p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200">
          {(['google', 'email'] as Tab[]).map((t_) => (
            <Button
              key={t_}
              type="button"
              onClick={() => { setTab(t_); clearAuthError(); }}
              variant="ghost"
              aria-pressed={tab === t_}
              colorClassName={tab === t_
                ? 'border-brand-500 text-brand-600 focus-visible:ring-brand-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 focus-visible:ring-slate-400'}
              className="flex-1 !rounded-none !py-3 !font-medium border-b-2"
            >
              {t_ === 'google' ? t('auth.modal.tabGoogle') : t('auth.modal.tabEmail')}
            </Button>
          ))}
        </div>

        <div className="p-6">
          {/* Error banner */}
          {authError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {authError}
            </div>
          )}

          {/* ── Google Tab ── */}
          {tab === 'google' && (
            <div className="flex flex-col items-center gap-4 py-2">
              <p className="text-slate-500 text-sm text-center leading-relaxed">
                {t('auth.modal.resetHint').includes('email')
                  ? 'Продолжи со твојот Google профил — без лозинка.'
                  : 'Continue with your Google profile.'}
              </p>
              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={busy || loading}
                fullWidth
                colorClassName="border-2 border-slate-200 text-slate-700 hover:border-brand-400 hover:bg-brand-50 focus-visible:ring-brand-400"
                className="!py-3 !gap-3 !font-medium"
              >
                {/* Google G logo */}
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {busy ? t('auth.modal.btnLoading') : t('auth.signInWithGoogle')}
              </Button>
            </div>
          )}

          {/* ── Email Tab ── */}
          {isEmailMode && (
            <div>
              {/* Mode title */}
              <h3 className="text-base font-semibold text-slate-800 mb-4">
                {mode === 'login' && t('auth.modal.loginTitle')}
                {mode === 'register' && t('auth.modal.registerTitle')}
                {mode === 'reset' && t('auth.modal.resetTitle')}
              </h3>

              {resetSent ? (
                <div className="text-center py-4">
                  <div className="text-3xl mb-3">📧</div>
                  <p className="text-green-700 font-medium">{t('auth.modal.resetSent')}</p>
                  <Button
                    type="button"
                    onClick={() => switchMode('login')}
                    variant="ghost"
                    colorClassName="text-brand-600 hover:underline focus-visible:ring-brand-500"
                    className="mt-4 !p-0 !font-medium"
                  >
                    {t('auth.modal.backToLogin')}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  {/* Name — register only */}
                  {mode === 'register' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {t('auth.modal.labelName')}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('auth.modal.namePlaceholder')}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                        required
                        autoComplete="name"
                      />
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {t('auth.modal.labelEmail')}
                    </label>
                    <input
                      ref={emailRef}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('auth.modal.emailPlaceholder')}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                      required
                      autoComplete="email"
                    />
                  </div>

                  {/* Password — login + register only */}
                  {mode !== 'reset' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {t('auth.modal.labelPassword')}
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('auth.modal.passwordPlaceholder')}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                        required
                        minLength={6}
                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      />
                    </div>
                  )}

                  {/* Reset hint */}
                  {mode === 'reset' && (
                    <p className="text-slate-500 text-sm">{t('auth.modal.resetHint')}</p>
                  )}

                  {/* Submit */}
                  <Button
                    type="submit"
                    disabled={busy || loading}
                    variant="primary"
                    fullWidth
                    className="!py-3 !font-semibold"
                  >
                    {busy
                      ? t('auth.modal.btnLoading')
                      : mode === 'login'
                        ? t('auth.modal.btnLogin')
                        : mode === 'register'
                          ? t('auth.modal.btnRegister')
                          : t('auth.modal.btnSendReset')}
                  </Button>
                </form>
              )}

              {/* Footer links */}
              {!resetSent && (
                <div className="mt-4 flex flex-col items-center gap-1.5 text-sm">
                  {mode === 'login' && (
                    <>
                      <Button type="button" variant="ghost" colorClassName="text-brand-600 hover:underline focus-visible:ring-brand-500" className="!p-0 !font-medium" onClick={() => switchMode('register')}>
                        {t('auth.modal.switchToRegister')}
                      </Button>
                      <Button type="button" variant="ghost" colorClassName="text-slate-400 hover:text-slate-600 focus-visible:ring-slate-400" className="!p-0 !text-xs !font-medium" onClick={() => switchMode('reset')}>
                        {t('auth.modal.forgotPassword')}
                      </Button>
                    </>
                  )}
                  {mode === 'register' && (
                    <Button type="button" variant="ghost" colorClassName="text-brand-600 hover:underline focus-visible:ring-brand-500" className="!p-0 !font-medium" onClick={() => switchMode('login')}>
                      {t('auth.modal.switchToLogin')}
                    </Button>
                  )}
                  {mode === 'reset' && (
                    <Button type="button" variant="ghost" colorClassName="text-slate-500 hover:text-slate-700 focus-visible:ring-slate-400" className="!p-0 !text-xs !font-medium" onClick={() => switchMode('login')}>
                      {t('auth.modal.backToLogin')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
