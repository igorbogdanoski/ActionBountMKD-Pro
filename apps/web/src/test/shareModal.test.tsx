import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShareModal } from '../components/creator/ShareModal';

Object.assign(navigator, { clipboard: { writeText: vi.fn() } });

describe('ShareModal', () => {
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
