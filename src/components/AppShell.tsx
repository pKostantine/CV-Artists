import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router, usePathname, type Href } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wordmark } from '@/components/Brand';
import BottomTabBar, { type ArtistTab } from '@/components/BottomTabBar';
import Icon, { type IconName } from '@/components/Icon';
import { IconButton } from '@/components/ui';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { useWorkspace } from '@/context/WorkspaceContext';
import { disableNativeNotificationDevice } from '@/services/notificationService';
import { supabase } from '@/services/supabase';

const SECTIONS: { href: Href; match: string; label: string; icon: IconName; tab: Exclude<ArtistTab, null> }[] = [
  { href: '/', match: '/', label: 'Submissions', icon: 'document-outline', tab: 'submissions' },
  { href: '/releases', match: '/releases', label: 'Releases', icon: 'globe-outline', tab: 'releases' },
  { href: '/lyrics', match: '/lyrics', label: 'Lyrics Studio', icon: 'lyrics-outline', tab: 'lyrics' },
  { href: '/profile', match: '/profile', label: 'Artist profile', icon: 'person-outline', tab: 'profile' },
];

const DESKTOP_NAV_MIN_WIDTH = 1100;
const SIDEBAR_WIDTH = 248;

function isSectionActive(pathname: string, match: string) {
  if (match === '/') return pathname === '/' || pathname.startsWith('/submission');
  return pathname === match
    || pathname.startsWith(`${match}/`)
    || (match === '/releases' && pathname.startsWith('/release/'));
}

export function AppShell({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { account, accounts, selectAccount } = useWorkspace();

  // Native tablets and touch-first web apps use the bottom tab bar too.
  // The sidebar is reserved for genuinely desktop-like pointer layouts.
  const coarsePointer = Platform.OS !== 'web'
    || (typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches);
  const desktopNavigation = width >= DESKTOP_NAV_MIN_WIDTH && !coarsePointer;
  const activeTab = SECTIONS.find((section) => isSectionActive(pathname, section.match))?.tab ?? null;

  const signOut = async () => {
    try {
      await disableNativeNotificationDevice();
    } catch (error) {
      console.warn('Unable to detach this device from Coptic Vine Artists notifications before sign-out:', error);
    }
    await supabase.auth.signOut();
  };

  const switcher = accounts.map((workspace) => {
    const active = workspace.id === account?.id;
    return (
      <Pressable
        key={workspace.id}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={() => selectAccount(workspace.id)}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.workspace,
          hovered && !active && styles.workspaceHover,
          active && styles.workspaceActive,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.workspaceText, active && styles.workspaceTextActive]} numberOfLines={1}>
          {workspace.displayName}
        </Text>
      </Pressable>
    );
  });

  if (desktopNavigation) {
    return (
      <View style={styles.wideRoot}>
        <View style={[styles.sidebar, { paddingTop: SPACING.lg + insets.top }]}>
          <View style={styles.brand}>
            <Wordmark product="Artists" seal={44} />
          </View>

          <View style={styles.accountBlock}>
            <Text style={styles.accountLabel}>{accounts.length > 1 ? 'Workspaces' : 'Workspace'}</Text>
            {accounts.length > 1
              ? <View style={styles.switcherColumn}>{switcher}</View>
              : <Text style={styles.accountName} numberOfLines={2}>{account?.displayName || 'Creator workspace'}</Text>}
          </View>

          {SECTIONS.map((section) => {
            const active = isSectionActive(pathname, section.match);
            return (
              <Pressable
                key={section.match}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => router.replace(section.href)}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.navItem,
                  active && styles.navItemActive,
                  !active && (hovered || pressed) && styles.navItemHover,
                ]}
              >
                <Icon name={section.icon} size={21} color={active ? COLORS.gold : COLORS.muted} />
                <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>{section.label}</Text>
              </Pressable>
            );
          })}

          <View style={[styles.foot, { paddingBottom: insets.bottom }]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void signOut()}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.navItem, (hovered || pressed) && styles.navItemHover]}
            >
              <Icon name="log-out-outline" size={20} color={COLORS.muted} />
              <Text style={styles.navLabel}>Log out</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.main}>{children}</View>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.narrowRoot}>
      <View style={[styles.mobileHeader, { paddingTop: Math.max(insets.top, SPACING.sm) }]}>
        <View style={styles.mobileHeaderRow}>
          <View style={styles.mobileBrand}>
            <Wordmark product="Artists" seal={34} compact />
          </View>
          <IconButton icon="log-out-outline" label="Log out" onPress={() => void signOut()} size={38} />
        </View>

        {accounts.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherRow}>
            {switcher}
          </ScrollView>
        )}
      </View>

      <View style={styles.main}>{children}</View>

      <BottomTabBar active={activeTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wideRoot: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.black },
  narrowRoot: { flex: 1, backgroundColor: COLORS.black },
  sidebar: { width: SIDEBAR_WIDTH, paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg, gap: 4, backgroundColor: COLORS.greenDeep },
  brand: { paddingHorizontal: 8, paddingBottom: 22 },
  accountBlock: { gap: 3, paddingHorizontal: 14, paddingBottom: 18 },
  accountLabel: { color: COLORS.faint, fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  accountName: { color: COLORS.white, fontFamily: TYPOGRAPHY.title, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 46, paddingHorizontal: 14, borderRadius: 14 },
  navItemActive: { backgroundColor: COLORS.goldSoft },
  navItemHover: { backgroundColor: COLORS.hover },
  navLabel: { flexShrink: 1, color: COLORS.muted, fontSize: 15, fontWeight: '600' },
  navLabelActive: { color: COLORS.gold },
  foot: { marginTop: 'auto' },
  main: { flex: 1, minWidth: 0, minHeight: 0 },
  pressed: { opacity: 0.82 },

  mobileHeader: { paddingHorizontal: SPACING.md, paddingBottom: 10, gap: 10, backgroundColor: COLORS.greenDeep },
  mobileHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  mobileBrand: { flex: 1, minWidth: 0 },

  switcherColumn: { gap: 6, marginTop: 6, alignItems: 'flex-start' },
  switcherRow: { flexDirection: 'row', gap: 6, paddingRight: SPACING.md },
  workspace: { maxWidth: 220, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADII.pill, backgroundColor: 'rgba(0, 0, 0, 0.25)' },
  workspaceHover: { backgroundColor: COLORS.hover },
  workspaceActive: { backgroundColor: COLORS.goldSoft },
  workspaceText: { color: COLORS.muted, fontSize: 12.5, fontWeight: '600' },
  workspaceTextActive: { color: COLORS.gold },
});
