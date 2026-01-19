import React, { createContext, useState, useCallback, useEffect } from 'react';
import { Storage } from 'expo-sqlite/kv-store';
import type { DestinationId, LFORouting } from '@/src/types/destination';
import { DESTINATIONS, DEFAULT_DESTINATION } from '@/src/data/destinations';

const CENTER_VALUES_KEY = 'centerValues';
const ROUTINGS_KEY = 'routings';

// TODO: Remove this migration after ~2 releases (added Jan 2026)
// This handles the transition from old destination IDs to new Digitakt II-correct IDs.
// Old IDs were: filter_cutoff, filter_resonance, pitch_fine, amp_overdrive, filter_drive
// Once users have had time to update, this migration code and the helper functions
// (isValidDestinationId, migrateDestinationId) can be deleted, and getInitialCenterValues/
// getInitialRoutings can return the parsed JSON directly without migration.
const DESTINATION_MIGRATION: Record<string, DestinationId> = {
  'filter_cutoff': 'filter_freq',
  'filter_resonance': 'filter_reso',
  'pitch_fine': 'pitch',
  'amp_overdrive': 'overdrive',
  'filter_drive': 'overdrive',
};

// Check if a destination ID is valid
function isValidDestinationId(id: string): id is DestinationId {
  if (id === 'none') return true;
  return DESTINATIONS.some(d => d.id === id);
}

// Migrate old destination ID to new one
function migrateDestinationId(id: string): DestinationId {
  if (isValidDestinationId(id)) return id;
  if (id in DESTINATION_MIGRATION) return DESTINATION_MIGRATION[id];
  return DEFAULT_DESTINATION;
}

interface ModulationContextValue {
  // Center values remembered per destination (persisted globally)
  centerValues: Partial<Record<DestinationId, number>>;
  setCenterValue: (destinationId: DestinationId, value: number) => void;
  getCenterValue: (destinationId: DestinationId) => number;

  // Routing: which LFO targets which destination
  routings: LFORouting[];
  setRouting: (lfoId: string, destinationId: DestinationId) => void;
  getRouting: (lfoId: string) => LFORouting | undefined;
  setRoutingAmount: (lfoId: string, amount: number) => void;

  // Convenience for single-LFO mode
  activeDestinationId: DestinationId;
  setActiveDestinationId: (id: DestinationId) => void;
}

const ModulationContext = createContext<ModulationContextValue | null>(null);

// Load initial center values synchronously with migration
function getInitialCenterValues(): Partial<Record<DestinationId, number>> {
  try {
    const saved = Storage.getItemSync(CENTER_VALUES_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved) as Record<string, number>;
    // Migrate any old destination ID keys
    const migrated: Partial<Record<DestinationId, number>> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const newKey = migrateDestinationId(key);
      if (newKey !== 'none') {
        migrated[newKey] = value;
      }
    }
    return migrated;
  } catch {
    return {};
  }
}

// Load initial routings synchronously with migration
function getInitialRoutings(): LFORouting[] {
  try {
    const saved = Storage.getItemSync(ROUTINGS_KEY);
    if (!saved) {
      return [{ lfoId: 'lfo1', destinationId: DEFAULT_DESTINATION, amount: 100 }];
    }
    const parsed = JSON.parse(saved) as LFORouting[];
    // Migrate any old destination IDs
    return parsed.map(r => ({
      ...r,
      destinationId: migrateDestinationId(r.destinationId),
    }));
  } catch {
    return [{ lfoId: 'lfo1', destinationId: DEFAULT_DESTINATION, amount: 100 }];
  }
}

export function ModulationProvider({ children }: { children: React.ReactNode }) {
  // Center values per destination - remembered when switching
  const [centerValues, setCenterValues] = useState<Partial<Record<DestinationId, number>>>(getInitialCenterValues);

  // Routings array - supports multiple LFOs
  const [routings, setRoutings] = useState<LFORouting[]>(getInitialRoutings);

  // Persist center values
  useEffect(() => {
    try {
      Storage.setItemSync(CENTER_VALUES_KEY, JSON.stringify(centerValues));
    } catch {
      console.warn('Failed to save center values');
    }
  }, [centerValues]);

  // Persist routings
  useEffect(() => {
    try {
      Storage.setItemSync(ROUTINGS_KEY, JSON.stringify(routings));
    } catch {
      console.warn('Failed to save routings');
    }
  }, [routings]);

  const setCenterValue = useCallback((destinationId: DestinationId, value: number) => {
    if (destinationId === 'none') return; // No-op for 'none'
    setCenterValues(prev => ({ ...prev, [destinationId]: value }));
  }, []);

  const getCenterValue = useCallback((destinationId: DestinationId): number => {
    if (destinationId === 'none') return 0;
    if (centerValues[destinationId] !== undefined) {
      return centerValues[destinationId]!;
    }
    const def = DESTINATIONS.find(d => d.id === destinationId);
    return def?.defaultValue ?? 64;
  }, [centerValues]);

  const setRouting = useCallback((lfoId: string, destinationId: DestinationId) => {
    setRoutings(prev => {
      const existing = prev.findIndex(r => r.lfoId === lfoId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], destinationId };
        return updated;
      }
      return [...prev, { lfoId, destinationId, amount: 100 }];
    });
  }, []);

  const getRouting = useCallback((lfoId: string) => {
    return routings.find(r => r.lfoId === lfoId);
  }, [routings]);

  const setRoutingAmount = useCallback((lfoId: string, amount: number) => {
    setRoutings(prev => prev.map(r =>
      r.lfoId === lfoId ? { ...r, amount } : r
    ));
  }, []);

  // Convenience: active destination for lfo1
  const activeDestinationId = routings.find(r => r.lfoId === 'lfo1')?.destinationId ?? DEFAULT_DESTINATION;
  const setActiveDestinationId = useCallback((id: DestinationId) => {
    setRouting('lfo1', id);
  }, [setRouting]);

  const value: ModulationContextValue = {
    centerValues,
    setCenterValue,
    getCenterValue,
    routings,
    setRouting,
    getRouting,
    setRoutingAmount,
    activeDestinationId,
    setActiveDestinationId,
  };

  return (
    <ModulationContext value={value}>
      {children}
    </ModulationContext>
  );
}

export function useModulation() {
  const context = React.use(ModulationContext);
  if (!context) {
    throw new Error('useModulation must be used within a ModulationProvider');
  }
  return context;
}
