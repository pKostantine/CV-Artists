import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { cvApiAuth, USER_API_URL } from '@/services/userApi';

// Native has no localStorage; expo-sqlite provides a persistent one so the
// session survives app restarts.
if (Platform.OS !== 'web') {
  require('expo-sqlite/localStorage/install');
}

/**
 * The client for the creator's data: supabase-js, which speaks the REST and
 * function requests cv-api answers (src/services/userApi.ts), with cv-api's
 * bearer token. It never signs in itself (src/services/account.ts does).
 * supabase-js needs a key; cv-api has none, so it is a placeholder, and never
 * a session.
 */
export const api = createClient(USER_API_URL, 'cv-api', { accessToken: cvApiAuth.accessToken });
