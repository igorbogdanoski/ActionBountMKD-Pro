import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';
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

async function ensureProfile(firebaseUser: User): Promise<UserProfile | null> {
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
    return p;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Handle redirect result (fires after signInWithRedirect returns)
    getRedirectResult(auth).catch(() => {});

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setProfile(await ensureProfile(firebaseUser));
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
      // Try popup first — fastest UX
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err as { code?: string }).code;

      if (code === 'auth/popup-closed-by-user') return;

      if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        // Popup blocked by browser — fall back to full-page redirect
        try {
          await signInWithRedirect(auth, provider);
        } catch {
          setAuthError('Најавата не успеа. Дозволи попапи за овој сајт или обиди се повторно.');
        }
        return;
      }

      if (code === 'auth/network-request-failed') {
        setAuthError('Нема интернет конекција. Провери ја мрежата и обиди се повторно.');
        return;
      }

      setAuthError('Најавата не успеа. Обиди се повторно.');
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
