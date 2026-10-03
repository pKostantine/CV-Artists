import { useRouter, type Href } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon, { type IconName } from '@/components/Icon';
import { COLORS, TYPOGRAPHY } from '@/constants/theme';

export type ArtistTab = 'submissions' | 'releases' | 'lyrics' | 'profile' | null;

interface BottomTabBarProps {
  active: ArtistTab;
}

const TABS: { active: Exclude<ArtistTab, null>; href: Href; icon: IconName; label: string }[] = [
  { active: 'submissions', href: '/', icon: 'document-outline', label: 'Submissions' },
  { active: 'releases', href: '/releases', icon: 'globe-outline', label: 'Releases' },
  { active: 'lyrics', href: '/lyrics', icon: 'lyrics-outline', label: 'Lyrics' },
  { active: 'profile', href: '/profile', icon: 'person-outline', label: 'Profile' },
];

function isStandaloneWebApp() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const standaloneNavigator = window.navigator as Navigator & { standalone?: boolean };
  return standaloneNavigator.standalone === true
    || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export default function BottomTabBar({ active }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isCompactLandscape = width > height && height <= 599;
  // The iPad sets the tabs as a centred row, as in the main Coptic Vine app.
  const tablet = !isCompactLandscape && width >= 768;
  // iOS standalone PWAs already receive a viewport that accounts for the
  // home-indicator area. Applying the web safe-area inset again creates a
  // large empty block below the tabs in Safari home-screen apps.
  const needsBrowserBottomInset = Platform.OS === 'web' && !isStandaloneWebApp();
  const iconSize = isCompactLandscape ? 22 : tablet ? 24 : 26;

  return (
    <View style={styles.shell}>
      <View
        accessibilityRole="tablist"
        style={[styles.bar, tablet && styles.barTablet, needsBrowserBottomInset && { paddingBottom: insets.bottom + (tablet ? 10 : 0) }]}
      >
        {TABS.map((tab) => {
          const selected = active === tab.active;
          return (
            <Pressable
              key={tab.active}
              accessibilityLabel={tab.label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => router.replace(tab.href)}
              style={[styles.tab, isCompactLandscape && styles.tabLandscape, tablet && styles.tabTablet]}
            >
              {selected && !tablet ? <View style={styles.activeIndicator} /> : null}
              <Icon name={tab.icon} size={iconSize} color={selected ? COLORS.gold : COLORS.muted} />
              <Text
                numberOfLines={1}
                style={[styles.tabLabel, isCompactLandscape && styles.tabLabelLandscape, tablet && styles.tabLabelTablet, selected && styles.tabLabelActive]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The tab bar sits on the deep green under a gold hairline (Coptic Vine, "TabBar").
  shell: { backgroundColor: COLORS.greenDeep },
  bar: {
    backgroundColor: COLORS.greenDeep,
    borderTopColor: COLORS.goldLine,
    borderTopWidth: 1,
    flexDirection: 'row',
  },
  barTablet: { gap: 48, justifyContent: 'center', paddingTop: 6, paddingBottom: 10 },
  activeIndicator: {
    backgroundColor: COLORS.gold,
    height: 3,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 10,
    position: 'relative',
  },
  tabTablet: { flexBasis: 96, flexGrow: 0, flexShrink: 0, gap: 4, paddingVertical: 8 },
  tabLandscape: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tabLabel: {
    color: COLORS.muted,
    fontFamily: TYPOGRAPHY.title,
    fontSize: 12,
    fontWeight: '700',
  },
  tabLabelTablet: { fontSize: 11.5 },
  tabLabelLandscape: {
    flexShrink: 1,
    fontSize: 14,
  },
  tabLabelActive: { color: COLORS.gold },
});
