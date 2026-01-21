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

  /** Number of 1/16 steps in one LFO cycle */
  steps?: number;

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

  /** Show phase indicator (dot and crosshairs) */
  showPhaseIndicator?: boolean;

  /** Waveform line thickness */
  strokeWidth?: number;

  /** When true, shows placeholder values instead of live data (during parameter editing) */
  isEditing?: boolean;

  /** When false, disables hiding values while editing */
  hideValuesWhileEditing?: boolean;

  /** When true, keeps fill areas visible while editing depth (default true) */
  showFillsWhenEditing?: boolean;

  /** Duration in ms for fade-out when editing starts (default 100) */
  editFadeOutDuration?: number;

  /** Duration in ms for fade-in when editing ends (default 350) */
  editFadeInDuration?: number;

  /** Current fade envelope multiplier (0.0 to 1.0) from LFO state */
  fadeMultiplier?: number;

  /** Random sample history for RND waveform visualization */
  randomSamples?: Array<{ phase: number; value: number }>;

  /** Whether to show the fade envelope curves (default true) */
  showFadeEnvelope?: boolean;
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
  /** Start phase offset (0-127) to shift waveform display */
  startPhase?: number;
  /** When true, hides the fill (while actively editing depth) */
  isEditing?: boolean;
  /** Duration in ms for fade-in when editing ends (default 350) */
  editFadeInDuration?: number;
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
  /** Start phase offset (0-127) to shift indicator position */
  startPhase?: number;
  /** Animated opacity value (0-1) */
  opacity?: SharedValue<number>;
  /** Waveform type for calculating position on fade curve */
  waveform?: WaveformType;
  /** Depth value (-64 to +63) */
  depth?: number;
  /** Fade value (-64 to +63) */
  fade?: number;
  /** Trigger mode - fade doesn't apply in FRE mode */
  mode?: TriggerMode;
  /** Current fade envelope multiplier (0.0 to 1.0) from LFO state - when provided, used instead of local calculation */
  fadeMultiplier?: number;
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
  steps?: number;
  theme: LFOTheme;
  /** Current phase for live step display (0.0 to 1.0) */
  phase?: SharedValue<number>;
  /** Start phase offset (0-127) for correct step calculation */
  startPhase?: number;
}

/**
 * Props for output value display
 */
export interface OutputValueDisplayProps {
  output: SharedValue<number>;
  theme: LFOTheme;
  /** When true, shows "-" placeholder instead of actual value */
  isEditing?: boolean;
}
