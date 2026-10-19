import { router, useLocalSearchParams } from 'expo-router';
import { SubmissionEditor } from '@/components/SubmissionEditor';
import { useWorkspace } from '@/context/WorkspaceContext';

/** Edits a submission after it is sent: opened from its page, or from Releases. */
export default function EditSubmissionScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; from?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const fromReleases = params.from === 'releases';
  const { refresh } = useWorkspace();
  if (!id) return null;
  return (
    <SubmissionEditor
      submissionId={id}
      backLabel={fromReleases ? 'Releases' : 'Submission'}
      onBack={() => (fromReleases
        ? router.replace('/releases')
        : router.replace({ pathname: '/submission/[id]', params: { id } }))}
      onSaved={() => { void refresh(); }}
      onDeleted={() => { void refresh(); router.replace(fromReleases ? '/releases' : '/'); }}
    />
  );
}
