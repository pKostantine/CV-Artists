import { useFonts as useLocalFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppShell } from '@/components/AppShell';
import NotificationBootstrap from '@/components/NotificationBootstrap';
import { SignInScreen } from '@/components/SignInScreen';
import { Loading } from '@/components/ui';
import { COLORS } from '@/constants/theme';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { account, type AccountSession } from '@/services/account';
import { describeAuthError } from '@/services/authService';

function AppStack() {
  return (
    <Stack
      screenOptions={{
        animation: 'none',
        contentStyle: { backgroundColor: COLORS.black },
        headerShown: false,
      }}
    />
  );
}

/** Reads an OAuth error the provider put in the URL on web, then removes the auth params. */
function takeWebAuthRedirectError(): string {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const message = url.searchParams.get('error_description') || hash.get('error_description') || '';
  // cv-api's own failures (a lost or stale sign-in) give only a code.
  const failed = url.searchParams.has('error');
  if (message || failed) {
    window.history.replaceState(null, '', url.pathname);
  }
  if (message) return describeAuthError(new Error(message.replace(/\+/g, ' ')));
  return failed ? 'Google sign-in did not complete. Try again.' : '';
}

function clearWebAuthCode() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (url.searchParams.has('code')) window.history.replaceState(null, '', url.pathname);
}

export default function RootLayout() {
  const pathname = usePathname();
  const [fontsLoaded] = useLocalFonts({
    Athanasius: require('../../assets/fonts/CopticVine-Athanasius-v1.0.ttf'),
  });
  const [session, setSession] = useState<AccountSession | null>(null);
  const [ready, setReady] = useState(false);
  const [authError] = useState(takeWebAuthRedirectError);

  useEffect(() => {
    // getSession waits for the web ?code= exchange (detectSessionInUrl) to
    // finish; with cv-api, for the first check, which takes Google's cookie.
    void account.getSession().catch(() => null).then((restored) => {
      setSession(restored);
      setReady(true);
      if (restored) clearWebAuthCode();
    });
    return account.onChange(setSession);
  }, []);

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={[styles.root, styles.opening]} />
      </SafeAreaProvider>
    );
  }

  let content;
  if (pathname === '/auth/callback') {
    // Native OAuth deep link: that route finishes the exchange itself.
    content = <AppStack />;
  } else if (!ready) {
    content = <Loading full label="Opening Coptic Vine Artists…" />;
  } else if (!session) {
    content = <SignInScreen initialError={authError} />;
  } else {
    // Keyed by user so switching accounts never shows the previous creator's data.
    content = (
      <WorkspaceProvider key={session.user.id}>
        <NotificationBootstrap />
        <AppShell>
          <AppStack />
        </AppShell>
      </WorkspaceProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.root}>{content}</View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  // Matches the splash and the web page behind the app until the fonts load.
  opening: { backgroundColor: COLORS.greenDeep },
});
