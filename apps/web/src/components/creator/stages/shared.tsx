import type { ReactNode } from 'react';
import { Button } from '../../ui/Button';

// ─── Tab component ─────────────────────────────────────────────────────────────

interface TabsProps {
  tabs: string[];
  active: number;
  onChange: (i: number) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex border-b border-slate-700 mb-5" role="tablist">
      {tabs.map((tab, i) => (
        <Button
          key={tab}
          type="button"
          role="tab"
          aria-selected={active === i}
          onClick={() => onChange(i)}
          size="sm"
          colorClassName={active === i
            ? 'border-indigo-500 text-indigo-400 focus-visible:ring-indigo-500'
            : 'border-transparent text-slate-400 hover:text-slate-200 focus-visible:ring-slate-500'}
          className="rounded-none border-b-2 px-4 py-2.5 text-sm"
        >
          {tab}
        </Button>
      ))}
    </div>
  );
}

// ─── Form field ────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// ─── Text input ────────────────────────────────────────────────────────────────

export const inputCls = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors';
export const textareaCls = `${inputCls} resize-none`;

// ─── Toggle ────────────────────────────────────────────────────────────────────

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}

export function Toggle({ label, checked, onChange, hint }: ToggleProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
        <div className={`w-10 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-500' : 'bg-slate-700'}`} />
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
    </label>
  );
}
