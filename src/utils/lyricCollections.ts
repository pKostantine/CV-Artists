import type { LyricCollectionRef, LyricEditorTrack } from '@/types/lyrics';

/** A release, Learn album or lesson set in Lyrics Studio, with its tracks in order. */
export interface LyricCollection {
  key: string;
  kind: LyricCollectionRef['kind'] | 'loose';
  title: string;
  releaseType: LyricCollectionRef['releaseType'];
  artwork: LyricCollectionRef['artwork'];
  tracks: LyricEditorTrack[];
}

const LOOSE_KEY = 'loose';

export function collectionKeyOf(track: LyricEditorTrack): string {
  return track.collection ? `${track.collection.kind}:${track.collection.id}` : LOOSE_KEY;
}

/**
 * The studio's tracks by release: releases in the order of their most
 * recently changed track (the list comes newest first), each one's tracks in
 * release order. Tracks on no release (none yet published) come last.
 */
export function groupLyricTracks(tracks: LyricEditorTrack[]): LyricCollection[] {
  const groups = new Map<string, LyricCollection>();
  for (const track of tracks) {
    const key = collectionKeyOf(track);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        kind: track.collection?.kind ?? 'loose',
        title: track.collection?.title ?? 'Not on a release',
        releaseType: track.collection?.releaseType ?? null,
        artwork: track.collection?.artwork ?? null,
        tracks: [],
      };
      groups.set(key, group);
    }
    group.tracks.push(track);
  }
  const order = (value: number | null | undefined) => (typeof value === 'number' ? value : Number.MAX_SAFE_INTEGER);
  for (const group of groups.values()) {
    group.tracks.sort((a, b) => order(a.disc) - order(b.disc) || order(a.position) - order(b.position) || a.title.localeCompare(b.title));
  }
  const loose = groups.get(LOOSE_KEY);
  groups.delete(LOOSE_KEY);
  return loose ? [...groups.values(), loose] : [...groups.values()];
}

/** What a collection is, in a word or two. */
export function collectionKindLabel(collection: Pick<LyricCollection, 'kind' | 'releaseType'>): string {
  if (collection.kind === 'learning_album') return 'Learn album';
  if (collection.kind === 'lesson_set') return 'Lesson set';
  if (collection.kind === 'loose') return 'Music';
  if (collection.releaseType === 'single') return 'Single';
  if (collection.releaseType === 'ep') return 'EP';
  return 'Album';
}

/** Tracks, recordings or lessons, counted. */
export function collectionCountLabel(collection: Pick<LyricCollection, 'kind' | 'tracks'>): string {
  const count = collection.tracks.length;
  const noun = collection.kind === 'lesson_set' ? 'lesson' : collection.kind === 'learning_album' ? 'recording' : 'track';
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
