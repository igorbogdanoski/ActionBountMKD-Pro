/**
 * InstallPrompt component tests.
 *
 * Tests the PWA install prompt banner:
 *  - hidden when no beforeinstallprompt event fires
 *  - visible after event + 3s delay
 *  - calls prompt() on install click
 *  - stores dismiss timestamp in localStorage
 *  - respects 7-day cooldown after dismiss
 *  - hidden when already running in standalone (installed)
 *  - hidden when recently dismissed
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InstallPrompt } from '../components/InstallPrompt';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DISMISS_KEY = 'av_install_prompt_dismissed';

/** Fire a fake beforeinstallprompt event with a stub prompt() */
function fireInstallEvent(
  outcome: 'accepted' | 'dismissed' = 'accepted',
  promptResult: Promise<void> = Promise.resolve(),
) {
  const promptFn = vi.fn().mockReturnValue(promptResult);
  const userChoice = Promise.resolve({ outcome, platform: 'web' });

  const event = Object.assign(new Event('beforeinstallprompt'), {
    platforms: ['web'],
    userChoice,
    prompt: promptFn,
    preventDefault: vi.fn(),
  });

  act(() => { window.dispatchEvent(event); });
  return { promptFn, event };
}

/** Stub window.matchMedia for a specific media query result */
function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  // Default: NOT in standalone mode
  stubMatchMedia(false);
  // Remove any iOS standalone flag
  delete (navigator as Navigator & { standalone?: boolean }).standalone;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('InstallPrompt', () => {
  it('renders nothing before any install event', () => {
    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('remains hidden until 3 s after the install event', () => {
    render(<InstallPrompt />);
    fireInstallEvent();

    // Still hidden right after the event
    expect(screen.queryByRole('banner')).toBeNull();

    // Fast-forward 2 999 ms — still hidden
    act(() => { vi.advanceTimersByTime(2999); });
    expect(screen.queryByRole('banner')).toBeNull();
  });

  it('appears after 3 s delay once the install event fires', () => {
    render(<InstallPrompt />);
    fireInstallEvent();

    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('shows the "Инсталирај" button and descriptive text', () => {
    render(<InstallPrompt />);
    fireInstallEvent();
    act(() => { vi.advanceTimersByTime(3000); });

    expect(screen.getByText('Инсталирај')).toBeInTheDocument();
    expect(screen.getByText(/Додај Авантура/)).toBeInTheDocument();
  });

  it('calls prompt() when "Инсталирај" is clicked', async () => {
    render(<InstallPrompt />);
    const { promptFn } = fireInstallEvent();
    act(() => { vi.advanceTimersByTime(3000); });

    await act(async () => {
      fireEvent.click(screen.getByText('Инсталирај'));
    });

    expect(promptFn).toHaveBeenCalledOnce();
  });

  it('disables the install action and shows loading content while prompt() is pending', () => {
    render(<InstallPrompt />);
    fireInstallEvent('accepted', new Promise<void>(() => {}));
    act(() => { vi.advanceTimersByTime(3000); });

    const install = screen.getAllByRole('button')[0];
    fireEvent.click(install);

    expect(install).toBeDisabled();
    expect(install).toHaveTextContent('…');
  });

  it('hides the banner after install is accepted', async () => {
    render(<InstallPrompt />);
    fireInstallEvent('accepted');
    act(() => { vi.advanceTimersByTime(3000); });

    await act(async () => {
      fireEvent.click(screen.getByText('Инсталирај'));
    });

    expect(screen.queryByRole('banner')).toBeNull();
  });

  it('stores a dismiss timestamp in localStorage on X click', () => {
    render(<InstallPrompt />);
    fireInstallEvent();
    act(() => { vi.advanceTimersByTime(3000); });

    fireEvent.click(screen.getByRole('button', { name: /затвори/i }));

    const stored = localStorage.getItem(DISMISS_KEY);
    expect(stored).not.toBeNull();
    expect(Number(stored)).toBeGreaterThan(0);
  });

  it('hides after X is clicked', () => {
    render(<InstallPrompt />);
    fireInstallEvent();
    act(() => { vi.advanceTimersByTime(3000); });

    fireEvent.click(screen.getByRole('button', { name: /затвори/i }));

    expect(screen.queryByRole('banner')).toBeNull();
  });

  it('never shows when dismiss timestamp is < 7 days old', () => {
    // Dismissed 1 day ago
    localStorage.setItem(DISMISS_KEY, String(Date.now() - 1 * 24 * 60 * 60 * 1000));

    render(<InstallPrompt />);
    fireInstallEvent();
    act(() => { vi.advanceTimersByTime(3000); });

    expect(screen.queryByRole('banner')).toBeNull();
  });

  it('shows again when dismiss timestamp is > 7 days old', () => {
    // Dismissed 8 days ago
    localStorage.setItem(DISMISS_KEY, String(Date.now() - 8 * 24 * 60 * 60 * 1000));

    render(<InstallPrompt />);
    fireInstallEvent();
    act(() => { vi.advanceTimersByTime(3000); });

    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('never shows when running in standalone (PWA already installed)', () => {
    stubMatchMedia(true); // (display-mode: standalone) matches

    render(<InstallPrompt />);
    fireInstallEvent();
    act(() => { vi.advanceTimersByTime(3000); });

    expect(screen.queryByRole('banner')).toBeNull();
  });

  it('never shows on iOS when navigator.standalone is true', () => {
    Object.defineProperty(navigator, 'standalone', { value: true, writable: true });

    render(<InstallPrompt />);
    fireInstallEvent();
    act(() => { vi.advanceTimersByTime(3000); });

    expect(screen.queryByRole('banner')).toBeNull();
  });
});
