import React, { createContext, useState, useCallback, useEffect } from 'react';
import { Storage } from 'expo-sqlite/kv-store';
import type { DestinationId, LFORouting } from '@/src/types/destination';
import { DESTINATIONS, DEFAULT_DESTINATION } from '@/src/data/destinations';

const CENTER_VALUES_KEY = 'centerValues';
const ROUTINGS_KEY = 'routings';

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

// Load initial center values synchronously
function getInitialCenterValues(): Partial<Record<DestinationId, number>> {
  try {
    const saved = Storage.getItemSync(CENTER_VALUES_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

// Load initial routings synchronously
function getInitialRoutings(): LFORouting[] {
  try {
    const saved = Storage.getItemSync(ROUTINGS_KEY);
    return saved ? JSON.parse(saved) : [
      { lfoId: 'lfo1', destinationId: DEFAULT_DESTINATION, amount: 100 }
    ];
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
    setCenterValues(prev => ({ ...prev, [destinationId]: value }));
  }, []);

  const getCenterValue = useCallback((destinationId: DestinationId): number => {
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
