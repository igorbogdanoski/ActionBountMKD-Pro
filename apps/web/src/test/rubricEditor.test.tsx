import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Rubric } from 'shared';
import { RubricEditor } from '../components/creator/stages/RubricEditor';

const rubric: Rubric = {
  criteria: [{
    id: 'c1',
    title: 'Точност',
    levels: [
      { id: 'l1', label: 'Одлично', points: 4 },
      { id: 'l2', label: 'Делумно', points: 2 },
    ],
  }],
  feedbackPresets: ['Добро образложение'],
};

describe('RubricEditor', () => {
  it('adds a criterion with default levels and a stable identifier', () => {
    const onChange = vi.fn();
    render(<RubricEditor onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Додај критериум' }));

    const next = onChange.mock.calls[0][0] as Rubric;
    expect(next.criteria).toHaveLength(1);
    expect(next.criteria[0].id).toEqual(expect.any(String));
    expect(next.criteria[0].levels.map(level => level.points)).toEqual([4, 2, 0]);
  });

  it('removes the exact criterion and preserves presets', () => {
    const onChange = vi.fn();
    render(<RubricEditor rubric={rubric} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Отстрани критериум 1' }));

    expect(onChange).toHaveBeenCalledWith({ criteria: [], feedbackPresets: ['Добро образложение'] });
  });

  it('removes the exact level but never exposes removal for a sole level', () => {
    const onChange = vi.fn();
    const { rerender } = render(<RubricEditor rubric={rubric} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Отстрани ниво 2 од критериум 1' }));
    expect(onChange).toHaveBeenCalledWith({
      criteria: [{ ...rubric.criteria[0], levels: [rubric.criteria[0].levels[0]] }],
      feedbackPresets: ['Добро образложение'],
    });

    rerender(<RubricEditor rubric={{ criteria: [{ ...rubric.criteria[0], levels: [rubric.criteria[0].levels[0]] }] }} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: /Отстрани ниво/ })).toBeNull();
  });

  it('clamps level scores to the persisted 0–1000 range', () => {
    const onChange = vi.fn();
    render(<RubricEditor rubric={rubric} onChange={onChange} />);
    const score = screen.getAllByRole('spinbutton', { name: 'Поени' })[0];

    fireEvent.change(score, { target: { value: '1500' } });
    expect(onChange.mock.calls.at(-1)?.[0].criteria[0].levels[0].points).toBe(1000);
    fireEvent.change(score, { target: { value: '-5' } });
    expect(onChange.mock.calls.at(-1)?.[0].criteria[0].levels[0].points).toBe(0);
  });

  it('trims presets, prevents duplicates and removes by precise name', () => {
    const onChange = vi.fn();
    render(<RubricEditor rubric={rubric} onChange={onChange} />);
    const input = screen.getByPlaceholderText('напр. Одлично образложение!');
    const add = screen.getByRole('button', { name: 'Додај брз коментар' });

    expect(add).toBeDisabled();
    fireEvent.change(input, { target: { value: '  Нов коментар  ' } });
    expect(add).toBeEnabled();
    fireEvent.click(add);
    expect(onChange).toHaveBeenCalledWith({
      criteria: rubric.criteria,
      feedbackPresets: ['Добро образложение', 'Нов коментар'],
    });

    fireEvent.change(input, { target: { value: 'Добро образложение' } });
    expect(add).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Отстрани брз коментар: Добро образложение' }));
    expect(onChange).toHaveBeenLastCalledWith({ criteria: rubric.criteria });
  });
});
