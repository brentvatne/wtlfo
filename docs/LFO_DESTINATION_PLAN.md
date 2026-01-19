# LFO Destination Selection and Visualization - Implementation Plan

## Overview

This document outlines the implementation plan for adding LFO destination selection and visualization to the wtlfo app. This feature allows users to select which parameter the LFO modulates, set a center value for that parameter, and visualize how the modulated value changes over time.

**Key Design Decisions:**
- Destination picker lives on the **Editor screen** for quick access
- Visualization and center value control live on the **Destination tab**
- Architecture supports **future multi-LFO expansion** without breaking changes
- LFO animation state is **lifted to context** for cross-tab sharing

---

## Feature Requirements

1. **Destination Selection** - Quick picker on Editor screen to choose modulation target
2. **Destination Tab** - Dedicated visualization showing modulated value over time
3. **Center Value Control** - Set the unmodulated value (value when LFO output = 0)
4. **Modulation Visualization** - Dual-trace view showing LFO waveform and destination value
5. **Learn Section Updates** - Educational content about destinations and modulation

---

## Part 1: Available Destinations

Based on the Digitakt II specification and expert feedback:

### Core Destination Parameters

| ID | Name | Display Name | Min | Max | Unit | Category | Description |
|----|------|--------------|-----|-----|------|----------|-------------|
| `filter_cutoff` | Filter Cutoff | CUTOFF | 0 | 127 | - | filter | Filter frequency |
| `filter_resonance` | Filter Resonance | RESO | 0 | 127 | - | filter | Filter resonance amount |
| `filter_drive` | Filter Drive | DRIVE | 0 | 127 | - | filter | Filter overdrive/saturation |
| `filter_env_depth` | Filter Env Depth | F.ENV | -64 | +63 | - | filter | Filter envelope modulation amount |
| `volume` | Volume | VOL | 0 | 127 | - | amp | Track volume level |
| `pan` | Pan | PAN | -64 | +63 | L/R | amp | Stereo position |
| `pitch` | Pitch | TUNE | -24 | +24 | st | pitch | Semitone offset |
| `pitch_fine` | Fine Pitch | FINE | -64 | +63 | ct | pitch | Cents offset (Elektron-style range) |
| `sample_start` | Sample Start | STRT | 0 | 127 | - | sample | Sample start position |
| `sample_length` | Sample Length | LEN | 0 | 127 | - | sample | Sample play length |
| `delay_send` | Delay Send | DLY | 0 | 127 | - | fx | Delay effect send |
| `reverb_send` | Reverb Send | REV | 0 | 127 | - | fx | Reverb effect send |
| `amp_attack` | Amp Attack | ATK | 0 | 127 | - | amp | Amplitude envelope attack |
| `amp_decay` | Amp Decay | DEC | 0 | 127 | - | amp | Amplitude envelope decay |
| `amp_sustain` | Amp Sustain | SUS | 0 | 127 | - | amp | Amplitude envelope sustain |
| `amp_release` | Amp Release | REL | 0 | 127 | - | amp | Amplitude envelope release |
| `overdrive` | Overdrive | OVR | 0 | 127 | - | fx | Overdrive/distortion amount |
| `bit_reduction` | Bit Reduction | BIT | 0 | 127 | - | fx | Bit crusher depth |

### Type Definitions

```typescript
// /src/types/destination.ts

// Derive DestinationId from const data for type safety
export type DestinationId =
  | 'filter_cutoff'
  | 'filter_resonance'
  | 'filter_drive'
  | 'filter_env_depth'
  | 'volume'
  | 'pan'
  | 'pitch'
  | 'pitch_fine'
  | 'sample_start'
  | 'sample_length'
  | 'delay_send'
  | 'reverb_send'
  | 'amp_attack'
  | 'amp_decay'
  | 'amp_sustain'
  | 'amp_release'
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
```

---

## Part 2: State Management

### Create Separate ModulationContext (Recommended)

Create a new context for modulation routing, separate from PresetContext:

