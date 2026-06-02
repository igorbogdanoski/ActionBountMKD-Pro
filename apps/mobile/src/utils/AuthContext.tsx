import React, { createContext, useContext, useEffect, useState } from 'react';
import { GoogleAuthProvider, User, onAuthStateChanged, signInWithCredential, signOut } from 'firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { auth } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authError: null,
  clearAuthError: () => {},
  signInWithGoogle: async () => {},
  logout: async () => {},
});

function describeGoogleAuthError(code?: string): string {
  switch (code) {
    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return 'Google Play Services не се достапни на уредот.';
    case statusCodes.IN_PROGRESS:
      return 'Google најавата е веќе во тек.';
    case 'missing-web-client-id':
      return 'Недостасува EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID во mobile околината.';
    case 'missing-id-token':
      return 'Google не врати валиден ID token.';
    default:
      return 'Google најавата не успеа. Обиди се повторно.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);

    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (!webClientId) {
      setAuthError(describeGoogleAuthError('missing-web-client-id'));
      return;
    }

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (response.type !== 'success') return;

      const idToken = response.data.idToken;
      if (!idToken) {
        setAuthError(describeGoogleAuthError('missing-id-token'));
        return;
      }

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : undefined;
      if (code === statusCodes.SIGN_IN_CANCELLED) return;
      setAuthError(describeGoogleAuthError(code));
      console.error('[MobileAuth] Google sign-in error', error);
    }
  };

  const logout = async () => {
    setAuthError(null);
    GoogleSignin.signOut().catch(() => {});
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      authError,
      clearAuthError: () => setAuthError(null),
      signInWithGoogle,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
