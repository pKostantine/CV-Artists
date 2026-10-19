import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { FileDropZone } from '@/components/FileDropZone';
import { FileSelectButton } from '@/components/FileSelectButton';
import { LearningContributorPicker, LearningHymnPicker } from '@/components/LearningPickers';
import { BuddedCross } from '@/components/Ornaments';
import { ReleaseDateTimeField } from '@/components/ReleaseDateTimeField';
import { ReorderableList } from '@/components/ReorderableList';
import { TrackMetadataEditor } from '@/components/TrackMetadataEditor';
import { Banner, Button, Card, Dropdown, Field, Label, Loading, Page, PageHeader, Segmented, StatusPill, uiStyles } from '@/components/ui';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { creatorService } from '@/services/creatorService';
import { resolveImageUrl } from '@/services/mediaService';
import type {
  CatalogOptions,
  EditorFileStatus,
  LocalizedMetadata,
  SubmissionEdit,
  SubmissionEditorItem,
  SubmissionEditorState,
  SubmissionMode,
  TrackContributor,
  UploadCandidate,
} from '@/types/creator';
import { confirmAction } from '@/utils/dialogs';
import { fileSize, uploadLabel } from '@/utils/format';
import { hasMusicTitle, MUSIC_TITLE_LOCALES, preferredLocalizedTitle, takesReleaseTitle } from '@/utils/titles';
import { droppedUploadCandidates, runUpload, uploadsBlocking } from '@/utils/uploads';

/** One track, recording or lesson in the editor, kept or new. */
interface EditorItem {
  key: string;
  /** The saved item's ID (a track's, or a Learn item's); absent for a new one. */
  id?: string;
  title: string;
  localizedTitle: LocalizedMetadata;
  mainArtistName: string;
  mainArtistId?: string;
  contributors: TrackContributor[];
  /** A new item's file. */
  upload?: UploadCandidate;
  /** A new file for a saved item. */
  replacement?: UploadCandidate;
  saved?: SubmissionEditorItem;
}

const MUSIC_TYPE_OPTIONS = [
  { id: 'hymn', title: 'Hymns' },
  { id: 'spiritual_song', title: 'Spiritual Songs' },
  { id: 'other', title: 'Other' },
];

const RECORDING_TYPE_OPTIONS = [
  { id: 'studio', title: 'Studio' },
  { id: 'live', title: 'Live' },
  { id: 'instrumental', title: 'Instrumental' },
  { id: 'other', title: 'Other' },
];

const KIND_LABELS: Record<SubmissionEditorState['kind'], string> = {
  music_release: 'Music release',
  learning_album: 'Learning album',
  learning_lesson_set: 'Lesson set',
};

const MODES: Record<SubmissionEditorState['kind'], SubmissionMode> = {
  music_release: 'music',
  learning_album: 'learning_album',
  learning_lesson_set: 'learning_lesson_set',
};

function musicTypeOption(value?: string | null): string {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'hymn' || normalized === 'hymns') return 'hymn';
  if (normalized === 'spiritual song' || normalized === 'spiritual songs') return 'spiritual_song';
  return normalized ? 'other' : '';
}

function recordingTypeOption(value?: string | null): string {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'studio') return 'studio';
  if (normalized === 'live') return 'live';
  if (normalized === 'instrumental') return 'instrumental';
  return normalized ? 'other' : '';
}

function localDateTimeValue(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16).replace('T', ' ');
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16).replace('T', ' ');
}

function localized(titles?: { en?: string; ar?: string; fr?: string } | null): LocalizedMetadata {
  return { en: titles?.en ?? '', ar: titles?.ar ?? '', cop: '', fr: titles?.fr ?? '' };
}

function threeTitles(titles: LocalizedMetadata) {
  return { en: titles.en.trim(), ar: titles.ar.trim(), fr: titles.fr.trim() };
}

