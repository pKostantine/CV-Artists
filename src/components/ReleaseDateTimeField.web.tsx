import { Text, View } from 'react-native';
import { COLORS, RADII, SPACING, WEB_SYSTEM_FONT } from '@/constants/theme';

function inputValue(value: string, mode: 'date' | 'datetime'): string {
  if (mode === 'date') return value.trim().slice(0, 10);
  return value.trim().replace(' ', 'T').slice(0, 16);
}

function minValue(date?: Date): string | undefined {
  if (!date) return undefined;
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function ReleaseDateTimeField({
  label,
  value,
  onChange,
  minimumDate,
  hint,
  mode = 'datetime',
  optional: _optional,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  hint?: string;
  mode?: 'date' | 'datetime';
  optional?: boolean;
}) {
  return (
    <View style={{ gap: SPACING.sm }}>
      <Text style={{ color: COLORS.muted, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 }}>
        {label}
      </Text>
      <input
        aria-label={label}
        type={mode === 'date' ? 'date' : 'datetime-local'}
        value={inputValue(value, mode)}
        min={minValue(minimumDate)}
        onChange={(event) => onChange(mode === 'date' ? event.currentTarget.value : event.currentTarget.value.replace('T', ' '))}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          minHeight: 46,
          borderRadius: RADII.sm,
          border: `1px solid ${COLORS.hairline}`,
          color: COLORS.white,
          background: COLORS.inset,
          padding: '11px 14px',
          fontSize: 15,
          fontFamily: WEB_SYSTEM_FONT,
          colorScheme: 'dark',
        }}
      />
      {!!hint && <Text style={{ color: COLORS.faint, fontSize: 12.5, lineHeight: 18 }}>{hint}</Text>}
    </View>
  );
}
