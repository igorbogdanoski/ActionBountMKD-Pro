import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

// `primary` (brand-500 coral) is the marketing-surface color — Landing,
// LoginModal, InstallPrompt already use it correctly. But the app's actual
// dominant "primary action" color in dashboard/creator/settings/session
// screens is indigo-600, applied ad hoc in ~50+ places outside this
// component. `app-primary` exists so the eventual Button migration has a
// distinct, correct target for those call sites instead of silently
// repainting them coral.
export type ButtonVariant = 'primary' | 'app-primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Escape hatch: replaces the variant's color/background/ring classes
   * entirely (sizing/structure classes are unaffected). For one-off colors
   * during the ad-hoc-to-Button migration that don't warrant a new named
   * variant — prefer a variant when the same color recurs more than once. */
  colorClassName?: string;
}

// `success` (emerald) and `danger` (rose) are the app's single canonical
// choices where ad-hoc markup today mixes emerald/green and red/rose for
// the same semantic meaning (e.g. AdminPanel's green-500 vs emerald
// elsewhere) — matching the palette Badge.tsx already established.
const VARIANTS: Record<ButtonVariant, string> = {
  primary:     'bg-brand-500 text-white hover:bg-brand-600 shadow-soft focus-visible:ring-brand-500',
  'app-primary': 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-soft focus-visible:ring-indigo-500',
  secondary:   'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 focus-visible:ring-slate-400',
  outline:     'border border-brand-500 text-brand-600 hover:bg-brand-500 hover:text-white dark:text-brand-400 focus-visible:ring-brand-500',
  ghost:       'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60 focus-visible:ring-slate-400',
  success:     'bg-emerald-600 text-white hover:bg-emerald-500 shadow-soft focus-visible:ring-emerald-500',
  danger:      'bg-rose-600 text-white hover:bg-rose-500 shadow-soft focus-visible:ring-rose-500',
};

const SIZES: Record<ButtonSize, string> = {
  sm:   'text-xs px-3 py-1.5 gap-1.5 rounded-lg',
  md:   'text-sm px-4 py-2.5 gap-2 rounded-xl',
  lg:   'text-base px-6 py-3 gap-2 rounded-xl',
  icon: 'p-2 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, fullWidth = false, leftIcon, rightIcon, colorClassName, className = '', disabled, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center font-bold transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        colorClassName ?? VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
