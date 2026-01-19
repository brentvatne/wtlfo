export const colors = {
  // Backgrounds
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceHover: '#2a2a2a',

  // Text (WCAG 2.1 AA compliant contrast ratios against #0a0a0a)
  textPrimary: '#ffffff',
  textSecondary: '#9999aa', // ~5.8:1 contrast ratio
  textMuted: '#8888a0',     // ~4.6:1 contrast ratio
  textDisabled: '#555566',

  // Accent
  accent: '#ff6600',
  accentDark: '#cc5500',

  // Status
  warning: '#ffaa00',
  warningBackground: '#3a2a00',
  warningBorder: '#665500',
  error: '#ff4444',

  // Grid/Borders
  border: '#2a2a2a',
  gridLines: 'rgba(255, 255, 255, 0.1)',
} as const;

export type Colors = typeof colors;
export type ColorKey = keyof Colors;
