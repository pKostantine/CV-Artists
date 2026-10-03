import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { HeroGlow, Seal } from '@/components/Brand';
import Icon, { type IconName } from '@/components/Icon';
import { BuddedCross, VineRule } from '@/components/Ornaments';
import { COLORS, MOTION, RADII, SPACING, TONES, TYPOGRAPHY, type Tone } from '@/constants/theme';
import type { PublicationStatus } from '@/types/creator';
import { statusLabel, statusTone, type StatusTone } from '@/utils/format';

/** Phones and narrow windows get the tighter type scale and 16px gutters. */
export function useCompact() {
  const { width } = useWindowDimensions();
  return width < 700;
}

export function Page({ children, scrollEnabled = true }: { children: ReactNode; scrollEnabled?: boolean }) {
  const compact = useCompact();
  const pathname = usePathname();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
  }, [pathname]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.page}
      contentContainerStyle={styles.pageScroll}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={scrollEnabled}
    >
      <HeroGlow />
      <View style={[styles.pageContent, compact && styles.pageContentCompact]}>{children}</View>
    </ScrollView>
  );
}

export function PageHeader({ eyebrow, title, subtitle, action, back }: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  back?: { label: string; onPress: () => void };
}) {
  const compact = useCompact();
  return (
    <View style={styles.headerBlock}>
      {!!back && <BackLink label={back.label} onPress={back.onPress} />}
      <View style={[styles.pageHeader, compact && styles.pageHeaderCompact]}>
        <View style={[styles.headerText, compact && styles.headerTextCompact]}>
          {!!eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <Text style={[styles.hero, compact && styles.heroCompact]} accessibilityRole="header">{title}</Text>
          {!!subtitle && <Text style={styles.subhero}>{subtitle}</Text>}
        </View>
        {!!action && <View style={[styles.headerAction, compact && styles.headerActionCompact]}>{action}</View>}
      </View>
    </View>
  );
}

/** A round gold back button with where it goes beside it. */
export function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.back, pressed && styles.pressed]}
    >
      <View style={styles.backCircle}>
        <Icon name="chevron-back" size={18} color={COLORS.gold} />
      </View>
      <Text style={styles.backText}>{label}</Text>
    </Pressable>
  );
}

/** Small gold capitals above a title. */
export function Eyebrow({ children, tone = 'gold' }: { children: ReactNode; tone?: Tone }) {
  return <Text style={[styles.eyebrow, { color: tone === 'gold' ? COLORS.gold : TONES[tone].fg }]}>{children}</Text>;
}

