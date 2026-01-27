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
    // Classic triggered envelope: filter sweeps up then back down on each trigger
    // Use case: Techno stabs, pluck sounds, dramatic synth hits
    // TRI waveform creates bipolar sweep (up → down) over one bar
    name: 'Triggered Sweep',
    config: {
      waveform: 'TRI',
      speed: 16,
      multiplier: 8 as Multiplier,
      useFixedBPM: false,
      startPhase: 0, // Start at bottom of triangle (mid-point of filter)
      mode: 'ONE',
      depth: 63,
      fade: 0, // No fade - waveform shape IS the envelope
    },
    destination: 'filter_freq',
    centerValue: 48, // Mid-low filter, sweeps up to 111 then back to 48
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
    // Wobble that gradually builds intensity after trigger
    // Use case: Bass drops, build-ups - wobble starts subtle, reaches full intensity after ~1 bar
    // Trigger on beat 1, wobble fades in over the phrase
    // fade: -16 = ~2.2 cycles to reach full amplitude
    // At 1/4 note speed (2 cycles/bar), full intensity after ~1 bar
    name: 'Swelling Wobble',
    config: {
      waveform: 'SIN',
      speed: 32,
      multiplier: 4 as Multiplier, // product=128, 1/4 note = 2 cycles per bar
      useFixedBPM: false,
      startPhase: 0,
      mode: 'TRG',
      depth: 48,
      fade: -16, // Fade IN over ~2.2 cycles (~1 bar)
    },
    destination: 'filter_freq',
    centerValue: 72,
  },
  {
    // One-shot S-curve fade in - volume rises from ~0 to full over 1 bar
    // Use case: Pads, ambient sounds, cinematic swells
    // SIN with HLF mode starting at phase 0.75 (-1) runs to phase 0.25 (+1)
    // S-curve: slow start, fast middle, slow finish - sounds more natural than linear
    name: 'Fade In',
    config: {
      waveform: 'SIN',
      speed: 16,
      multiplier: 8 as Multiplier, // 1 bar for half cycle
      useFixedBPM: false,
      startPhase: 96, // Start at bottom of sine wave (-1)
      mode: 'HLF', // Run half cycle: from -1 to +1
      depth: 63, // Full positive depth
      fade: 0,
    },
    destination: 'volume',
    centerValue: 64, // Centered at 64: range is 1 to 127
  },
];

export const BPM = 120;
