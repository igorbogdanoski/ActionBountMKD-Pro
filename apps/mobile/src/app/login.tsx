import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Внесете емаил и лозинка.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // Ако успее, AuthContext ќе ја смени состојбата и ќе се редиректираме кон /
      router.replace('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Настана грешка при најава.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ActionBound MKD Pro</Text>
      <Text style={styles.subtitle}>{isLogin ? 'Најава' : 'Регистрација'}</Text>
      
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Емаил адреса"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Лозинка"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isLogin ? 'Најави се' : 'Регистрирај се'}</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
        <Text style={styles.switchText}>
          {isLogin ? 'Немаш профил? Регистрирај се' : 'Веќе имаш профил? Најави се'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 32,
    color: '#4b5563',
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchText: {
    color: '#4f46e5',
    fontSize: 14,
  },
  error: {
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  }
});