/** The card fade (Coptic Vine, "--grad-card"), or the green block gradient for the one highlighted card on a page. Lay it first inside a rounded, overflow-hidden view. */
export function CardFill({ highlight }: { highlight?: boolean }) {
  return (
    <LinearGradient
      colors={highlight ? [COLORS.green, COLORS.greenDeep] : [COLORS.surfaceDeep, COLORS.surface]}
      start={highlight ? { x: 0.2, y: 0 } : { x: 0.5, y: 0 }}
      end={highlight ? { x: 0.8, y: 1 } : { x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}

export function Card({ title, description, eyebrow, highlight, children, style }: {
  title?: string;
  description?: string;
  eyebrow?: string;
  /** The page's one highlighted block: green instead of the dark card fade. */
  highlight?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const compact = useCompact();
  return (
    <View style={[styles.card, compact && styles.cardCompact, style]}>
      <CardFill highlight={highlight} />
      {(!!eyebrow || !!title || !!description) && (
        <View style={styles.cardHead}>
          {!!eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          {!!title && <Text style={styles.cardTitle}>{title}</Text>}
          {!!description && <Text style={[styles.muted, highlight && styles.onGreen]}>{description}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

/** A tappable row card: rows are separate cards 8px apart, with the chevron at the far right. */
export function RowCard({ onPress, children, accessibilityLabel, style }: {
  onPress?: () => void;
  children: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.rowCard,
        style,
        hovered && styles.rowCardHover,
        pressed && styles.pressed,
      ]}
    >
      <CardFill />
      {children}
      {!!onPress && <View style={styles.chevron}><Icon name="chevron-forward" size={18} color={COLORS.gold} /></View>}
    </Pressable>
  );
}

/** A section heading with the vine running out from it, and an optional count and note. */
export function Section({ title, count, description, action, children }: {
  title: string;
  count?: number;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
        {count !== undefined && <Text style={styles.sectionCount}>{count}</Text>}
        <VineRule height={16} />
        {action}
      </View>
      {!!description && <Text style={styles.muted}>{description}</Text>}
      {children}
    </View>
  );
}

/** The quiet state for an empty list: a budded cross in a gold medallion. */
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.empty}>
      <CardFill />
      <View style={styles.medallion}><BuddedCross size={24} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!description && <Text style={[styles.muted, styles.centered]}>{description}</Text>}
    </View>
  );
}

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({ label, onPress, disabled, busy, danger, kind = 'secondary', size = 'md', icon, style }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  danger?: boolean;
  kind?: ButtonKind;
  size?: 'sm' | 'md';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const resolved: ButtonKind = danger ? 'danger' : kind;
  const off = disabled || busy;
  const fg = BUTTON_FG[resolved];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.button,
        size === 'sm' && styles.buttonSmall,
        buttonStyles[resolved],
        hovered && !off && buttonHover[resolved],
        off && styles.disabled,
        pressed && !off && styles.pressed,
        style,
      ]}
    >
      {busy
        ? <ActivityIndicator size="small" color={fg} />
        : icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} color={fg} /> : null}
      <Text style={[styles.buttonText, size === 'sm' && styles.buttonTextSmall, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** A round, gold-ringed icon button for chrome actions. */
export function IconButton({ icon, label, onPress, size = 40 }: { icon: IconName; label: string; onPress: () => void; size?: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        hovered && styles.iconButtonHover,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.48)} color={COLORS.gold} />
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  multiline,
  ...props
}: TextInputProps & {
  label: string;
  hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={COLORS.faint}
        onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
        style={[styles.input, multiline && styles.multiline, focused && styles.inputFocused, props.style]}
      />
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

/** Pills that can be switched off again by tapping the selected one. */
export function Chips({ items, value, onChange }: { items: { id: string; title: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <View style={styles.chips}>
      {items.map((item) => {
        const active = value === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            onPress={() => onChange(active ? '' : item.id)}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.chip,
              hovered && !active && styles.chipHover,
              active && styles.chipActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.title}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The pill segmented toggle (Coptic Vine, "SegmentedToggle"): one option is always selected, filled in gold. */
export function Segmented({ items, value, onChange }: { items: { id: string; title: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <View accessibilityRole="tablist" style={styles.segmented}>
      {items.map((item) => {
        const active = value === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.id)}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.segment,
              hovered && !active && styles.segmentHover,
              active && styles.segmentActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>{item.title}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Dropdown({ label, items, value, onChange, placeholder = 'Select an option', hint }: {
  label: string;
  items: { id: string; title: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((item) => item.id === value);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.input, styles.dropdownButton, open && styles.inputFocused, pressed && styles.pressed]}
      >
        <Text style={[styles.dropdownText, !selected && styles.dropdownPlaceholder]} numberOfLines={1}>
          {selected?.title ?? placeholder}
        </Text>
        <View style={open && styles.flipped}><Icon name="chevron-down" size={16} color={COLORS.gold} /></View>
      </Pressable>
      {open && (
        <View style={styles.dropdownMenu}>
          {items.map((item) => {
            const active = item.id === value;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="menuitem"
                onPress={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.dropdownOption,
                  (hovered || pressed) && styles.dropdownOptionHover,
                ]}
              >
                <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>{item.title}</Text>
                {active && <Icon name="checkmark" size={16} color={COLORS.gold} />}
              </Pressable>
            );
          })}
        </View>
      )}
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

/** Inline loading: a gold spinner and a short label. `full` fills the screen with the seal on deep green. */
export function Loading({ label, full = false }: { label: string; full?: boolean }) {
  if (full) {
    return (
      <View style={styles.loadingFull}>
        <Seal size={132} />
        <View style={styles.loadingRow}>
          <ActivityIndicator color={COLORS.gold} />
          <Text style={styles.loadingFullText}>{label}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={COLORS.gold} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

type BannerTone = 'error' | 'info' | 'success' | 'warning';

const BANNER_TONE: Record<BannerTone, Tone> = { error: 'danger', info: 'neutral', success: 'success', warning: 'warning' };

export function Banner({ children, tone = 'error' }: { children: ReactNode; tone?: BannerTone }) {
  const palette = TONES[BANNER_TONE[tone]];
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={[styles.banner, { backgroundColor: palette.soft }]}
    >
      <View style={[styles.bannerRule, { backgroundColor: tone === 'info' ? COLORS.goldLine : palette.fg }]} />
      <Text style={[styles.bannerText, { color: tone === 'info' ? COLORS.muted : palette.fg }]}>{children}</Text>
    </View>
  );
}

/** `progress` is work moving through review; it takes the gold. */
export type PillTone = StatusTone | 'info';

function pillPalette(tone: PillTone) {
  return TONES[tone === 'progress' ? 'gold' : tone];
}

export function StatusPill({ status }: { status: PublicationStatus }) {
  return <Pill label={statusLabel(status)} tone={statusTone(status)} />;
}

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: PillTone }) {
  const palette = pillPalette(tone);
  return (
    <View style={[styles.pill, { backgroundColor: palette.soft, borderColor: palette.line }]}>
      <Text style={[styles.pillText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

/** A row of figures: each a number over a small label, tinted by its tone. */
export function Stats({ items }: { items: { label: string; value: number; tone?: Tone }[] }) {
  const compact = useCompact();
  // One row on wide screens; on a phone, pairs when the count is even, otherwise one row of three.
  const basis = !compact ? 0 : items.length % 2 === 0 ? '40%' : '28%';
  return (
    <View style={styles.stats}>
      {items.map((item) => (
        <View key={item.label} style={[styles.stat, { flexBasis: basis }]}>
          <CardFill />
          <Text style={[styles.statValue, item.tone && item.value > 0 && { color: TONES[item.tone].fg }]}>{item.value}</Text>
          <Text style={styles.statLabel} numberOfLines={2}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export const uiStyles = StyleSheet.create({
  muted: { color: COLORS.muted, fontSize: 13.5, lineHeight: 20 },
  /** A row in a list inside a card, divided from the one above by a hairline. */
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.hairline, flexWrap: 'wrap' },
  rowTitle: { color: COLORS.white, fontFamily: TYPOGRAPHY.title, fontWeight: '700', fontSize: 16 },
  link: { color: COLORS.gold, fontWeight: '700', fontSize: 13.5 },
  remove: { color: COLORS.danger, fontWeight: '700', fontSize: 13.5 },
  success: { color: COLORS.success, fontSize: 12.5, fontWeight: '700' },
  error: { color: COLORS.danger, fontSize: 12.5, fontWeight: '700' },
  errorDetail: { color: COLORS.danger, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  body: { color: COLORS.white, fontSize: 14.5, lineHeight: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  code: { color: COLORS.muted, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 11.5, lineHeight: 17, padding: 12, backgroundColor: COLORS.inset, borderRadius: RADII.sm },
});

const BUTTON_FG: Record<ButtonKind, string> = {
  primary: COLORS.greenDeep,
  secondary: COLORS.gold,
  ghost: COLORS.gold,
  danger: COLORS.danger,
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.black },
  pageScroll: { flexGrow: 1 },
  pageContent: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: SPACING.xl, paddingTop: 36, paddingBottom: 56, gap: 22 },
  pageContentCompact: { paddingHorizontal: SPACING.md, paddingTop: 22, paddingBottom: 36, gap: 18 },

  headerBlock: { gap: 14 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start' },
  backCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: COLORS.goldLine, alignItems: 'center', justifyContent: 'center' },
  backText: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
  pageHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: SPACING.md },
  pageHeaderCompact: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch', gap: 14 },
  headerText: { gap: 6, flexShrink: 1, minWidth: 240 },
  headerTextCompact: { minWidth: 0, width: '100%' },
  headerAction: { flexShrink: 0 },
  headerActionCompact: { alignItems: 'flex-start' },
  hero: { color: COLORS.white, fontFamily: TYPOGRAPHY.title, fontSize: 34, lineHeight: 40, fontWeight: '700' },
  heroCompact: { fontSize: 28, lineHeight: 34 },
  subhero: { color: COLORS.muted, fontSize: 15, lineHeight: 22, maxWidth: 680 },
  eyebrow: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1.9, textTransform: 'uppercase' },

  card: { padding: 22, gap: 16, borderRadius: RADII.lg, overflow: 'hidden', backgroundColor: COLORS.surface },
  cardCompact: { padding: 18, gap: 14, borderRadius: 18 },
  cardHead: { gap: 6 },
  cardTitle: { color: COLORS.white, fontFamily: TYPOGRAPHY.title, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  onGreen: { color: 'rgba(255, 255, 255, 0.82)' },
  muted: { color: COLORS.muted, fontSize: 13.5, lineHeight: 20 },
  centered: { alignSelf: 'stretch', textAlign: 'center' },

  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, paddingRight: 16, borderRadius: RADII.md, overflow: 'hidden', backgroundColor: COLORS.surface },
  rowCardHover: { opacity: 0.92 },
  chevron: { alignSelf: 'center' },

  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { color: COLORS.white, fontFamily: TYPOGRAPHY.title, fontSize: 22, fontWeight: '700' },
  sectionCount: { color: COLORS.gold, backgroundColor: COLORS.goldSoft, borderRadius: RADII.pill, paddingHorizontal: 9, paddingVertical: 2, fontSize: 12, fontWeight: '700', overflow: 'hidden' },

  empty: { alignItems: 'center', gap: 8, paddingVertical: 28, paddingHorizontal: 22, borderRadius: RADII.lg, overflow: 'hidden', backgroundColor: COLORS.surface },
  medallion: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.goldSoft, marginBottom: 4 },
  emptyTitle: { alignSelf: 'stretch', color: COLORS.white, fontFamily: TYPOGRAPHY.title, fontSize: 18, fontWeight: '700', textAlign: 'center' },

  button: { minHeight: 44, paddingHorizontal: 18, paddingVertical: 10, borderRadius: RADII.sm, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  buttonSmall: { minHeight: 36, paddingHorizontal: 13, paddingVertical: 7, gap: 6, borderRadius: 10 },
  buttonText: { fontFamily: TYPOGRAPHY.title, fontWeight: '700', fontSize: 15.5 },
  buttonTextSmall: { fontSize: 13.5 },
  disabled: { opacity: 0.42 },
  pressed: { opacity: MOTION.pressOpacity },

  iconButton: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.goldLine },
  iconButtonHover: { backgroundColor: COLORS.goldSoft },

  field: { gap: 7 },
  fieldLabel: { color: COLORS.muted, fontSize: 11.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  input: { minHeight: 46, borderWidth: 1, borderColor: COLORS.hairline, borderRadius: RADII.sm, backgroundColor: COLORS.inset, color: COLORS.white, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  inputFocused: { borderColor: COLORS.goldLine },
  multiline: { minHeight: 104, textAlignVertical: 'top' },
  hint: { color: COLORS.faint, fontSize: 12.5, lineHeight: 18 },

  loading: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingFull: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26, backgroundColor: COLORS.greenDeep },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingFullText: { color: COLORS.white, fontFamily: TYPOGRAPHY.title, fontSize: 18, fontWeight: '700' },

  banner: { flexDirection: 'row', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 14 },
  bannerRule: { width: 3, borderRadius: 2, alignSelf: 'stretch' },
  bannerText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },

  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADII.pill, borderWidth: 1 },
  pillText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.2 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 36, paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADII.pill, backgroundColor: COLORS.surface },
  chipHover: { backgroundColor: COLORS.surfaceSoft },
  chipActive: { backgroundColor: COLORS.gold },
  chipText: { color: COLORS.muted, fontWeight: '600', fontSize: 13.5 },
  chipTextActive: { color: COLORS.greenDeep, fontWeight: '700' },

  segmented: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'flex-start', gap: 4, padding: 4, borderRadius: 22, backgroundColor: COLORS.inset },
  segment: { minHeight: 38, paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADII.pill, alignItems: 'center', justifyContent: 'center' },
  segmentHover: { backgroundColor: COLORS.hover },
  segmentActive: { backgroundColor: COLORS.gold },
  segmentText: { color: COLORS.muted, fontFamily: TYPOGRAPHY.title, fontWeight: '700', fontSize: 14.5 },
  segmentTextActive: { color: COLORS.greenDeep },

  dropdownButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dropdownText: { color: COLORS.white, fontSize: 15, flex: 1 },
  dropdownPlaceholder: { color: COLORS.faint },
  flipped: { transform: [{ rotate: '180deg' }] },
  dropdownMenu: { borderRadius: RADII.sm, backgroundColor: COLORS.surfaceSoft, overflow: 'hidden', paddingVertical: 4 },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  dropdownOptionHover: { backgroundColor: COLORS.hover },
  dropdownOptionText: { color: COLORS.white, fontSize: 15 },
  dropdownOptionTextActive: { color: COLORS.gold, fontWeight: '700' },

  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, minWidth: 0, paddingVertical: 14, paddingHorizontal: 16, borderRadius: RADII.md, overflow: 'hidden', backgroundColor: COLORS.surface, gap: 2 },
  statValue: { color: COLORS.white, fontFamily: TYPOGRAPHY.title, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  statLabel: { color: COLORS.muted, fontSize: 11, lineHeight: 15, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },


});

const buttonStyles = StyleSheet.create({
  primary: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  secondary: { backgroundColor: 'transparent', borderColor: COLORS.goldLine },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent', paddingHorizontal: 10 },
  danger: { backgroundColor: COLORS.dangerSoft, borderColor: COLORS.dangerLine },
});

const buttonHover = StyleSheet.create({
  primary: { backgroundColor: '#EBC250', borderColor: '#EBC250' },
  secondary: { backgroundColor: COLORS.goldSoft },
  ghost: { backgroundColor: COLORS.goldSoft },
  danger: { backgroundColor: 'rgba(214, 69, 69, 0.22)' },
});
