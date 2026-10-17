/**
 * The pieces of a large upload that are easy to get wrong and easy to test:
 * how big each part is, how long to wait before retrying one, how fast the
 * upload is going, and what to remember so a 15 GB upload that stops (a
 * dropped connection, a closed laptop, a reload) continues where it stopped
 * instead of starting over.
 */

const MIB = 1024 * 1024;
// R2: at least 5 MiB a part (but the last), at most 10,000 parts.
const MIN_PART_BYTES = 5 * MIB;
const MAX_PARTS = 9_500;

export function planParts(size: number, recommended?: number, maximum?: number): { partSize: number; partCount: number } {
  const ceiling = Math.max(MIN_PART_BYTES, Number(maximum) || 64 * MIB);
  const wanted = Math.max(MIN_PART_BYTES, Number(recommended) || 32 * MIB, Math.ceil(size / MAX_PARTS / MIB) * MIB);
  const partSize = Math.min(ceiling, wanted);
  return { partSize, partCount: Math.max(1, Math.ceil(size / partSize)) };
}

/** Seconds to wait before retry `attempt` (1-based) of one part: 1, 2, 4, 8, 16, then 30. */
export function retryDelayMs(attempt: number): number {
  return Math.min(30_000, 1_000 * 2 ** Math.max(0, attempt - 1));
}

export function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

/** A smoothed upload speed, for "8.3 MB/s · 12 min left". */
export class SpeedMeter {
  private lastAt: number | null = null;
  private lastBytes = 0;
  private rate = 0;

  constructor(private readonly now: () => number = () => Date.now()) {}

  /** Records the total bytes sent so far; returns the smoothed bytes per second. */
  sample(totalBytes: number): number {
    const at = this.now();
    if (this.lastAt === null) {
      this.lastAt = at;
      this.lastBytes = totalBytes;
      return this.rate;
    }
    const elapsed = (at - this.lastAt) / 1000;
    if (elapsed < 1) return this.rate;
    const instant = Math.max(0, totalBytes - this.lastBytes) / elapsed;
    this.rate = this.rate ? this.rate * 0.7 + instant * 0.3 : instant;
    this.lastAt = at;
    this.lastBytes = totalBytes;
    return this.rate;
  }

  secondsLeft(remainingBytes: number): number | undefined {
    return this.rate > 0 ? Math.ceil(remainingBytes / this.rate) : undefined;
  }
}

export interface ResumableUpload {
  uploadIntentId: string;
  uploadId: string;
  partSize: number;
  /** Part number -> ETag of every part already stored. */
  parts: Record<string, string>;
  savedAt: number;
}

// Upload authorizations last 24 hours; resume well inside that.
const RESUME_MAX_AGE_MS = 20 * 60 * 60 * 1000;
const RESUME_PREFIX = 'cv-artists.resumable-upload:';

export function resumeKey(accountId: string, file: { name: string; size: number; lastModified?: number }): string {
  return `${RESUME_PREFIX}${accountId}:${file.size}:${file.lastModified ?? 0}:${file.name}`;
}

interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStore(): KeyValueStore | null {
  try {
    const store = (globalThis as { localStorage?: KeyValueStore }).localStorage;
    return store ?? null;
  } catch {
    return null;
  }
}

export function loadResumable(key: string, store: KeyValueStore | null = defaultStore(), now = Date.now()): ResumableUpload | null {
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as ResumableUpload;
    if (!value?.uploadIntentId || !value.uploadId || !(value.partSize > 0) || !value.parts || now - value.savedAt > RESUME_MAX_AGE_MS) {
      store.removeItem(key);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function saveResumable(key: string, value: ResumableUpload, store: KeyValueStore | null = defaultStore()): void {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    // Without storage the upload still works; it just cannot resume after a reload.
  }
}

export function clearResumable(key: string, store: KeyValueStore | null = defaultStore()): void {
  try {
    store?.removeItem(key);
  } catch {
    // Nothing to clear.
  }
}
