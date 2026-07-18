// MobilePlayer.tsx orchestrates the entire play session (name entry -> stage
// sequencing -> scoring -> finish screen) but, unlike every extracted stage
// component, had no dedicated test of its own. This covers the core loop —
// completing a simple quest end to end — plus the rubric-grade lookup added
// on the finish screen (students previously never saw a teacher's grade).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import type { ReactNode } from 'react';
import type { Quest, QuestResult } from 'shared';

vi.mock('../utils/firebase', () => ({ auth: {}, provider: {}, storage: {}, db: {} }));

// jsdom has no real requestAnimationFrame loop, and motion.div/AnimatePresence
// wrap every stage transition (including the one holding renderStageContent()) —
// rendering them for real hangs the whole process indefinitely. Swap in plain
// passthrough elements; only markup/behavior is under test here, not animation.
// The replacement component for each tag (div, etc.) must be a STABLE reference
// across renders — a Proxy that mints a new function per `get` breaks React's
// reconciliation (every access looks like a different component type) and was
// itself a second, independent cause of the same hang.
function MotionPassthrough({ children, className, role, ...rest }: Record<string, unknown> & { children?: ReactNode }) {
  const ariaProps: Record<string, unknown> = {};
  for (const key of Object.keys(rest)) {
    if (key.startsWith('aria-')) ariaProps[key] = rest[key];
  }
  return (
    <div className={className as string | undefined} role={role as string | undefined} {...ariaProps}>
      {children}
    </div>
  );
}
const motionCache = new Map<string, typeof MotionPassthrough>();
vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!motionCache.has(tag)) motionCache.set(tag, MotionPassthrough);
        return motionCache.get(tag);
      },
    }
  ),
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const getQuestById = vi.hoisted(() => vi.fn());
const getQuestResults = vi.hoisted(() => vi.fn());
const saveQuestResult = vi.hoisted(() => vi.fn());
const submitQuestFeedback = vi.hoisted(() => vi.fn());
const downloadCertificate = vi.hoisted(() => vi.fn());
vi.mock('../utils/storage', () => ({ getQuestById, getQuestResults, saveQuestResult, submitQuestFeedback }));
vi.mock('../utils/certificate', () => ({ downloadCertificate }));

import { MobilePlayer } from '../components/player/MobilePlayer';

beforeEach(() => {
  getQuestById.mockReset();
  getQuestResults.mockReset().mockResolvedValue([]);
  saveQuestResult.mockReset();
  submitQuestFeedback.mockReset();
  downloadCertificate.mockReset();
  window.localStorage.clear();
});

function renderPlayer(quest: Quest) {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <MobilePlayer questId={quest.id} questProp={quest} isPreview />
      </MemoryRouter>
    </HelmetProvider>
  );
}

