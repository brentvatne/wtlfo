import React, { createContext, useState, useCallback, useEffect, useRef } from 'react';
import * as Settings from '@/src/services/settings';
import type { DestinationId, LFORouting } from '@/src/types/destination';
import { DESTINATIONS, DEFAULT_DESTINATION } from '@/src/data/destinations';

// Check if a stored destination ID is valid. Guards the loaders against
// unknown/corrupt persisted values (e.g. from a corrupted store or a future
// build's IDs) so they fall back to defaults instead of crashing.
function isValidDestinationId(id: string): id is DestinationId {
  if (id === 'none') return true;
  return DESTINATIONS.some(d => d.id === id);
}

// "Hot" values change on every center-value slider drag tick. Consumers of
// this context re-render per tick.
// NOTE: getCenterValue lives here even though it is a callback - its
// useCallback deps include centerValues, so its identity changes per tick.
// Putting it in the stable context would churn its value identity and defeat
// the split.
interface ModulationHotContextValue {
  // Center values remembered per destination (persisted globally)
  centerValues: Partial<Record<DestinationId, number>>;
  /** Read a destination's center value - identity tracks centerValues */
  getCenterValue: (destinationId: DestinationId) => number;
}

// "Stable" values do NOT change during a center-value drag: routings (change
// on routing edits only), the active destination, and identity-stable
// setters. Consumers that only need these avoid per-tick re-renders.
interface ModulationStableContextValue {
  setCenterValue: (destinationId: DestinationId, value: number) => void;

  // Routing: which LFO targets which destination
  routings: LFORouting[];
  setRouting: (lfoId: string, destinationId: DestinationId) => void;
  getRouting: (lfoId: string) => LFORouting | undefined;
  setRoutingAmount: (lfoId: string, amount: number) => void;

  // Convenience for single-LFO mode
  activeDestinationId: DestinationId;
  setActiveDestinationId: (id: DestinationId) => void;
}

type ModulationContextValue = ModulationStableContextValue & ModulationHotContextValue;

const ModulationHotContext = createContext<ModulationHotContextValue | null>(null);
const ModulationStableContext = createContext<ModulationStableContextValue | null>(null);

// Load initial center values synchronously, dropping unknown/corrupt entries
function getInitialCenterValues(): Partial<Record<DestinationId, number>> {
  try {
    const saved = Settings.getString('centerValues');
    if (!saved) return {};
    const parsed = JSON.parse(saved) as Record<string, number>;
    const values: Partial<Record<DestinationId, number>> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isValidDestinationId(key) && key !== 'none' && typeof value === 'number') {
        values[key] = value;
      }
    }
    return values;
  } catch {
    return {};
  }
}

// Load initial routings synchronously, falling back to defaults for
// unknown/corrupt destination IDs
function getInitialRoutings(): LFORouting[] {
  try {
    const saved = Settings.getString('routings');
    if (!saved) {
      return [{ lfoId: 'lfo1', destinationId: DEFAULT_DESTINATION, amount: 100 }];
    }
    const parsed = JSON.parse(saved) as LFORouting[];
    return parsed.map(r => ({
      ...r,
      destinationId: isValidDestinationId(r.destinationId) ? r.destinationId : DEFAULT_DESTINATION,
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

  // Persist center values (deferred to idle by settings service).
  // Skip on first render - state was just loaded from storage.
  const isFirstCenterValuesPersist = useRef(true);
  useEffect(() => {
    if (isFirstCenterValuesPersist.current) {
      isFirstCenterValuesPersist.current = false;
      return;
    }
    Settings.setJSON('centerValues', centerValues);
  }, [centerValues]);

  // Persist routings (deferred to idle by settings service).
  // Skip on first render - state was just loaded from storage.
  const isFirstRoutingsPersist = useRef(true);
  useEffect(() => {
    if (isFirstRoutingsPersist.current) {
      isFirstRoutingsPersist.current = false;
      return;
    }
    Settings.setJSON('routings', routings);
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

  // Plain object literals - the React Compiler memoizes them against their
  // inputs, so each context value only changes identity when a field changes.
  const hotValue: ModulationHotContextValue = {
    centerValues,
    getCenterValue,
  };

  const stableValue: ModulationStableContextValue = {
    setCenterValue,
    routings,
    setRouting,
    getRouting,
    setRoutingAmount,
    activeDestinationId,
    setActiveDestinationId,
  };

  return (
    <ModulationStableContext value={stableValue}>
      <ModulationHotContext value={hotValue}>
        {children}
      </ModulationHotContext>
    </ModulationStableContext>
  );
}

/**
 * Merged view of both contexts - identical surface to the pre-split hook.
 * Re-renders per center-value drag tick (the hot context changes identity
 * per tick). Prefer useModulationStable() when only stable values are needed.
 */
export function useModulation(): ModulationContextValue {
  const stable = React.use(ModulationStableContext);
  const hot = React.use(ModulationHotContext);
  if (!stable || !hot) {
    throw new Error('useModulation must be used within a ModulationProvider');
  }
  return { ...stable, ...hot };
}

/**
 * Stable slice only: routings, activeDestinationId, and identity-stable
 * setters. Does NOT change during center-value slider drags, so consumers
 * avoid per-tick re-renders.
 */
export function useModulationStable(): ModulationStableContextValue {
  const context = React.use(ModulationStableContext);
  if (!context) {
    throw new Error('useModulationStable must be used within a ModulationProvider');
  }
  return context;
}
