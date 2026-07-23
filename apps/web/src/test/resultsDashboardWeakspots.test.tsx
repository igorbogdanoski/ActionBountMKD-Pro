// Cross-quest weak-spot tab (Phase 1) — ranks the lowest-accuracy QUIZ
// questions and biggest per-stage drop-offs across every quest a teacher
// owns, reusing the same pure completion.ts derivations the per-quest
// funnel tab already uses.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Quest, QuestResult } from 'shared';

// This suite verifies weak-spot data and navigation, not Recharts sizing.
// jsdom has no layout engine, so give ResponsiveContainer deterministic
// dimensions instead of letting it emit negative-size warnings.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 320 }}>{children}</div>
    ),
  };
});

const authState = vi.hoisted(() => ({ user: { uid: 'teacher-1' } }));
vi.mock('../utils/AuthContext', () => ({ useAuth: () => authState }));

const planState = vi.hoisted(() => ({ planId: 'pro' as 'free' | 'pro' }));
vi.mock('../hooks/usePlan', () => ({ usePlan: () => planState }));

const getQuests = vi.hoisted(() => vi.fn());
const getQuestResults = vi.hoisted(() => vi.fn());
vi.mock('../utils/storage', () => ({ getQuests, getQuestResults }));
const downloadWorkbook = vi.hoisted(() => vi.fn());
vi.mock('../utils/excelExport', () => ({ downloadWorkbook }));
vi.mock('../components/dashboard/SubmissionReviewModal', () => ({
  SubmissionReviewModal: ({ stageId }: { stageId: string }) => <div role="dialog">Review {stageId}</div>,
}));

import { ResultsDashboard } from '../components/dashboard/ResultsDashboard';

function makeQuiz(id: string, title: string) {
  return { id, type: 'QUIZ' as const, title, description: '', order: 0, points: 10, questionType: 'multiple_choice' as const, options: ['A', 'B'], correctAnswer: 'A' };
}

function quests(): Quest[] {
  return [
    { id: 'q1', creatorId: 'teacher-1', title: 'Слаб квест', description: '', visibility: 'secret', playMode: 'singleplayer', sequence: 'fixed', stages: [makeQuiz('s1', 'Тешко прашање')], createdAt: '', updatedAt: '' } as Quest,
    { id: 'q2', creatorId: 'teacher-1', title: 'Добар квест', description: '', visibility: 'secret', playMode: 'singleplayer', sequence: 'fixed', stages: [makeQuiz('s2', 'Лесно прашање')], createdAt: '', updatedAt: '' } as Quest,
  ];
}

function resultsFor(questId: string): QuestResult[] {
  if (questId === 'q1') {
    // 1 correct out of 4 -> 25% accuracy, well past the 3-answer noise floor
    return [
      { id: 'r1', questId, playerName: 'A', points: 0, completedAt: '', quizAnswers: [{ stageId: 's1', selectedAnswer: 'B', correct: false }] },
      { id: 'r2', questId, playerName: 'B', points: 0, completedAt: '', quizAnswers: [{ stageId: 's1', selectedAnswer: 'B', correct: false }] },
      { id: 'r3', questId, playerName: 'C', points: 0, completedAt: '', quizAnswers: [{ stageId: 's1', selectedAnswer: 'B', correct: false }] },
      { id: 'r4', questId, playerName: 'D', points: 10, completedAt: '', quizAnswers: [{ stageId: 's1', selectedAnswer: 'A', correct: true }] },
    ] as QuestResult[];
  }
  return [
    { id: 'r5', questId, playerName: 'A', points: 10, completedAt: '', quizAnswers: [{ stageId: 's2', selectedAnswer: 'A', correct: true }] },
    { id: 'r6', questId, playerName: 'B', points: 10, completedAt: '', quizAnswers: [{ stageId: 's2', selectedAnswer: 'A', correct: true }] },
    { id: 'r7', questId, playerName: 'C', points: 10, completedAt: '', quizAnswers: [{ stageId: 's2', selectedAnswer: 'A', correct: true }] },
  ] as QuestResult[];
}

beforeEach(() => {
  planState.planId = 'pro';
  getQuests.mockReset().mockResolvedValue(quests());
  getQuestResults.mockReset().mockImplementation((questId: string) => Promise.resolve(resultsFor(questId)));
  downloadWorkbook.mockReset();
});

