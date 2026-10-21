import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { cvApiAuth } from '@/services/userApi';

WebBrowser.maybeCompleteAuthSession();

/** Where Google sends the browser back to after consent. Must be among cv-api's TRUSTED_ORIGINS. */
export function oauthRedirectUrl(): string {
  if (Platform.OS === 'web') {
    // Return to the page the creator started from (e.g. /lyrics), without any stale auth params.
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    return url.toString();
  }
  return Linking.createURL('auth/callback');
}

/**
 * Finishes a sign-in from the link cv-api brings the app back with (it holds
 * the session itself, Better Auth's Expo plugin). Returns whether a creator is
 * signed in afterwards.
 */
export async function completeOAuthFromUrl(url: string): Promise<boolean> {
  await cvApiAuth.applyCallback(url);
  return Boolean(await cvApiAuth.getSession());
}

export async function signInWithGoogle(): Promise<void> {
  // The web goes to Google and back with the cookie; a phone, through cv-api's proxy, with the session in the link.
  await cvApiAuth.signInWithGoogle(oauthRedirectUrl());
}

/** Turns a sign-in error into something a creator can act on. */
export function describeAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/Invalid email or password/i.test(message)) return 'That email and password do not match a Coptic Vine Artists account.';
  if (/Email not verified/i.test(message)) return 'Confirm your email address first. Check your inbox for the link.';
  return message;
}
