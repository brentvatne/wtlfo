// Destination types for LFO modulation targets

export type DestinationId =
  | 'none'
  | 'filter_cutoff'
  | 'filter_resonance'
  | 'filter_env_depth'
  | 'volume'
  | 'pan'
  | 'pitch'
  | 'pitch_fine'
  | 'sample_start'
  | 'sample_length'
  | 'sample_loop'
  | 'delay_send'
  | 'reverb_send'
  | 'chorus_send'
  | 'amp_attack'
  | 'amp_hold'
  | 'amp_decay'
  | 'overdrive'
  | 'bit_reduction';

export type DestinationCategory = 'filter' | 'amp' | 'sample' | 'fx' | 'pitch';

export interface DestinationDefinition {
  id: DestinationId;
  name: string;
  displayName: string;
  min: number;
  max: number;
  defaultValue: number;
  unit?: string;
  category: DestinationCategory;
  bipolar: boolean; // true for parameters that center at 0
}

// Modulation routing - designed for multi-LFO support
export interface LFORouting {
  lfoId: string;              // 'lfo1' for now, supports 'lfo2', etc. later
  destinationId: DestinationId;
  amount: number;             // 0-100% of LFO depth applied to this routing
}
