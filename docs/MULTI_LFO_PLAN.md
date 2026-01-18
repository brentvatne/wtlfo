# Multi-LFO Implementation Plan

## Overview

This document outlines the implementation plan for supporting multiple LFOs (LFO 1, LFO 2, LFO 3) with dedicated tabs, independent parameters, destinations, and cross-modulation capabilities.

## Current Architecture Summary

The application currently has:
- **Navigation**: Uses `expo-router` with native tabs for bottom navigation (Editor/Settings)
- **State Management**: A `PresetContext` managing a single LFO configuration with persistence
- **LFO Configuration**: Single `LFOPresetConfig` with waveform, speed, multiplier, startPhase, mode, depth, fade
- **UI Components**: `ParameterEditor` for controls, `LFOVisualizer` for display using Skia
- **LFO Engine**: External `elektron-lfo` package handles actual LFO calculations

---

## Part 1: Type Definitions

### New Types (`/src/types/lfo.ts`)

```typescript
import type { Waveform, TriggerMode, Multiplier } from 'elektron-lfo';
import type { DestinationId } from './destination';

// LFO identification
export type LFOId = 'lfo1' | 'lfo2' | 'lfo3';

// Single LFO configuration (extends existing LFOPresetConfig)
export interface LFOConfig {
  waveform: Waveform;
  speed: number;
  multiplier: Multiplier;
  startPhase: number;
  mode: TriggerMode;
  depth: number;
  fade: number;
  destination: DestinationId | null;  // What this LFO modulates
}

// Cross-modulation targets - LFO parameters that can be modulated
export type LFOParameterTarget =
  | 'speed'
  | 'multiplier'
  | 'depth'
  | 'fade'
  | 'startPhase';

// Full multi-LFO preset
export interface MultiLFOPreset {
  name: string;
  version: number;
  lfo1: LFOConfig;
  lfo2: LFOConfig;
  lfo3: LFOConfig;
}

// Modulation routing entry (for matrix view)
export interface ModulationRoute {
  source: LFOId;
  destination: DestinationId;
  depth: number;
}
```

---

## Part 2: Cross-Modulation System

Following the Digitakt II architecture:
- **LFO3** can modulate LFO1 and LFO2
- **LFO2** can modulate LFO1
- **LFO1** cannot modulate other LFOs (bottom of the chain)

### Destination Options by LFO

| Source | Can Target |
|--------|-----------|
| LFO1 | External destinations only (filter, amp, pitch, etc.) |
| LFO2 | LFO1 params (speed, depth, fade, etc.) + External destinations |
| LFO3 | LFO1 params + LFO2 params + External destinations |

### Cross-Modulation Destinations

```typescript
export const LFO_CROSS_MOD_DESTINATIONS: Record<LFOId, DestinationId[]> = {
  lfo1: [], // Cannot modulate other LFOs
  lfo2: [
    { category: 'lfo', target: 'lfo1.speed' },
    { category: 'lfo', target: 'lfo1.depth' },
    { category: 'lfo', target: 'lfo1.fade' },
    { category: 'lfo', target: 'lfo1.multiplier' },
    { category: 'lfo', target: 'lfo1.startPhase' },
  ],
  lfo3: [
    { category: 'lfo', target: 'lfo1.speed' },
    { category: 'lfo', target: 'lfo1.depth' },
    { category: 'lfo', target: 'lfo1.fade' },
    { category: 'lfo', target: 'lfo1.multiplier' },
    { category: 'lfo', target: 'lfo1.startPhase' },
    { category: 'lfo', target: 'lfo2.speed' },
    { category: 'lfo', target: 'lfo2.depth' },
    { category: 'lfo', target: 'lfo2.fade' },
    { category: 'lfo', target: 'lfo2.multiplier' },
    { category: 'lfo', target: 'lfo2.startPhase' },
  ],
};
```

---

## Part 3: Navigation Structure

Uses a **top segmented control** for LFO tabs within the Editor screen (follows Elektron hardware patterns).

### Updated Navigation Hierarchy

```
Root (NativeTabs - bottom)
├── (home) - Editor Tab
│   ├── index.tsx - Main LFO Editor with top LFO selector
│   │   ├── LFO 1 | LFO 2 | LFO 3 (SegmentedControl)
│   │   ├── LFOVisualizer for selected LFO
│   │   ├── ParameterEditor for selected LFO
│   │   └── Destination selector
│   ├── presets.tsx - Preset picker (saves all 3 LFOs together)
│   └── matrix.tsx - Modulation Matrix overview (modal)
├── (destination) - Destination Tab (from destination plan)
└── (settings) - Settings Tab
    └── index.tsx - BPM, MIDI settings
```

---

## Part 4: Context API Redesign

### New Context Structure (`/src/context/multi-lfo-context.tsx`)

