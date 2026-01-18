# LFO Destination Selection and Visualization - Implementation Plan

## Overview

This document outlines the implementation plan for adding LFO destination selection and visualization to the wtlfo app. This feature allows users to select which parameter the LFO modulates, set a base value for that parameter, and visualize how the modulated value changes over time.

## Feature Requirements

1. **Destination Selection** - User can choose what parameter the LFO modulates
2. **Destination Tab** - A new tab/screen that shows visualization for the selected destination
3. **Initial Value Control** - User can set the unmodulated base value for the destination parameter
4. **Modulation Visualization** - Shows how the destination value changes over time as the LFO modulates it

---

## Part 1: Available Destinations

Based on the Digitakt II specification and common synthesizer parameters:

### Core Destination Parameters

| ID | Name | Display Name | Min | Max | Unit | Description |
|----|------|--------------|-----|-----|------|-------------|
| `filter_cutoff` | Filter Cutoff | CUTOFF | 0 | 127 | - | Filter frequency |
| `filter_resonance` | Filter Resonance | RESO | 0 | 127 | - | Filter resonance amount |
| `volume` | Volume | VOL | 0 | 127 | - | Track volume level |
| `pan` | Pan | PAN | -64 | +63 | L/R | Stereo position |
| `pitch` | Pitch | TUNE | -24 | +24 | st | Semitone offset |
| `pitch_fine` | Fine Pitch | FINE | -50 | +50 | ct | Cents offset |
| `sample_start` | Sample Start | STRT | 0 | 127 | - | Sample start position |
| `sample_length` | Sample Length | LEN | 0 | 127 | - | Sample play length |
| `delay_send` | Delay Send | DLY | 0 | 127 | - | Delay effect send |
| `reverb_send` | Reverb Send | REV | 0 | 127 | - | Reverb effect send |
| `amp_attack` | Amp Attack | ATK | 0 | 127 | - | Amplitude envelope attack |
| `amp_decay` | Amp Decay | DEC | 0 | 127 | - | Amplitude envelope decay |
| `amp_sustain` | Amp Sustain | SUS | 0 | 127 | - | Amplitude envelope sustain |
| `amp_release` | Amp Release | REL | 0 | 127 | - | Amplitude envelope release |
| `overdrive` | Overdrive | OVR | 0 | 127 | - | Overdrive/distortion amount |
| `bit_reduction` | Bit Reduction | BIT | 0 | 127 | - | Bit crusher depth |

### Destination Type Definition

```typescript
// /src/types/destination.ts

export type DestinationId =
  | 'filter_cutoff'
  | 'filter_resonance'
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

export interface DestinationDefinition {
  id: DestinationId;
  name: string;
  displayName: string;
  min: number;
  max: number;
  defaultValue: number;
  unit?: string;
  category: 'filter' | 'amp' | 'sample' | 'fx' | 'pitch';
  bipolar: boolean; // true for parameters like pan that center at 0
}

export interface DestinationConfig {
  destinationId: DestinationId;
  baseValue: number; // Initial/unmodulated value (in parameter range)
}

export interface ModulatedOutput {
  baseValue: number;      // The user-set base value
  modulationAmount: number; // LFO contribution (scaled to parameter range)
  finalValue: number;     // Clamped result within parameter range
  normalizedLfo: number;  // Raw LFO output (-1 to +1)
}
```

---

## Part 2: State Management

### Extend PresetContext (Recommended)

Extend the existing `PresetContext` to include destination configuration:

```typescript
// Updated /src/context/preset-context.tsx

interface DestinationState {
  destinationId: DestinationId;
  baseValue: number;
}

interface PresetContextValue {
  // Existing...
  activePreset: number;
  preset: LFOPreset;
  setActivePreset: (index: number) => void;
  presets: LFOPreset[];
  currentConfig: LFOPresetConfig;
  updateParameter: <K extends keyof LFOPresetConfig>(key: K, value: LFOPresetConfig[K]) => void;
  resetToPreset: () => void;

  // New destination state...
  destinationId: DestinationId;
  baseValue: number;
  setDestinationId: (id: DestinationId) => void;
  setBaseValue: (value: number) => void;
}
```

### Why Extend vs New Context?

- **Cohesion**: Destination is directly tied to LFO behavior
- **Simpler state sync**: No need to coordinate between multiple contexts
- **Presets**: Could later include destination in preset definitions
- **Single provider**: Cleaner component tree

