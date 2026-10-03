import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { COLORS, RADII, SPACING } from '@/constants/theme';

function parseLocal(value: string): Date {
  const parsed = new Date(value.trim().replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? new Date(Date.now() + 72 * 60 * 60 * 1000) : parsed;
}

function formatLocal(date: Date, mode: 'date' | 'datetime'): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return mode === 'date' ? datePart : `${datePart} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function displayValue(date: Date, mode: 'date' | 'datetime'): string {
  return date.toLocaleString(undefined, mode === 'date'
    ? { year: 'numeric', month: 'short', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function ReleaseDateTimeField({
  label,
  value,
  onChange,
  minimumDate,
  hint,
  mode = 'datetime',
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  hint?: string;
  mode?: 'date' | 'datetime';
  optional?: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const hasValue = Boolean(value.trim());
  const date = hasValue ? parseLocal(value) : new Date();

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>

      {Platform.OS === 'ios' ? (
        optional && !hasValue && !showPicker ? (
          <Pressable style={styles.button} onPress={() => setShowPicker(true)}>
            <Text style={styles.buttonText}>Choose a date</Text>
          </Pressable>
        ) : (
          <View style={styles.pickerRow}>
            <DateTimePicker
              value={date}
              mode={mode}
              display="compact"
              minimumDate={minimumDate}
              themeVariant="dark"
              accentColor={COLORS.gold}
              onValueChange={(_event, selectedDate) => {
                onChange(formatLocal(selectedDate, mode));
                setShowPicker(false);
              }}
            />
            {optional && hasValue && (
              <Pressable onPress={() => onChange('')} hitSlop={8}>
                <Text style={styles.clear}>Clear</Text>
              </Pressable>
            )}
          </View>
        )
      ) : (
        <>
          <Pressable style={styles.button} onPress={() => setShowPicker(true)}>
            <Text style={styles.buttonText}>{hasValue ? displayValue(date, mode) : 'Choose a date'}</Text>
          </Pressable>
          {showPicker && (
            <DateTimePicker
              value={date}
              mode={mode}
              minimumDate={minimumDate}
              presentation="dialog"
              accentColor={COLORS.gold}
              onValueChange={(_event, selectedDate) => {
                setShowPicker(false);
                onChange(formatLocal(selectedDate, mode));
              }}
              onDismiss={() => setShowPicker(false)}
            />
          )}
          {optional && hasValue && (
            <Pressable onPress={() => onChange('')} hitSlop={8}>
              <Text style={styles.clear}>Clear date</Text>
            </Pressable>
          )}
        </>
      )}

      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: SPACING.sm },
  label: {
    color: COLORS.muted,
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  button: {
    minHeight: 46,
    justifyContent: 'center',
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.inset,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  buttonText: { color: COLORS.white, fontSize: 15 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flexWrap: 'wrap' },
  clear: { color: COLORS.gold, fontWeight: '700', fontSize: 13.5 },
  hint: { color: COLORS.faint, fontSize: 12.5, lineHeight: 18 },
});
