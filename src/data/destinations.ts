import type { DestinationDefinition, DestinationId, DestinationCategory } from '@/src/types/destination';

export const DESTINATIONS: DestinationDefinition[] = [
  // Filter
  {
    id: 'filter_cutoff',
    name: 'Filter Cutoff',
    displayName: 'CUTOFF',
    min: 0,
    max: 127,
    defaultValue: 64,
    category: 'filter',
    bipolar: false,
  },
  {
    id: 'filter_resonance',
    name: 'Filter Resonance',
    displayName: 'RESO',
    min: 0,
    max: 127,
    defaultValue: 0,
    category: 'filter',
    bipolar: false,
  },
  {
    id: 'filter_env_depth',
    name: 'Filter Env Depth',
    displayName: 'F.ENV',
    min: -64,
    max: 63,
    defaultValue: 0,
    category: 'filter',
    bipolar: true,
  },
  // Amp
  {
    id: 'volume',
    name: 'Volume',
    displayName: 'VOL',
    min: 0,
    max: 127,
    defaultValue: 100,
    category: 'amp',
    bipolar: false,
  },
  {
    id: 'pan',
    name: 'Pan',
    displayName: 'PAN',
    min: -64,
    max: 63,
    defaultValue: 0,
    unit: 'L/R',
    category: 'amp',
    bipolar: true,
  },
  {
    id: 'amp_attack',
    name: 'Amp Attack',
    displayName: 'ATK',
    min: 0,
    max: 127,
    defaultValue: 0,
    category: 'amp',
    bipolar: false,
  },
  {
    id: 'amp_hold',
    name: 'Amp Hold',
    displayName: 'HLD',
    min: 0,
    max: 127,
    defaultValue: 0,
    category: 'amp',
    bipolar: false,
  },
  {
    id: 'amp_decay',
    name: 'Amp Decay',
    displayName: 'DEC',
    min: 0,
    max: 127,
    defaultValue: 64,
    category: 'amp',
    bipolar: false,
  },
  // Pitch
  {
    id: 'pitch',
    name: 'Pitch',
    displayName: 'TUNE',
    min: -24,
    max: 24,
    defaultValue: 0,
    unit: 'st',
    category: 'pitch',
    bipolar: true,
  },
  {
    id: 'pitch_fine',
    name: 'Fine Pitch',
    displayName: 'FINE',
    min: -64,
    max: 63,
    defaultValue: 0,
    unit: 'ct',
    category: 'pitch',
    bipolar: true,
  },
  // Sample
  {
    id: 'sample_start',
    name: 'Sample Start',
    displayName: 'STRT',
    min: 0,
    max: 127,
    defaultValue: 0,
    category: 'sample',
    bipolar: false,
  },
  {
    id: 'sample_length',
    name: 'Sample Length',
    displayName: 'LEN',
    min: 0,
    max: 127,
    defaultValue: 127,
    category: 'sample',
    bipolar: false,
  },
  {
    id: 'sample_loop',
    name: 'Loop Position',
    displayName: 'LOOP',
    min: 0,
    max: 127,
    defaultValue: 0,
    category: 'sample',
    bipolar: false,
  },
  // FX
  {
    id: 'delay_send',
    name: 'Delay Send',
    displayName: 'DLY',
    min: 0,
    max: 127,
    defaultValue: 0,
    category: 'fx',
    bipolar: false,
  },
  {
    id: 'reverb_send',
    name: 'Reverb Send',
    displayName: 'REV',
    min: 0,
    max: 127,
    defaultValue: 0,
    category: 'fx',
    bipolar: false,
  },
  {
    id: 'chorus_send',
    name: 'Chorus Send',
    displayName: 'CHO',
    min: 0,
    max: 127,
    defaultValue: 0,
    category: 'fx',
    bipolar: false,
  },
  {
    id: 'overdrive',
    name: 'Overdrive',
    displayName: 'OVR',
    min: 0,
    max: 127,
    defaultValue: 0,
    category: 'fx',
    bipolar: false,
  },
  {
    id: 'bit_reduction',
    name: 'Bit Reduction',
    displayName: 'BIT',
    min: 0,
    max: 127,
    defaultValue: 0,
    category: 'fx',
    bipolar: false,
  },
];

export function getDestination(id: DestinationId): DestinationDefinition | null {
  if (id === 'none') return null;
  const dest = DESTINATIONS.find(d => d.id === id);
  if (!dest) throw new Error(`Unknown destination: ${id}`);
  return dest;
}

export function getDestinationsByCategory(category: DestinationCategory) {
  return DESTINATIONS.filter(d => d.category === category);
}

export const DEFAULT_DESTINATION: DestinationId = 'none';

export const CATEGORY_ORDER: DestinationCategory[] = ['filter', 'amp', 'pitch', 'sample', 'fx'];

export const CATEGORY_LABELS: Record<DestinationCategory, string> = {
  filter: 'FILTER',
  amp: 'AMP',
  pitch: 'PITCH',
  sample: 'SAMPLE',
  fx: 'FX',
};
