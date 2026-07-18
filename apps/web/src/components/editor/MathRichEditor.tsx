import { useRef, useState, useCallback } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Button } from '../ui/Button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MathRichEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  hint?: string;
}

// ─── Math symbol groups ───────────────────────────────────────────────────────

const SYMBOL_GROUPS = [
  {
    label: 'Аритметика',
    symbols: [
      { display: '×', insert: '\\times' },
      { display: '÷', insert: '\\div' },
      { display: '±', insert: '\\pm' },
      { display: '≠', insert: '\\neq' },
      { display: '≤', insert: '\\leq' },
      { display: '≥', insert: '\\geq' },
      { display: '≈', insert: '\\approx' },
    ],
  },
  {
    label: 'Степени / Корени',
    symbols: [
      { display: 'x²', insert: 'x^{2}' },
      { display: 'x³', insert: 'x^{3}' },
      { display: 'xⁿ', insert: 'x^{n}' },
      { display: '√x', insert: '\\sqrt{x}' },
      { display: '∛x', insert: '\\sqrt[3]{x}' },
      { display: 'ⁿ√x', insert: '\\sqrt[n]{x}' },
    ],
  },
  {
    label: 'Дропки',
    symbols: [
      { display: 'a/b', insert: '\\frac{a}{b}' },
      { display: '½', insert: '\\frac{1}{2}' },
      { display: '¼', insert: '\\frac{1}{4}' },
      { display: '¾', insert: '\\frac{3}{4}' },
    ],
  },
  {
    label: 'Грчки / Константи',
    symbols: [
      { display: 'π', insert: '\\pi' },
      { display: 'α', insert: '\\alpha' },
      { display: 'β', insert: '\\beta' },
      { display: 'θ', insert: '\\theta' },
      { display: '∞', insert: '\\infty' },
      { display: '∑', insert: '\\sum' },
      { display: '∫', insert: '\\int' },
    ],
  },
];

// ─── KaTeX renderer ───────────────────────────────────────────────────────────

function renderMath(text: string): string {
  // Replace $$...$$ block math first, then $...$ inline
  let result = text
    .replace(/\$\$([^$]+)\$\$/g, (_, formula) => {
      try {
        return `<div class="katex-block">${katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false })}</div>`;
      } catch {
        return `<span class="text-red-400 text-xs">[Грешка: ${formula}]</span>`;
      }
    })
    .replace(/\$([^$\n]+)\$/g, (_, formula) => {
      try {
        return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
      } catch {
        return `<span class="text-red-400 text-xs">[Грешка: ${formula}]</span>`;
      }
    });

  // Convert newlines to <br> for display
  return result.replace(/\n/g, '<br/>');
}

function hasmath(text: string): boolean {
  return /\$[^$]/.test(text);
}

// ─── Editor ───────────────────────────────────────────────────────────────────

