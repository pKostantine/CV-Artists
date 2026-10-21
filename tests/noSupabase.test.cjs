const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

/** Coptic Vine Artists signs in and keeps its data through cv-api only: nothing in it points at Supabase. */
test('nothing in the app points at Supabase: no address, key or variable of its own', () => {
  const root = path.join(__dirname, '..');
  const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));
  for (const file of ['app.json', '.env.example', ...walk('src')]) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /supabase\.co|sb_publishable_|EXPO_PUBLIC_SUPABASE_|EXPO_PUBLIC_USER_DATA_SOURCE/, file);
  }
});
