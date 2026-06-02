import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../utils/AuthContext';
import {
  getNotificationRegistrationStateAsync,
  requestNotificationRegistrationAsync,
  scheduleTestNotificationAsync,
  type NotificationRegistrationState,
} from '../../utils/notifications';

const DEFAULT_NOTIFICATION_STATE: NotificationRegistrationState = {
  permission: 'undetermined',
  enabled: false,
  canAskAgain: true,
  expoPushToken: null,
};

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [notificationState, setNotificationState] = useState<NotificationRegistrationState>(DEFAULT_NOTIFICATION_STATE);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [notificationBusy, setNotificationBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadNotificationState = async () => {
      setNotificationLoading(true);
      const state = await getNotificationRegistrationStateAsync();
      if (!cancelled) {
        setNotificationState(state);
        setNotificationLoading(false);
      }
    };

    void loadNotificationState();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Одјава',
      'Дали сакаш да се одјавиш?',
      [
        { text: 'Откажи', style: 'cancel' },
        { text: 'Одјави се', style: 'destructive', onPress: logout },
      ]
    );
  };

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() ?? '?';

  const notificationStatusLabel = notificationState.enabled
    ? 'Активирани'
    : notificationState.permission === 'denied'
      ? 'Исклучени'
      : notificationState.permission === 'simulator'
        ? 'Само на физички уред'
        : 'Не се поставени';

  const truncatedPushToken = notificationState.expoPushToken
    ? `${notificationState.expoPushToken.slice(0, 18)}...${notificationState.expoPushToken.slice(-8)}`
    : null;

  const handleNotificationsEnable = async () => {
    if (!user) return;

    setNotificationBusy(true);
    const state = await requestNotificationRegistrationAsync(user.uid);
    setNotificationState(state);
    setNotificationBusy(false);

    if (state.message) {
      Alert.alert('Известувања', state.message);
    }
  };

  const handleTestNotification = async () => {
    try {
      await scheduleTestNotificationAsync();
      Alert.alert('Известувања', 'Испратено е локално тест известување.');
    } catch (error) {
      Alert.alert('Известувања', 'Не успеа испраќањето на тест известувањето.');
      console.error('[Notifications] Test notification failed', error);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.displayName || 'Корисник'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.providerData[0]?.providerId === 'google.com' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Google акаунт</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>СМЕТКА</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>План</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planText}>Free</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Верзија</Text>
            <Text style={styles.rowValue}>1.0.0 (SDK 56)</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ИЗВЕСТУВАЊА</Text>
          <View style={styles.rowTopAligned}>
            <View style={styles.notificationMeta}>
              <Text style={styles.rowLabel}>Push статус</Text>
              <Text style={styles.notificationHint}>
                {notificationState.message || 'Дозволи известувања за сесии, потсетници и важни активности.'}
              </Text>
            </View>
            {notificationLoading ? (
              <ActivityIndicator size="small" color="#4f46e5" />
            ) : (
              <View style={[styles.statusBadge, notificationState.enabled ? styles.statusBadgeEnabled : styles.statusBadgeMuted]}>
                <Text style={[styles.statusBadgeText, notificationState.enabled ? styles.statusBadgeTextEnabled : styles.statusBadgeTextMuted]}>
                  {notificationStatusLabel}
                </Text>
              </View>
            )}
          </View>

          {truncatedPushToken ? (
            <View style={styles.rowTopAligned}>
              <View style={styles.notificationMeta}>
                <Text style={styles.rowLabel}>Expo Push Token</Text>
                <Text style={styles.tokenValue}>{truncatedPushToken}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.notificationActions}>
            <TouchableOpacity
              style={[styles.notificationButton, notificationBusy && styles.notificationButtonDisabled]}
              onPress={handleNotificationsEnable}
              disabled={notificationBusy || !user}
            >
              <Text style={styles.notificationButtonText}>
                {notificationState.enabled ? 'Освежи push статус' : 'Вклучи известувања'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.notificationSecondaryButton, !notificationState.enabled && styles.notificationSecondaryButtonDisabled]}
              onPress={handleTestNotification}
              disabled={!notificationState.enabled}
            >
              <Text style={[styles.notificationSecondaryText, !notificationState.enabled && styles.notificationSecondaryTextDisabled]}>
                Прати тест известување
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.notificationFootnote}>
            За remote push delivery е потребен dev/EAS build со важечки notification credentials.
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Одјави се</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3f4f6' },
  container: { padding: 20, paddingBottom: 40 },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  email: { fontSize: 14, color: '#6b7280' },
  badge: {
    marginTop: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { color: '#3b82f6', fontSize: 12, fontWeight: '600' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  rowTopAligned: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  rowLabel: { fontSize: 15, color: '#374151', fontWeight: '500' },
  rowValue: { fontSize: 14, color: '#9ca3af' },
  notificationMeta: { flex: 1 },
  notificationHint: { marginTop: 4, fontSize: 13, lineHeight: 19, color: '#6b7280' },
  tokenValue: { marginTop: 4, fontSize: 12, lineHeight: 18, color: '#4b5563' },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  statusBadgeEnabled: {
    backgroundColor: '#ecfdf5',
    borderColor: '#86efac',
  },
  statusBadgeMuted: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  statusBadgeTextEnabled: { color: '#15803d' },
  statusBadgeTextMuted: { color: '#6b7280' },
  notificationActions: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 14,
    gap: 10,
  },
  notificationButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  notificationButtonDisabled: { opacity: 0.6 },
  notificationButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  notificationSecondaryButton: {
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  notificationSecondaryButtonDisabled: { backgroundColor: '#f3f4f6' },
  notificationSecondaryText: { color: '#4338ca', fontSize: 15, fontWeight: '700' },
  notificationSecondaryTextDisabled: { color: '#9ca3af' },
  notificationFootnote: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontSize: 12,
    lineHeight: 18,
    color: '#9ca3af',
  },
  planBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  planText: { color: '#16a34a', fontSize: 13, fontWeight: '600' },
  logoutButton: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#dc2626', fontSize: 16, fontWeight: '700' },
});
