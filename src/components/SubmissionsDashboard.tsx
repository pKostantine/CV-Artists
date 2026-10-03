import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Banner, Button, EmptyState, Loading, Page, PageHeader, RowCard, Section, Stats, StatusPill, uiStyles, useCompact } from '@/components/ui';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { useWorkspace } from '@/context/WorkspaceContext';
import type { PublicationStatus } from '@/types/creator';
import { shortDate, submissionTypeLabel } from '@/utils/format';

const IN_REVIEW: PublicationStatus[] = ['pending_review', 'processing'];

export default function SubmissionsDashboardScreen() {
  const compact = useCompact();
  const { dashboard, loading, error, refresh, draft } = useWorkspace();
  const { submissions } = dashboard;

  // Pick up reviewer decisions when the creator comes back to this page.
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  // Fully approved/processed music moves to the Releases section. Published
  // work lives there too. Submissions is only the working/review inbox.
  const activeSubmissions = submissions.filter((submission) =>
    submission.submissionType !== 'music_release'
    || (submission.status !== 'approved' && submission.status !== 'published'),
  );
  const needsAction = activeSubmissions.filter((s) => s.status === 'changes_requested');
  const draftInProgress = Boolean(draft.title || draft.media.length || draft.artwork);
  const stats = [
    { label: 'Needs changes', value: needsAction.length, tone: 'warning' as const },
    { label: 'In review', value: activeSubmissions.filter((s) => IN_REVIEW.includes(s.status)).length, tone: 'gold' as const },
    { label: compact ? 'Other' : 'Other submissions', value: activeSubmissions.filter((s) => !IN_REVIEW.includes(s.status) && s.status !== 'changes_requested').length },
  ];

  return (
    <Page>
      <PageHeader
        title="Submissions"
        subtitle="Create new work and follow it through review. Fully approved music moves to Releases."
        action={(
          <Button
            kind="primary"
            icon={draftInProgress ? undefined : 'add'}
            label={draftInProgress ? 'Continue draft' : 'New submission'}
            onPress={() => router.push('/submission/new')}
          />
        )}
      />

      {!!error && (
        <View style={styles.errorBlock}>
          <Banner tone="error">{error}</Banner>
          <View style={uiStyles.actions}>
            <Button icon="refresh-outline" label="Retry loading submissions" onPress={() => void refresh()} />
          </View>
        </View>
      )}

      {needsAction.length > 0 && (
        <Banner tone="warning">
          {needsAction.length === 1 ? '1 submission needs' : `${needsAction.length} submissions need`} changes before Coptic Vine can approve it.
        </Banner>
      )}

      <Stats items={stats} />

      <Section title="Your submissions" count={activeSubmissions.length}>
        {loading && !activeSubmissions.length ? (
          <Loading label="Loading submissions…" />
        ) : activeSubmissions.length ? (
          <View style={styles.list}>
            {activeSubmissions.map((s) => (
              <RowCard
                key={s.id}
                accessibilityLabel={`Open ${s.title}`}
                onPress={() => router.push({ pathname: '/submission/[id]', params: { id: s.id } })}
              >
                <View style={styles.rowText}>
                  <Text style={styles.title}>{s.title}</Text>
                  <View style={styles.pills}>
                    <StatusPill status={s.status} />
                  </View>
                  <Text style={styles.meta}>
                    {submissionTypeLabel(s.submissionType)}  ·  {s.itemCount} file{s.itemCount === 1 ? '' : 's'}  ·  Updated {shortDate(s.updatedAt)}
                  </Text>
                  {s.status === 'changes_requested' && !!s.reviewNotes && (
                    <Text style={styles.warning} numberOfLines={2}>Changes requested: {s.reviewNotes}</Text>
                  )}
                </View>
              </RowCard>
            ))}
          </View>
        ) : (
          <EmptyState
            title="No submissions yet"
            description="Nothing needs your attention right now. Approved music appears in Releases."
          />
        )}
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  errorBlock: { gap: SPACING.sm },
  list: { gap: SPACING.sm },
  rowText: { flex: 1, minWidth: 0, gap: 6 },
  title: { color: COLORS.white, fontFamily: TYPOGRAPHY.title, fontSize: 18, lineHeight: 23, fontWeight: '700' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  meta: { color: COLORS.faint, fontSize: 12.5, lineHeight: 18 },
  warning: { color: COLORS.warning, fontSize: 13, lineHeight: 19 },
});
