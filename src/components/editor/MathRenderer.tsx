import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  text: string;
  className?: string;
}

function renderContent(text: string): string {
  if (!text) return '';

  return text
    // Block math $$...$$ first
    .replace(/\$\$([^$]+)\$\$/g, (_, formula) => {
      try {
        return `<div class="katex-block my-3 text-center overflow-x-auto">${
          katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false })
        }</div>`;
      } catch {
        return `<span class="text-red-400 text-xs font-mono">[math error]</span>`;
      }
    })
    // Inline math $...$
    .replace(/\$([^$\n]+)\$/g, (_, formula) => {
      try {
        return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
      } catch {
        return `<span class="text-red-400 text-xs font-mono">[math error]</span>`;
      }
    })
    // Bold **text**
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic *text*
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Newlines
    .replace(/\n/g, '<br/>');
}

export function MathRenderer({ text, className = '' }: MathRendererProps) {
  const html = useMemo(() => renderContent(text), [text]);

  if (!text) return null;

  return (
    <div
      className={`leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// Pure check — does the text contain math syntax?
export function hasMath(text: string): boolean {
  return /\$[^$]/.test(text);
}
