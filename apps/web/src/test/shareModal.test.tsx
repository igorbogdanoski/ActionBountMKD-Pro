import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareModal } from '../components/creator/ShareModal';

Object.assign(navigator, { clipboard: { writeText: vi.fn() } });

describe('ShareModal', () => {
  beforeEach(() => {
    vi.mocked(navigator.clipboard.writeText).mockReset().mockResolvedValue(undefined);
  });

  it('renders the quest title, share link and QR code', () => {
    render(<ShareModal questId="q1" questTitle="Мојата авантура" onClose={vi.fn()} />);
    expect(screen.getByText('Мојата авантура')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByDisplayValue(/\/play\/q1$/)).toBeTruthy();
  });

  it('only shows the public leaderboard link when publicLeaderboard is true', () => {
    const { rerender } = render(<ShareModal questId="q1" questTitle="Т" onClose={vi.fn()} />);
    expect(screen.queryByDisplayValue(/\/leaderboard\/q1$/)).toBeNull();

    rerender(<ShareModal questId="q1" questTitle="Т" publicLeaderboard onClose={vi.fn()} />);
    expect(screen.getByDisplayValue(/\/leaderboard\/q1$/)).toBeTruthy();
  });

  it('copies the play link and announces success only after the clipboard resolves', async () => {
    let resolveCopy!: () => void;
    vi.mocked(navigator.clipboard.writeText).mockImplementation(() => new Promise<void>(resolve => { resolveCopy = resolve; }));
    render(<ShareModal questId="q1" questTitle="Т" onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Копирај' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/play/q1`);
    expect(screen.queryByText('Копирано')).toBeNull();

    resolveCopy();
    await waitFor(() => expect(screen.getByText('Копирано')).toBeTruthy());
    expect(screen.getByRole('status')).toHaveTextContent('Линкот „Линк за игра“ е копиран');
  });

  it('copies the public leaderboard link through the shared copy control', async () => {
    render(<ShareModal questId="q1" questTitle="Т" publicLeaderboard onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Копирај линк за табела' }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/leaderboard/q1`));
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('Линкот „Јавна табела со резултати“ е копиран');
  });

  it('does not report a successful copy when the clipboard rejects', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('clipboard denied'));
    render(<ShareModal questId="q1" questTitle="Т" onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Копирај' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledOnce());
    expect(screen.queryByText('Копирано')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Копирањето не успеа');
  });

  it('closes on Escape (gained from the shared Modal — the ad-hoc version had no keyboard handling)', () => {
    const onClose = vi.fn();
    render(<ShareModal questId="q1" questTitle="Т" onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<ShareModal questId="q1" questTitle="Т" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Затвори' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
