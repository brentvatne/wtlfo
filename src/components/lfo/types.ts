import type { SharedValue } from 'react-native-reanimated';

// Waveform types matching Digitakt II
export type WaveformType = 'TRI' | 'SIN' | 'SQR' | 'SAW' | 'EXP' | 'RMP' | 'RND';

// Trigger modes matching Digitakt II
export type TriggerMode = 'FRE' | 'TRG' | 'HLD' | 'ONE' | 'HLF';

/**
 * Props for driving the visualizer - can come from LFO engine or mock data
 */
export interface LFOVisualizerProps {
  // === REQUIRED: Current LFO State ===

  /** Current phase position (0.0 to 1.0) - can be animated SharedValue or static number */
  phase: number | SharedValue<number>;

  /** Current output value (-1.0 to 1.0 for bipolar, 0.0 to 1.0 for unipolar) */
  output: number | SharedValue<number>;

  // === REQUIRED: LFO Configuration ===

  /** Waveform type to display */
  waveform: WaveformType;

  // === OPTIONAL: Display Parameters ===

  /** Speed value for display (-64 to +63) */
  speed?: number;

  /** Multiplier value for display */
  multiplier?: number | string;

  /** Start phase for display (0-127) */
  startPhase?: number;

  /** Trigger mode for display */
  mode?: TriggerMode;

  /** Depth value for display (-64 to +63) */
  depth?: number;

  /** Fade value for display (-64 to +63) */
  fade?: number;

  // === OPTIONAL: Timing Info ===

  /** BPM for timing calculations display */
  bpm?: number;

  /** Calculated cycle time in milliseconds */
  cycleTimeMs?: number;

  /** Musical note value string (e.g., "1/4", "1 bar", "16 bars") */
  noteValue?: string;

  // === OPTIONAL: Styling ===

  /** Width of the visualizer */
  width?: number;

  /** Height of the visualizer */
  height?: number;

  /** Color theme */
  theme?: 'dark' | 'light' | LFOTheme;

  /** Show parameter badges */
  showParameters?: boolean;

  /** Show timing info */
  showTiming?: boolean;

  /** Show numeric output value */
  showOutput?: boolean;

  /** Waveform line thickness */
  strokeWidth?: number;

  /** Current fade envelope multiplier (0.0 to 1.0) from LFO state */
  fadeMultiplier?: number;

  /** Random sample history for RND waveform visualization */
  randomSamples?: Array<{ phase: number; value: number }>;
}

export interface LFOTheme {
  background: string;
  waveformStroke: string;
  waveformFill?: string;
  phaseIndicator: string;
  gridLines: string;
  text: string;
  textSecondary: string;
  positive: string;
  negative: string;
  accent: string;
  /** Color for the fade envelope curve (current output path) */
  fadeCurve?: string;
}

/**
 * Props for the standalone waveform display
 */
export interface WaveformDisplayProps {
  waveform: WaveformType;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
  /** Number of points to sample for path generation */
  resolution?: number;
  /** Depth value (-64 to +63) to scale/invert the waveform */
  depth?: number;
}

/**
 * Props for the phase indicator overlay
 */
export interface PhaseIndicatorProps {
  phase: number | SharedValue<number>;
  output: SharedValue<number>;
  width: number;
  height: number;
  color: string;
  /** Show the output value at the phase position */
  showDot?: boolean;
  dotRadius?: number;
}

/**
 * Props for grid lines
 */
export interface GridLinesProps {
  width: number;
  height: number;
  color: string;
  /** Number of vertical divisions */
  verticalDivisions?: number;
  /** Number of horizontal divisions */
  horizontalDivisions?: number;
}

/**
 * Props for parameter badges
 */
export interface ParameterBadgesProps {
  waveform: WaveformType;
  speed?: number;
  multiplier?: number | string;
  mode?: TriggerMode;
  depth?: number;
  fade?: number;
  startPhase?: number;
  theme: LFOTheme;
}

/**
 * Props for timing info display
 */
export interface TimingInfoProps {
  bpm?: number;
  cycleTimeMs?: number;
  noteValue?: string;
  theme: LFOTheme;
}

/**
 * Props for output value display
 */
export interface OutputValueDisplayProps {
  output: SharedValue<number>;
  theme: LFOTheme;
}