```typescript
interface MultiLFOContextValue {
  // Selected LFO for editing
  activeLFO: LFOId;
  setActiveLFO: (id: LFOId) => void;

  // Current configurations
  lfo1Config: LFOConfig;
  lfo2Config: LFOConfig;
  lfo3Config: LFOConfig;

  // Update specific LFO
  updateLFOParameter: <K extends keyof LFOConfig>(
    lfoId: LFOId,
    key: K,
    value: LFOConfig[K]
  ) => void;

  // Preset management
  activePreset: number;
  preset: MultiLFOPreset;
  presets: MultiLFOPreset[];
  setActivePreset: (index: number) => void;
  resetToPreset: () => void;

  // Cross-modulation state (computed)
  getModulatedValue: (lfoId: LFOId, param: LFOParameterTarget) => number;
  modulationRoutes: ModulationRoute[];

  // BPM
  bpm: number;
  setBPM: (bpm: number) => void;
}
```

---

## Part 5: File Structure

### New Files to Create

```
src/
├── types/
│   └── lfo.ts                    # Type definitions for multi-LFO
├── context/
│   └── multi-lfo-context.tsx     # Rewritten from preset-context.tsx
├── components/
│   ├── lfo-tabs/
│   │   ├── LFOTabBar.tsx         # LFO 1 | 2 | 3 tab selector
│   │   └── index.ts
│   ├── destination/
│   │   ├── DestinationPicker.tsx # Destination selection UI
│   │   ├── destinations.ts       # Destination definitions
│   │   └── index.ts
│   └── matrix/
│       ├── ModulationMatrix.tsx  # Overview screen component
│       └── index.ts
├── data/
│   └── presets.ts                # Multi-LFO presets
└── hooks/
    └── useLFOEngine.ts           # Hook managing 3 LFO instances

app/
├── (home)/
│   ├── index.tsx                 # Multi-LFO editor
│   ├── presets.tsx               # Multi-LFO preset picker
│   └── matrix.tsx                # Modulation matrix modal
```

### Files to Modify

```
src/context/preset-context.tsx    → Rename to multi-lfo-context.tsx
src/data/presets.ts               → Add multi-LFO presets, migration
src/components/ParameterEditor.tsx → Accept lfoId prop
app/(home)/index.tsx              → Add LFO tab bar, manage 3 LFOs
app/(home)/_layout.tsx            → Add matrix route
app/_layout.tsx                   → Use new MultiLFOProvider
```

---

## Part 6: LFO Engine Management

### Custom Hook (`/src/hooks/useLFOEngine.ts`)

```typescript
interface LFOEngineState {
  phase: SharedValue<number>;
  output: SharedValue<number>;
  trigger: () => void;
}

interface UseLFOEnginesResult {
  lfo1: LFOEngineState;
  lfo2: LFOEngineState;
  lfo3: LFOEngineState;
  timingInfo: {
    lfo1: { cycleTimeMs: number; noteValue: string };
    lfo2: { cycleTimeMs: number; noteValue: string };
    lfo3: { cycleTimeMs: number; noteValue: string };
  };
}

function useLFOEngines(
  lfo1Config: LFOConfig,
  lfo2Config: LFOConfig,
  lfo3Config: LFOConfig,
  bpm: number
): UseLFOEnginesResult {
  // Create 3 LFO instances
  // Set up animation frames
  // Apply cross-modulation in update loop
  // Return shared values and triggers
}
```

### Cross-Modulation Update Order

1. Update LFO3 first (no dependencies)
2. Apply LFO3's output to LFO2's parameters if targeted
3. Update LFO2
4. Apply LFO3 and LFO2 outputs to LFO1's parameters if targeted
5. Update LFO1
6. Apply all outputs to external destinations

---

## Part 7: UI Components

### LFO Tab Bar

```
┌─────────────────────────────────────────┐
│  [LFO 1•]  │  [LFO 2 ]  │  [LFO 3•]    │
│   active      inactive      has dest    │
└─────────────────────────────────────────┘
```

