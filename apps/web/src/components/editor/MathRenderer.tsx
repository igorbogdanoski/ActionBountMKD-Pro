import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  text: string;
  className?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

function unescapeHtml(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => HTML_ENTITIES[entity]);
}

function renderContent(text: string): string {
  if (!text) return '';

  return escapeHtml(text)
    // Block math $$...$$ first — formula was HTML-escaped above, so decode
    // it back to raw LaTeX before handing it to KaTeX; the renderer's own
    // output is safe (default `trust: false` blocks \href/\includegraphics etc).
    .replace(/\$\$([^$]+)\$\$/g, (_, formula) => {
      try {
        return `<div class="katex-block my-3 text-center overflow-x-auto">${
          katex.renderToString(unescapeHtml(formula).trim(), { displayMode: true, throwOnError: false, trust: false })
        }</div>`;
      } catch {
        return `<span class="text-red-400 text-xs font-mono">[math error]</span>`;
      }
    })
    // Inline math $...$
    .replace(/\$([^$\n]+)\$/g, (_, formula) => {
      try {
        return katex.renderToString(unescapeHtml(formula).trim(), { displayMode: false, throwOnError: false, trust: false });
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
