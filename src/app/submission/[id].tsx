import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Banner, Button, Card, Loading, Page, PageHeader, StatusPill, uiStyles } from '@/components/ui';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { useWorkspace } from '@/context/WorkspaceContext';
import { creatorService } from '@/services/creatorService';
import type { SubmissionItem } from '@/types/creator';
import { fileSize, shortDate, statusDescription, statusLabel, submissionTypeLabel } from '@/utils/format';

function itemState(item: SubmissionItem): string {
  if (item.mediaAssetId) return 'Processed';

  // A queued job that has already been attempted is a retry, not a fresh wait,
  // and saying so is the difference between "slow" and "going wrong".
  if (item.processingStatus === 'queued' && (item.processingAttemptCount ?? 0) > 0) {
    return `Retrying (attempt ${(item.processingAttemptCount ?? 0) + 1} of ${item.processingMaxAttempts ?? '?'})`;
  }

  if (item.processingStatus === 'processing' && (item.processingProgress ?? 0) > 0) {
    const label = item.mediaType === 'video' ? 'Converting video' : 'Processing';
    return `${label} ${Math.min(99, Math.round((item.processingProgress ?? 0) * 100))}%`;
  }
  if (item.processingStatus) return `Processing: ${statusLabel(item.processingStatus)}`;
  if (item.uploadStatus) return statusLabel(item.uploadStatus);
  return '—';
}

function itemRoleLabel(item: SubmissionItem): string {
  if (item.role === 'artwork') return 'Artwork';
  if (item.role === 'lesson') return 'Lesson media';
  if (item.role === 'track') return 'Track';
  return item.mediaType ? statusLabel(item.mediaType) : 'File';
}

