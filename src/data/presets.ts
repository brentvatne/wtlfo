import type { Waveform, TriggerMode, Multiplier } from 'elektron-lfo';

export interface LFOPresetConfig {
  waveform: Waveform;
  speed: number;
  multiplier: Multiplier;
  startPhase: number;
  mode: TriggerMode;
  depth: number;
  fade: number;
}

export interface LFOPreset {
  name: string;
  config: LFOPresetConfig;
}

export const PRESETS: LFOPreset[] = [
  {
    name: 'Init',
    config: {
      waveform: 'SIN',
      speed: 16,
      multiplier: 16 as Multiplier,
      startPhase: 0,
      mode: 'FRE',
      depth: 63,
      fade: 0,
    },
  },
  {
    name: 'Wobble Bass',
    config: {
      waveform: 'SIN',
      speed: 16,
      multiplier: 8 as Multiplier,
      startPhase: 32,
      mode: 'TRG',
      depth: 48,
      fade: 0,
    },
  },
  {
    name: 'Ambient Drift',
    config: {
      waveform: 'SIN',
      speed: 1,
      multiplier: 1 as Multiplier,
      startPhase: 0,
      mode: 'FRE',
      depth: 24,
      fade: 0,
    },
  },
  {
    name: 'Hi-Hat Humanizer',
    config: {
      waveform: 'RND',
      speed: 32,
      multiplier: 64 as Multiplier,
      startPhase: 0,
      mode: 'FRE',
      depth: 12,
      fade: 0,
    },
  },
  {
    name: 'Pumping Sidechain',
    config: {
      waveform: 'EXP',
      speed: 32,
      multiplier: 4 as Multiplier,
      startPhase: 0,
      mode: 'TRG',
      depth: -63,
      fade: 0,
    },
  },
  {
    name: 'Fade-In One-Shot',
    config: {
      waveform: 'RMP',
      speed: 8,
      multiplier: 16 as Multiplier,
      startPhase: 0,
      mode: 'ONE',
      depth: 63,
      fade: -32,
    },
  },
];

export const BPM = 120;
