import type { HTMLAttributes } from 'react';

export type BadgeColor = 'brand' | 'emerald' | 'amber' | 'slate' | 'rose' | 'indigo';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
}

const COLORS: Record<BadgeColor, string> = {
  brand:   'bg-brand-50 text-brand-700 border-brand-200/60 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-700/40',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40',
  amber:   'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40',
  slate:   'bg-slate-100 text-slate-600 border-slate-200/60 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600/40',
  rose:    'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700/40',
  indigo:  'bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700/40',
};

export function Badge({ color = 'brand', className = '', children, ...rest }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border',
        COLORS[color],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </span>
  );
}
