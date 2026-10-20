const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const read = (file) => fs.readFileSync(file, 'utf8');

function load(path) {
  const moduleObject = { exports: {} };
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', 'require', 'module', output)(moduleObject.exports, require, moduleObject);
  return moduleObject.exports;
}

const track = (id, title, collection, position, extra = {}) => ({ id, title, targetType: 'music_track', collection, position, disc: collection ? 1 : null, ...extra });

test('Lyrics Studio groups its tracks by release, each in release order', () => {
  const { groupLyricTracks, collectionKindLabel, collectionCountLabel } = load('src/utils/lyricCollections.ts');
  const liturgy = { id: 'r1', kind: 'release', title: 'Liturgy', releaseType: 'album', artwork: { bucket: 'chc-images', path: 'a.jpg' } };
  const single = { id: 'r2', kind: 'release', title: 'At Your Feet', releaseType: 'single', artwork: null };
  const lessons = { id: 's1', kind: 'lesson_set', title: 'Teen Anastaseen', artwork: null };
  // The list comes newest first: the release changed most recently leads.
  const groups = groupLyricTracks([
    track('t2', 'Taishouri', liturgy, 2),
    track('loose', 'A draft', null, null),
    track('s', 'At Your Feet', single, 1),
    track('t1', 'Nisavev', liturgy, 1),
    track('l2', 'Lesson 2', lessons, 2, { targetType: 'learning_lesson' }),
    track('l1', 'Lesson 1', lessons, 1, { targetType: 'learning_lesson' }),
  ]);
  assert.deepEqual(groups.map((group) => [group.title, group.tracks.map((item) => item.id)]), [
    ['Liturgy', ['t1', 't2']],
    ['At Your Feet', ['s']],
    ['Teen Anastaseen', ['l1', 'l2']],
    ['Not on a release', ['loose']],
  ]);
  assert.deepEqual(groups.map(collectionKindLabel), ['Album', 'Single', 'Lesson set', 'Music']);
  assert.deepEqual(groups.map(collectionCountLabel), ['2 tracks', '1 track', '2 lessons', '1 track']);
  assert.equal(groups[0].artwork.path, 'a.jpg');
});

test('the studio picks a release, then a track; a single needs only the release', () => {
  const studio = read('src/components/LyricsStudio.tsx');
  assert.match(studio, /1\. Choose a release, then a track/);
  assert.match(studio, /const collections = useMemo\(\(\) => groupLyricTracks\(tracks\), \[tracks\]\);/);
  assert.match(studio, /if \(collection\.tracks\.length === 1\) void switchTrack\(collection\.tracks\[0\]\.id\);/);
  assert.match(studio, /onPress=\{\(\) => void switchTrack\(track\.id\)\}/);
  assert.doesNotMatch(studio, /1\. Choose a track</);
});
