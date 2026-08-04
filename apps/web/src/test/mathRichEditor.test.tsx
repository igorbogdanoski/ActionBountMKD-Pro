import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MathRichEditor } from '../components/editor/MathRichEditor';

describe('MathRichEditor controls', () => {
  it('wraps the current selection and restores textarea focus/cursor', async () => {
    const onChange = vi.fn();
    render(<MathRichEditor value="важен текст" onChange={onChange} placeholder="Опис" />);
    const textarea = screen.getByPlaceholderText('Опис') as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, 5);

    fireEvent.click(screen.getByRole('button', { name: 'Задебелен текст' }));

    expect(onChange).toHaveBeenCalledWith('**важен** текст');
    await new Promise(resolve => requestAnimationFrame(resolve));
    expect(textarea).toHaveFocus();
    expect(textarea.selectionStart).toBe(7);
    expect(textarea.selectionEnd).toBe(7);
  });

  it('opens the semantic symbol picker and inserts a labelled symbol at the cursor', () => {
    const onChange = vi.fn();
    render(<MathRichEditor value="x = " onChange={onChange} placeholder="Опис" />);
    const textarea = screen.getByPlaceholderText('Опис') as HTMLTextAreaElement;
    textarea.setSelectionRange(4, 4);
    const symbols = screen.getByRole('button', { name: 'Σ π √' });
    expect(symbols).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(symbols);
    expect(symbols).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Вметни π: \\pi' }));
    expect(onChange).toHaveBeenCalledWith('x = $\\pi$');
  });

  it('exposes preview visibility through expanded semantics', () => {
    render(<MathRichEditor value="$x^2$" onChange={vi.fn()} />);
    const preview = screen.getByRole('button', { name: 'Преглед' });
    expect(preview).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(preview);
    expect(screen.getByRole('button', { name: 'Сокриј преглед' })).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('math-preview')).toBeInTheDocument();
  });

  it('escapes raw HTML in the math preview while preserving KaTeX output', () => {
    render(
      <MathRichEditor
        value={'<img src=x onerror="window.__richPwned=true"> $x^2$'}
        onChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Преглед' }));

    const preview = document.getElementById('math-preview')!;
    expect(preview.querySelector('img')).toBeNull();
    expect(preview.querySelector('.katex')).toBeTruthy();
    expect(preview.textContent).toContain('<img src=x onerror="window.__richPwned=true">');
    expect((window as unknown as { __richPwned?: boolean }).__richPwned).toBeUndefined();
  });
});
