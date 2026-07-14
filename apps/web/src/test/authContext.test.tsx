// Regression test for the signup-tracking bug: every email/password signup
// used to fire two 'signup' analytics events (one correctly labeled 'email'
// from signUpWithEmail, one incorrectly labeled 'google' from the
// onAuthStateChanged handler reacting to the new profile). Verifies each
// sign-in path now fires exactly one correctly-labeled event, driven by
// Firebase's own isNewUser flag instead of our Firestore profile-existence
// check.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../utils/AuthContext';

const trackEventMock = vi.fn();
vi.mock('../utils/analytics', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
  identifyAnalyticsUser: vi.fn(),
}));

const getUserProfileMock = vi.fn().mockResolvedValue(null);
const upsertUserProfileMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../utils/storage', () => ({
  getUserProfile: (...args: unknown[]) => getUserProfileMock(...args),
  upsertUserProfile: (...args: unknown[]) => upsertUserProfileMock(...args),
}));

const authState = vi.hoisted(() => ({
  callback: null as ((user: unknown) => void) | null,
}));
const mockAuth = vi.hoisted(() => ({
  onAuthStateChanged: (cb: (user: unknown) => void) => {
    authState.callback = cb;
    return () => { authState.callback = null; };
  },
}));
vi.mock('../utils/firebase', () => ({ auth: mockAuth, provider: {} }));

const signInWithPopupMock = vi.fn();
const createUserWithEmailAndPasswordMock = vi.fn();
const getRedirectResultMock = vi.fn().mockResolvedValue(null);
const getAdditionalUserInfoMock = vi.fn();

vi.mock('firebase/auth', () => ({
  signInWithPopup: (...args: unknown[]) => signInWithPopupMock(...args),
  signInWithRedirect: vi.fn(),
  getRedirectResult: (...args: unknown[]) => getRedirectResultMock(...args),
  getAdditionalUserInfo: (...args: unknown[]) => getAdditionalUserInfoMock(...args),
  signOut: vi.fn(),
  createUserWithEmailAndPassword: (...args: unknown[]) => createUserWithEmailAndPasswordMock(...args),
  signInWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn().mockResolvedValue(undefined),
}));

function TestConsumer() {
  const { signInWithGoogle, signUpWithEmail } = useAuth();
  return (
    <div>
      <button onClick={() => signInWithGoogle()}>google</button>
      <button onClick={() => signUpWithEmail('a@b.com', 'pw123456', 'Име')}>email-signup</button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getUserProfileMock.mockResolvedValue(null);
  authState.callback = null;
});

function fakeUser(uid: string, claims: Record<string, unknown> = {}) {
  return {
    uid,
    email: `${uid}@example.com`,
    displayName: '',
    photoURL: null,
    getIdTokenResult: () => Promise.resolve({ claims }),
  };
}

describe('signup analytics attribution', () => {
  it('fires exactly one correctly-labeled event for a new email signup', async () => {
    createUserWithEmailAndPasswordMock.mockResolvedValue({ user: fakeUser('u1') });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await act(async () => {
      fireEvent.click(screen.getByText('email-signup'));
    });
    // Simulate Firebase notifying the app of the resulting signed-in user —
    // this is what used to also fire a second, mislabeled 'signup' event.
    await act(async () => {
      authState.callback?.(fakeUser('u1'));
    });
    await waitFor(() => expect(getUserProfileMock).toHaveBeenCalled());

    const signupCalls = trackEventMock.mock.calls.filter(c => c[0] === 'signup');
    expect(signupCalls).toHaveLength(1);
    expect(signupCalls[0][1]).toMatchObject({ method: 'email' });
  });

  it('fires exactly one correctly-labeled event for a new Google popup signup', async () => {
    getAdditionalUserInfoMock.mockReturnValue({ isNewUser: true });
    signInWithPopupMock.mockResolvedValue({ user: fakeUser('u2') });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await act(async () => {
      fireEvent.click(screen.getByText('google'));
    });
    await act(async () => {
      authState.callback?.(fakeUser('u2'));
    });
    await waitFor(() => expect(getUserProfileMock).toHaveBeenCalled());

    const signupCalls = trackEventMock.mock.calls.filter(c => c[0] === 'signup');
    expect(signupCalls).toHaveLength(1);
    expect(signupCalls[0][1]).toMatchObject({ method: 'google' });
  });

  it('does not fire a signup event when an existing user merely logs back in', async () => {
    getAdditionalUserInfoMock.mockReturnValue({ isNewUser: false });
    signInWithPopupMock.mockResolvedValue({ user: fakeUser('u3') });
    getUserProfileMock.mockResolvedValue({ uid: 'u3', plan: 'free' });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await act(async () => {
      fireEvent.click(screen.getByText('google'));
    });
    await act(async () => {
      authState.callback?.(fakeUser('u3'));
    });
    await waitFor(() => expect(getUserProfileMock).toHaveBeenCalled());

    expect(trackEventMock.mock.calls.filter(c => c[0] === 'signup')).toHaveLength(0);
  });
});

function AdminProbe() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <span>loading</span>;
  return <span>isAdmin:{String(isAdmin)}</span>;
}

describe('admin custom claim', () => {
  it('exposes isAdmin=true only when the ID token carries the admin claim', async () => {
    render(<AuthProvider><AdminProbe /></AuthProvider>);
    await act(async () => {
      authState.callback?.(fakeUser('admin-1', { admin: true }));
    });
    await waitFor(() => expect(screen.getByText('isAdmin:true')).toBeTruthy());
  });

  it('exposes isAdmin=false for a signed-in user without the claim', async () => {
    render(<AuthProvider><AdminProbe /></AuthProvider>);
    await act(async () => {
      authState.callback?.(fakeUser('plain-user'));
    });
    await waitFor(() => expect(screen.getByText('isAdmin:false')).toBeTruthy());
  });

  it('resets isAdmin to false on sign-out', async () => {
    render(<AuthProvider><AdminProbe /></AuthProvider>);
    await act(async () => {
      authState.callback?.(fakeUser('admin-2', { admin: true }));
    });
    await waitFor(() => expect(screen.getByText('isAdmin:true')).toBeTruthy());

    await act(async () => {
      authState.callback?.(null);
    });
    await waitFor(() => expect(screen.getByText('isAdmin:false')).toBeTruthy());
  });
});
