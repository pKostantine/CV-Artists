import { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { BuddedCross } from '@/components/Ornaments';
import { Banner, Button, EmptyState, Loading, Page, PageHeader, Pill, RowCard, Section, StatusPill, uiStyles } from '@/components/ui';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { useWorkspace } from '@/context/WorkspaceContext';
import { creatorService } from '@/services/creatorService';
import { resolveImageUrl } from '@/services/mediaService';
import type { CreatorReleaseSummary } from '@/types/creator';

function dateLabel(value?: string | null): string {
  if (!value) return 'No date set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function ReleaseRow({ release }: { release: CreatorReleaseSummary }) {
  const artworkUrl = release.cover
    ? resolveImageUrl(release.cover.bucket, release.cover.path, release.cover.version)
    : null;

  return (
    <RowCard
      accessibilityLabel={`Edit ${release.title}`}
      onPress={() => router.push({ pathname: '/release/[id]', params: { id: release.id } })}
    >
      <View style={styles.cover}>
        {artworkUrl ? (
          <Image source={{ uri: artworkUrl }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <BuddedCross size={22} />
        )}
      </View>

      <View style={styles.releaseBody}>
        <Text style={styles.title}>{release.title}</Text>
        <View style={styles.pills}>
          <StatusPill status={release.publicationStatus} />
          <Pill label={`${release.releaseType.toUpperCase()}  ·  ${release.trackCount} track${release.trackCount === 1 ? '' : 's'}`} />
        </View>
        <Text style={release.releaseState === 'ready' ? styles.ready : styles.released}>
          {release.releaseState === 'ready'
            ? `Goes live ${dateLabel(release.scheduledReleaseAt)}`
            : `Released ${release.displayDate || dateLabel(release.scheduledReleaseAt)}`}
        </Text>
      </View>
    </RowCard>
  );
}

export default function ReleasesScreen() {
  const { account } = useWorkspace();
  const [releases, setReleases] = useState<CreatorReleaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (soft = false) => {
    if (!account) return;
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setReleases(await creatorService.releases(account.id));
    } catch (cause) {
      setError(creatorService.describeError(cause));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [account]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  if (loading && !releases.length) return <Page><Loading label="Loading releases…" /></Page>;

  const ready = releases.filter((release) => release.releaseState === 'ready');
  const released = releases.filter((release) => release.releaseState === 'released');

  return (
    <Page>
      <PageHeader
        title="Releases"
        subtitle="Approved, fully processed music and everything you have already released."
        action={(
          <Button
            icon="refresh-outline"
            label={refreshing ? 'Refreshing…' : 'Refresh'}
            busy={refreshing}
            onPress={() => void load(true)}
          />
        )}
      />

      {!!error && <Banner tone="error">{error}</Banner>}

      <Section
        title="Ready for release"
        count={ready.length}
        description="Coptic Vine has approved these and every required media file is processed. You can still edit them."
      >
        {ready.length ? (
          <View style={styles.list}>
            {ready.map((release) => <ReleaseRow key={release.id} release={release} />)}
          </View>
        ) : (
          <Text style={uiStyles.muted}>Nothing is waiting for release right now.</Text>
        )}
      </Section>

      <Section
        title="Released"
        count={released.length}
        description="Music already published to Coptic Vine. Open a release to change its details, artwork, tracks, credits or dates."
      >
        {released.length ? (
          <View style={styles.list}>
            {released.map((release) => <ReleaseRow key={release.id} release={release} />)}
          </View>
        ) : (
          <EmptyState title="Nothing released yet" description="Your music appears here once Coptic Vine publishes it." />
        )}
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  list: { gap: SPACING.sm },
  cover: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: { width: '100%', height: '100%' },
  releaseBody: { flex: 1, minWidth: 0, gap: 6 },
  title: { color: COLORS.white, fontFamily: TYPOGRAPHY.title, fontSize: 18, lineHeight: 23, fontWeight: '700' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ready: { color: COLORS.gold, fontSize: 13, fontWeight: '600' },
  released: { color: COLORS.success, fontSize: 13, fontWeight: '600' },
});
