import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { cvApiAuth } from '@/services/userApi';
import type { UploadAuthProvider } from '@/utils/uploadAuth';

/**
 * Signing in, and the session: cv-api's (src/services/userApi.ts). Everything
 * asks this (and Google's sign-in, src/services/authService.ts).
 */
export type AccountUser = { id: string; email?: string };
export type AccountSession = { user: AccountUser };

export interface Account {
  getSession(): Promise<AccountSession | null>;
  /** The signed-in user, checked with the server where the source does. */
  getUser(): Promise<AccountUser | null>;
  /** Called on every change of session; returns the unsubscribe. */
  onChange(listener: (session: AccountSession | null) => void): () => void;
  signInWithEmail(email: string, password: string): Promise<void>;
  /** A new account; the email's confirmation link comes first. */
  signUpWithEmail(email: string, password: string, displayName: string): Promise<{ confirmationRequired: boolean }>;
  signOut(): Promise<void>;
}

/** Where an email's confirmation link brings the creator back, signed in. */
const confirmationReturn = () => (Platform.OS === 'web' ? window.location.origin : Linking.createURL('auth/callback'));

const cvApiAccount = (auth: typeof cvApiAuth): Account => ({
  getSession: () => auth.getSession(),
  getUser: () => auth.getUser(),
  onChange: (listener) => auth.onChange((_event, session) => listener(session)),
  signInWithEmail: (email, password) => auth.signInWithEmail(email, password),
  signUpWithEmail: (email, password, displayName) => auth.signUpWithEmail(email, password, displayName, confirmationReturn()),
  signOut: () => auth.signOut(),
});

export const account: Account = cvApiAccount(cvApiAuth);

const tokenSession = (token: string | null) => ({ data: { session: token ? { access_token: token } : null }, error: null });

/**
 * The session as the uploads ask for it (src/utils/uploadAuth.ts): cv-api's
 * token, checked again with the server when an upload is refused.
 */
export const cvApiUploadSessions = (auth: typeof cvApiAuth): UploadAuthProvider => ({
  getSession: async () => tokenSession(await auth.accessToken()),
  refreshSession: async () => {
    await auth.refresh();
    return tokenSession(await auth.accessToken());
  },
});

export const uploadSessions: UploadAuthProvider = cvApiUploadSessions(cvApiAuth);
