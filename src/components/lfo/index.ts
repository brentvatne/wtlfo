// Main component
export { LFOVisualizer } from './LFOVisualizer';

// Sub-components (for advanced usage)
export { WaveformDisplay } from './WaveformDisplay';
export { PhaseIndicator } from './PhaseIndicator';
export { FadeEnvelope } from './FadeEnvelope';
export { RandomWaveform } from './RandomWaveform';
export { GridLines } from './GridLines';
export { ParameterBadges } from './ParameterBadges';
export { TimingInfo } from './TimingInfo';
export { OutputValueDisplay } from './OutputValueDisplay';
export { VisualizationPlaceholder } from './VisualizationPlaceholder';

// Small inline waveform icon (sparkline-style)
export { WaveformIcon, warmPathCache, WAVEFORM_ICON_SIZES } from './WaveformIcon';
export type { WaveformIconProps } from './WaveformIcon';

// Hooks
export { useWaveformPath, isUnipolar, sampleWaveform } from './hooks/useWaveformPath';
export { useSlowMotionPhase } from './hooks/useSlowMotionPhase';

// Slow motion visualization
export { SlowMotionBadge } from './SlowMotionBadge';

// Play/pause indicator overlay
export { PlayPauseIndicator } from './PlayPauseIndicator';
export { getSlowdownInfo, getSlowdownFactor, DEFAULT_SLOWDOWN_CONFIG } from './utils/getSlowdownInfo';
export type { SlowdownInfo, SlowdownConfig } from './utils/getSlowdownInfo';

// Worklets (for use inside Reanimated worklets)
export {
  sampleWaveformWorklet,
  sampleWaveformWithSlew,
  sampleRandomWithSlew,
  getRandomStepValue,
  isUnipolarWorklet,
} from './worklets';

// Types
export type {
  LFOVisualizerProps,
  LFOTheme,
  WaveformType,
  TriggerMode,
  WaveformDisplayProps,
  PhaseIndicatorProps,
  GridLinesProps,
  ParameterBadgesProps,
  TimingInfoProps,
  OutputValueDisplayProps,
} from './types';

// Constants
export {
  DEFAULT_THEME_DARK,
  DEFAULT_THEME_LIGHT,
  ELEKTRON_THEME,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  PADDING,
} from './constants';
