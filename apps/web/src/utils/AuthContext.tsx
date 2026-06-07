import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, provider } from './firebase';
import { upsertUserProfile, getUserProfile } from './storage';
import { identifyAnalyticsUser, trackEvent } from './analytics';
import type { UserProfile } from 'shared';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  authError: null,
  clearAuthError: () => {},
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  resetPassword: async () => {},
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
    case 'auth/email-already-in-use':
      return 'Овој е-маил е веќе регистриран. Обиди се да се најавиш.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Погрешен е-маил или лозинка. Обиди се повторно.';
    case 'auth/user-not-found':
      return 'Не постои сметка со овој е-маил.';
    case 'auth/weak-password':
      return 'Лозинката е прекратка. Внеси барем 6 знаци.';
    case 'auth/invalid-email':
      return 'Невалидна е-маил адреса.';
    case 'auth/too-many-requests':
      return 'Премногу обиди. Почекај малку и обиди се повторно.';
    default:
      return 'Најавата не успеа. Обиди се повторно.';
  }
}

async function ensureProfile(firebaseUser: User): Promise<{ profile: UserProfile | null; isNew: boolean }> {
  try {
    let p = await getUserProfile(firebaseUser.uid);
    let isNew = false;
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
      isNew = true;
    }
    return { profile: p, isNew };
  } catch {
    return { profile: null, isNew: false };
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
        const { profile: nextProfile, isNew } = await ensureProfile(firebaseUser);
        setProfile(nextProfile);
        if (nextProfile) {
          identifyAnalyticsUser(firebaseUser.uid, {
            plan: nextProfile.plan,
            has_photo: Boolean(nextProfile.photoURL),
          });
        }
        if (isNew) {
          trackEvent('signup', {
            method: 'google',
            plan: nextProfile?.plan ?? 'free',
          });
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

  const signInWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const code = (err as { code?: string }).code;
      setAuthError(describeAuthError(code));
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      }
      trackEvent('signup', { method: 'email', plan: 'free' });
    } catch (err) {
      const code = (err as { code?: string }).code;
      setAuthError(describeAuthError(code));
    }
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const code = (err as { code?: string }).code;
      setAuthError(describeAuthError(code));
      throw err;
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
      signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