describe('ResultsDashboard cross-quest weak-spots tab', () => {
  it('is gated behind Pro, matching the funnel tab', async () => {
    planState.planId = 'free';
    render(<ResultsDashboard />);
    await screen.findByText('Слаб квест', { selector: 'option' });

    fireEvent.click(screen.getByText('🎯 Слаби точки'));

    expect(await screen.findByText('Слаби точки — Pro план')).toBeTruthy();
    expect(getQuestResults).not.toHaveBeenCalledWith('q2');
  });

  it('ranks the lowest-accuracy question first, across both quests, with the quest name shown', async () => {
    render(<ResultsDashboard />);
    await screen.findByText('Слаб квест', { selector: 'option' });

    fireEvent.click(screen.getByText('🎯 Слаби точки'));

    const weakQuestion = await screen.findByText('Тешко прашање');
    expect(weakQuestion).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy();
    const subtitle = weakQuestion.closest('button')!.querySelector('p:last-child');
    expect(subtitle?.textContent).toContain('Слаб квест');
    await waitFor(() => expect(getQuestResults).toHaveBeenCalledWith('q2'));
  });

  it('jumping to a weak question switches to the funnel tab for that quest', async () => {
    render(<ResultsDashboard />);
    await screen.findByText('Слаб квест', { selector: 'option' });

    fireEvent.click(screen.getByText('🎯 Слаби точки'));
    fireEvent.click(await screen.findByText('Тешко прашање'));

    expect(await screen.findByText('Точност по прашање')).toBeTruthy();
  });
});

describe('ResultsDashboard H3b controls', () => {
  it('renders the funnel summary as three hard-dark shared cards', async () => {
    render(<ResultsDashboard />);
    await screen.findByText('Слаб квест', { selector: 'option' });

    fireEvent.click(screen.getByRole('tab', { name: /Аналитика/ }));
    const cards = await screen.findAllByTestId('funnel-summary-card');
    expect(cards).toHaveLength(3);
    expect(cards.every(card => card.className.includes('bg-slate-800'))).toBe(true);
    expect(cards.every(card => card.className.includes('!rounded-xl'))).toBe(true);
    expect(cards.every(card => card.className.includes('!shadow-none'))).toBe(true);
  });

  it('renders stage and question analysis rows as compact shared cards', async () => {
    render(<ResultsDashboard />);
    await screen.findByText('Слаб квест', { selector: 'option' });

    fireEvent.click(screen.getByRole('tab', { name: /Аналитика/ }));
    const stageCards = await screen.findAllByTestId('funnel-stage-card');
    const questionCards = await screen.findAllByTestId('quiz-analysis-card');
    expect(stageCards).toHaveLength(1);
    expect(questionCards).toHaveLength(1);
    for (const card of [...stageCards, ...questionCards]) {
      expect(card.className).toContain('bg-slate-800');
      expect(card.className).toContain('!rounded-xl');
      expect(card.className).toContain('!shadow-none');
    }
  });

  it('exposes a semantic tablist and keeps empty exports disabled', async () => {
    getQuestResults.mockResolvedValue([]);
    render(<ResultsDashboard />);
    await screen.findByText('Слаб квест', { selector: 'option' });

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: /Аналитика/ }));
    expect(screen.getByRole('tab', { name: /Аналитика/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Извоз во CSV' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Извоз во Excel' })).toBeDisabled();
  });

  it('exports both formats and releases the temporary CSV object URL', async () => {
    const createObjectURL = vi.fn(() => 'blob:results');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ResultsDashboard />);
    await screen.findByText('Слаб квест', { selector: 'option' });

    const csv = screen.getByRole('button', { name: 'Извоз во CSV' });
    await waitFor(() => expect(csv).toBeEnabled());
    fireEvent.click(csv);
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:results');

    fireEvent.click(screen.getByRole('button', { name: 'Извоз во Excel' }));
    expect(downloadWorkbook).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: 'Резултати' }),
      expect.objectContaining({ name: 'Завршеност по етапа' }),
    ]), 'rezultati_q1');
    click.mockRestore();
  });

  it('opens rubric review from the grading tab', async () => {
    const mission = {
      id: 'mission-1', type: 'MISSION', title: 'Field evidence', description: '', order: 0,
      rubric: { criteria: [{ id: 'quality', title: 'Quality', levels: [{ id: 'ok', label: 'OK', points: 1 }] }] },
    };
    getQuests.mockResolvedValue([{ ...quests()[0], stages: [mission] }]);
    getQuestResults.mockResolvedValue([{
      id: 'grade-result', questId: 'q1', playerName: 'Ana', points: 0, completedAt: '',
      submissions: [{ stageId: 'mission-1', type: 'photo', mediaUrl: 'https://example.test/photo.jpg' }],
    }]);
    render(<ResultsDashboard />);
    await screen.findByText('Слаб квест', { selector: 'option' });

    fireEvent.click(screen.getByRole('tab', { name: /За оценување/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Оцени' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Review mission-1');
  });
});