- Horizontal tab bar at top of editor
- Selected tab highlighted in accent color (#ff6600)
- Indicator dot shows if LFO has active destination

### Destination Picker

```
┌─────────────────────────────────┐
│ Destination                     │
├─────────────────────────────────┤
│ LFO Cross-Modulation            │
│   ○ None                        │
│   ○ LFO1 Speed                  │
│   ○ LFO1 Depth                  │
│   ○ LFO2 Speed  (if LFO3)       │
├─────────────────────────────────┤
│ External                        │
│   ○ Filter Cutoff               │
│   ○ Filter Resonance            │
└─────────────────────────────────┘
```

### Modulation Matrix

```
┌──────────────────────────────────────┐
│ Modulation Matrix           [Close] │
├──────────────────────────────────────┤
│                                      │
│ LFO1 ─► Filter Cutoff    DEP: +48   │
│ LFO2 ─► LFO1.Speed       DEP: -32   │
│ LFO3 ─► LFO2.Depth       DEP: +16   │
│ LFO3 ─► Amp.Pan          DEP: +63   │
│                                      │
└──────────────────────────────────────┘
```

---

## Part 8: Preset Migration

### Migration Strategy

```typescript
const CURRENT_PRESET_VERSION = 2;

function migratePreset(preset: unknown): MultiLFOPreset {
  if (isOldFormat(preset)) {
    return {
      name: preset.name,
      version: CURRENT_PRESET_VERSION,
      lfo1: { ...preset.config, destination: null },
      lfo2: createDefaultLFOConfig(),
      lfo3: createDefaultLFOConfig(),
    };
  }
  return preset as MultiLFOPreset;
}

function createDefaultLFOConfig(): LFOConfig {
  return {
    waveform: 'SIN',
    speed: 16,
    multiplier: 16,
    startPhase: 0,
    mode: 'FRE',
    depth: 63,
    fade: 0,
    destination: null,
  };
}
```

---

## Part 9: Implementation Steps

### Phase 1: Type System and Data Layer (Foundation)
1. Create `/src/types/lfo.ts` with all new type definitions
2. Update `/src/data/presets.ts` with multi-LFO preset structure
3. Add migration logic for old presets
4. Create default multi-LFO presets

### Phase 2: Context Refactor (Core State)
5. Create `/src/context/multi-lfo-context.tsx` with new API
6. Implement storage with updated key structure
7. Add computed modulation routes
8. Update `/app/_layout.tsx` to use new provider

### Phase 3: LFO Engine Hook (Runtime)
9. Create `/src/hooks/useLFOEngine.ts` managing 3 LFO instances
10. Implement cross-modulation update order
11. Test with existing visualizer

### Phase 4: UI Components (Interface)
12. Create `/src/components/lfo-tabs/LFOTabBar.tsx`
13. Create `/src/components/destination/DestinationPicker.tsx`
14. Modify `/src/components/ParameterEditor.tsx` to accept `lfoId` prop

### Phase 5: Screen Updates (Integration)
15. Update `/app/(home)/index.tsx` with LFO tabs and multi-visualizer
16. Update `/app/(home)/presets.tsx` to show all 3 LFOs
17. Update `/app/(home)/_layout.tsx` with matrix route

### Phase 6: Modulation Matrix (Overview)
18. Create `/src/components/matrix/ModulationMatrix.tsx`
19. Create `/app/(home)/matrix.tsx` modal screen
20. Add matrix button to header or screen

### Phase 7: Polish and Testing
21. Add visual indicators for active destinations on LFO tabs
22. Implement destination clear functionality
23. Test preset save/load with all 3 LFOs
24. Test cross-modulation runtime behavior
25. Performance optimization for 3 simultaneous animations

---

## Part 10: Main Editor Screen Layout

```
┌─────────────────────────────────────────┐
│ Reset      Wobble Bass           Load  │  <- Header
├─────────────────────────────────────────┤
│  [ LFO 1• ]  [ LFO 2 ]  [ LFO 3 ]      │  <- LFO Tab Bar
├─────────────────────────────────────────┤
│                                         │
│     ╭──────────────────────────╮       │
│     │   ▲                      │       │  <- LFO Visualizer
│     │  / \      ●              │       │
│     │ /   \    /               │       │
│     │/     \  /                │       │
│     │       \/                 │       │
│     ╰──────────────────────────╯       │
│                                         │
├─────────────────────────────────────────┤
│ Parameters                              │
│ ┌─────────────────────────────────────┐│
│ │ Waveform: TRI SIN SQR SAW EXP RMP  ││
│ │ Mode: FRE TRG HLD ONE HLF          ││
│ │ Speed: ════════●═══════════ +16    ││
│ │ Multiplier: 1 2 4 8 [16] 32 64...  ││
│ │ Depth: ═══════════●════════ +48    ││
│ │ Fade: ═══●═════════════════  -32   ││
│ │ Start Phase: ════●═════════  32    ││
│ └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│ Destination                             │
│ ┌─────────────────────────────────────┐│
│ │ ▼ Filter Cutoff                    ││
│ └─────────────────────────────────────┘│
│                                         │
│              [ Matrix ]                 │
└─────────────────────────────────────────┘
```

---

## Integration with Destination Feature Plan

This plan is designed to complement the LFO Destination Plan:

- **This plan** establishes multi-LFO infrastructure and cross-modulation between LFOs
- **Destination plan** adds external destinations (filter, amp, pitch, etc.)
- The `DestinationId` type supports both LFO cross-mod and external destinations
- Modulation matrix shows all routes including external destinations

The destination picker categories expand over time:

```typescript
// Phase 1: LFO cross-mod only
const DESTINATION_CATEGORIES = ['lfo', 'none'];

// Phase 2: With external destinations
const DESTINATION_CATEGORIES = ['lfo', 'filter', 'amp', 'pitch', 'fx', 'none'];
```

---

## Testing Checklist

- [ ] LFO tab switching works correctly
- [ ] Each LFO maintains independent state
- [ ] Cross-modulation follows correct update order (LFO3 → LFO2 → LFO1)
- [ ] Preset save/load includes all 3 LFOs
- [ ] Old presets migrate correctly
- [ ] Modulation matrix displays all active routes
- [ ] 3 simultaneous animations perform at 60fps
- [ ] Destination picker shows correct options per LFO
- [ ] Visual indicators update when destinations change
