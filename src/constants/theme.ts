/**
 * Coptic Vine design tokens (the "Coptic Vine" design system, shared with the
 * main app's constants/theme.ts). Vine green carries the chrome, gold is the
 * one accent, on true black. Blocks have no outlines: depth comes from the
 * green gradients and the surfaces below.
 */
export const COLORS = {
  // Brand palette — cv-green, cv-green-deep and the steps between them.
  green: '#2B5A30',
  greenDeep: '#14301B',
  greenMid: '#1D4424',
  greenGlow: '#3A7A3F',
  gold: '#E3B53B',
  goldBright: '#ECD48A',
  goldSoft: 'rgba(227, 181, 59, 0.13)',
  goldLine: 'rgba(227, 181, 59, 0.45)',

  // Surfaces. Cards fade from surfaceDeep down to surface.
  black: '#000000',
  surface: '#0B1C10',
  surfaceSoft: '#133020',
  surfaceDeep: '#10291A',
  // Inputs and inset tiles sit in a well of black on a card.
  inset: 'rgba(0, 0, 0, 0.32)',
  hairline: 'rgba(255, 255, 255, 0.08)',
  hover: 'rgba(255, 255, 255, 0.04)',
  border: '#23301F',

  white: '#FFFFFF',
  muted: '#CDD8CB',
  faint: '#8E9C8B',

  // Status colours, taken from the reader's rubric so they read as part of
  // the same family: People orange for warnings, Priest red for failures,
  // the comment green for success, and the verse-row blue for work in motion.
  success: '#8FD19E',
  successSoft: 'rgba(143, 209, 158, 0.12)',
  successLine: 'rgba(143, 209, 158, 0.38)',
  warning: '#F0B67E',
  warningSoft: 'rgba(226, 138, 46, 0.13)',
  warningLine: 'rgba(226, 138, 46, 0.42)',
  danger: '#F08A84',
  dangerSoft: 'rgba(214, 69, 69, 0.14)',
  dangerLine: 'rgba(214, 69, 69, 0.48)',
  info: '#8EC5FF',
  infoSoft: 'rgba(142, 197, 255, 0.12)',
  infoLine: 'rgba(142, 197, 255, 0.38)',
} as const;

export type Tone = 'neutral' | 'gold' | 'info' | 'success' | 'warning' | 'danger';

/** Foreground, wash and hairline for each status tone. */
export const TONES: Record<Tone, { fg: string; soft: string; line: string }> = {
  neutral: { fg: COLORS.muted, soft: 'rgba(255, 255, 255, 0.06)', line: 'rgba(255, 255, 255, 0.14)' },
  gold: { fg: COLORS.gold, soft: COLORS.goldSoft, line: COLORS.goldLine },
  info: { fg: COLORS.info, soft: COLORS.infoSoft, line: COLORS.infoLine },
  success: { fg: COLORS.success, soft: COLORS.successSoft, line: COLORS.successLine },
  warning: { fg: COLORS.warning, soft: COLORS.warningSoft, line: COLORS.warningLine },
  danger: { fg: COLORS.danger, soft: COLORS.dangerSoft, line: COLORS.dangerLine },
};

/** A 4px base: 16px gutters, 8–14px between cards, 22–26px between sections. */
export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

/** Buttons and inputs 12, row cards 16, cards 20, hero blocks 24. */
export const RADII = { sm: 12, md: 16, lg: 20, xl: 24, pill: 999 } as const;

/** Titles are Georgia, bold; everything else is the system face. Coptic lyrics use the Athanasius face. */
export const TYPOGRAPHY = { title: 'Georgia', body: 'System', coptic: 'Athanasius', arabic: 'Arial' } as const;

/** The system stack for raw DOM elements on web, which would otherwise inherit the browser's serif. */
export const WEB_SYSTEM_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** Presses dim rather than bounce. */
export const MOTION = { pressOpacity: 0.82 } as const;
