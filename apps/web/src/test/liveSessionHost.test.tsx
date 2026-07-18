import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  getQuestById: vi.fn(),
  createSession: vi.fn(),
  setSessionStatus: vi.fn(),
  setBroadcastStage: vi.fn(),
  deleteSession: vi.fn(),
  clearSosAlert: vi.fn(),
  updateProgress: vi.fn(),
  isPro: true,
  game: {
    session: null as Record<string, unknown> | null,
    leaderboard: [] as Array<Record<string, unknown>>,
    stats: { total: 0, finished: 0 },
  },
}));

vi.mock('../utils/firebase', () => ({ auth: {}, provider: {}, storage: {}, db: {} }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ questId: 'quest-1' }), useNavigate: () => mocks.navigate };
});
vi.mock('../utils/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'teacher-1' } }) }));
vi.mock('../hooks/usePlan', () => ({ usePlan: () => ({ isPro: mocks.isPro }) }));
vi.mock('../hooks/useGameSession', () => ({ useGameSession: () => mocks.game }));
vi.mock('../utils/storage', () => ({ getQuestById: mocks.getQuestById }));
vi.mock('../utils/sessionStorage', () => ({
  createSession: mocks.createSession,
  setSessionStatus: mocks.setSessionStatus,
  setBroadcastStage: mocks.setBroadcastStage,
  deleteSession: mocks.deleteSession,
  clearSosAlert: mocks.clearSosAlert,
  updateProgress: mocks.updateProgress,
}));
vi.mock('../components/SEO', () => ({ SEO: () => null }));
vi.mock('qrcode.react', () => ({ QRCodeSVG: ({ value }: { value: string }) => <div data-testid="qr-code">{value}</div> }));
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  Marker: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  useMap: () => ({ setView: vi.fn(), fitBounds: vi.fn() }),
}));
vi.mock('leaflet', () => ({
  default: { divIcon: vi.fn(() => ({})), latLngBounds: vi.fn(() => ({})) },
}));

import { LiveSessionHost } from '../components/session/LiveSessionHost';

const quest = {
  id: 'quest-1',
  title: 'Тест авантура',
  stages: [{ id: 'stage-1' }, { id: 'stage-2' }],
};

function activeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ABC234',
    status: 'waiting',
    mode: 'free',
    currentStageIndex: 0,
    players: [],
    sosAlerts: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isPro = true;
  mocks.game.session = null;
  mocks.game.leaderboard = [];
  mocks.game.stats = { total: 0, finished: 0 };
  mocks.getQuestById.mockResolvedValue(quest);
  mocks.createSession.mockResolvedValue({ id: 'ABC234' });
  mocks.setSessionStatus.mockResolvedValue(undefined);
  mocks.setBroadcastStage.mockResolvedValue(undefined);
  mocks.deleteSession.mockResolvedValue(undefined);
  mocks.clearSosAlert.mockResolvedValue(undefined);
  mocks.updateProgress.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe('LiveSessionHost', () => {
  it('exposes session modes as pressed choices and creates the selected mode', async () => {
    render(<LiveSessionHost />);
    const free = await screen.findByRole('button', { name: /Слободно темпо/ });
    const broadcast = screen.getByRole('button', { name: /Водено/ });
    expect(free).toHaveAttribute('aria-pressed', 'true');
    expect(broadcast).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(broadcast);
    expect(broadcast).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Создади сесија' }));

    await waitFor(() => expect(mocks.createSession).toHaveBeenCalledWith(expect.objectContaining({
      questId: 'quest-1', hostId: 'teacher-1', stageCount: 2, mode: 'broadcast',
    })));
    expect(await screen.findByText('ABC234')).toBeTruthy();
  });

  it('reports clipboard failure instead of claiming success', async () => {
    mocks.createSession.mockResolvedValue({ id: 'ABC234' });
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('denied'));
    render(<LiveSessionHost />);
    await screen.findByRole('button', { name: /Слободно темпо/ });
    fireEvent.click(screen.getByRole('button', { name: 'Создади сесија' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Копирај линк' }));
    expect(await screen.findByText(/Линкот не може да се копира/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Копирано!' })).toBeNull();
  });

  it('deletes only after confirmation and navigates only after success', async () => {
    render(<LiveSessionHost />);
    await screen.findByRole('button', { name: /Слободно темпо/ });
    fireEvent.click(screen.getByRole('button', { name: 'Создади сесија' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Затвори и избриши сесија' }));
    expect(mocks.deleteSession).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Избриши ја сесијата?' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Избриши сесија' }));
    await waitFor(() => expect(mocks.deleteSession).toHaveBeenCalledWith('ABC234'));
    expect(mocks.navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('stays on the host screen and shows an error when deletion fails', async () => {
    mocks.deleteSession.mockRejectedValueOnce(new Error('offline'));
    render(<LiveSessionHost />);
    await screen.findByRole('button', { name: /Слободно темпо/ });
    fireEvent.click(screen.getByRole('button', { name: 'Создади сесија' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Затвори и избриши сесија' }));
    fireEvent.click(screen.getByRole('button', { name: 'Избриши сесија' }));

    const dialog = screen.getByRole('dialog', { name: 'Избриши ја сесијата?' });
    await waitFor(() => expect(dialog.querySelector('[role="alert"]')).toHaveTextContent(/Сесијата не може да се избрише/));
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(dialog).toBeTruthy();
  });

  it('provides labeled broadcast navigation and a pressed time-support toggle', async () => {
    mocks.game.session = activeSession({ status: 'active', mode: 'broadcast' });
    mocks.game.leaderboard = [{ uid: 'p1', name: 'Ана', rank: 1, stageIndex: 0, points: 50, finished: false, timeMultiplier: 1.5 }];
    mocks.game.stats = { total: 1, finished: 0 };
    render(<LiveSessionHost />);
    await screen.findByRole('button', { name: /Слободно темпо/ });
    fireEvent.click(screen.getByRole('button', { name: 'Создади сесија' }));

    const previous = await screen.findByRole('button', { name: 'Претходна етапа' });
    const next = screen.getByRole('button', { name: 'Следна етапа' });
    expect(previous).toBeDisabled();
    fireEvent.click(next);
    await waitFor(() => expect(mocks.setBroadcastStage).toHaveBeenCalledWith('ABC234', 1));

    const timeSupport = screen.getByRole('button', { name: 'Исклучи дополнителни 50% време за Ана' });
    expect(timeSupport).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(timeSupport);
    await waitFor(() => expect(mocks.updateProgress).toHaveBeenCalledWith('ABC234', 'p1', { timeMultiplier: 1 }));
  });
});