---

## Part 3: Architecture Overview

### New File Structure

```
/Users/brent/wtlfo/
├── app/
│   ├── _layout.tsx                    # MODIFY: Add Destination tab
│   ├── (home)/
│   │   └── ...existing files...
│   ├── (destination)/                 # NEW: Destination route group
│   │   ├── _layout.tsx                # NEW: Stack layout for destination
│   │   └── index.tsx                  # NEW: Main destination screen
│   └── (settings)/
│       └── ...existing files...
├── src/
│   ├── components/
│   │   ├── destination/               # NEW: Destination components
│   │   │   ├── index.ts               # Exports
│   │   │   ├── DestinationPicker.tsx  # Destination selector UI
│   │   │   ├── DestinationVisualizer.tsx  # Main visualization
│   │   │   ├── BaseValueSlider.tsx    # Base value control
│   │   │   ├── ModulatedValueDisplay.tsx  # Current value display
│   │   │   └── DestinationMeter.tsx   # Vertical meter visualization
│   │   └── ...existing...
│   ├── context/
│   │   └── preset-context.tsx         # MODIFY: Add destination state
│   ├── data/
│   │   └── destinations.ts            # NEW: Destination definitions
│   ├── types/
│   │   └── destination.ts             # NEW: Type definitions
│   └── hooks/
│       └── useModulatedValue.ts       # NEW: Calculate modulated output
```

---

## Part 4: UI Design

### 4.1 Destination Tab

Add a new bottom tab for the Destination screen:

```tsx
// Updated /app/_layout.tsx
<NativeTabs tintColor="#ff6600" {...legacyIOSProps}>
  <NativeTabs.Trigger name="(home)">
    <Icon sf={{ default: 'waveform', selected: 'waveform' }} />
    <Label>Editor</Label>
  </NativeTabs.Trigger>
  <NativeTabs.Trigger name="(destination)">
    <Icon sf={{ default: 'dial.medium', selected: 'dial.medium.fill' }} />
    <Label>Destination</Label>
  </NativeTabs.Trigger>
  <NativeTabs.Trigger name="(settings)">
    <Icon sf={{ default: 'gear', selected: 'gear' }} />
    <Label>Settings</Label>
  </NativeTabs.Trigger>
</NativeTabs>
```

### 4.2 Destination Screen Layout

```
┌─────────────────────────────────────┐
│          DESTINATION: CUTOFF        │  ← Header with destination name
├─────────────────────────────────────┤
│                                     │
│    ┌─────────────────────────┐      │
│    │                         │      │
│    │   [Vertical Meter]      │      │  ← Main visualization area
│    │   showing modulated     │      │     Shows base value, modulation
│    │   value movement        │      │     range, and current value
│    │                         │      │
│    │   BASE: 64              │      │
│    │   FINAL: 87             │      │
│    │                         │      │
│    └─────────────────────────┘      │
│                                     │
├─────────────────────────────────────┤
│  BASE VALUE                    64   │  ← Slider for base value
│  ═══════════════●═══════════════    │
├─────────────────────────────────────┤
│  DESTINATION                        │  ← Destination picker
│  ┌─────┬─────┬─────┬─────┬─────┐   │
│  │CUTOF│RESO │ VOL │ PAN │TUNE │   │
│  └─────┴─────┴─────┴─────┴─────┘   │
│  ┌─────┬─────┬─────┬─────┬─────┐   │
│  │ DLY │ REV │ ATK │ DEC │ ... │   │
│  └─────┴─────┴─────┴─────┴─────┘   │
└─────────────────────────────────────┘
```

---

## Part 5: Modulation Calculation

### Core Formula

