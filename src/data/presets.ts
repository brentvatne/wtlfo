import type { Waveform, TriggerMode, Multiplier } from 'elektron-lfo';
import type { DestinationId } from '@/src/types/destination';

export interface LFOPresetConfig {
  waveform: Waveform;
  speed: number;
  multiplier: Multiplier;
  useFixedBPM: boolean; // true = fixed 120 BPM, false = synced to project BPM
  startPhase: number;
  mode: TriggerMode;
  depth: number;
  fade: number;
}

export interface LFOPreset {
  name: string;
  config: LFOPresetConfig;
  destination?: DestinationId;
  centerValue?: number;
}

export const PRESETS: LFOPreset[] = [
  {
    name: 'Init',
    config: {
      waveform: 'SIN',
      speed: 48,
      multiplier: 2 as Multiplier,
      useFixedBPM: false,
      startPhase: 0,
      mode: 'FRE',
      depth: 47,
      fade: 0,
    },
    destination: 'filter_freq',
    centerValue: 64,
  },
  {
    name: 'Wobble Bass',
    config: {
      waveform: 'SIN',
      speed: 16,
      multiplier: 8 as Multiplier,
      useFixedBPM: false,
      startPhase: 32,
      mode: 'TRG',
      depth: 48,
      fade: 0,
    },
    destination: 'filter_freq',
    centerValue: 80,
  },
  {
    name: 'Ambient Drift',
    config: {
      waveform: 'SIN',
      speed: 1,
      multiplier: 1 as Multiplier,
      useFixedBPM: false,
      startPhase: 0,
      mode: 'FRE',
      depth: 24,
      fade: 0,
    },
    destination: 'pan',
    centerValue: 0,
  },
  {
    name: 'Hi-Hat Humanizer',
    config: {
      waveform: 'RND',
      speed: 32,
      multiplier: 64 as Multiplier,
      useFixedBPM: false,
      startPhase: 0,
      mode: 'FRE',
      depth: 12,
      fade: 0,
    },
    destination: 'volume',
    centerValue: 110,
  },
  {
    name: 'Pumping Sidechain',
    config: {
      waveform: 'EXP',
      speed: 32,
      multiplier: 4 as Multiplier,
      useFixedBPM: false,
      startPhase: 0,
      mode: 'TRG',
      depth: -63,
      fade: 0,
    },
    destination: 'volume',
    centerValue: 100,
  },
  {
    name: 'Fade-In One-Shot',
    config: {
      waveform: 'RMP',
      speed: 8,
      multiplier: 16 as Multiplier,
      useFixedBPM: false,
      startPhase: 0,
      mode: 'ONE',
      depth: 63,
      fade: -32,
    },
    destination: 'filter_freq',
    centerValue: 32,
  },
];

export const BPM = 120;
