import { router } from 'expo-router';
import { Button, EmptyState, Page, PageHeader } from '@/components/ui';

export default function NotFound() {
  return (
    <Page>
      <PageHeader title="Page not found" />
      <EmptyState title="That address is not part of Coptic Vine Artists." />
      <Button kind="primary" label="Go to submissions" onPress={() => router.replace('/')} style={{ alignSelf: 'flex-start' }} />
    </Page>
  );
}
