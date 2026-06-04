import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({ padded = true, className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-soft',
        padded ? 'p-5' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
