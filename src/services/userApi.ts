import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { AppState, Platform } from 'react-native';

import { createCvApiAuth, type CvApiAuth, type CvApiMessage } from '@/services/cvApiAuth';

/**
 * Where Coptic Vine Artists signs in and keeps its data: cv-api at
 * https://api.copticvine.ca (Coptic Vine's workers/api), with Better Auth for
 * signing in (src/services/cvApiAuth.ts) and the REST and function requests
 * supabase-js makes, on D1. EXPO_PUBLIC_USER_API_URL gives another address.
 */
export const USER_API_URL = (process.env.EXPO_PUBLIC_USER_API_URL || 'https://api.copticvine.ca').replace(/\/+$/, '');

const MESSAGES: Record<CvApiMessage, string> = {
  finishSignIn: 'Unable to finish signing in.',
  signIn: 'Unable to sign in.',
  createAccount: 'Unable to create your account.',
  startGoogle: 'Unable to start Google sign-in.',
  googleNoUrl: 'Google sign-in did not return a URL.',
  googleIncomplete: 'Google sign-in did not complete. Try again.',
  googleNotEnabled: 'Google sign-in is not switched on for Coptic Vine Artists yet. Use your email and password for now.',
  passwordReset: 'Unable to send a password reset email.',
  resendConfirmation: 'Unable to resend the confirmation email.',
  updateProfile: 'Unable to update your profile.',
  updateEmail: 'Unable to update your email address.',
  updatePhoto: 'Unable to update your photo.',
  updatePassword: 'Unable to update your password.',
  currentPasswordRequired: 'Enter your current password.',
  linkExpired: 'This link has expired or was already used.',
  signOut: 'Unable to sign out.',
};

/**
 * Signing in to cv-api. The web keeps a bearer token too, which the upload
 * authorizer is handed, and reads the links back on any page, since Google
 * returns to the page it left.
 */
export const cvApiAuth: CvApiAuth = createCvApiAuth({
  baseUrl: USER_API_URL,
  native: Platform.OS !== 'web',
  bearer: true,
  appOrigin: Platform.OS === 'web' ? '' : Linking.createURL(''),
  callbackPath: Platform.OS === 'web' ? undefined : 'auth/callback',
  // expo-sqlite's localStorage on a phone (installed by src/services/api.ts), the browser's on the web.
  storage: () => (typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage),
  openAuthSession: async (url, returnUrl) => {
    if (Platform.OS === 'android') {
      try {
        WebBrowser.dismissAuthSession();
      } catch {
        // None was open.
      }
    }
    return WebBrowser.openAuthSessionAsync(url, returnUrl);
  },
  navigate: (url) => window.location.assign(url),
  replaceUrl: Platform.OS === 'web' ? (url) => window.history.replaceState(window.history.state, '', url) : undefined,
  message: (key) => MESSAGES[key],
});

// Checked again whenever the app comes back.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void cvApiAuth.refresh();
  });
}
