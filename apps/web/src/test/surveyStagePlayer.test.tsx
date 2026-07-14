import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SurveyStagePlayer } from '../components/player/stages/SurveyStagePlayer';
import type { SurveyStage } from 'shared';

function makeStage(overrides: Partial<SurveyStage> = {}): SurveyStage {
  return {
    id: 's1',
    type: 'SURVEY',
    title: 'Рефлексија',
    description: 'Опис',
    order: 0,
    points: 20,
    surveyQuestions: ['Прашање 1?', 'Прашање 2?'],
    ...overrides,
  };
}

describe('SurveyStagePlayer', () => {
  it('renders one textarea per question and disables submit until all are answered', () => {
    const onAnswerChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <SurveyStagePlayer stage={makeStage()} isNightMode={false} answers={{}} onAnswerChange={onAnswerChange} onSubmit={onSubmit} />
    );
    expect(screen.getByText('Прашање 1?')).toBeTruthy();
    expect(screen.getByText('Прашање 2?')).toBeTruthy();
    const submitBtn = screen.getByRole('button', { name: 'Поднеси анкета' });
    expect(submitBtn).toBeDisabled();
  });

  it('calls onAnswerChange with the question index when typing', () => {
    const onAnswerChange = vi.fn();
    render(
      <SurveyStagePlayer stage={makeStage()} isNightMode={false} answers={{}} onAnswerChange={onAnswerChange} onSubmit={vi.fn()} />
    );
    const textareas = screen.getAllByPlaceholderText('Вашето мислење овде...');
    fireEvent.change(textareas[1], { target: { value: 'Мојот одговор' } });
    expect(onAnswerChange).toHaveBeenCalledWith(1, 'Мојот одговор');
  });

  it('submits a survey-type StageSubmission with answers in question order once complete', () => {
    const onSubmit = vi.fn();
    render(
      <SurveyStagePlayer
        stage={makeStage()}
        isNightMode={false}
        answers={{ 0: 'Одговор еден', 1: 'Одговор два' }}
        onAnswerChange={vi.fn()}
        onSubmit={onSubmit}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Поднеси анкета' }));
    expect(onSubmit).toHaveBeenCalledWith({
      stageId: 's1',
      type: 'survey',
      surveyAnswers: ['Одговор еден', 'Одговор два'],
    });
  });

  it('shows the grading-submission label and shows the rubric preview when a rubric is attached', () => {
    const stage = makeStage({
      rubric: { criteria: [{ id: 'c1', title: 'Јасност', levels: [{ id: 'l1', label: 'Добро', points: 5 }] }] },
    });
    render(
      <SurveyStagePlayer stage={stage} isNightMode={false} answers={{}} onAnswerChange={vi.fn()} onSubmit={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Испрати за оценување' })).toBeTruthy();
    expect(screen.getByText('📋 Како се оценува')).toBeTruthy();
  });
});
