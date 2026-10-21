import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { supabase } from '@/services/supabase';
import { cvApiAuth } from '@/services/userApi';
import type { UploadAuthProvider } from '@/utils/uploadAuth';

/**
 * Signing in, and the session, from whichever source src/services/userApi.ts
 * says: Supabase Auth until the cutover, or cv-api. Everything asks this (and
 * Google's sign-in, src/services/authService.ts), never supabase.auth, which
 * the cv-api client doesn't have.
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
  /** A new account; the email's confirmation link comes first, unless the source signs in at once. */
  signUpWithEmail(email: string, password: string, displayName: string): Promise<{ confirmationRequired: boolean }>;
  signOut(): Promise<void>;
}

const supabaseAccount: Account = {
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },
  onChange(listener) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => listener(session));
    return () => data.subscription.unsubscribe();
  },
  async signInWithEmail(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  async signUpWithEmail(email, password, displayName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
        emailRedirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
      },
    });
    if (error) throw error;
    return { confirmationRequired: !data.session };
  },
  async signOut() {
    await supabase.auth.signOut();
  },
};

/** Where an email's confirmation link brings the creator back, signed in. */
const confirmationReturn = () => (Platform.OS === 'web' ? window.location.origin : Linking.createURL('auth/callback'));

const cvApiAccount = (auth: NonNullable<typeof cvApiAuth>): Account => ({
  getSession: () => auth.getSession(),
  getUser: () => auth.getUser(),
  onChange: (listener) => auth.onChange((_event, session) => listener(session)),
  signInWithEmail: (email, password) => auth.signInWithEmail(email, password),
  signUpWithEmail: (email, password, displayName) => auth.signUpWithEmail(email, password, displayName, confirmationReturn()),
  signOut: () => auth.signOut(),
});

export const account: Account = cvApiAuth ? cvApiAccount(cvApiAuth) : supabaseAccount;

const tokenSession = (token: string | null) => ({ data: { session: token ? { access_token: token } : null }, error: null });

/**
 * The session as the uploads ask for it (src/utils/uploadAuth.ts): Supabase
 * Auth itself, or cv-api's token, checked again with the server when an upload
 * is refused.
 */
export const cvApiUploadSessions = (auth: NonNullable<typeof cvApiAuth>): UploadAuthProvider => ({
  getSession: async () => tokenSession(await auth.accessToken()),
  refreshSession: async () => {
    await auth.refresh();
    return tokenSession(await auth.accessToken());
  },
});

export const uploadSessions: UploadAuthProvider = cvApiAuth ? cvApiUploadSessions(cvApiAuth) : supabase.auth;
