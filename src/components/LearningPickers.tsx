import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ContributorSearchField } from '@/components/ContributorSearchField';
import { Banner, Button, Dropdown, Field, uiStyles } from '@/components/ui';
import { creatorService } from '@/services/creatorService';
import type { CatalogOption } from '@/types/creator';

/**
 * One shared Coptic Vine artist picker for learning albums and lesson sets.
 * Cantors and choruses are artists, not separate identities or creation types.
 * Unselected names are resolved or created when the submission is sent.
 */
export function LearningContributorPicker({ accountId, name, selectedArtistId, onNameChange, onSelect }: {
  accountId: string | undefined;
  name: string;
  selectedArtistId: string;
  onNameChange: (name: string) => void;
  onSelect: (artistId: string, name: string) => void;
}) {
  return (
    <ContributorSearchField
      label="Artist / Cantor / Chorus"
      accountId={accountId}
      kind="artist"
      value={name}
      selectedId={selectedArtistId}
      placeholder="Search an existing Coptic Vine artist by name"
      hint="Choose an existing profile to link it, including its photo. If no profile matches, keep your new name; Coptic Vine will create a reusable artist credit when you submit."
      onTextChange={onNameChange}
      onSelect={(person) => onSelect(person.id, person.title)}
    />
  );
}

export function LearningHymnPicker({ accountId, options, value, onChange }: {
  accountId: string | undefined;
  options: CatalogOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [created, setCreated] = useState<CatalogOption | null>(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choices = created && !options.some((item) => item.id === created.id)
    ? [...options, created]
    : options;

  async function addHymn() {
    if (!accountId || !newName.trim()) return;
    setBusy(true);
    setError('');
    try {
      const next = await creatorService.createHymn(accountId, newName.trim());
      setCreated(next);
      onChange(next.id);
      setNewName('');
    } catch (cause) {
      setError(creatorService.describeError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.group}>
      <Dropdown
        label="Hymn"
        items={choices}
        value={value}
        onChange={onChange}
        placeholder={choices.length ? 'Select an existing hymn' : 'No learning hymns yet'}
      />
      <Text style={uiStyles.muted}>Can't find the hymn? Add its title. Coptic Vine will review it with your lesson set.</Text>
      <Field
        label="New hymn name"
        value={newName}
        onChangeText={(text) => { setNewName(text); setError(''); }}
        placeholder="Enter the hymn you are teaching"
      />
      <Button
        icon="add"
        label="Add new hymn"
        style={styles.addLink}
        onPress={() => void addHymn()}
        busy={busy}
        disabled={!accountId || !newName.trim()}
      />
      {!!error && <Banner tone="error">{error}</Banner>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  addLink: { alignSelf: 'flex-start' },
});
