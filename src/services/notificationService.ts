import Constants from 'expo-constants';
import type { DevicePushToken, NotificationResponse } from 'expo-notifications';
import { Platform } from 'react-native';

import { account } from '@/services/account';
import { api } from '@/services/api';

export type NotificationPreferenceMap = Record<string, boolean>;
export type NotificationSyncResult = 'registered' | 'permission_required' | 'signed_out' | 'unsupported' | 'unconfigured';

// Coptic Vine's names: the app key cv-api and the database check, and the
// channel the push dispatcher sends to. Before the rename they were chc
// (chc_artists, 'chc-default'); cv-api still takes the old key from older builds.
const APP_KEY = 'cv_artists';
const PROVIDER = 'expo';
const CHANNEL_ID = 'cv-default';
const LEGACY_CHANNEL_ID = 'chc-default';
const LAST_TOKEN_KEY = '@cv/notification-token/cv_artists';
const LEGACY_LAST_TOKEN_KEY = '@chc/notification-token/chc_artists';

let handlerConfigured = false;

/** localStorage, with the token an earlier build kept under the old name moved to the new first. */
function storage() {
  const store = typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  try {
    const legacy = store?.getItem(LEGACY_LAST_TOKEN_KEY) ?? null;
    if (store && legacy !== null) {
      if (store.getItem(LAST_TOKEN_KEY) === null) store.setItem(LAST_TOKEN_KEY, legacy);
      store.removeItem(LEGACY_LAST_TOKEN_KEY);
    }
  } catch {
    // Storage that can't be read has nothing to move.
  }
  return store;
}

function projectId() {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

async function notificationModule() {
  if (Platform.OS === 'web') return null;
  return import('expo-notifications');
}

async function prepareNativeNotifications(requestPermission: boolean) {
  const Notifications = await notificationModule();
  if (!Notifications) return { Notifications: null, granted: false };

  if (!handlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerConfigured = true;
  }

  if (Platform.OS === 'android') {
    await Notifications.deleteNotificationChannelAsync(LEGACY_CHANNEL_ID).catch(() => undefined);
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Coptic Vine Artists',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }

  return { Notifications, granted: permission.granted };
}

async function registerExpoToken(expoPushToken: string) {
  const user = await account.getUser();
  if (!user) return 'signed_out' as const;

  const { error } = await api.rpc('register_notification_device', {
    p_app_key: APP_KEY,
    p_platform: Platform.OS,
    p_provider: PROVIDER,
    p_push_token: expoPushToken,
    p_provider_data: projectId() ? { project_id: projectId() } : {},
    p_device_name: null,
    p_app_version: Constants.expoConfig?.version ?? null,
  });
  if (error) throw new Error('Register notifications: ' + error.message);

  storage()?.setItem(LAST_TOKEN_KEY, expoPushToken);
  return 'registered' as const;
}

export async function syncNativeNotificationDevice(options: {
  requestPermission?: boolean;
  devicePushToken?: DevicePushToken;
} = {}): Promise<NotificationSyncResult> {
  if (Platform.OS === 'web') return 'unsupported';

  const { Notifications, granted } = await prepareNativeNotifications(Boolean(options.requestPermission));
  if (!Notifications) return 'unsupported';
  if (!granted) return 'permission_required';

  const id = projectId();
  if (!id) return 'unconfigured';

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: id,
    ...(options.devicePushToken ? { devicePushToken: options.devicePushToken } : {}),
  });

  return registerExpoToken(token.data);
}

export async function disableNativeNotificationDevice(): Promise<void> {
  if (Platform.OS === 'web') return;
  const token = storage()?.getItem(LAST_TOKEN_KEY);
  if (!token) return;

  const { error } = await api.rpc('disable_notification_device', {
    p_app_key: APP_KEY,
    p_provider: PROVIDER,
    p_push_token: token,
  });
  if (error) throw new Error('Disable notifications: ' + error.message);
  storage()?.removeItem(LAST_TOKEN_KEY);
}

function routeFromResponse(response: NotificationResponse): string | null {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  const route = data?.deep_link ?? data?.url;
  return typeof route === 'string' && route.startsWith('/') ? route : null;
}

export async function installNativeNotificationRuntime(
  onDeepLink: (path: string) => void,
): Promise<() => void> {
  if (Platform.OS === 'web') return () => {};

  const { Notifications } = await prepareNativeNotifications(false);
  if (!Notifications) return () => {};

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const route = routeFromResponse(response);
    if (route) onDeepLink(route);
  });

  const tokenSubscription = Notifications.addPushTokenListener((devicePushToken) => {
    void syncNativeNotificationDevice({ devicePushToken }).catch((error) => {
      console.warn('Unable to refresh the Coptic Vine push token:', error);
    });
  });

  const initialResponse = await Notifications.getLastNotificationResponseAsync();
  if (initialResponse) {
    const route = routeFromResponse(initialResponse);
    if (route) onDeepLink(route);
    await Notifications.clearLastNotificationResponseAsync();
  }

  return () => {
    responseSubscription.remove();
    tokenSubscription.remove();
  };
}

export async function loadNotificationPreferences(categories: string[]): Promise<NotificationPreferenceMap> {
  const result: NotificationPreferenceMap = Object.fromEntries(categories.map((category) => [category, true]));
  const user = await account.getUser();
  if (!user) return result;

  const { data, error } = await api
    .from('notification_preferences')
    .select('category, enabled')
    .eq('user_id', user.id)
    .eq('app_key', APP_KEY)
    .in('category', categories);
  if (error) throw new Error('Load notification preferences: ' + error.message);

  for (const row of data ?? []) result[row.category] = row.enabled;
  return result;
}

export async function setNotificationPreference(category: string, enabled: boolean): Promise<void> {
  const user = await account.getUser();
  if (!user) throw new Error('Sign in to change notification preferences.');

  const { error } = await api.from('notification_preferences').upsert({
    user_id: user.id,
    app_key: APP_KEY,
    category,
    enabled,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,app_key,category' });
  if (error) throw new Error('Save notification preference: ' + error.message);
}

export async function listNotifications(limit = 50) {
  const { data, error } = await api
    .from('notifications')
    .select('id, category, event_type, title, body, image_url, deep_link, payload, created_at, read_at')
    .eq('app_key', APP_KEY)
    .order('created_at', { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)));
  if (error) throw new Error('Load notifications: ' + error.message);
  return data ?? [];
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await api
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('app_key', APP_KEY);
  if (error) throw new Error('Mark notification read: ' + error.message);
}
