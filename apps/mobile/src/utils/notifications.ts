import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type NotificationPermissionState =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'simulator'
  | 'unsupported';

export interface NotificationRegistrationState {
  permission: NotificationPermissionState;
  enabled: boolean;
  canAskAgain: boolean;
  expoPushToken: string | null;
  message?: string;
}

const DEFAULT_CHANNEL_ID = 'default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function hasGrantedPermissions(settings: Notifications.NotificationPermissionsStatus): boolean {
  return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

function getProjectId(): string | null {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  return typeof projectId === 'string' && projectId.length > 0 ? projectId : null;
}

async function ensureAndroidNotificationChannelAsync(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: 'Општи известувања',
    description: 'Известувања за авантури, сесии и важни активности.',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4f46e5',
    enableVibrate: true,
    showBadge: true,
    sound: 'default',
  });
}

async function persistNotificationState(userId: string, state: NotificationRegistrationState): Promise<void> {
  try {
    await setDoc(doc(db, 'user_settings', userId), {
      notificationsEnabled: state.enabled,
      notificationPermission: state.permission,
      expoPushToken: state.expoPushToken,
      notificationPlatform: Platform.OS,
      notificationsUpdatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('[Notifications] Failed to persist settings', error);
  }
}

async function resolveCurrentStateAsync(): Promise<NotificationRegistrationState> {
  const permissions = await Notifications.getPermissionsAsync();
  const granted = hasGrantedPermissions(permissions);

  return {
    permission: granted ? 'granted' : (permissions.status as NotificationPermissionState),
    enabled: granted,
    canAskAgain: permissions.canAskAgain,
    expoPushToken: null,
  };
}

async function resolveTokenAsync(): Promise<string | null> {
  const projectId = getProjectId();
  if (!projectId) {
    throw new Error('Недостасува EAS projectId за push registration.');
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

async function buildRegisteredStateAsync(): Promise<NotificationRegistrationState> {
  const baseState = await resolveCurrentStateAsync();
  if (!baseState.enabled) return baseState;

  const expoPushToken = await resolveTokenAsync();
  return {
    ...baseState,
    expoPushToken,
  };
}

export async function getNotificationRegistrationStateAsync(): Promise<NotificationRegistrationState> {
  if (!Device.isDevice) {
    return {
      permission: 'simulator',
      enabled: false,
      canAskAgain: false,
      expoPushToken: null,
      message: 'Push известувањата бараат физички уред или dev build.',
    };
  }

  await ensureAndroidNotificationChannelAsync();

  try {
    return await buildRegisteredStateAsync();
  } catch (error) {
    const fallback = await resolveCurrentStateAsync();
    return {
      ...fallback,
      message: error instanceof Error ? error.message : 'Не успеа читањето на push статусот.',
    };
  }
}

export async function syncNotificationRegistrationAsync(userId: string): Promise<NotificationRegistrationState> {
  const state = await getNotificationRegistrationStateAsync();
  await persistNotificationState(userId, state);
  return state;
}

export async function requestNotificationRegistrationAsync(userId: string): Promise<NotificationRegistrationState> {
  if (!Device.isDevice) {
    const simulatorState: NotificationRegistrationState = {
      permission: 'simulator',
      enabled: false,
      canAskAgain: false,
      expoPushToken: null,
      message: 'Push известувањата бараат физички уред или dev build.',
    };
    await persistNotificationState(userId, simulatorState);
    return simulatorState;
  }

  await ensureAndroidNotificationChannelAsync();

  const current = await Notifications.getPermissionsAsync();
  let granted = hasGrantedPermissions(current);
  let canAskAgain = current.canAskAgain;

  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowProvisional: true,
        provideAppNotificationSettings: true,
      },
    });
    granted = hasGrantedPermissions(requested);
    canAskAgain = requested.canAskAgain;
    if (!granted) {
      const deniedState: NotificationRegistrationState = {
        permission: requested.status as NotificationPermissionState,
        enabled: false,
        canAskAgain,
        expoPushToken: null,
        message: 'Известувањата не се одобрени на овој уред.',
      };
      await persistNotificationState(userId, deniedState);
      return deniedState;
    }
  }

  try {
    const registeredState = await buildRegisteredStateAsync();
    await persistNotificationState(userId, registeredState);
    return registeredState;
  } catch (error) {
    const failedState: NotificationRegistrationState = {
      permission: 'granted',
      enabled: true,
      canAskAgain,
      expoPushToken: null,
      message: error instanceof Error ? error.message : 'Не успеа регистрацијата за push известувања.',
    };
    await persistNotificationState(userId, failedState);
    return failedState;
  }
}

export async function scheduleTestNotificationAsync(): Promise<void> {
  await ensureAndroidNotificationChannelAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'АВАНТУРА',
      body: 'Известувањата се активирани успешно на уредот.',
      sound: 'default',
      data: { url: '/settings' },
    },
    trigger: null,
  });
}

export function addNotificationResponseListener(onOpenUrl: (url: string) => void) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string' && url.length > 0) {
      onOpenUrl(url);
    }
  });

  return subscription;
}

export async function handleInitialNotificationAsync(onOpenUrl: (url: string) => void): Promise<void> {
  const response = await Notifications.getLastNotificationResponseAsync();
  const url = response?.notification.request.content.data?.url;
  if (typeof url === 'string' && url.length > 0) {
    onOpenUrl(url);
    await Notifications.clearLastNotificationResponseAsync();
  }
}

export function addPushTokenSyncListener(userId: string) {
  return Notifications.addPushTokenListener(({ data }) => {
    if (typeof data !== 'string' || data.length === 0) return;
    void persistNotificationState(userId, {
      permission: 'granted',
      enabled: true,
      canAskAgain: false,
      expoPushToken: data,
    });
  });
}