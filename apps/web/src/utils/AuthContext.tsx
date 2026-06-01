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
import type { UserProfile } from 'shared';

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

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // Phones, tablets and iPadOS (which reports as "Macintosh" but is touch).
  return /Android|iPhone|iPad|iPod|Mobi|Windows Phone/i.test(ua)
    || (/Macintosh/.test(ua) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1);
}

function describeAuthError(code?: string): string {
  switch (code) {
    case 'auth/unauthorized-domain':
      return 'Овој домен не е авторизиран во Firebase. Додај го во Authentication → Settings → Authorized domains.';
    case 'auth/network-request-failed':
      return 'Нема интернет конекција. Провери ја мрежата и обиди се повторно.';
    case 'auth/account-exists-with-different-credential':
      return 'Веќе постои сметка со овој е-маил, но со друг начин на најава.';
    default:
      return 'Најавата не успеа. Обиди се повторно.';
  }
}

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
    // Handle redirect result (fires after signInWithRedirect returns).
    // Surface a helpful message if the redirect sign-in failed.
    getRedirectResult(auth).catch((err) => {
      const code = (err as { code?: string }).code;
      if (code) setAuthError(describeAuthError(code));
    });

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

    // Mobile browsers handle OAuth popups poorly (blocked / broken on iOS Safari
    // & Android Chrome) → go straight to a full-page redirect.
    if (isMobileDevice()) {
      try {
        await signInWithRedirect(auth, provider);
      } catch (err) {
        const code = (err as { code?: string }).code;
        setAuthError(describeAuthError(code));
        console.error('[Auth] redirect signIn error', err);
      }
      return;
    }

    try {
      // Desktop: try popup first — fastest UX
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

      setAuthError(describeAuthError(code));
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

