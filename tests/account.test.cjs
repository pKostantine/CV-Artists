const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

/**
 * Signing in (src/services/account.ts): cv-api's client
 * (src/services/cvApiAuth.ts, a copy of Coptic Vine's, which is tested against
 * the cv-api Worker there). The module is loaded for real, with its imports
 * replaced by stubs.
 */
function load(cvApiAuth, os = 'ios') {
  const compiled = ts.transpileModule(fs.readFileSync('src/services/account.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const stubs = {
    'expo-linking': { createURL: (path) => `copticvineartists://${path}` },
    'react-native': { Platform: { OS: os } },
    '@/services/userApi': { cvApiAuth },
  };
  const moduleObject = { exports: {} };
  new Function('module', 'exports', 'require', compiled)(moduleObject, moduleObject.exports, (id) => (id in stubs ? stubs[id] : require(id)));
  return moduleObject.exports;
}

function fakeCvApi() {
  const calls = [];
  let token = 'token-1';
  return {
    calls,
    revoke() { token = null; },
    async accessToken() { return token; },
    async refresh() { calls.push(['refresh']); return token ? { user: { id: 'user-1' } } : null; },
    async getSession() { return token ? { user: { id: 'user-1', email: 'creator@example.com' } } : null; },
    async getUser() { return token ? { id: 'user-1' } : null; },
    onChange(listener) { calls.push(['onChange']); listener('SIGNED_IN', { user: { id: 'user-1' } }); return () => calls.push(['unsubscribe']); },
    async signInWithEmail(email, password) { calls.push(['signIn', email, password]); },
    async signUpWithEmail(email, password, name, back) { calls.push(['signUp', email, password, name, back]); return { confirmationRequired: true }; },
    async signOut() { calls.push(['signOut']); },
  };
}

test('with cv-api, the uploads are handed its token, and a refused upload checks the session again', async () => {
  const cvApi = fakeCvApi();
  const { uploadSessions } = load(cvApi);
  assert.deepEqual(await uploadSessions.getSession(), { data: { session: { access_token: 'token-1' } }, error: null });
  assert.deepEqual(await uploadSessions.refreshSession(), { data: { session: { access_token: 'token-1' } }, error: null });
  assert.deepEqual(cvApi.calls, [['refresh']]);
  cvApi.revoke();
  assert.deepEqual(await uploadSessions.refreshSession(), { data: { session: null }, error: null }, 'signed out on the server: no token to upload with');
});

test('with cv-api, a phone\'s confirmation link comes back to auth/callback, and listeners get the session', async () => {
  const cvApi = fakeCvApi();
  const { account } = load(cvApi);
  assert.deepEqual(await account.signUpWithEmail('new@example.com', 'a password', 'New Creator'), { confirmationRequired: true });
  assert.deepEqual(cvApi.calls.at(-1), ['signUp', 'new@example.com', 'a password', 'New Creator', 'copticvineartists://auth/callback']);
  const seen = [];
  const unsubscribe = account.onChange((session) => seen.push(session?.user.id ?? null));
  unsubscribe();
  assert.deepEqual(seen, ['user-1']);
  assert.equal((await account.getSession()).user.email, 'creator@example.com');
});

