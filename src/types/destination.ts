// Destination types for LFO modulation targets
// Based on Digitakt II manual - Appendix C: LFO Modulation Destinations

export type DestinationId =
  | 'none'
  // SRC page
  | 'sample_slot'
  | 'sample_bank'
  | 'pitch'
  | 'play_mode'
  | 'sample_start'
  | 'sample_length'
  | 'sample_loop'
  | 'sample_level'
  // Filter (Multi-Mode) page
  | 'filter_freq'
  | 'filter_reso'
  | 'filter_type'
  // Filter Envelope page
  | 'filter_env_delay'
  | 'filter_attack'
  | 'filter_decay'
  | 'filter_sustain'
  | 'filter_release'
  | 'filter_env_depth'
  // AMP page
  | 'amp_attack'
  | 'amp_hold'
  | 'amp_decay'
  | 'amp_sustain'
  | 'amp_release'
  | 'pan'
  | 'volume'
  // FX page
  | 'chorus_send'
  | 'delay_send'
  | 'reverb_send'
  | 'bit_reduction'
  | 'srr'
  | 'overdrive';

export type DestinationCategory = 'src' | 'filter' | 'amp' | 'fx';

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
