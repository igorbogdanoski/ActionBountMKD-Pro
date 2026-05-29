import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User, signInWithPopup, signOut } from 'firebase/auth';
import { auth, provider } from './firebase';
import { upsertUserProfile, getUserProfile } from './storage';
import type { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  authError: null,
  clearAuthError: () => {},
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          let p = await getUserProfile(firebaseUser.uid);
          if (!p) {
            p = {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              displayName: firebaseUser.displayName ?? '',
              photoURL: firebaseUser.photoURL ?? undefined,
              plan: 'free',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await upsertUserProfile(p);
          }
          setProfile(p);
        } catch {
          // Profile fetch failing shouldn't block the user
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/popup-closed-by-user') return;
      if (code === 'auth/network-request-failed') {
        setAuthError('Нема интернет конекција. Провери ја мрежата и обиди се повторно.');
      } else {
        setAuthError('Најавата не успеа. Обиди се повторно.');
      }
      console.error('[Auth] signIn error', err);
    }
  };

  const logout = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (err) {
      setAuthError('Одјавата не успеа.');
      console.error('[Auth] signOut error', err);
    }
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading, authError,
      clearAuthError: () => setAuthError(null),
      signInWithGoogle, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