/** "Ready", "Processing", … for a saved file. */
export function fileStatusLabel(status: EditorFileStatus): string {
  switch (status) {
    case 'completed': return 'Ready';
    case 'processing': return 'Processing';
    case 'queued':
    case 'uploaded': return 'Waiting to process';
    case 'failed': return 'Processing failed';
    case 'cancelled': return 'Processing cancelled';
    case 'missing': return 'No file';
    default: return status;
  }
}

/** What saving does here, in the editor's words. */
function saveExplanation(state: SubmissionEditorState): string {
  if (state.isAdmin) {
    return state.isLive
      ? 'You are editing as Coptic Vine. Changes are live when you save; new and replaced files and artwork go live as soon as they finish processing.'
      : 'You are editing as Coptic Vine. Saving keeps the submission where it is in review.';
  }
  if (state.isLive) {
    return 'Titles, details, credits, order and deletions are live as soon as you save. New or replaced files and artwork go to Coptic Vine for review first; what is live now stays live until they are approved.';
  }
  if (state.status === 'pending_review') return 'Saving updates the submission Coptic Vine is reviewing.';
  return 'Saving sends this back to Coptic Vine for review.';
}

function itemsFromState(state: SubmissionEditorState): EditorItem[] {
  return state.items.map((item) => ({
    key: item.id,
    id: item.id,
    title: item.title,
    localizedTitle: localized(item.localizedTitles),
    mainArtistName: item.mainArtist && !item.mainArtist.isIdentity ? item.mainArtist.displayName : '',
    mainArtistId: item.mainArtist && !item.mainArtist.isIdentity ? item.mainArtist.id : undefined,
    contributors: (item.contributors ?? []).map((credit) => ({
      id: credit.id,
      name: credit.name,
      role: credit.role,
      artistId: credit.artistId,
    })),
    saved: item,
  }));
}

/**
 * Edits a submission after it is sent, music or Learn, in any status but
 * rejected, and the published release, album or lesson set it became:
 * titles in every language, details, credits, order, artwork, adding and
 * deleting items, and replacing a file. One save sends it all
 * (save_submission_edit); the database decides what goes live and what goes
 * to review (supabase/migrations/20261019200000_edit_submissions_after_sending.sql).
 */
