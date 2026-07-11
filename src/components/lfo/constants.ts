import type { LFOTheme } from './types';

export const DEFAULT_THEME_DARK: LFOTheme = {
  background: '#1a1a2e',
  waveformStroke: '#00d4ff',
  waveformFill: '#00d4ff',
  phaseIndicator: '#ff6b6b',
  gridLines: '#ffffff',
  text: '#ffffff',
  textSecondary: '#9999aa', // WCAG AA compliant
  positive: '#4ade80',
  negative: '#f87171',
  accent: '#00d4ff',
  fadeCurve: '#ffcc00',
};

export const DEFAULT_THEME_LIGHT: LFOTheme = {
  background: '#f5f5f7',
  waveformStroke: '#0066cc',
  waveformFill: '#0066cc',
  phaseIndicator: '#dc2626',
  gridLines: '#000000',
  text: '#1a1a1a',
  textSecondary: '#666677',
  positive: '#16a34a',
  negative: '#dc2626',
  accent: '#0066cc',
  fadeCurve: '#ff9900',
};

// Elektron-inspired theme
export const ELEKTRON_THEME: LFOTheme = {
  background: '#000000',
  waveformStroke: '#ff6600',
  waveformFill: '#ff6600',
  phaseIndicator: '#ffffff',
  gridLines: '#333333',
  text: '#ffffff',
  textSecondary: '#9999aa', // WCAG AA compliant
  positive: '#00ff00',
  negative: '#ff0000',
  accent: '#ff6600',
  fadeCurve: '#00ffcc', // Cyan/teal - contrasts with orange
};

// Dimensions
export const DEFAULT_WIDTH = 300;
export const DEFAULT_HEIGHT = 150;
export const PADDING = 8;

// SPH (start phase) normalization for the DISPLAY curves.
// The waveform curve and fade trajectory divide SPH by 127 so that SPH=127
// wraps around to look like SPH=0 on screen (matches the Digitakt display).
// The engine and PhaseIndicator divide by 128 (elektron-lfo convention), so
// the dot can lead the curve by up to 1/128 of a cycle at high SPH values.
// Do not change either divisor without checking dot-vs-curve alignment on
// hardware at SPH 0/34/64/100/127 (see CLAUDE.md consistency contract).
export const SPH_DISPLAY_DIVISOR = 127;
