import type { PublicationStatus, SubmissionType, UploadCandidate } from '@/types/creator';

export function statusLabel(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const SUBMISSION_TYPE_LABELS: Record<SubmissionType, string> = {
  music_release: 'Music release',
  learning_album: 'Learning album',
  learning_lesson_set: 'Lesson set',
  artist_update: 'Artist update',
  cantor_update: 'Cantor update',
};

export function submissionTypeLabel(value: SubmissionType): string {
  return SUBMISSION_TYPE_LABELS[value] ?? statusLabel(value);
}

/** What the status means for the creator, in their terms. */
export function statusDescription(status: PublicationStatus): string {
  switch (status) {
    case 'pending_review': return 'Waiting for Coptic Vine review.';
    case 'changes_requested': return 'Coptic Vine asked for changes before it can be approved.';
    case 'approved': return 'Approved. Coptic Vine is preparing it for publication.';
    case 'processing': return 'Approved. Media is being processed.';
    case 'published': return 'Live on Coptic Vine.';
    case 'rejected': return 'Not accepted for publication.';
    case 'archived': return 'Archived.';
    default: return 'Not sent to Coptic Vine yet.';
  }
}

export type StatusTone = 'neutral' | 'progress' | 'warning' | 'success' | 'danger';

export function statusTone(status: PublicationStatus): StatusTone {
  if (status === 'published') return 'success';
  if (status === 'changes_requested') return 'warning';
  if (status === 'rejected') return 'danger';
  if (status === 'pending_review' || status === 'approved' || status === 'processing') return 'progress';
  return 'neutral';
}

export function fileSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function duration(seconds: number): string {
  if (seconds < 60) return 'under a minute';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function speed(bytesPerSecond: number): string {
  const mb = bytesPerSecond / 1_000_000;
  return mb >= 10 ? `${Math.round(mb)} MB/s` : `${mb.toFixed(1)} MB/s`;
}

export function uploadLabel(file: UploadCandidate): string {
  if (file.error && file.uploadIntentId) return 'Uploaded — processing retry needed';
  if (file.error && file.paused) return `Upload paused at ${Math.floor(file.progress * 100)}% — Retry continues it`;
  if (file.error) return 'Upload failed';
  if (file.uploaded && file.uploadIntentId) return 'Uploaded';
  if (file.uploading) {
    const parts = [`Uploading ${Math.max(1, Math.round(file.progress * 100))}%`];
    if (file.uploadBytesPerSecond) parts.push(speed(file.uploadBytesPerSecond));
    if (file.uploadSecondsLeft !== undefined) parts.push(`about ${duration(file.uploadSecondsLeft)} left`);
    return parts.join(' · ');
  }
  return 'Waiting to upload';
}

export function shortDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
