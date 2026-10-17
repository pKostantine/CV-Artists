const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function compile(file) {
  return ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

function load(file, requireMap) {
  const moduleObject = { exports: {} };
  const mockRequire = (name) => {
    if (name in requireMap) return requireMap[name];
    throw new Error('Unexpected require: ' + name);
  };
  new Function('require', 'module', 'exports', compile(file))(mockRequire, moduleObject, moduleObject.exports);
  return moduleObject.exports;
}

const plan = load('src/utils/multipartPlan.ts', {});
const MIB = 1024 * 1024;

test('part sizes stay within R2 limits for anything up to the 20 GB cap', () => {
  assert.deepEqual(plan.planParts(15 * 1024 ** 3, 32 * MIB, 64 * MIB), { partSize: 32 * MIB, partCount: 480 });
  assert.equal(plan.planParts(60 * MIB, 1, 64 * MIB).partSize, 5 * MIB);
  const huge = plan.planParts(400 * 1024 ** 3, 32 * MIB, 64 * MIB);
  assert.equal(huge.partSize, 44 * MIB, 'parts grow so a file never needs more than 9,500');
  assert.ok(huge.partCount <= 9500);
  assert.equal(plan.planParts(1000 * 1024 ** 3, 32 * MIB, 64 * MIB).partSize, 64 * MIB, 'never above the server maximum');
  assert.deepEqual([1, 2, 3, 6, 9].map(plan.retryDelayMs), [1000, 2000, 4000, 30000, 30000]);
});

test('upload speed is smoothed and turned into time left', () => {
  let now = 0;
  const meter = new plan.SpeedMeter(() => now);
  meter.sample(0);
  now = 1000;
  assert.equal(meter.sample(10_000_000), 10_000_000);
  now = 2000;
  assert.equal(meter.sample(15_000_000), 10_000_000 * 0.7 + 5_000_000 * 0.3);
  assert.equal(meter.secondsLeft(85_000_000), Math.ceil(85_000_000 / 8_500_000));
});

test('a remembered upload expires before its authorization does', () => {
  const store = new Map();
  const kv = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  const key = plan.resumeKey('acct', { name: 'Lesson.mov', size: 10, lastModified: 5 });
  plan.saveResumable(key, { uploadIntentId: 'i', uploadId: 'u', partSize: 5, parts: { 1: 'e' }, savedAt: 0 }, kv);
  assert.equal(plan.loadResumable(key, kv, 60_000).uploadIntentId, 'i');
  assert.equal(plan.loadResumable(key, kv, 21 * 60 * 60 * 1000), null);
  assert.equal(store.size, 0);
});

function harness({ failPart = null, missingUpload = false } = {}) {
  const calls = { authorize: 0, create: 0, parts: [], complete: [] };
  const state = { failPart, missingUpload };
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };

  globalThis.XMLHttpRequest = class {
    constructor() { this.upload = {}; }
    open(method, url) { this.url = url; }
    setRequestHeader() {}
    send(body) {
      setImmediate(() => {
        const match = this.url.match(/\/parts\/(\d+)$/);
        const partNumber = Number(match[1]);
        calls.parts.push({ partNumber, uploadId: this.url.match(/multipart\/([^/]+)\/parts/)[1] });
        if (state.missingUpload && this.url.includes('/multipart/old-upload/')) {
          this.status = 404;
          this.responseText = '{"error":"upload_intent_not_found"}';
          this.onload();
          return;
        }
        if (state.failPart === partNumber) {
          this.status = 0;
          this.onerror();
          return;
        }
        this.upload.onprogress?.({ lengthComputable: true, loaded: body.size });
        this.status = 200;
        this.responseText = JSON.stringify({ partNumber, etag: `etag-${partNumber}` });
        this.onload();
      });
    }
  };

  const uploadAuth = {
    getToken: async () => 'token',
    authorizedFetch: async (url, init = {}) => {
      if (url.endsWith('/uploads/authorize')) {
        calls.authorize += 1;
        return new Response(JSON.stringify({ uploadIntentId: `intent-${calls.authorize}` }), { status: 200 });
      }
      if (url.endsWith('/multipart') && init.method === 'POST') {
        calls.create += 1;
        return new Response(JSON.stringify({ uploadId: `upload-${calls.create}`, partSize: 5 * MIB, maxPartSize: 64 * MIB, maxParallel: 6 }), { status: 200 });
      }
      if (url.endsWith('/complete')) {
        calls.complete.push(JSON.parse(init.body));
        return new Response('{}', { status: 200 });
      }
      throw new Error('Unexpected fetch ' + url);
    },
  };

  const { creatorService } = load('src/services/creatorService.ts', {
    'react-native': { Platform: { OS: 'web' } },
    'expo-file-system': { File: class {} },
    '@/services/supabase': { supabase: {} },
    '@/utils/uploadAuth': { createUploadAuth: () => uploadAuth },
    '@/utils/titles': { preferredLocalizedTitle: (titles) => titles?.en || '', releaseTypeForTrackCount: () => 'single' },
    // Retries happen at once in tests.
    '@/utils/multipartPlan': { ...plan, retryDelayMs: () => 0 },
  });
  return { calls, state, store, creatorService };
}

