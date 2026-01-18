// Main component
export { LFOVisualizer } from './LFOVisualizer';

// Sub-components (for advanced usage)
export { WaveformDisplay } from './WaveformDisplay';
export { PhaseIndicator } from './PhaseIndicator';
export { GridLines } from './GridLines';
export { ParameterBadges } from './ParameterBadges';
export { TimingInfo } from './TimingInfo';
export { OutputValueDisplay } from './OutputValueDisplay';

// Hooks
export { useWaveformPath, isUnipolar, sampleWaveform } from './hooks/useWaveformPath';

// Worklets (for use inside Reanimated worklets)
export { sampleWaveformWorklet, isUnipolarWorklet } from './worklets';

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
