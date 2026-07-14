import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { isValidJoinCode, normalizeJoinCode } from 'shared';
import { getSession, SessionError } from '../../utils/sessionStorage';

/** Accepts a raw 6-char code or a shared join URL/deep link ending in the code. */
function extractJoinCode(scanned: string): string {
  const trimmed = scanned.trim();
  if (isValidJoinCode(trimmed)) return normalizeJoinCode(trimmed);
  const lastSegment = trimmed.split(/[/?#]/).filter(Boolean).pop() ?? '';
  return normalizeJoinCode(lastSegment);
}

export default function PlayScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const joinByCode = async (raw: string) => {
    const c = normalizeJoinCode(raw);
    if (!isValidJoinCode(c)) { setError('Невалиден код. Кодот има 6 знаци.'); return; }

    setJoining(true);
    setError('');
    try {
      const session = await getSession(c);
      if (!session) throw new SessionError('not-found', 'Сесијата не постои.');
      if (session.status === 'finished') throw new SessionError('finished', 'Сесијата е завршена.');
      router.push({ pathname: '/quest/[id]', params: { id: session.questId, sessionCode: c } });
    } catch (err) {
      if (err instanceof SessionError) {
        const map: Record<string, string> = {
          'not-found': 'Сесијата не постои. Провери го кодот.',
          'finished': 'Сесијата е завршена.',
          'full': 'Сесијата е полна.',
        };
        setError(map[err.code] ?? 'Грешка при приклучување.');
      } else {
        setError('Грешка при приклучување. Провери ја интернет конекцијата.');
      }
    } finally {
      setJoining(false);
    }
  };

  const handleJoin = () => { joinByCode(code); };

  const openScanner = async () => {
    setError('');
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) { setError('Потребна е дозвола за камера за скенирање QR код.'); return; }
    }
    setScanned(false);
    setScannerOpen(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setScannerOpen(false);
    const extracted = extractJoinCode(data);
    setCode(extracted);
    joinByCode(extracted);
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
              onChangeText={t => { setCode(t.toUpperCase()); setError(''); }}
              autoCapitalize="characters"
              maxLength={8}
              autoCorrect={false}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.joinButton, (joining || code.trim().length < 4) && styles.joinDisabled]}
              onPress={handleJoin}
              disabled={joining || code.trim().length < 4}
            >
              {joining
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.joinText}>Приклучи се →</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>или</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.qrButton} onPress={openScanner}>
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

      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <SafeAreaView style={styles.scannerScreen}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Скенирај QR код</Text>
            <TouchableOpacity onPress={() => setScannerOpen(false)}>
              <Text style={styles.scannerClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.qrContainer}>
            <CameraView
              style={styles.qrCamera}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />
            <View style={styles.qrOverlay}>
              <View style={styles.qrFrame} />
            </View>
          </View>
          <Text style={styles.qrHint}>Насочи ја камерата кон QR кодот</Text>
        </SafeAreaView>
      </Modal>
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
  errorText: { color: '#dc2626', fontSize: 13, textAlign: 'center', marginBottom: 12, fontWeight: '600' },
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
  scannerScreen: { flex: 1, backgroundColor: '#000' },
  scannerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  scannerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  scannerClose: { color: '#fff', fontSize: 22, fontWeight: '700', padding: 4 },
  qrContainer: { flex: 1, marginHorizontal: 20, borderRadius: 20, overflow: 'hidden' },
  qrCamera: { flex: 1 },
  qrOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  qrFrame: { width: 220, height: 220, borderWidth: 3, borderColor: '#fff', borderRadius: 16 },
  qrHint: { color: '#fff', textAlign: 'center', marginVertical: 16, fontSize: 14 },
});