function infoQuizQuest(): Quest {
  return {
    id: 'quest-1',
    creatorId: 'teacher-1',
    title: 'Проверка на MobilePlayer',
    description: 'Тест авантура',
    visibility: 'secret',
    playMode: 'singleplayer',
    sequence: 'fixed',
    certificateEnabled: false,
    stages: [
      {
        id: 'info-1',
        type: 'INFO',
        title: 'Вовед',
        description: 'Добредојде.',
        order: 0,
        isIntro: true,
        mediaType: 'none',
      },
      {
        id: 'quiz-1',
        type: 'QUIZ',
        title: 'Прашање',
        description: 'Колку е 2+2?',
        order: 1,
        points: 10,
        questionType: 'multiple_choice',
        options: ['3', '4', '5'],
        correctAnswer: '4',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Quest;
}

function surveyRubricQuest(): Quest {
  return {
    id: 'quest-2',
    creatorId: 'teacher-1',
    title: 'Рефлексија',
    description: 'Тест анкета',
    visibility: 'secret',
    playMode: 'singleplayer',
    sequence: 'fixed',
    certificateEnabled: false,
    stages: [
      {
        id: 'survey-1',
        type: 'SURVEY',
        title: 'Твоето мислење',
        description: 'Кажи нѐ што мислиш.',
        order: 0,
        surveyQuestions: ['Што научи денес?'],
        rubric: {
          criteria: [
            { id: 'c1', title: 'Длабочина на одговорот', levels: [{ id: 'l1', label: 'Добро', points: 8 }] },
          ],
        },
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Quest;
}

async function finishInfoQuiz(name = 'Марко') {
  fireEvent.change(screen.getByPlaceholderText('Внесете го вашето име...'), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'Започни Авантура' }));
  fireEvent.click(await screen.findByText('Разбрав, понатаму'));
  fireEvent.click(await screen.findByText('4'));
  fireEvent.click(screen.getByText('Потврди'));
  await screen.findByText(`Честитки, ${name}!`, undefined, { timeout: 3000 });
}

describe('MobilePlayer orchestration', () => {
  it('uses semantic entry controls and persists onboarding dismissal', () => {
    renderPlayer(infoQuizQuest());
    const start = screen.getByRole('button', { name: 'Започни Авантура' });
    expect(start).toBeDisabled();
    const theme = screen.getByRole('button', { name: 'Вклучи темна тема' });
    expect(theme).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(theme);
    expect(screen.getByRole('button', { name: 'Вклучи светла тема' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Сфатив' }));
    expect(window.localStorage.getItem('av_player_onboarded')).toBe('1');
  });

  it('completes a simple INFO -> QUIZ quest and reaches the finish screen with the right points', async () => {
    renderPlayer(infoQuizQuest());

    fireEvent.change(screen.getByPlaceholderText('Внесете го вашето име...'), { target: { value: 'Марко' } });
    fireEvent.click(screen.getByText('Започни Авантура'));

    fireEvent.click(await screen.findByText('Разбрав, понатаму'));

    fireEvent.click(await screen.findByText('4'));
    fireEvent.click(screen.getByText('Потврди'));

    expect(await screen.findByText('Честитки, Марко!', undefined, { timeout: 3000 })).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.queryByText('Провери ја мојата оценка')).toBeNull();
  });

  it('shows a rubric-grade lookup on the finish screen, reporting "not graded yet" before a teacher grades it', async () => {
    getQuestResults.mockResolvedValue([]);
    renderPlayer(surveyRubricQuest());

    fireEvent.change(screen.getByPlaceholderText('Внесете го вашето име...'), { target: { value: 'Ана' } });
    fireEvent.click(screen.getByText('Започни Авантура'));

    fireEvent.change(await screen.findByPlaceholderText('Вашето мислење овде...'), {
      target: { value: 'Научив многу нови работи денес.' },
    });
    fireEvent.click(screen.getByText('Испрати за оценување'));

    expect(await screen.findByText('Честитки, Ана!')).toBeTruthy();
    fireEvent.click(screen.getByText('Провери ја мојата оценка'));

    expect(await screen.findByText('Сè уште не е оценето.')).toBeTruthy();
    expect(getQuestResults).toHaveBeenCalledWith('quest-2');
  });

  it('shows the teacher grade and feedback once the submission has been graded', async () => {
    const graded: QuestResult = {
      id: 'r1',
      questId: 'quest-2',
      playerName: 'Ана',
      points: 8,
      completedAt: new Date().toISOString(),
      grades: [
        { stageId: 'survey-1', criterionScores: { c1: 8 }, totalPoints: 8, feedback: 'Одлична рефлексија!', gradedAt: new Date().toISOString() },
      ],
    };
    getQuestResults.mockResolvedValue([graded]);
    renderPlayer(surveyRubricQuest());

    fireEvent.change(screen.getByPlaceholderText('Внесете го вашето име...'), { target: { value: 'Ана' } });
    fireEvent.click(screen.getByText('Започни Авантура'));

    fireEvent.change(await screen.findByPlaceholderText('Вашето мислење овде...'), {
      target: { value: 'Научив многу нови работи денес.' },
    });
    fireEvent.click(screen.getByText('Испрати за оценување'));

    fireEvent.click(await screen.findByText('Провери ја мојата оценка'));

    expect(await screen.findByText('8 поени')).toBeTruthy();
    expect(screen.getByText('Одлична рефлексија!')).toBeTruthy();
  });

  it('offers a working retry after grade lookup failure', async () => {
    getQuestResults.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    renderPlayer(surveyRubricQuest());
    fireEvent.change(screen.getByPlaceholderText('Внесете го вашето име...'), { target: { value: 'Ана' } });
    fireEvent.click(screen.getByRole('button', { name: 'Започни Авантура' }));
    fireEvent.change(await screen.findByPlaceholderText('Вашето мислење овде...'), { target: { value: 'Одговор за оценување.' } });
    fireEvent.click(screen.getByText('Испрати за оценување'));
    fireEvent.click(await screen.findByRole('button', { name: 'Провери ја мојата оценка' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Не успеавме/);
    fireEvent.click(screen.getByRole('button', { name: 'Обиди се повторно' }));
    expect(await screen.findByText('Сè уште не е оценето.')).toBeTruthy();
    expect(getQuestResults).toHaveBeenCalledTimes(2);
  });

  it('keeps feedback available and reports an error until a retry succeeds', async () => {
    submitQuestFeedback.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    renderPlayer(infoQuizQuest());
    await finishInfoQuiz();
    const feedback = screen.getByPlaceholderText('Споделете впечаток за авантурата...');
    fireEvent.change(feedback, { target: { value: 'Одлична авантура!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Испрати коментар' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Коментарот не може/);
    expect(feedback).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Испрати коментар' }));
    expect(await screen.findByText('Хвала за повратната информација!')).toBeTruthy();
    expect(submitQuestFeedback).toHaveBeenCalledTimes(2);
  });

  it('reports certificate generation failure and permits a successful retry', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    downloadCertificate.mockRejectedValueOnce(new Error('render failed')).mockResolvedValueOnce(undefined);
    const quest = { ...infoQuizQuest(), certificateEnabled: true } as Quest;
    renderPlayer(quest);
    await finishInfoQuiz();
    fireEvent.click(screen.getByRole('button', { name: 'Преземи сертификат' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Сертификатот не може/);
    fireEvent.click(screen.getByRole('button', { name: 'Преземи сертификат' }));
    await waitFor(() => expect(downloadCertificate).toHaveBeenCalledTimes(2));
    expect(errorLog).toHaveBeenCalledWith('Certificate generation failed', expect.any(Error));
    errorLog.mockRestore();
  });
});