```typescript
// /src/context/modulation-context.tsx

import React, { createContext, useState, useCallback, useEffect, useRef } from 'react';
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

export function ModulationProvider({ children }: { children: React.ReactNode }) {
  // Center values per destination - remembered when switching
  const [centerValues, setCenterValues] = useState<Partial<Record<DestinationId, number>>>(() => {
    try {
      const saved = Storage.getItemSync(CENTER_VALUES_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Routings array - supports multiple LFOs
  const [routings, setRoutings] = useState<LFORouting[]>(() => {
    try {
      const saved = Storage.getItemSync(ROUTINGS_KEY);
      return saved ? JSON.parse(saved) : [
        { lfoId: 'lfo1', destinationId: DEFAULT_DESTINATION, amount: 100 }
      ];
    } catch {
      return [{ lfoId: 'lfo1', destinationId: DEFAULT_DESTINATION, amount: 100 }];
    }
  });

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
```

### Why Separate Context?

1. **Separation of Concerns**: LFO config (waveform, speed) vs routing (where it goes)
2. **Different Persistence Needs**: Center values are global, presets are selectable
3. **Multi-LFO Ready**: Adding LFO2 is just adding another routing entry
4. **Cleaner Lifecycle**: Routing doesn't reset when changing presets

---

## Part 3: Lift LFO Animation to PresetContext

The LFO animation state must be accessible from both Editor and Destination tabs.

### Update PresetContext

```typescript
// /src/context/preset-context.tsx - Add these to existing context

import { useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { LFO } from 'elektron-lfo';

interface PresetContextValue {
  // ... existing fields ...

  // LFO animation state - shared across tabs
  lfoPhase: SharedValue<number>;
  lfoOutput: SharedValue<number>;
  lfoRef: React.MutableRefObject<LFO | null>;

  // Control methods
  triggerLFO: () => void;
  startLFO: () => void;
  stopLFO: () => void;
  isLFORunning: () => boolean;
}

export function PresetProvider({ children }: { children: React.ReactNode }) {
  // ... existing state ...

  // LFO animation state - persists across tab switches
  const lfoPhase = useSharedValue(0);
  const lfoOutput = useSharedValue(0);
  const lfoRef = useRef<LFO | null>(null);
  const animationRef = useRef<number>(0);

  // Create/recreate LFO when debounced config changes
  useEffect(() => {
    lfoRef.current = new LFO(debouncedConfig, bpm);

    // Auto-trigger for modes that need it
    if (debouncedConfig.mode === 'TRG' || debouncedConfig.mode === 'ONE' || debouncedConfig.mode === 'HLF') {
      lfoRef.current.trigger();
    }

    // Get timing info if needed
    // const info = lfoRef.current.getTimingInfo();
  }, [debouncedConfig, bpm]);

  // Animation loop - runs at provider level, independent of tabs
  useEffect(() => {
    const animate = (timestamp: number) => {
      if (lfoRef.current) {
        const state = lfoRef.current.update(timestamp);
        lfoPhase.value = state.phase;
        lfoOutput.value = state.output;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [lfoPhase, lfoOutput]);

  // Control methods
  const triggerLFO = useCallback(() => lfoRef.current?.trigger(), []);
  const startLFO = useCallback(() => lfoRef.current?.start(), []);
  const stopLFO = useCallback(() => lfoRef.current?.stop(), []);
  const isLFORunning = useCallback(() => lfoRef.current?.isRunning() ?? false, []);

  // ... rest of context
}
```

### Update Editor Screen

The Editor screen no longer manages LFO animation - it uses context:

```typescript
// /app/(home)/index.tsx

export default function HomeScreen() {
  const {
    currentConfig,
    debouncedConfig,
    bpm,
    isEditing,
    lfoPhase,
    lfoOutput,
    lfoRef,
    triggerLFO,
    startLFO,
    stopLFO,
    isLFORunning,
  } = usePreset();

  // ... rest of component uses lfoPhase, lfoOutput from context
}
```

---

## Part 4: Architecture Overview

### File Structure

