import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import '../i18n';

const authState = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  resetPassword: vi.fn(),
  authError: null as string | null,
  clearAuthError: vi.fn(),
  loading: false,
  user: null as { uid: string } | null,
}));
vi.mock('../utils/AuthContext', () => ({ useAuth: () => authState }));

import { LoginModal } from '../components/auth/LoginModal';

beforeEach(() => {
  authState.signInWithGoogle.mockReset();
  authState.signInWithEmail.mockReset();
  authState.authError = null;
  authState.user = null;
});

describe('LoginModal', () => {
  it('does not render when closed', () => {
    render(<LoginModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the Google sign-in tab by default', () => {
    render(<LoginModal isOpen onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Авантура МКД')).toBeTruthy();
  });

  it('switches to the email tab and shows the email/password form', () => {
    render(<LoginModal isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Е-маил'));
    expect(screen.getByPlaceholderText('vase@email.com')).toBeTruthy();
  });

  it('calls signInWithGoogle when the Google button is clicked', async () => {
    render(<LoginModal isOpen onClose={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Најави се со Google'));
    });
    expect(authState.signInWithGoogle).toHaveBeenCalledOnce();
  });

  it('closes on Escape (gained from the shared Modal — the ad-hoc version had no keyboard handling)', () => {
    const onClose = vi.fn();
    render(<LoginModal isOpen onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<LoginModal isOpen onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
