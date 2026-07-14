import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MathRenderer, hasMath } from '../components/editor/MathRenderer';

describe('MathRenderer', () => {
  it('escapes raw HTML in quest text instead of injecting it', () => {
    const { container } = render(
      <MathRenderer text={'<img src=x onerror="window.__pwned=true">'} />
    );
    expect(container.querySelector('img')).toBeNull();
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
    expect(container.textContent).toContain('<img src=x onerror="window.__pwned=true">');
  });

  it('escapes script tags', () => {
    const { container } = render(<MathRenderer text={'<script>window.__pwned2=true</script>'} />);
    expect(container.querySelector('script')).toBeNull();
    expect((window as unknown as { __pwned2?: boolean }).__pwned2).toBeUndefined();
  });

  it('still renders inline math correctly', () => {
    const { container } = render(<MathRenderer text="$x^2$" />);
    expect(container.querySelector('.katex')).toBeTruthy();
  });

  it('still renders block math correctly', () => {
    const { container } = render(<MathRenderer text="$$x^2$$" />);
    expect(container.querySelector('.katex-block')).toBeTruthy();
  });

  it('renders math formulas containing comparison operators', () => {
    const { container } = render(<MathRenderer text="$x < 5$ and $y > 2$" />);
    expect(container.querySelector('.katex')).toBeTruthy();
    expect(container.querySelector('img,script')).toBeNull();
  });

  it('still supports bold and italic markdown', () => {
    const { container } = render(<MathRenderer text="**bold** and *italic*" />);
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('em')?.textContent).toBe('italic');
  });

  it('hasMath detects $ syntax', () => {
    expect(hasMath('$x$')).toBe(true);
    expect(hasMath('plain text')).toBe(false);
  });
});