export function MathRichEditor({ value, onChange, placeholder, rows = 4, label, hint }: MathRichEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSymbols, setShowSymbols] = useState(false);
  const [showPreview, setShowPreview]   = useState(false);

  // Insert text at cursor position
  const insertAt = useCallback((before: string, after = '', wrap = false) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const selected = value.slice(start, end);
    const insert = wrap && selected
      ? `${before}${selected}${after}`
      : `${before}${after}`;
    const cursorPos = start + before.length + (wrap ? selected.length : 0);

    const next = value.slice(0, start) + insert + value.slice(end);
    onChange(next);

    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  }, [value, onChange]);

  const wrapBold   = () => insertAt('**', '**', true);
  const wrapItalic = () => insertAt('*', '*', true);
  const wrapInlineMath = () => insertAt('$', '$', true);
  const wrapBlockMath  = () => insertAt('\n$$\n', '\n$$\n', true);

  const insertSymbol = (sym: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    // If there's an open $ before cursor, insert raw LaTeX; else wrap in $...$
    const before = value.slice(0, start);
    const inMath = /\$[^$]*$/.test(before);
    const insert = inMath ? sym : `$${sym}$`;
    const next = before + insert + value.slice(ta.selectionEnd);
    onChange(next);
    const pos = start + insert.length;
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(pos, pos); });
  };

  const toolbarColor = 'text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 hover:border-slate-500 focus-visible:ring-slate-400';
  const toolbarCls = 'px-2 py-1.5 rounded';
  const inputCls   = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono';

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-800 border border-slate-700 rounded-t-lg border-b-0">
        <Button onClick={wrapBold} variant="ghost" size="sm" colorClassName={toolbarColor} className={toolbarCls} aria-label="Задебелен текст" title="Bold (**текст**)"><strong>B</strong></Button>
        <Button onClick={wrapItalic} variant="ghost" size="sm" colorClassName={toolbarColor} className={toolbarCls} aria-label="Закосен текст" title="Italic (*текст*)"><em>I</em></Button>
        <div className="w-px h-5 bg-slate-700 mx-1" />
        <Button onClick={wrapInlineMath} variant="ghost" size="sm" colorClassName="text-amber-400 hover:bg-slate-700 hover:text-amber-300 border border-amber-500/30 focus-visible:ring-amber-500" className={toolbarCls} aria-label="Вметни вградена математичка формула" title="Inline math $formula$">
          $…$
        </Button>
        <Button onClick={wrapBlockMath} variant="ghost" size="sm" colorClassName="text-amber-400 hover:bg-slate-700 hover:text-amber-300 border border-amber-500/30 focus-visible:ring-amber-500" className={toolbarCls} aria-label="Вметни блок математичка формула" title="Block math $$formula$$">
          $$…$$
        </Button>
        <Button
          onClick={() => setShowSymbols(p => !p)}
          aria-expanded={showSymbols}
          aria-controls="math-symbol-picker"
          variant="ghost"
          size="sm"
          colorClassName={showSymbols ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 focus-visible:ring-amber-500' : toolbarColor}
          className={toolbarCls}
          title="Математички симболи"
        >
          Σ π √
        </Button>
        <div className="flex-1" />
        {hasmath(value) && (
          <Button
            onClick={() => setShowPreview(p => !p)}
            aria-expanded={showPreview}
            aria-controls="math-preview"
            variant="ghost"
            size="sm"
            colorClassName={showPreview ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 focus-visible:ring-indigo-500' : toolbarColor}
            className={toolbarCls}
          >
            {showPreview ? 'Сокриј преглед' : 'Преглед'}
          </Button>
        )}
      </div>

      {/* Symbol picker */}
      {showSymbols && (
        <div id="math-symbol-picker" className="bg-slate-800 border border-slate-700 border-t-0 rounded-none p-3 space-y-3">
          {SYMBOL_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">{group.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.symbols.map(sym => (
                  <Button
                    key={sym.insert}
                    onClick={() => insertSymbol(sym.insert)}
                    aria-label={`Вметни ${sym.display}: ${sym.insert}`}
                    size="sm"
                    colorClassName="bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 hover:border-amber-500/50 focus-visible:ring-amber-500"
                    className="px-2.5 py-1.5 rounded font-mono"
                    title={sym.insert}
                  >
                    {sym.display}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[10px] text-slate-600">
            {'Совет: Означи текст → клик на симбол за да го замоташ. Синтакса: $x^2$ или $$\\frac{a}{b}$$'}
          </p>
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} rounded-t-none ${showSymbols ? '' : 'rounded-t-lg'}`}
      />

      {/* KaTeX Preview */}
      {showPreview && hasmath(value) && (
        <div id="math-preview" className="bg-slate-900 border border-slate-700 rounded-lg p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Преглед</p>
          <div
            className="text-slate-200 text-sm leading-relaxed [&_.katex-block]:my-3 [&_.katex-block]:text-center"
            dangerouslySetInnerHTML={{ __html: renderMath(value) }}
          />
        </div>
      )}

      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
