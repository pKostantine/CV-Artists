export type LyricKind = 'original' | 'translation' | 'transliteration';
export type LyricSyncPrecision = 'unsynced' | 'line' | 'word';
export type LyricTargetType = 'music_track' | 'learning_album_recording' | 'learning_lesson';
export type LocaleCode = 'cop' | 'ar' | 'en' | 'fr' | (string & {});

export interface EditableLyricLine {
  id?: string;
  sequence: number;
  startMs: number | null;
  endMs: number | null;
  text: string;
}

export interface LyricEditorTrack {
  id: string;
  targetType: LyricTargetType;
  maxSyncPrecision: 'unsynced' | 'line';
  title: string;
  subtitle: string | null;
  durationMs: number | null;
  publicationStatus: string;
  /** A lesson: its set, its place in it, and whether it is a video (it auditions by its sound alone). */
  lessonSetId?: string | null;
  lessonNumber?: number | null;
  mediaType?: 'audio' | 'video' | null;
  mediaAsset: null | {
    id: string;
    provider: 'cloudflare_r2' | 'external';
    bucket: string;
    path: string;
    mimeType: string | null;
    durationMs: number | null;
    publicationStatus: string;
  };
}

export interface LyricDraft {
  id: string;
  trackId: string;
  locale: LocaleCode;
  description: string | null;
  publicationStatus: string;
  hasDraft?: boolean;
  syncPrecision?: 'unsynced' | 'line';
  lines: EditableLyricLine[];
}


export interface EditableMultilingualLyricRow {
  key: string;
  startMs: number | null;
  endMs: number | null;
  texts: Record<string, string>;
  lineIds?: Record<string, string>;
}
