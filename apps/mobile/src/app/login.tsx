import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { useAuth } from '../utils/AuthContext';

type LoadingMethod = 'email' | 'google' | null;

export default function LoginScreen() {
  const { signInWithGoogle, authError, clearAuthError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingMethod, setLoadingMethod] = useState<LoadingMethod>(null);
  const [error, setError] = useState('');


  const handleAuth = async () => {
    if (!email || !password) {
      setError('Внесете емаил и лозинка.');
      return;
    }
    if (password.length < 6) {
      setError('Лозинката мора да има најмалку 6 знаци.');
      return;
    }
    setLoadingMethod('email');
    setError('');
    clearAuthError();
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found': 'Корисникот не постои.',
        'auth/wrong-password': 'Погрешна лозинка.',
        'auth/email-already-in-use': 'Емаилот е веќе регистриран.',
        'auth/invalid-email': 'Невалидна емаил адреса.',
        'auth/too-many-requests': 'Премногу обиди. Обиди се подоцна.',
      };
      setError(msg[err.code] || err.message || 'Настана грешка.');
    } finally {
      setLoadingMethod(null);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    clearAuthError();
    setLoadingMethod('google');
    try {
      await signInWithGoogle();
    } finally {
      setLoadingMethod(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>AB</Text>
          </View>
          <Text style={styles.title}>АВАНТУРА</Text>
          <Text style={styles.tagline}>Авантури без граници</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.subtitle}>{isLogin ? 'Најава' : 'Регистрација'}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!error && authError ? <Text style={styles.error}>{authError}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Емаил адреса"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Лозинка"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loadingMethod !== null && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loadingMethod !== null}
          >
            {loadingMethod === 'email'
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>{isLogin ? 'Најави се' : 'Регистрирај се'}</Text>
            }
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>или</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, loadingMethod !== null && styles.buttonDisabled]}
            onPress={handleGoogleAuth}
            disabled={loadingMethod !== null}
          >
            {loadingMethod === 'google' ? (
              <ActivityIndicator color="#374151" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleText}>Продолжи со Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setIsLogin(!isLogin); setError(''); clearAuthError(); }}
            style={styles.switchButton}
          >
            <Text style={styles.switchText}>
              {isLogin ? 'Немаш профил? Регистрирај се' : 'Веќе имаш профил? Најави се'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f0f4ff' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
    backgroundColor: '#fee2e2',
    padding: 8,
    borderRadius: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#9ca3af',
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '500',
  },
});
