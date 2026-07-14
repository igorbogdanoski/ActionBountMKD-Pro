import type { HTMLAttributes } from 'react';

export type CardTone = 'auto' | 'dark';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  /** 'auto' (default) follows the app-wide light/dark toggle via `dark:`
   * classes. 'dark' always renders the dark palette regardless of theme —
   * for screens like BoundCreator.tsx/LiveSessionHost.tsx that are
   * currently hardcoded dark with no `dark:` classes of their own; wrapping
   * their content in an 'auto' Card would go white under a light theme. */
  tone?: CardTone;
}

const TONES: Record<CardTone, string> = {
  auto: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
  dark: 'bg-slate-800 border-slate-700',
};

export function Card({ padded = true, tone = 'auto', className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl border shadow-soft',
        TONES[tone],
        padded ? 'p-5' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