```typescript
// /src/hooks/useModulatedValue.ts

import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { DESTINATIONS } from '@/src/data/destinations';
import type { DestinationId } from '@/src/types/destination';

interface UseModulatedValueProps {
  lfoOutput: SharedValue<number>;  // -1 to +1
  lfoDepth: number;                // -64 to +63
  destinationId: DestinationId;
  baseValue: number;
}

export function useModulatedValue({
  lfoOutput,
  lfoDepth,
  destinationId,
  baseValue,
}: UseModulatedValueProps) {
  const destination = DESTINATIONS.find(d => d.id === destinationId)!;
  const range = destination.max - destination.min;

  const modulatedValue = useDerivedValue(() => {
    'worklet';

    const normalizedLfo = lfoOutput.value;
    const depthScale = lfoDepth / 63; // -1 to +1

    // Full depth (63) means LFO can swing the full parameter range
    const maxModulation = range / 2;
    const modulationAmount = normalizedLfo * depthScale * maxModulation;

    const rawResult = baseValue + modulationAmount;
    const finalValue = Math.max(destination.min, Math.min(destination.max, rawResult));

    return {
      baseValue,
      modulationAmount,
      finalValue,
      normalizedLfo,
    };
  }, [lfoOutput, lfoDepth, baseValue, destination]);

  return modulatedValue;
}
```

### Modulation Behavior Examples

For **Filter Cutoff** (0-127) with base=64:
- LFO output=+1.0, depth=+63: final = 64 + (1.0 × 1.0 × 63.5) = 127.5 → 127
- LFO output=-1.0, depth=+63: final = 64 + (-1.0 × 1.0 × 63.5) = 0.5 → 0
- LFO output=+1.0, depth=-63: final = 64 + (1.0 × -1.0 × 63.5) = 0.5 → 0 (inverted)

For **Pan** (-64 to +63) with base=0 (center):
- LFO output=+1.0, depth=+63: final = 0 + 63.5 = 63 (hard right)
- LFO output=-1.0, depth=+63: final = 0 - 63.5 = -64 (hard left)

---

## Part 6: Implementation Steps

### Phase 1: Foundation (Types & Data)
1. Create `/src/types/destination.ts` with type definitions
2. Create `/src/data/destinations.ts` with destination definitions array
3. Update `/src/context/preset-context.tsx` to add destination state

### Phase 2: Navigation
4. Create `/app/(destination)/_layout.tsx` with Stack navigator
5. Create `/app/(destination)/index.tsx` as placeholder screen
6. Update `/app/_layout.tsx` to add Destination tab trigger

### Phase 3: Core Hook
7. Create `/src/hooks/useModulatedValue.ts` for modulation calculation
8. Test hook independently with mock LFO output

### Phase 4: UI Components
9. Create `/src/components/destination/DestinationPicker.tsx`
10. Create `/src/components/destination/BaseValueSlider.tsx`
11. Create `/src/components/destination/ModulatedValueDisplay.tsx`
12. Create `/src/components/destination/DestinationMeter.tsx` (Skia visualization)
13. Create `/src/components/destination/DestinationVisualizer.tsx` (main composite)
14. Create `/src/components/destination/index.ts` (exports)

### Phase 5: Screen Integration
15. Build out `/app/(destination)/index.tsx` with full UI
16. Connect to LFO animation loop from preset context
17. Test all destinations with various LFO configurations

### Phase 6: Polish
18. Add haptic feedback on destination selection
19. Add persistence of destination selection to storage
20. Visual refinements and animation tuning

---

## Part 7: Destination Definitions Data

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
  // ... (full list in implementation)
];

export function getDestination(id: DestinationId): DestinationDefinition {
  const dest = DESTINATIONS.find(d => d.id === id);
  if (!dest) throw new Error(`Unknown destination: ${id}`);
  return dest;
}

export const DEFAULT_DESTINATION: DestinationId = 'filter_cutoff';
```

---

## Part 8: Styling Guidelines

Follow existing app styling patterns:

- **Background**: `#0a0a0a` (near black)
- **Card Background**: `#1a1a1a`
- **Accent Color**: `#ff6600` (Elektron orange)
- **Text Primary**: `#ffffff`
- **Text Secondary**: `#888899`
- **Border/Divider**: `#3a3a3a`
- **Border Radius**: 12px for cards, 6px for buttons

---

## Part 9: Testing Checklist

- [ ] Destination selection persists across app restarts
- [ ] Base value persists per destination
- [ ] Modulation calculation matches expected formula
- [ ] Visualization animates smoothly at 60fps
- [ ] Bipolar destinations (pan, pitch) handle negative values correctly
- [ ] Values clamp correctly at min/max boundaries
- [ ] LFO depth inversion works (negative depth)
- [ ] All waveforms work correctly with destination modulation
- [ ] Tab navigation works correctly between all three tabs
- [ ] iOS and Android render consistently
