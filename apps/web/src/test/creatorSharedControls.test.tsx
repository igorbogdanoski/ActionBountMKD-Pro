import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from '../components/creator/stages/shared';

describe('creator shared Tabs', () => {
  it('exposes a semantic tablist and selected tab state', () => {
    render(<Tabs tabs={['Мисија', 'Поставки']} active={1} onChange={vi.fn()} />);

    expect(screen.getByRole('tablist')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Мисија' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Поставки' })).toHaveAttribute('aria-selected', 'true');
  });

  it('reports the selected tab index', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={['Мисија', 'Поставки']} active={0} onChange={onChange} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Поставки' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
