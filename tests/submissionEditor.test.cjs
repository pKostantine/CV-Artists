const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (file) => fs.readFileSync(file, 'utf8');

test('the editor loads and saves through the shared submission editor RPCs', () => {
  const service = read('src/services/creatorService.ts');
  assert.match(service, /rpc<SubmissionEditorState>\('get_submission_editor', \{ p_submission_id: submissionId \}\)/);
  assert.match(service, /rpc<SubmissionEditorState>\('save_submission_edit', \{/);
  // A scheduled date is sent as an instant, as when submitting.
  assert.match(service, /scheduledReleaseAt: edit\.scheduledReleaseAt \? toIsoOrNull\(edit\.scheduledReleaseAt\) : null/);
});

test('this app saves as the artist, even for a Coptic Vine admin: a resubmission goes back to review', () => {
  const service = read('src/services/creatorService.ts');
  assert.match(service, /p_edit: \{\n\s+\.\.\.edit,\n\s+asCreator: true,/);
  const editor = read('src/components/SubmissionEditor.tsx');
  assert.doesNotMatch(editor, /isAdmin/);
  assert.doesNotMatch(editor, /editing as Coptic Vine/);
  assert.match(editor, /goes live when Coptic Vine approves it/);
});

test('a single is titled as its release; lessons are numbered; replaced files are sent as new uploads', () => {
  const editor = read('src/components/SubmissionEditor.tsx');
  assert.match(editor, /const single = takesReleaseTitle\(mode, items\.length\);/);
  assert.match(editor, /title: isLessonSet \? `Lesson \$\{index \+ 1\}` : single \? releaseTitle : preferredLocalizedTitle\(item\.localizedTitle\) \|\| item\.title,/);
  assert.match(editor, /localizedTitles: isLessonSet \? \{ en: '', ar: '', fr: '' \} : single \? titles : threeTitles\(item\.localizedTitle\),/);
  assert.match(editor, /uploadIntentId: item\.replacement\?\.uploadIntentId \?\? item\.upload\?\.uploadIntentId \?\? null,/);
  assert.match(editor, /showTitle=\{!single\}/);
});

test('an unchanged release date is not checked against the 48-hour notice again, and live content keeps its timing', () => {
  const editor = read('src/components/SubmissionEditor.tsx');
  assert.match(editor, /\.\.\.\(!state\.isLive \? \{/);
  assert.match(editor, /scheduledReleaseAt: timing === 'scheduled' && scheduledAt !== initialScheduledAt \? scheduledAt \|\| null : null,/);
});

test('every sent submission but a rejected one opens the editor, and Releases go to it', () => {
  const detail = read('src/app/submission/[id].tsx');
  const releases = read('src/app/releases.tsx');
  const route = read('src/app/submission/edit/[id].tsx');
  assert.match(detail, /const editable = submission\.status !== 'rejected' && submission\.status !== 'archived';/);
  assert.match(detail, /pathname: '\/submission\/edit\/\[id\]'/);
  assert.doesNotMatch(detail, /addCorrectedFiles|attachUpload/);
  assert.match(releases, /pathname: '\/submission\/edit\/\[id\]', params: \{ id: release\.submissionId, from: 'releases' \}/);
  assert.match(route, /<SubmissionEditor/);
});

test('artists delete their own submissions, live or not, from the editor and the submission page', () => {
  const service = read('src/services/creatorService.ts');
  const editor = read('src/components/SubmissionEditor.tsx');
  const detail = read('src/app/submission/[id].tsx');
  assert.match(service, /rpc\('delete_submission', \{ p_submission_id: submissionId \}\)/);
  assert.match(editor, /await creatorService\.deleteSubmission\(state\.submissionId\);/);
  // Every kind, and a rejected submission too (its read-only view keeps the danger zone).
  assert.doesNotMatch(editor, /isMusic && allowDelete/);
  assert.match(editor, /\{!!error && <Banner tone="error">\{error\}<\/Banner>\}\n\s+\{dangerZone\}\n\s+<\/Page>/);
  assert.match(detail, /await creatorService\.deleteSubmission\(submission\.id\);/);
});
