import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PlayScreen() {
  const [code, setCode] = useState('');

  const handleJoin = () => {
    if (code.trim().length < 4) return;
    // TODO: navigate to quest player with session code
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>

          <View style={styles.heroCard}>
            <Text style={styles.heroIcon}>🎯</Text>
            <Text style={styles.heroTitle}>Започни Авантура</Text>
            <Text style={styles.heroDesc}>
              Внеси го кодот за приклучување или скенирај QR код
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>КОД ЗА ПРИКЛУЧУВАЊЕ</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="пр. AB1234"
              placeholderTextColor="#d1d5db"
              value={code}
              onChangeText={t => setCode(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.joinButton, code.trim().length < 4 && styles.joinDisabled]}
              onPress={handleJoin}
              disabled={code.trim().length < 4}
            >
              <Text style={styles.joinText}>Приклучи се →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>или</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.qrButton}>
            <Text style={styles.qrIcon}>📷</Text>
            <Text style={styles.qrText}>Скенирај QR Код</Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Добиј го кодот од наставникот или организаторот на авантурата
            </Text>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3f4f6' },
  flex: { flex: 1 },
  container: { flex: 1, padding: 20 },
  heroCard: {
    backgroundColor: '#4f46e5',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIcon: { fontSize: 48, marginBottom: 10 },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 1,
    marginBottom: 10,
  },
  codeInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    color: '#111827',
    marginBottom: 16,
  },
  joinButton: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  joinDisabled: { backgroundColor: '#c7d2fe' },
  joinText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, color: '#9ca3af', fontSize: 14 },
  qrButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4f46e5',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  qrIcon: { fontSize: 22 },
  qrText: { fontSize: 16, fontWeight: '700', color: '#4f46e5' },
  infoBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  infoText: { fontSize: 13, color: '#92400e', lineHeight: 20 },
});
