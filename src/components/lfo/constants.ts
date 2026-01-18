import type { LFOTheme } from './types';

export const DEFAULT_THEME_DARK: LFOTheme = {
  background: '#1a1a2e',
  waveformStroke: '#00d4ff',
  waveformFill: '#00d4ff',
  phaseIndicator: '#ff6b6b',
  gridLines: '#ffffff',
  text: '#ffffff',
  textSecondary: '#888899',
  positive: '#4ade80',
  negative: '#f87171',
  accent: '#00d4ff',
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
};

// Elektron-inspired theme
export const ELEKTRON_THEME: LFOTheme = {
  background: '#000000',
  waveformStroke: '#ff6600',
  waveformFill: '#ff6600',
  phaseIndicator: '#ffffff',
  gridLines: '#333333',
  text: '#ffffff',
  textSecondary: '#888888',
  positive: '#00ff00',
  negative: '#ff0000',
  accent: '#ff6600',
};

// Dimensions
export const DEFAULT_WIDTH = 300;
export const DEFAULT_HEIGHT = 150;
export const PADDING = 8;