function bigFile() {
  const bytes = new Uint8Array(60 * MIB);
  const file = new File([bytes], 'Lesson 4.mov', { type: 'video/quicktime', lastModified: 1_700_000_000_000 });
  return { id: 'f', name: file.name, size: file.size, mediaType: 'video', mimeType: 'video/quicktime', uri: 'blob:x', sourceFile: file, progress: 0 };
}

test('a large upload that stops continues where it stopped, without re-sending finished parts', async () => {
  const { calls, state, store, creatorService } = harness({ failPart: 3 });
  const file = bigFile();

  await assert.rejects(creatorService.upload('acct', file, () => {}), (error) => {
    assert.equal(error.code, 'upload_paused');
    assert.match(error.message, /continue from where it stopped/);
    return true;
  });
  assert.equal(calls.complete.length, 0);
  const saved = JSON.parse([...store.values()][0]);
  const finished = Object.keys(saved.parts).map(Number);
  assert.ok(!finished.includes(3));
  assert.ok(finished.length >= 2);

  state.failPart = null;
  const sentBefore = calls.parts.length;
  const progress = [];
  const id = await creatorService.upload('acct', file, (value) => progress.push(value));
  assert.equal(id, 'intent-1');
  assert.equal(calls.authorize, 1, 'not authorized again');
  assert.equal(calls.create, 1, 'the same multipart upload continued');
  const resent = calls.parts.slice(sentBefore).map((part) => part.partNumber);
  assert.ok(resent.every((partNumber) => !finished.includes(partNumber)), 'finished parts are not sent again');
  assert.equal(calls.complete[0].parts.length, 12);
  assert.deepEqual(calls.complete[0].parts.map((part) => part.partNumber), Array.from({ length: 12 }, (_, i) => i + 1));
  assert.equal(store.size, 0, 'the finished upload is forgotten');
  assert.equal(progress.at(-1), 1);
});

test('an upload that can no longer be resumed starts over cleanly', async () => {
  const { calls, store, creatorService } = harness({ missingUpload: true });
  const file = bigFile();
  const key = plan.resumeKey('acct', { name: file.name, size: file.size, lastModified: file.sourceFile.lastModified });
  store.set(key, JSON.stringify({ uploadIntentId: 'old-intent', uploadId: 'old-upload', partSize: 5 * MIB, parts: { 1: 'x' }, savedAt: Date.now() }));

  const id = await creatorService.upload('acct', file, () => {});
  assert.equal(id, 'intent-1');
  assert.equal(calls.authorize, 1);
  assert.equal(calls.complete.length, 1);
  assert.equal(calls.complete[0].parts.length, 12);
  assert.equal(store.size, 0);
});