```
/Users/brent/wtlfo/
├── app/
│   ├── _layout.tsx                    # MODIFY: Add Destination tab, wrap with ModulationProvider
│   ├── (home)/
│   │   ├── index.tsx                  # MODIFY: Add destination picker, use context LFO state
│   │   └── ...existing files...
│   ├── (destination)/                 # NEW: Destination route group
│   │   ├── _layout.tsx                # NEW: Stack layout for destination
│   │   └── index.tsx                  # NEW: Visualization + center value screen
│   ├── (learn)/
│   │   ├── destinations.tsx           # MODIFY: Expand with interactive examples
│   │   └── ...existing files...
│   └── (settings)/
│       └── ...existing files...
├── src/
│   ├── components/
│   │   ├── destination/               # NEW: Destination components
│   │   │   ├── index.ts               # Exports
│   │   │   ├── DestinationPicker.tsx  # Compact picker for Editor screen
│   │   │   ├── DestinationVisualizer.tsx  # Main dual-trace visualization
│   │   │   ├── CenterValueSlider.tsx  # Center value control
│   │   │   ├── ModulatedValueDisplay.tsx  # Current value readout
│   │   │   └── DestinationMeter.tsx   # Vertical meter component
│   │   └── ...existing...
│   ├── context/
│   │   ├── preset-context.tsx         # MODIFY: Add LFO SharedValues + animation loop
│   │   └── modulation-context.tsx     # NEW: Modulation routing context
│   ├── data/
│   │   └── destinations.ts            # NEW: Destination definitions
│   ├── types/
│   │   └── destination.ts             # NEW: Type definitions
│   └── hooks/
│       └── useModulatedValue.ts       # NEW: Calculate modulated output
```

---

## Part 5: UI Design

### 5.1 Editor Screen - Destination Picker

Add a compact destination picker below the parameter grid:

```
┌─────────────────────────────────────┐
│  [Parameter Grid - existing]        │
├─────────────────────────────────────┤
│  DEST ─────────────────── CUTOFF ▼  │  ← Tappable row, opens picker modal
├─────────────────────────────────────┤
│  [LFO Visualizer - existing]        │
└─────────────────────────────────────┘
```

The picker row shows current destination, tapping opens a modal/sheet with all options.

### 5.2 Destination Tab Layout

```
┌─────────────────────────────────────┐
│            FILTER CUTOFF            │  ← Full destination name
│               CUTOFF                │  ← Display name
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐  │
│  │   [Dual-Trace Visualization]  │  │
│  │                               │  │
│  │   Top: LFO waveform over time │  │  ← Horizontal, shows LFO shape
│  │   ───────────────────────────│  │
│  │   Bot: Destination value      │  │  ← Shows how value moves
│  │                               │  │
│  │   CENTER: 64    FINAL: 87     │  │  ← Current values overlay
│  └───────────────────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│  CENTER VALUE                  64   │  ← Slider for center value
│  ═══════════════●═══════════════    │     (value when LFO output = 0)
├─────────────────────────────────────┤
│  MOD RANGE: 0 ──────────── 127      │  ← Shows min/max the value will hit
└─────────────────────────────────────┘
```

### 5.3 Dual-Trace Visualization

The visualization shows time on X-axis (left = past, right = future):

```
LFO Output:     ╱╲    ╱╲    ╱╲
               ╱  ╲  ╱  ╲  ╱  ╲
              ╱    ╲╱    ╲╱    ╲

Dest Value:   ┌──┐  ┌──┐  ┌──┐
             ─┘  └──┘  └──┘  └──  (when center=64, depth=63)
              64      127    0
```

This shows the correlation between LFO phase and destination value.

---

## Part 6: Modulation Calculation

### Optimized Hook (No Object Allocation)

