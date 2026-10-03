import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HeroGlow, Seal } from '@/components/Brand';
import { VineDivider } from '@/components/Ornaments';
import { Banner, Button, Card, Eyebrow, Field, Segmented } from '@/components/ui';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { describeAuthError, signInWithGoogle } from '@/services/authService';
import { supabase } from '@/services/supabase';

type AuthMode = 'signIn' | 'signUp';

export function SignInScreen({ initialError }: { initialError?: string }) {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(initialError ?? '');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<'' | 'email' | 'google'>('');

  function switchMode(next: AuthMode) {
    setMode(next);
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
  }

  async function signIn() {
    setBusy('email');
    setError('');
    setNotice('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) setError(describeAuthError(authError));
    setBusy('');
  }

  async function signUp() {
    setError('');
    setNotice('');
    if (!displayName.trim()) return setError('Enter the name you want shown in Coptic Vine Artists.');
    if (password.length < 8) return setError('Use a password with at least 8 characters.');
    if (password !== confirmPassword) return setError('The passwords do not match.');

    setBusy('email');
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: displayName.trim() },
        emailRedirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
      },
    });

    if (authError) {
      setError(describeAuthError(authError));
    } else if (!data.session) {
      setNotice('Account created. Check your email to confirm it, then come back and sign in.');
      setMode('signIn');
      setPassword('');
      setConfirmPassword('');
    }
    setBusy('');
  }

  async function google() {
    setError('');
    setNotice('');
    setBusy('google');
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(describeAuthError(e));
    } finally {
      // On web the page navigates away to Google, so this only matters on failure or cancel.
      setBusy('');
    }
  }

  const signInDisabled = Boolean(busy) || !email.trim() || !password;
  const signUpDisabled = signInDisabled || !displayName.trim() || !confirmPassword;
  const submit = mode === 'signIn' ? signIn : signUp;

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <HeroGlow height={520} />
        <View style={styles.column}>
          <View style={styles.hero}>
            <Seal size={112} />
            <Eyebrow>Coptic Vine Artists</Eyebrow>
            <Text style={styles.title} accessibilityRole="header">
              {mode === 'signUp' ? 'Create your creator account' : 'Creator dashboard'}
            </Text>
            <Text style={styles.subtitle}>Publish your music and Learn &amp; Study lessons.</Text>
            <VineDivider width={180} height={32} />
          </View>

          <Card>
            <View style={styles.modeRow}>
              <Segmented
                items={[{ id: 'signIn', title: 'Sign in' }, { id: 'signUp', title: 'Sign up' }]}
                value={mode}
                onChange={(value) => switchMode(value as AuthMode)}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.googleButton, Boolean(busy) && styles.disabled, pressed && styles.pressed]}
              disabled={Boolean(busy)}
              onPress={() => void google()}
            >
              <Text style={styles.googleMark}>G</Text>
              <Text style={styles.googleButtonText}>{busy === 'google' ? 'Opening Google…' : 'Continue with Google'}</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or use email</Text>
              <View style={styles.divider} />
            </View>

            {mode === 'signUp' && (
              <Field
                label="Display name"
                placeholder="The name listeners will see"
                autoComplete="name"
                value={displayName}
                onChangeText={setDisplayName}
              />
            )}
            <Field
              label="Email"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
            />
            <Field
              label="Password"
              secureTextEntry
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              placeholder={mode === 'signUp' ? 'At least 8 characters' : 'Password'}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={() => { if (mode === 'signIn' && !signInDisabled) void signIn(); }}
            />
            {mode === 'signUp' && (
              <Field
                label="Confirm password"
                secureTextEntry
                autoComplete="new-password"
                placeholder="Type it again"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onSubmitEditing={() => { if (!signUpDisabled) void signUp(); }}
              />
            )}

            <Button
              kind="primary"
              label={busy === 'email' ? 'Please wait…' : mode === 'signIn' ? 'Sign in' : 'Create account'}
              busy={busy === 'email'}
              disabled={mode === 'signIn' ? signInDisabled : signUpDisabled}
              onPress={() => void submit()}
            />

            {!!error && <Banner tone="error">{error}</Banner>}
            {!!notice && <Banner tone="success">{notice}</Banner>}
          </Card>

          <Text style={styles.note}>
            {mode === 'signUp'
              ? 'Your Coptic Vine Artists workspace is created the first time you sign in.'
              : 'Your submissions stay private until Coptic Vine reviews and publishes them.'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.black },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 48 },
  column: { width: '100%', maxWidth: 420, gap: 22 },
  hero: { alignItems: 'center', gap: 10 },
  title: { color: COLORS.white, fontFamily: TYPOGRAPHY.title, fontSize: 30, lineHeight: 36, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  subtitle: { color: COLORS.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 400 },
  modeRow: { alignItems: 'center' },
  googleButton: { flexDirection: 'row', gap: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADII.sm, minHeight: 46, paddingVertical: 11 },
  googleMark: { color: '#4285F4', fontWeight: '900', fontSize: 18 },
  googleButtonText: { color: '#1F1F1F', fontWeight: '600', fontSize: 15 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: COLORS.hairline },
  dividerText: { color: COLORS.faint, fontSize: 12.5 },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.82 },
  note: { color: COLORS.faint, fontSize: 12.5, lineHeight: 19, textAlign: 'center', paddingHorizontal: 8 },
});
