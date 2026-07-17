import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ joinSession: vi.fn(), navigate: vi.fn(), codeParam: undefined as string | undefined }));

vi.mock('../utils/firebase', () => ({ auth: {}, provider: {}, storage: {}, db: {} }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ code: mocks.codeParam }), useNavigate: () => mocks.navigate };
});
vi.mock('../utils/sessionStorage', () => {
  class SessionError extends Error {
    constructor(public code: 'not-found' | 'finished' | 'full' | 'code-collision', message: string) { super(message); }
  }
  return { joinSession: mocks.joinSession, SessionError };
});
vi.mock('../components/player/MobilePlayer', () => ({
  MobilePlayer: (props: Record<string, string>) => <div data-testid="mobile-player">{JSON.stringify(props)}</div>,
}));
vi.mock('../components/SEO', () => ({ SEO: () => null }));

import { JoinSession } from '../components/session/JoinSession';
import { SessionError } from '../utils/sessionStorage';

function fill(code: string, name: string) {
  fireEvent.change(screen.getByPlaceholderText('КОД'), { target: { value: code } });
  fireEvent.change(screen.getByPlaceholderText('Твоето име...'), { target: { value: name } });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => { resolve = res; });
  return { promise, resolve };
}

beforeEach(() => {
  mocks.joinSession.mockReset();
  mocks.navigate.mockReset();
  mocks.codeParam = undefined;
  localStorage.clear();
});

describe('JoinSession', () => {
  it('validates code and missing name before joining', () => {
    render(<JoinSession />);
    const codeInput = screen.getByRole('textbox', { name: 'Код за сесија' });
    const nameInput = screen.getByRole('textbox', { name: 'Име на играч' });
    fireEvent.click(screen.getByRole('button', { name: 'Приклучи се' }));
    const codeError = screen.getByRole('alert');
    expect(codeError).toHaveTextContent('Невалиден код. Кодот има 6 знаци.');
    expect(codeInput).toHaveAttribute('aria-invalid', 'true');
    expect(codeInput).toHaveAttribute('aria-describedby', codeError.id);
    expect(nameInput).not.toHaveAttribute('aria-invalid');
    expect(nameInput).not.toHaveAttribute('aria-describedby');
    fireEvent.change(codeInput, { target: { value: 'abc234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Приклучи се' }));
    const nameError = screen.getByRole('alert');
    expect(nameError).toHaveTextContent('Внеси го твоето име.');
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    expect(nameInput).toHaveAttribute('aria-describedby', nameError.id);
    expect(codeInput).not.toHaveAttribute('aria-invalid');
    expect(codeInput).not.toHaveAttribute('aria-describedby');
    expect(mocks.joinSession).not.toHaveBeenCalled();
  });

  it('normalizes the code and submits on Enter', async () => {
    mocks.joinSession.mockResolvedValue({ questId: 'q1' });
    render(<JoinSession />);
    fill(' ab c234 ', '  Ана  ');
    expect(screen.getByPlaceholderText('КОД')).toHaveValue('ABC234');
    fireEvent.keyDown(screen.getByPlaceholderText('Твоето име...'), { key: 'Enter' });
    await waitFor(() => expect(mocks.joinSession).toHaveBeenCalledWith('ABC234', expect.any(String), 'Ана'));
  });

  it('disables the green CTA with a 20px shared spinner while joining, then hands off persistent identity', async () => {
    const pending = deferred<{ questId: string }>();
    mocks.joinSession.mockReturnValue(pending.promise);
    const playerId = '11111111-1111-4111-8111-111111111111';
    const randomUuid = vi.spyOn(crypto, 'randomUUID').mockReturnValue(playerId);
    render(<JoinSession />);
    fill('ABC234', 'Ана');
    const join = screen.getByRole('button', { name: 'Приклучи се' });
    expect(join.className).toContain('bg-emerald-600');
    expect(join.className).toContain('!py-4');
    fireEvent.click(join);
    await waitFor(() => expect(join).toBeDisabled());
    expect(join.querySelector('.animate-spin')).toBeTruthy();
    expect(join.className).toContain('[&>svg]:!w-5');
    expect(join.className).toContain('[&>svg]:!h-5');
    await act(async () => { pending.resolve({ questId: 'q1' }); await pending.promise; });
    const player = await screen.findByTestId('mobile-player');
    expect(player).toHaveTextContent('"questId":"q1"');
    expect(player).toHaveTextContent('"sessionCode":"ABC234"');
    expect(player).toHaveTextContent(`"sessionPlayerId":"${playerId}"`);
    expect(localStorage.getItem('av_session_player_id')).toBe(playerId);
    randomUuid.mockRestore();
  });

  it.each([
    ['not-found', 'Сесијата не постои. Провери го кодот.'],
    ['finished', 'Сесијата е завршена.'],
    ['full', 'Сесијата е полна.'],
  ] as const)('maps SessionError %s', async (code, message) => {
    mocks.joinSession.mockRejectedValue(new SessionError(code, code));
    render(<JoinSession />);
    fill('ABC234', 'Ана');
    fireEvent.click(screen.getByRole('button', { name: 'Приклучи се' }));
    expect(await screen.findByText(message)).toBeTruthy();
  });

  it('shows the generic network failure and preserves text-only Back navigation', async () => {
    mocks.joinSession.mockRejectedValue(new Error('offline'));
    render(<JoinSession />);
    const back = screen.getByRole('button', { name: /Назад/ });
    expect(back.className).toContain('!p-0');
    expect(back.className).toContain('min-h-11');
    expect(back.className).toContain('text-slate-400');
    expect(back.className).not.toContain('bg-slate');
    fireEvent.click(back);
    expect(mocks.navigate).toHaveBeenCalledWith('/');
    fill('ABC234', 'Ана');
    fireEvent.click(screen.getByRole('button', { name: 'Приклучи се' }));
    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('Грешка при приклучување. Провери ја интернет конекцијата.');
    expect(screen.getByRole('textbox', { name: 'Код за сесија' })).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('textbox', { name: 'Име на играч' })).not.toHaveAttribute('aria-invalid');
  });
});
