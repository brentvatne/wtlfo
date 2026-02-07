export type ParamKey = 'waveform' | 'speed' | 'multiplier' | 'mode' | 'depth' | 'fade' | 'startPhase' | 'destination';

// Parameter order matching the grid layout (row 1 then row 2)
export const PARAM_ORDER: ParamKey[] = ['speed', 'multiplier', 'fade', 'destination', 'waveform', 'startPhase', 'mode', 'depth'];

// Short labels for navigation buttons (startPhase is dynamic based on waveform)
export const PARAM_LABELS: Record<ParamKey, string> = {
  speed: 'SPD',
  multiplier: 'MULT',
  fade: 'FADE',
  destination: 'DEST',
  waveform: 'WAVE',
  startPhase: 'SPH', // Dynamically changed to 'SLEW' for RND
  mode: 'MODE',
  depth: 'DEP',
};

// Get dynamic label for startPhase based on waveform
export function getStartPhaseLabel(waveform: string): string {
  return waveform === 'RND' ? 'SLEW' : 'SPH';
}