export default function SubmissionDetail() {
  const { id, submitted } = useLocalSearchParams<{ id: string; submitted?: string }>();
  const { dashboard, loading } = useWorkspace();
  const submission = dashboard.submissions.find((s) => s.id === id) ?? null;

  const [items, setItems] = useState<SubmissionItem[] | null>(null);
  const [itemsError, setItemsError] = useState('');
  const notice = submitted ? 'Submitted. Your submission is now in Coptic Vine review.' : '';

  const loadItems = useCallback(async () => {
    if (!id) return;
    try {
      setItems(await creatorService.items(id));
      setItemsError('');
    } catch (e) {
      setItemsError(creatorService.describeError(e));
    }
  }, [id]);

  useEffect(() => { void loadItems(); }, [loadItems]);

  if (!submission) {
    if (loading) return <Page><Loading label="Loading submission…" /></Page>;
    return (
      <Page>
        <PageHeader
          back={{ label: 'All submissions', onPress: () => router.replace('/') }}
          title="Submission not found"
          subtitle="It may belong to a different creator workspace."
        />
      </Page>
    );
  }

  const revising = submission.status === 'changes_requested';
  // Everything sent can be edited, live or not, until it is rejected (SubmissionEditor).
  const editable = submission.status !== 'rejected' && submission.status !== 'archived';
  const openEditor = () => router.push({ pathname: '/submission/edit/[id]', params: { id: submission.id } });

  return (
    <Page>
      <PageHeader
        back={{ label: 'All submissions', onPress: () => router.navigate('/') }}
        eyebrow={submissionTypeLabel(submission.submissionType)}
        title={submission.title}
        subtitle={`Created ${shortDate(submission.createdAt)}`}
        action={editable ? <Button kind={revising ? 'primary' : 'secondary'} label={revising ? 'Edit and resubmit' : 'Edit submission'} onPress={openEditor} /> : undefined}
      />

      {!!notice && <Banner tone="success">{notice}</Banner>}

      {revising && (
        <View style={styles.notes}>
          <Text style={styles.notesTitle}>Changes requested</Text>
          <Text style={styles.notesBody}>{submission.reviewNotes || 'The reviewer did not leave a note with this request.'}</Text>
        </View>
      )}

      {submission.submissionType === 'music_release' ? (
        <Card
          title="Lyrics"
          description="Lyrics are added after the music submission is created, not in the release description."
        >
          <Text style={uiStyles.muted}>
            Open Lyrics Studio to add Coptic, Arabic, English, or French lyrics to each submitted track. You can start before publication; synchronized timing becomes available once the processed audio is attached.
          </Text>
          <View style={uiStyles.actions}>
            <Button label="Open Lyrics Studio" onPress={() => router.push('/lyrics')} />
          </View>
        </Card>
      ) : (
        <Card
          title="Lyrics"
          description={submission.submissionType === 'learning_lesson_set'
            ? 'Each lesson can carry the hymn’s words, shown under the lesson in the app.'
            : 'Each recording can carry its words, shown in the player.'}
        >
          <Text style={uiStyles.muted}>
            {submission.status === 'published'
              ? 'Open Lyrics Studio to add Coptic, Arabic, English, or French lyrics to each item. Lessons take unsynced lyrics; recordings can also be timed line by line.'
              : 'Once Coptic Vine publishes this submission, its items appear in Lyrics Studio, where you can add Coptic, Arabic, English, or French lyrics to each.'}
          </Text>
          {submission.status === 'published' ? (
            <View style={uiStyles.actions}>
              <Button label="Open Lyrics Studio" onPress={() => router.push('/lyrics')} />
            </View>
          ) : null}
        </Card>
      )}

      <Card>
        <View style={styles.statusRow}>
          <StatusPill status={submission.status} />
          <Text style={uiStyles.muted}>{statusDescription(submission.status)}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={uiStyles.muted}>Submitted: {shortDate(submission.submittedAt)}</Text>
          {submission.status === 'pending_review' && <Text style={uiStyles.muted}>Review due: {shortDate(submission.reviewDueAt)}</Text>}
          {!!submission.publishedAt && <Text style={uiStyles.muted}>Published: {shortDate(submission.publishedAt)}</Text>}
        </View>
        {!!submission.description && <Text style={styles.body}>{submission.description}</Text>}
      </Card>

      <Card title="Files">
        {itemsError ? (
          <Banner tone="error">{itemsError}</Banner>
        ) : items === null ? (
          <Loading label="Loading files…" />
        ) : items.length ? (
          items.map((item) => (
            <View key={item.id} style={uiStyles.row}>
              <View style={styles.fileText}>
                <Text style={uiStyles.rowTitle}>{item.sortOrder + 1}. {item.title || 'Untitled file'}</Text>
                <Text style={uiStyles.muted}>
                  {itemRoleLabel(item)} • {fileSize(item.contentLength ?? 0)} • {itemState(item)}
                </Text>
                {item.processingStatus === 'failed' && item.processingError ? (
                  <Text style={styles.itemError}>{item.processingError}</Text>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <Text style={uiStyles.muted}>No files are attached.</Text>
        )}
      </Card>

      {editable && (
        <Card
          title={revising ? 'Make the requested changes' : 'Edit'}
          description={submission.status === 'published'
            ? 'Edit titles, details, credits, order and artwork, add or delete items, or give an item a new file. Titles, credits, order and deletions are live as soon as you save; new files and artwork are reviewed first.'
            : 'Edit titles, details, credits, order and artwork, add or delete items, or give an item a new file. Saving sends it to Coptic Vine for review.'}
        >
          <View style={uiStyles.actions}>
            <Button kind={revising ? 'primary' : 'secondary'} label={revising ? 'Edit and resubmit' : 'Edit submission'} onPress={openEditor} />
          </View>
        </Card>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: SPACING.lg, rowGap: 4 },
  body: { color: COLORS.white, fontSize: 14.5, lineHeight: 22 },
  notes: { padding: 18, gap: 6, borderRadius: RADII.lg, backgroundColor: COLORS.warningSoft },
  notesTitle: { color: COLORS.warning, fontFamily: TYPOGRAPHY.title, fontSize: 17, fontWeight: '700' },
  notesBody: { color: COLORS.white, fontSize: 14.5, lineHeight: 22 },
  fileText: { flex: 1, minWidth: 200, gap: 3 },
  itemError: { color: COLORS.danger, fontSize: 12.5, lineHeight: 18 },
});
