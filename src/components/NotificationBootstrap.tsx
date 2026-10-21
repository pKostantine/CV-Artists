import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { account } from '@/services/account';
import {
  installNativeNotificationRuntime,
  syncNativeNotificationDevice,
} from '@/services/notificationService';

export default function NotificationBootstrap() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let active = true;
    let removeRuntime = () => {};

    void installNativeNotificationRuntime((path) => {
      router.push(path as Href);
    }).then((remove) => {
      if (!active) {
        remove();
        return;
      }
      removeRuntime = remove;
    }).catch((error) => {
      console.warn('Unable to start Coptic Vine notifications:', error);
    });

    void syncNativeNotificationDevice({ requestPermission: false }).catch((error) => {
      console.warn('Unable to synchronize Coptic Vine notifications:', error);
    });

    const unsubscribe = account.onChange((session) => {
      if (!session) return;
      void syncNativeNotificationDevice({ requestPermission: false }).catch((error) => {
        console.warn('Unable to synchronize Coptic Vine notifications after sign-in:', error);
      });
    });

    return () => {
      active = false;
      removeRuntime();
      unsubscribe();
    };
  }, []);

  return null;
}
