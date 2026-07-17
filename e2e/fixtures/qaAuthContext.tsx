import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import type { PlanId, UserProfile } from 'shared';

const query = new URLSearchParams(window.location.search);
const plan = (query.get('qaPlan') || 'pro') as PlanId;
const isAdmin = query.get('qaAdmin') === '1';
const isGuest = query.get('qaGuest') === '1';

const user = {
  uid: 'qa-teacher-001',
  email: 'qa.teacher@example.test',
  displayName: 'QA Teacher',
  photoURL: null,
} as User;

const profile: UserProfile = {
  uid: user.uid,
  email: user.email!,
  displayName: user.displayName!,
  plan,
  createdAt: '2025-01-02T00:00:00.000Z',
  updatedAt: '2026-07-17T00:00:00.000Z',
};

const value = {
  user: isGuest ? null : user,
  profile: isGuest ? null : profile,
  isAdmin,
  loading: false,
  authError: null,
  clearAuthError: () => {},
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  resetPassword: async () => {},
  logout: async () => {},
};

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  return value;
}
