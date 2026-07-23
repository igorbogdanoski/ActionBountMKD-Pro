import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Quest, QuestResult } from 'shared';

const navigate = vi.hoisted(() => vi.fn());
const gradeSubmission = vi.hoisted(() => vi.fn());
const planState = vi.hoisted(() => ({
  planId: 'free',
  limits: { maxQuests: 3 },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});
vi.mock('../hooks/usePlan', () => ({ usePlan: () => planState }));
vi.mock('../utils/storage', () => ({ gradeSubmission }));

import { PlanUsageWidget } from '../components/dashboard/PlanUsageWidget';
import { SubmissionReviewModal } from '../components/dashboard/SubmissionReviewModal';

const quest = {
  id: 'q1',
  stages: [{
    id: 'mission-1',
    type: 'MISSION',
    title: 'Field evidence',
    submissionType: 'photo',
    rubric: {
      criteria: [{
        id: 'accuracy',
        title: 'Accuracy',
        levels: [
          { id: 'partial', label: 'Partial', points: 2 },
          { id: 'complete', label: 'Complete', points: 4 },
        ],
      }],
      feedbackPresets: ['Good evidence'],
    },
  }],
} as unknown as Quest;

const result = {
  id: 'r1',
  questId: 'q1',
  playerName: 'Student',
  points: 5,
  completedAt: '2026-07-17T00:00:00.000Z',
  submissions: [{ stageId: 'mission-1', type: 'photo', mediaUrl: 'https://example.test/evidence.jpg' }],
} as QuestResult;

beforeEach(() => {
  navigate.mockReset();
  gradeSubmission.mockReset();
  gradeSubmission.mockResolvedValue(undefined);
  planState.planId = 'free';
  planState.limits.maxQuests = 3;
});

describe('H3b review and plan controls', () => {
  it('keeps the plan upgrade action explicit and routes to pricing', () => {
    render(<MemoryRouter><PlanUsageWidget questCount={3} /></MemoryRouter>);
    const card = screen.getByTestId('plan-usage-card');
    expect(card).toHaveAttribute('data-state', 'exhausted');
    expect(card.className).toContain('!bg-rose-500/5');
    expect(card.className).toContain('!shadow-none');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
    const upgrade = screen.getByRole('button');
    expect(upgrade).toHaveAttribute('type', 'button');
    fireEvent.click(upgrade);
    expect(navigate).toHaveBeenCalledWith('/pricing');
  });

  it('preserves normal and warning state palettes', () => {
    const { rerender } = render(<MemoryRouter><PlanUsageWidget questCount={1} /></MemoryRouter>);
    expect(screen.getByTestId('plan-usage-card')).toHaveAttribute('data-state', 'normal');
    expect(screen.getByTestId('plan-usage-card').className).toContain('!bg-slate-800/50');

    planState.planId = 'starter';
    planState.limits.maxQuests = 10;
    rerender(<MemoryRouter><PlanUsageWidget questCount={8} /></MemoryRouter>);
    expect(screen.getByTestId('plan-usage-card')).toHaveAttribute('data-state', 'warning');
    expect(screen.getByTestId('plan-usage-card').className).toContain('!bg-amber-500/5');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '8');
  });

  it('does not render an upgrade action for an enterprise plan', () => {
    planState.planId = 'enterprise';
    planState.limits.maxQuests = -1;
    render(<MemoryRouter><PlanUsageWidget questCount={300} /></MemoryRouter>);
    expect(screen.getByTestId('plan-usage-card')).toHaveAttribute('data-state', 'normal');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('requires a rubric selection, appends feedback and saves the grade once', async () => {
    const onClose = vi.fn();
    const onGraded = vi.fn();
    const { container } = render(
      <SubmissionReviewModal
        open
        onClose={onClose}
        quest={quest}
        result={result}
        stageId="mission-1"
        onGraded={onGraded}
      />,
    );

    const save = screen.getAllByRole('button').at(-1)!;
    expect(save).toBeDisabled();
    const levels = container.querySelectorAll('button[aria-pressed]');
    expect(levels).toHaveLength(2);
    fireEvent.click(levels[1]);
    expect(levels[1]).toHaveAttribute('aria-pressed', 'true');
    expect(save).toBeEnabled();

    fireEvent.click(screen.getByText(/Good evidence/).closest('button')!);
    expect(screen.getByRole('textbox')).toHaveValue('Good evidence');
    fireEvent.click(save);

    await waitFor(() => expect(gradeSubmission).toHaveBeenCalledOnce());
    const grade = gradeSubmission.mock.calls[0][1];
    expect(grade).toMatchObject({ criterionScores: { accuracy: 4 }, totalPoints: 4, feedback: 'Good evidence' });
    expect(onGraded).toHaveBeenCalledWith(expect.objectContaining({ points: 9 }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
