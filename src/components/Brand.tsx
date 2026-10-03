import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { COLORS, TYPOGRAPHY } from '@/constants/theme';

const SEAL = require('../../assets/images/coptic-vine-seal.png');

/** The Coptic Vine seal: Christ holding John 15, framed by vines. The only illustration the brand uses. */
export function Seal({ size }: { size: number }) {
  return (
    <Image
      source={SEAL}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      accessibilityLabel="Coptic Vine"
    />
  );
}

/** The seal beside the wordmark, with this app's name as a gold eyebrow underneath. */
export function Wordmark({ product, seal = 40, compact = false }: { product: string; seal?: number; compact?: boolean }) {
  return (
    <View style={styles.wordmark}>
      <Seal size={seal} />
      <View style={styles.wordmarkText}>
        <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={1}>Coptic Vine</Text>
        <Text style={styles.product} numberOfLines={1}>{product}</Text>
      </View>
    </View>
  );
}

/**
 * The green glow at the head of every page (Coptic Vine, "--grad-hero"): a
 * radial light over a deep-green-to-black fall. It is laid behind the page's
 * first content and scrolls away with it.
 */
export function HeroGlow({ height = 380, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.glow, { height }, style]} pointerEvents="none">
      <LinearGradient
        colors={[COLORS.greenDeep, '#0C1F11', COLORS.black]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="cvHeroGlow" cx="50%" cy="0%" rx="70%" ry="85%" fx="50%" fy="0%">
            <Stop offset="0" stopColor="#346E3A" stopOpacity="0.55" />
            <Stop offset="0.4" stopColor="#224C28" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#cvHeroGlow)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  wordmarkText: { flexShrink: 1, minWidth: 0, gap: 1 },
  name: { color: COLORS.white, fontFamily: TYPOGRAPHY.title, fontSize: 21, fontWeight: '700' },
  nameCompact: { fontSize: 17 },
  product: { color: COLORS.gold, fontSize: 10.5, fontWeight: '700', letterSpacing: 1.9, textTransform: 'uppercase' },
  glow: { position: 'absolute', top: 0, left: 0, right: 0 },
});
