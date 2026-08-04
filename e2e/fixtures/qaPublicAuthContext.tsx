import type { ReactNode } from 'react';

const value = {
  user: null,
  profile: null,
  isAdmin: false,
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