```typescript
// /src/hooks/useModulatedValue.ts

import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { getDestination } from '@/src/data/destinations';
import type { DestinationId } from '@/src/types/destination';

interface UseModulatedValueProps {
  lfoOutput: SharedValue<number>;  // -1 to +1
  lfoDepth: number;                // -64 to +63
  destinationId: DestinationId;
  centerValue: number;
}

/**
 * Returns a SharedValue<number> with the final modulated destination value.
 * All calculations happen on UI thread in worklet.
 * Returns a single number (not an object) to avoid GC pressure.
 */
export function useModulatedValue({
  lfoOutput,
  lfoDepth,
  destinationId,
  centerValue,
}: UseModulatedValueProps): SharedValue<number> {
  // Extract primitives OUTSIDE the worklet to avoid object access in worklet
  const destination = getDestination(destinationId);
  const { min, max } = destination;
  const range = max - min;
  const maxModulation = range / 2;
  const depthScale = lfoDepth / 63; // -1 to +1

  // Return a single number, NOT an object
  return useDerivedValue(() => {
    'worklet';
    const modulationAmount = lfoOutput.value * depthScale * maxModulation;
    const raw = centerValue + modulationAmount;
    return Math.max(min, Math.min(max, raw));
  }, [lfoOutput]);
}

/**
 * Hook that returns modulation metadata (for display purposes).
 * Call this separately from the animation loop.
 */
export function useModulationInfo(
  destinationId: DestinationId,
  centerValue: number,
  lfoDepth: number
) {
  const destination = getDestination(destinationId);
  const range = destination.max - destination.min;
  const maxModulation = range / 2;
  const depthScale = Math.abs(lfoDepth / 63);
  const swing = maxModulation * depthScale;

  return {
    minValue: Math.max(destination.min, centerValue - swing),
    maxValue: Math.min(destination.max, centerValue + swing),
    destination,
  };
}
```

### Modulation Behavior

**Center Value** = the value when LFO output is 0
**Depth** = how far the LFO can push the value (positive or negative)

For **Filter Cutoff** (0-127) with center=64, depth=+63:
- LFO output=+1.0: final = 64 + (1.0 × 1.0 × 63.5) = 127
- LFO output=0.0: final = 64 (at center)
- LFO output=-1.0: final = 64 - 63.5 = 0

For **Pan** (-64 to +63) with center=0, depth=+63:
- LFO output=+1.0: final = 0 + 63.5 = 63 (hard right)
- LFO output=-1.0: final = 0 - 63.5 = -64 (hard left)

---

## Part 7: Implementation Steps

### Phase 1: Foundation (Types & Data)
1. Create `/src/types/destination.ts` with type definitions
2. Create `/src/data/destinations.ts` with all destination definitions
3. Create `/src/context/modulation-context.tsx` with routing state
4. Update `/app/_layout.tsx` to wrap with `ModulationProvider`

### Phase 2: Lift LFO Animation
5. Update `/src/context/preset-context.tsx` to add SharedValues + animation loop
6. Update `/app/(home)/index.tsx` to use context LFO state (remove local state)
7. Verify LFO animation still works on Editor screen

### Phase 3: Navigation & Tabs
8. Create `/app/(destination)/_layout.tsx` with Stack navigator
9. Create `/app/(destination)/index.tsx` as placeholder screen
10. Update `/app/_layout.tsx` to add Destination tab trigger

### Phase 4: Editor Screen Destination Picker
11. Create `/src/components/destination/DestinationPicker.tsx` (compact row + modal)
12. Integrate picker into `/app/(home)/index.tsx` below ParamGrid
13. Connect to `useModulation()` context

### Phase 5: Core Hook
14. Create `/src/hooks/useModulatedValue.ts` for modulation calculation
15. Test hook with mock data to verify formula

### Phase 6: Destination Tab UI
16. Create `/src/components/destination/CenterValueSlider.tsx`
17. Create `/src/components/destination/ModulatedValueDisplay.tsx`
18. Create `/src/components/destination/DestinationMeter.tsx` (Skia)
19. Create `/src/components/destination/DestinationVisualizer.tsx` (dual-trace)
20. Build out `/app/(destination)/index.tsx` with full UI
21. Connect to LFO output SharedValue from PresetContext

### Phase 7: Learn Section Updates
22. Update `/app/(learn)/destinations.tsx` with expanded content:
    - What is a destination?
    - How center value affects modulation
    - Interactive examples with different destinations
    - Visual comparison of modulating filter vs pan vs pitch
23. Add destination-related content to other Learn sections as appropriate

### Phase 8: Polish
24. Add haptic feedback on destination selection
25. Visual refinements and animation tuning
26. Test all destinations with various LFO configurations
27. Verify persistence works correctly

---

## Part 8: Learn Section Updates

### Destinations Page Expansion

The existing `/app/(learn)/destinations.tsx` should be expanded:

```typescript
// Content sections to add:

const DESTINATION_LEARN_CONTENT = [
  {
    title: 'What is a Destination?',
    content: 'The destination is the parameter that your LFO modulates...',
  },
  {
    title: 'Center Value',
    content: 'The center value is what the parameter equals when the LFO output is zero. The LFO moves the value above and below this center point.',
  },
  {
    title: 'Common Destinations',
    subsections: [
      {
        name: 'Filter Cutoff',
        description: 'Creates wah-wah, sweeping, and breathing effects',
        example: 'TRI wave + slow speed = classic filter sweep',
      },
      {
        name: 'Pan',
        description: 'Moves sound left and right in stereo field',
        example: 'SIN wave = smooth auto-pan effect',
      },
      {
        name: 'Pitch',
        description: 'Creates vibrato, pitch wobbles, and siren effects',
        example: 'SIN wave + fast speed + small depth = vibrato',
      },
      {
        name: 'Volume',
        description: 'Creates tremolo and rhythmic gating',
        example: 'SQR wave = rhythmic on/off gating',
      },
    ],
  },
  {
    title: 'Depth and Range',
    content: 'The LFO depth controls how far from the center value the modulation can go. At depth 63, the LFO can swing the full parameter range.',
  },
];
```

### Interactive Examples

Add interactive mini-visualizations showing:
1. Filter cutoff modulation with different waveforms
2. Pan modulation showing stereo field movement
3. Pitch modulation showing note wobble
4. Comparison: same LFO settings, different destinations

---

## Part 9: Destination Definitions Data

```typescript
// /src/data/destinations.ts

import type { DestinationDefinition, DestinationId } from '@/src/types/destination';

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
    id: 'filter_drive',
    name: 'Filter Drive',
    displayName: 'DRIVE',
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
    id: 'amp_decay',
    name: 'Amp Decay',
    displayName: 'DEC',
    min: 0,
    max: 127,
    defaultValue: 64,
    category: 'amp',
    bipolar: false,
  },
  {
    id: 'amp_sustain',
    name: 'Amp Sustain',
    displayName: 'SUS',
    min: 0,
    max: 127,
    defaultValue: 127,
    category: 'amp',
    bipolar: false,
  },
  {
    id: 'amp_release',
    name: 'Amp Release',
    displayName: 'REL',
    min: 0,
    max: 127,
    defaultValue: 32,
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

export function getDestination(id: DestinationId): DestinationDefinition {
  const dest = DESTINATIONS.find(d => d.id === id);
  if (!dest) throw new Error(`Unknown destination: ${id}`);
  return dest;
}

export function getDestinationsByCategory(category: DestinationDefinition['category']) {
  return DESTINATIONS.filter(d => d.category === category);
}

export const DEFAULT_DESTINATION: DestinationId = 'filter_cutoff';
```

---

## Part 10: Styling Guidelines

Follow existing app styling patterns:

- **Background**: `#0a0a0a` (near black)
- **Card Background**: `#1a1a1a`
- **Accent Color**: `#ff6600` (Elektron orange)
- **Text Primary**: `#ffffff`
- **Text Secondary**: `#888899`
- **Border/Divider**: `#3a3a3a`
- **Positive Values**: `#4ade80` (green)
- **Negative Values**: `#f87171` (red)
- **Border Radius**: 12px for cards, 6px for buttons

---

## Part 11: Testing Checklist

### Functionality
- [ ] Destination picker on Editor screen works
- [ ] Destination selection persists across app restarts
- [ ] Center value persists per destination (switching back remembers value)
- [ ] Modulation calculation matches expected formula
- [ ] Visualization animates smoothly at 60fps
- [ ] LFO animation continues when switching between tabs

### Edge Cases
- [ ] Bipolar destinations (pan, pitch, filter env) handle negative values correctly
- [ ] Values clamp correctly at min/max boundaries
- [ ] LFO depth inversion works (negative depth)
- [ ] All waveforms work correctly with destination modulation
- [ ] Center value at extremes (min/max) works correctly

### Multi-LFO Preparation
- [ ] Routing array structure is correct
- [ ] Adding a second routing doesn't break existing functionality
- [ ] State shape supports future expansion

### Learn Section
- [ ] Destinations page loads correctly
- [ ] Interactive examples work
- [ ] Content is accurate and educational

### Platform
- [ ] Tab navigation works correctly between all tabs
- [ ] Haptic feedback works correctly on iOS