export function SubmissionEditor({ submissionId, backLabel, onBack, onSaved, onDeleted }: {
  submissionId: string;
  backLabel: string;
  onBack: () => void;
  onSaved?: (state: SubmissionEditorState) => void;
  onDeleted?: () => void;
}) {
  const [state, setState] = useState<SubmissionEditorState | null>(null);
  const [items, setItems] = useState<EditorItem[]>([]);
  const [localizedTitle, setLocalizedTitle] = useState<LocalizedMetadata>(localized(null));
  const [description, setDescription] = useState('');
  const [musicType, setMusicType] = useState('');
  const [musicTypeChoice, setMusicTypeChoice] = useState('');
  const [recordingType, setRecordingType] = useState('');
  const [recordingTypeChoice, setRecordingTypeChoice] = useState('');
  const [artistName, setArtistName] = useState('');
  const [artistId, setArtistId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [hymnId, setHymnId] = useState('');
  const [timing, setTiming] = useState<'asap' | 'scheduled'>('asap');
  const [scheduledAt, setScheduledAt] = useState('');
  const [initialScheduledAt, setInitialScheduledAt] = useState('');
  const [originalDate, setOriginalDate] = useState('');
  const [coverUpload, setCoverUpload] = useState<UploadCandidate | null>(null);
  const [catalog, setCatalog] = useState<CatalogOptions | null>(null);
  const [identityName, setIdentityName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deletingRelease, setDeletingRelease] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dragging, setDragging] = useState(false);

  const apply = useCallback((next: SubmissionEditorState) => {
    const scheduled = localDateTimeValue(next.scheduledReleaseAt);
    setState(next);
    setItems(itemsFromState(next));
    setLocalizedTitle(localized(next.localizedTitles.en || next.localizedTitles.ar || next.localizedTitles.fr
      ? next.localizedTitles
      : { en: next.title }));
    setDescription(next.description ?? '');
    setMusicType(next.musicType ?? '');
    setMusicTypeChoice(musicTypeOption(next.musicType));
    setRecordingType(next.recordingType ?? '');
    setRecordingTypeChoice(recordingTypeOption(next.recordingType));
    setArtistName(next.artist?.displayName ?? '');
    setArtistId(next.artist?.id ?? '');
    setSeasonId(next.seasonId ?? '');
    setHymnId(next.hymn?.id ?? '');
    setTiming(next.releaseTimingMode ?? 'asap');
    setScheduledAt(scheduled);
    setInitialScheduledAt(scheduled);
    setOriginalDate(next.originalReleaseDate ?? '');
    setCoverUpload(null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const loaded = await creatorService.editor(submissionId);
      apply(loaded);
      if (loaded.kind === 'music_release') {
        const credits = await creatorService.creditOptions(loaded.creatorAccountId).catch(() => null);
        setIdentityName(credits?.identityArtist?.displayName ?? loaded.artist?.displayName ?? '');
      } else {
        setCatalog(await creatorService.catalogOptions().catch(() => null));
      }
    } catch (cause) {
      setError(creatorService.describeError(cause));
    } finally {
      setLoading(false);
    }
  }, [submissionId, apply]);

  useEffect(() => { void load(); }, [load]);

  const kind = state?.kind ?? 'music_release';
  const mode = MODES[kind];
  const isMusic = kind === 'music_release';
  const isLessonSet = kind === 'learning_lesson_set';
  const accountId = state?.creatorAccountId;
  const single = takesReleaseTitle(mode, items.length);
  const itemNoun = isMusic ? 'track' : isLessonSet ? 'lesson' : 'recording';
  const pickerKind = isLessonSet ? 'lesson' : 'audio';

  const uploads = useMemo(() => [
    ...items.flatMap((item) => [item.upload, item.replacement].filter(Boolean) as UploadCandidate[]),
    ...(coverUpload ? [coverUpload] : []),
  ], [items, coverUpload]);
  const blocking = uploads.length ? uploadsBlocking(uploads) : null;

  function startUpload(file: UploadCandidate, onChange: (change: Partial<UploadCandidate>) => void) {
    if (!accountId) return;
    void runUpload(accountId, file, mode, (_id, change) => onChange(change));
  }

  function addFiles(picked: UploadCandidate[]) {
    if (!picked.length) return;
    setError('');
    setItems((current) => [
      ...current,
      ...picked.map((file) => ({
        key: file.id,
        title: preferredLocalizedTitle(file.localizedTitle) || file.name.replace(/\.[a-z0-9]+$/i, ''),
        localizedTitle: file.localizedTitle ?? localized(null),
        mainArtistName: file.mainArtistName ?? '',
        mainArtistId: file.mainArtistId,
        contributors: file.contributors ?? [],
        upload: file,
      })),
    ]);
    for (const file of picked) {
      startUpload(file, (change) => setItems((current) => current.map((item) => (
        item.upload?.id === file.id ? { ...item, upload: { ...item.upload, ...change } as UploadCandidate } : item
      ))));
    }
  }

  function receiveDropped(raw: any[]) {
    setError('');
    const picked = droppedUploadCandidates(raw, pickerKind);
    if (!picked.length) {
      setError(isLessonSet ? 'Choose supported audio or video files.' : 'Choose supported audio files.');
      return;
    }
    addFiles(picked);
  }

  function replaceFile(key: string, picked: UploadCandidate[]) {
    const file = picked[0];
    if (!file) return;
    setError('');
    setItems((current) => current.map((item) => (item.key === key ? { ...item, replacement: file } : item)));
    startUpload(file, (change) => setItems((current) => current.map((item) => (
      item.replacement?.id === file.id ? { ...item, replacement: { ...item.replacement, ...change } as UploadCandidate } : item
    ))));
  }

  function receiveArtwork(picked: UploadCandidate[]) {
    const file = picked[0];
    if (!file) return;
    setError('');
    setCoverUpload(file);
    startUpload(file, (change) => setCoverUpload((current) => (current?.id === file.id ? { ...current, ...change } : current)));
  }

  function patchItem(key: string, change: Partial<EditorItem>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...change } : item)));
  }

  function moveItem(from: number, to: number) {
    setItems((current) => {
      if (from < 0 || to < 0 || from >= current.length || to >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function copyCreditsToAll(sourceKey: string) {
    setItems((current) => {
      const source = current.find((item) => item.key === sourceKey);
      if (!source) return current;
      const stamp = Date.now();
      return current.map((item) => (item.key === sourceKey ? item : {
        ...item,
        mainArtistName: source.mainArtistName,
        mainArtistId: source.mainArtistId,
        contributors: source.contributors.map((credit, index) => ({ ...credit, id: `${stamp}-${index}-${item.key}` })),
      }));
    });
  }

  async function removeItem(item: EditorItem) {
    if (item.id && !(await confirmAction(
      `Delete this ${itemNoun}?`,
      `"${preferredLocalizedTitle(item.localizedTitle) || item.title}" is deleted from Coptic Vine when you save${state?.isLive ? ', and stops playing at once' : ''}. This cannot be undone.`,
      `Delete ${itemNoun}`,
    ))) return;
    setItems((current) => current.filter((entry) => entry.key !== item.key));
  }

  function problems(): string[] {
    const list: string[] = [];
    if (!hasMusicTitle(localizedTitle)) list.push(`Add the ${isMusic ? 'release' : isLessonSet ? 'lesson set' : 'album'} title in at least one language.`);
    if (isMusic && (!musicTypeChoice || !musicType.trim())) list.push('Choose a music type.');
    if (isMusic && (!recordingTypeChoice || !recordingType.trim())) list.push('Choose a recording type.');
    if (!isMusic && !artistName.trim() && !artistId) list.push('Enter an artist name or choose an existing Coptic Vine artist profile.');
    if (isLessonSet && !hymnId) list.push('Choose the hymn these lessons teach.');
    if (!state?.isLive && timing === 'scheduled' && !scheduledAt.trim()) list.push('Choose a scheduled release date and time.');
    if (!items.length) list.push(`Keep at least one ${itemNoun}.`);
    if (!isLessonSet && !single) {
      items.forEach((item, index) => {
        if (!hasMusicTitle(item.localizedTitle)) list.push(`Add a title in at least one language for ${itemNoun} ${index + 1}.`);
      });
    }
    if (isMusic) {
      items.forEach((item, index) => {
        if (item.contributors.some((credit) => !credit.name.trim())) list.push(`Fill in or remove the unnamed contributor on track ${index + 1}.`);
      });
    }
    if (blocking) list.push(blocking);
    return list;
  }

  async function save() {
    if (!state) return;
    const issues = problems();
    if (issues.length) { setError(issues[0]); return; }
    const releaseTitle = preferredLocalizedTitle(localizedTitle);
    const titles = threeTitles(localizedTitle);
    const edit: SubmissionEdit = {
      title: releaseTitle,
      localizedTitles: titles,
      description: description.trim() || null,
      originalReleaseDate: originalDate || null,
      coverUploadIntentId: coverUpload?.uploadIntentId ?? null,
      ...(isMusic ? { musicType: musicType.trim(), recordingType: recordingType.trim() } : {
        artistId: artistId || null,
        artistName: artistName.trim() || null,
        seasonId: seasonId || null,
      }),
      ...(isLessonSet ? { hymnId } : {}),
      // Timing only matters before it is live. An unchanged date is not sent,
      // so it is not checked against the 48-hour notice again.
      ...(!state.isLive ? {
        releaseTimingMode: timing,
        scheduledReleaseAt: timing === 'scheduled' && scheduledAt !== initialScheduledAt ? scheduledAt || null : null,
      } : {}),
      items: items.map((item, index) => ({
        id: item.id,
        uploadIntentId: item.replacement?.uploadIntentId ?? item.upload?.uploadIntentId ?? null,
        // A single is titled as its release; lessons are numbered.
        title: isLessonSet ? `Lesson ${index + 1}` : single ? releaseTitle : preferredLocalizedTitle(item.localizedTitle) || item.title,
        localizedTitles: isLessonSet ? { en: '', ar: '', fr: '' } : single ? titles : threeTitles(item.localizedTitle),
        ...(isMusic ? {
          mainArtistName: item.mainArtistName.trim() || null,
          mainArtistId: item.mainArtistId || null,
          contributors: item.contributors.map((credit) => ({ name: credit.name.trim(), role: credit.role, artistId: credit.artistId || null })),
        } : {}),
      })),
    };

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const before = state.status;
      const next = await creatorService.saveEdit(state.submissionId, edit);
      apply(next);
      onSaved?.(next);
      if (next.status === 'pending_review' && before !== 'pending_review') {
        setNotice(next.isLive
          ? 'Saved. Your new files are with Coptic Vine for review; what is live stays live until they are approved.'
          : 'Saved and sent to Coptic Vine for review.');
      } else if (next.status === 'pending_review') {
        setNotice('Saved. It is still waiting for Coptic Vine’s review.');
      } else if (next.isLive) {
        setNotice(next.isAdmin
          ? 'Saved. Changes are live; new files go live as soon as they finish processing.'
          : 'Saved. Your changes are live.');
      } else {
        setNotice('Saved.');
      }
    } catch (cause) {
      setError(creatorService.describeError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function deleteRelease() {
    if (!state || !isMusic) return;
    if (!(await confirmAction(
      'Delete this release permanently?',
      `"${state.title}" and its tracks will be removed from the Coptic Vine music catalog. This cannot be undone.`,
      'Delete release',
    ))) return;
    setDeletingRelease(true);
    setError('');
    try {
      await creatorService.deleteRelease(state.catalogId);
      onDeleted?.();
    } catch (cause) {
      setError(creatorService.describeError(cause));
      setDeletingRelease(false);
    }
  }

  if (loading) return <Page><Loading label="Loading…" /></Page>;

  if (!state) {
    return (
      <Page>
        <PageHeader back={{ label: backLabel, onPress: onBack }} title="Could not load this submission" />
        <Banner tone="error">{error || 'Submission not found.'}</Banner>
      </Page>
    );
  }

  const header = (
    <PageHeader
      back={{ label: backLabel, onPress: onBack }}
      eyebrow={isMusic && state.releaseType ? `${KIND_LABELS[kind]} • ${state.releaseType.toUpperCase()}` : KIND_LABELS[kind]}
      title={state.title}
      subtitle={state.artist?.displayName ? `By ${state.artist.displayName}` : undefined}
      action={state.canEdit ? (
        <Button kind="primary" label={busy ? 'Saving…' : 'Save changes'} busy={busy} disabled={deletingRelease} onPress={() => void save()} />
      ) : undefined}
    />
  );

  if (!state.canEdit) {
    return (
      <Page>
        {header}
        <StatusPill status={state.status} />
        <Banner tone="info">This submission was not approved, so it can no longer be edited. Send a new submission instead.</Banner>
      </Page>
    );
  }

  const coverUrl = state.cover ? resolveImageUrl(state.cover.bucket, state.cover.path, state.cover.version ?? state.cover.assetId) : null;
  const shownCover = coverUpload?.uri || coverUrl;
  const minimumDate = state.earliestReleaseAt ? new Date(state.earliestReleaseAt) : undefined;
  const issues = problems();

  return (
    <Page scrollEnabled={!dragging}>
      {header}

      <View style={styles.statusRow}>
        <StatusPill status={state.status} />
        {state.isLive && state.status !== 'published' && <Text style={uiStyles.muted}>Live on Coptic Vine</Text>}
      </View>

      {!!notice && <Banner tone="success">{notice}</Banner>}
      {!!error && <Banner tone="error">{error}</Banner>}
      {state.status === 'changes_requested' && !!state.reviewNotes && (
        <Banner tone="warning">{`Coptic Vine asked for changes: ${state.reviewNotes}`}</Banner>
      )}
      <Banner tone="info">{saveExplanation(state)}</Banner>

      <Card
        title={isMusic ? 'Release title' : isLessonSet ? 'Lesson set title' : 'Album title'}
        description={single
          ? `This ${itemNoun} is a single, so it takes this title. Enter it in any of the supported languages; at least one is required.`
          : 'Enter the title in any of the supported languages. At least one is required.'}
      >
        <View style={styles.localeGrid}>
          {MUSIC_TITLE_LOCALES.map(({ key, label }) => (
            <View key={key} style={styles.localeField}>
              <Field
                label={label}
                value={localizedTitle[key]}
                onChangeText={(text) => setLocalizedTitle((current) => ({ ...current, [key]: text }))}
                style={key === 'ar' ? styles.rtl : undefined}
              />
            </View>
          ))}
        </View>
      </Card>

      <Card title="Details">
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder={isMusic ? 'Optional. Do not put lyrics here; add them in Lyrics Studio.' : 'Optional'}
        />

        {isMusic ? (
          <>
            <Dropdown
              label="Music type"
              items={MUSIC_TYPE_OPTIONS}
              value={musicTypeChoice}
              onChange={(choice) => {
                setMusicTypeChoice(choice);
                if (choice === 'hymn') setMusicType('Hymns');
                else if (choice === 'spiritual_song') setMusicType('Spiritual Songs');
                else if (musicTypeOption(musicType) !== 'other') setMusicType('');
              }}
              placeholder="Choose a music type"
            />
            {musicTypeChoice === 'other' && (
              <Field label="Other music type" value={musicType} onChangeText={setMusicType} placeholder="Enter the music type" />
            )}
            <Dropdown
              label="Recording type"
              items={RECORDING_TYPE_OPTIONS}
              value={recordingTypeChoice}
              onChange={(choice) => {
                setRecordingTypeChoice(choice);
                if (choice === 'studio') setRecordingType('Studio');
                else if (choice === 'live') setRecordingType('Live');
                else if (choice === 'instrumental') setRecordingType('Instrumental');
                else if (recordingTypeOption(recordingType) !== 'other') setRecordingType('');
              }}
              placeholder="Choose a recording type"
            />
            {recordingTypeChoice === 'other' && (
              <Field label="Other recording type" value={recordingType} onChangeText={setRecordingType} placeholder="Enter the recording type" />
            )}
          </>
        ) : (
          <>
            <LearningContributorPicker
              accountId={accountId}
              name={artistName}
              selectedArtistId={artistId}
              onNameChange={(name) => { setArtistName(name); setArtistId(''); }}
              onSelect={(id, name) => { setArtistId(id); setArtistName(name); }}
            />
            <Dropdown
              label="Season (optional)"
              items={[{ id: '', title: 'No season' }, ...(catalog?.seasons ?? [])]}
              value={seasonId}
              onChange={setSeasonId}
              placeholder="No season"
            />
            {isLessonSet && (
              <LearningHymnPicker accountId={accountId} options={catalog?.hymns ?? []} value={hymnId} onChange={setHymnId} />
            )}
          </>
        )}

        {!state.isLive && (
          <>
            <View style={styles.group}>
              <Label>Release timing</Label>
              <Segmented
                items={[{ id: 'asap', title: 'As soon as possible' }, { id: 'scheduled', title: 'Select date & time' }]}
                value={timing}
                onChange={(value) => setTiming(value as 'asap' | 'scheduled')}
              />
              <Text style={uiStyles.muted}>
                As soon as possible goes live when Coptic Vine approves it. Scheduled content publishes automatically at the selected time.
              </Text>
            </View>
            {timing === 'scheduled' && (
              <ReleaseDateTimeField
                label="Goes live on Coptic Vine"
                value={scheduledAt}
                onChange={setScheduledAt}
                minimumDate={minimumDate}
                hint="A new date needs at least 48 hours' notice."
              />
            )}
          </>
        )}
        <ReleaseDateTimeField
          label="Originally released (optional)"
          value={originalDate}
          onChange={setOriginalDate}
          mode="date"
          optional
          hint="The date listeners see if this came out elsewhere first."
        />
      </Card>

      <Card
        title="Artwork & files"
        description={`Replace the artwork, add ${itemNoun}s, give a ${itemNoun} a new file, delete ${itemNoun}s, or drag the six-dot handle to change the order.`}
      >
        <FileDropZone kind={pickerKind} onFiles={receiveDropped} />
        <View style={uiStyles.actions}>
          <FileSelectButton
            label={isLessonSet ? 'Add lesson files' : 'Add audio files'}
            kind={pickerKind}
            multiple
            disabled={busy || deletingRelease}
            onFiles={addFiles}
            onError={setError}
          />
        </View>

        <View style={styles.artworkRow}>
          <View style={styles.coverPreview}>
            {shownCover ? <Image source={{ uri: shownCover }} style={styles.coverImage} resizeMode="cover" /> : <BuddedCross size={36} />}
          </View>
          <View style={styles.artworkActions}>
            <FileSelectButton
              label={coverUpload ? 'Choose another image' : state.cover ? 'Replace artwork' : 'Add artwork'}
              kind="image"
              disabled={busy || deletingRelease}
              onFiles={receiveArtwork}
              onError={setError}
            />
            {coverUpload ? (
              <>
                <Text style={coverUpload.error ? uiStyles.error : uiStyles.muted}>{fileSize(coverUpload.size)} • {uploadLabel(coverUpload)}</Text>
                <Button kind="ghost" label="Keep current artwork" onPress={() => setCoverUpload(null)} />
              </>
            ) : state.pendingCover ? (
              <Text style={uiStyles.muted}>{`New artwork: ${fileStatusLabel(state.pendingCover.processingStatus)}`}</Text>
            ) : state.cover && !state.cover.isLive && state.isLive ? (
              <Text style={uiStyles.muted}>New artwork, waiting for Coptic Vine’s review.</Text>
            ) : null}
          </View>
        </View>

        <ReorderableList
          items={items}
          getKey={(item) => item.key}
          onMove={moveItem}
          onDragActiveChange={setDragging}
          disabled={busy || deletingRelease}
          renderItem={(item, index, dragHandle) => (
            <View style={styles.item}>
              <View style={styles.itemHeader}>
                {dragHandle}
                <View style={styles.itemBody}>
                  <Text style={uiStyles.rowTitle} numberOfLines={1}>
                    {isLessonSet
                      ? `Lesson ${index + 1}`
                      : `${index + 1}. ${single ? preferredLocalizedTitle(localizedTitle) : preferredLocalizedTitle(item.localizedTitle) || item.title || 'Untitled'}`}
                  </Text>
                  {item.upload ? (
                    <Text style={item.upload.error ? uiStyles.error : uiStyles.muted}>
                      {`New • ${item.upload.name} • ${fileSize(item.upload.size)} • ${uploadLabel(item.upload)}`}
                    </Text>
                  ) : (
                    <Text style={uiStyles.muted} numberOfLines={1}>
                      {`${item.saved?.fileName ?? 'Saved file'} • ${fileStatusLabel(item.saved?.processingStatus ?? 'completed')}`}
                    </Text>
                  )}
                  {item.replacement ? (
                    <Text style={item.replacement.error ? uiStyles.error : uiStyles.muted}>
                      {`New file: ${item.replacement.name} • ${uploadLabel(item.replacement)}`}
                    </Text>
                  ) : item.saved?.replacement ? (
                    <Text style={uiStyles.muted}>
                      {`New file waiting: ${item.saved.replacement.fileName ?? 'file'} • ${fileStatusLabel(item.saved.replacement.processingStatus)}${state.isAdmin ? '' : ' • goes live when Coptic Vine approves it'}`}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.itemActions}>
                  {!!item.id && (item.replacement ? (
                    <Button kind="ghost" size="sm" label="Keep current file" onPress={() => patchItem(item.key, { replacement: undefined })} />
                  ) : (
                    <FileSelectButton
                      label="Replace file"
                      kind={pickerKind}
                      disabled={busy || deletingRelease}
                      onFiles={(picked) => replaceFile(item.key, picked)}
                      onError={setError}
                    />
                  ))}
                  <Button
                    kind="danger"
                    size="sm"
                    icon="trash-outline"
                    label={item.id ? 'Delete' : 'Remove'}
                    disabled={busy || deletingRelease}
                    onPress={() => void removeItem(item)}
                  />
                </View>
              </View>

              {!isLessonSet && (
                <TrackMetadataEditor
                  value={item}
                  index={index}
                  total={items.length}
                  kind={isMusic ? 'track' : 'recording'}
                  showCredits={isMusic}
                  showTitle={!single}
                  identityName={identityName}
                  accountId={accountId}
                  onCopyCreditsToAll={isMusic ? () => copyCreditsToAll(item.key) : undefined}
                  onChange={(change) => patchItem(item.key, change)}
                />
              )}
            </View>
          )}
        />
        {!items.length && <Text style={uiStyles.muted}>{`No ${itemNoun}s. Add at least one before saving.`}</Text>}
      </Card>

      <Card title="Save">
        {issues.length > 0 ? (
          <View style={styles.requirements}>
            <Text style={styles.requirementsTitle}>Before you can save</Text>
            {issues.map((issue) => <Text key={issue} style={uiStyles.muted}>• {issue}</Text>)}
          </View>
        ) : (
          <Text style={uiStyles.muted}>{saveExplanation(state)}</Text>
        )}
        <View style={uiStyles.actions}>
          <Button kind="primary" label={busy ? 'Saving…' : 'Save changes'} busy={busy} disabled={deletingRelease} onPress={() => void save()} />
          <Button kind="ghost" label="Discard changes" disabled={busy} onPress={() => { setNotice(''); setError(''); apply(state); }} />
        </View>
      </Card>

      {isMusic && (
        <Card
          eyebrow="Danger zone"
          title="Delete this release"
          description="Deleting a release permanently removes it from the Coptic Vine music catalog. Submission history is kept for audit purposes."
        >
          <View style={uiStyles.actions}>
            <Button
              kind="danger"
              icon="trash-outline"
              label={deletingRelease ? 'Deleting release…' : 'Delete release'}
              busy={deletingRelease}
              disabled={busy}
              onPress={() => void deleteRelease()}
            />
          </View>
        </Card>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  group: { gap: SPACING.sm },
  localeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  localeField: { flex: 1, minWidth: 220 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  artworkRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.lg },
  coverPreview: {
    width: 180,
    height: 180,
    borderRadius: RADII.md,
    overflow: 'hidden',
    backgroundColor: COLORS.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: { width: '100%', height: '100%' },
  artworkActions: { flex: 1, minWidth: 220, gap: SPACING.sm },
  item: { gap: SPACING.sm, padding: 12, borderRadius: RADII.md, backgroundColor: COLORS.inset },
  itemHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  itemBody: { flex: 1, minWidth: 180, gap: 4 },
  itemActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  requirements: { gap: 4 },
  requirementsTitle: { color: COLORS.warning, fontFamily: TYPOGRAPHY.title, fontWeight: '700', fontSize: 16, marginBottom: 2 },
});
