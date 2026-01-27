# LFO Logic Consolidation Plan

## Revision History

- **v1**: Original plan with import + wrap approach
- **v2**: Added code generation to work around worklet limitations
- **v3 (Current)**: Inverted architecture - worklet-compatible pure functions as source of truth

### Key Learnings from Earlier Versions

**v1 Problem**: Worklets CANNOT import functions - imports become `undefined` at runtime because worklets run in a separate JavaScript context.

**v2 Solution**: Build-time code generation to create worklet-compatible copies.

**v3 Insight**: The `'worklet'` directive is just a Babel hint, not a runtime requirement. Functions can be written worklet-compatible and work everywhere.

---

## Executive Summary

**Architecture**: Make worklet-compatible pure functions the canonical implementation in `elektron-lfo`. The engine imports and uses these directly. React Native consumers import the same functions and add `'worklet'` directives in thin wrappers.

**Key Insight**: Functions with `'worklet'` work normally in Node.js. Therefore, we can write worklet-compatible functions once and use them everywhere.

---

## Current State (Problem)

LFO logic is duplicated across:
1. **elektron-lfo engine** (`/Users/brent/code/elektron-lfo/src/engine/`)
2. **Visualization worklets** (`wtlfo/src/components/lfo/worklets.ts`)
3. **WaveformDisplay.tsx** (stroke and fill paths)
4. **PhaseIndicator.tsx** (dot position calculation)
5. **FadeEnvelope.tsx** (fade curve rendering)
6. **Destination display** (`home/index.tsx`)

### Consequences
- Bug fixes must be applied in multiple places
- Discrepancies exist (e.g., RND uses different algorithms, SPH normalization differs)
- No shared test coverage for visualization logic
- Difficult to verify engine and visualization match

---

## Proposed Architecture

```
elektron-lfo/
├── src/
│   ├── core/                    # Pure functions (worklet-compatible style)
│   │   ├── waveforms.ts         # Waveform sampling
│   │   ├── transforms.ts        # Speed, depth transformations
│   │   ├── fade.ts              # Fade envelope
│   │   ├── timing.ts            # Timing calculations
│   │   ├── constants.ts         # Shared constants
│   │   └── index.ts
│   ├── engine/                  # Stateful LFO class (uses core/)
│   │   └── lfo.ts
│   └── index.ts
├── package.json                 # Exports ./core for direct import
└── tests/
    ├── unit/                    # Pure function tests
    ├── property/                # Property-based tests (fast-check)
    └── golden/                  # Golden master tests

wtlfo/
└── src/
    └── components/lfo/
        └── worklets.ts          # Thin wrappers adding 'worklet' directive
```

---

## Design Principles

### 1. Worklet-Compatible Function Style

All `core/` functions must be:
- **Pure**: No side effects, no mutation
- **Self-contained**: No imports of non-primitive values
- **Primitive I/O**: Accept/return only numbers, strings, booleans, or simple objects
- **No closures**: Don't capture external variables
- **No Math.random()**: Use seeded PRNG for RND

```typescript
// GOOD: Worklet-compatible
export function sampleTriangle(phase: number): number {
  if (phase < 0.25) return phase * 4;
  if (phase < 0.75) return 2 - phase * 4;
  return phase * 4 - 4;
}

// BAD: Uses closure
const K = 3;
export function sampleExp(phase: number): number {
  return Math.exp(-phase * K); // K is captured - breaks worklet
}

// GOOD: Inline constant
export function sampleExpDecay(phase: number): number {
  const k = 3;
  const endValue = Math.exp(-k);
  return (Math.exp(-phase * k) - endValue) / (1 - endValue);
}
```

### 2. Type-Only Imports Allowed

Types don't exist at runtime, so they're safe:

```typescript
import type { WaveformType } from './types';

export function sampleWaveform(waveform: WaveformType, phase: number): number {
  // ...
}
```

### 3. Engine Uses Core Directly

```typescript
// engine/lfo.ts
import { sampleWaveform, applySpeedTransform, applyDepthScale } from '../core';

export class LFO {
  update(timestamp: number): LFOState {
    const rawOutput = sampleWaveform(this.config.waveform, this.state.phase, this.state.randomSeed);
    // ... rest of engine logic
  }
}
```

### 4. Worklet Wrappers in wtlfo

```typescript
// wtlfo/src/components/lfo/worklets.ts
import { sampleTriangle } from 'elektron-lfo/core';

export function sampleTriangleWorklet(phase: number): number {
  'worklet';
  return sampleTriangle(phase);
}
```

**Important**: Test this pattern with Metro/Reanimated before committing. If wrappers don't work, inline the function bodies.

---

## Implementation: Core Module

### core/waveforms.ts

```typescript
import type { WaveformType } from './types';

// ===== BIPOLAR WAVEFORMS (-1 to +1) =====

export function sampleTriangle(phase: number): number {
  if (phase < 0.25) return phase * 4;
  if (phase < 0.75) return 2 - phase * 4;
  return phase * 4 - 4;
}

export function sampleSine(phase: number): number {
  return Math.sin(phase * 2 * Math.PI);
}

export function sampleSquare(phase: number): number {
  return phase < 0.5 ? 1 : -1;
}

export function sampleSawtooth(phase: number): number {
  return 1 - phase * 2;
}

// ===== UNIPOLAR WAVEFORMS (0 to 1) =====

export function sampleRamp(phase: number): number {
  return phase;
}

// EXP decay: 1 → 0 (concave shape)
export function sampleExpDecay(phase: number): number {
  const k = 3;
  const endValue = Math.exp(-k);
  return (Math.exp(-phase * k) - endValue) / (1 - endValue);
}

// EXP rise: 0 → 1 (concave shape) - used when speed < 0
export function sampleExpRise(phase: number): number {
  const k = 3;
  return (Math.exp(phase * k) - 1) / (Math.exp(k) - 1);
}

// ===== RANDOM WAVEFORM =====

export function seededRandom(step: number, seed: number): number {
  let h = ((step * 2654435761) ^ (seed * 1597334677)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h = (h ^ (h >>> 16)) >>> 0;
  return (h / 2147483648) - 1;
}

export function sampleRandom(phase: number, seed: number): number {
  const step = Math.floor(phase * 16) % 16;
  return seededRandom(step, seed);
}

export function sampleRandomWithSlew(phase: number, slew: number, seed: number): number {
  const steps = 16;
  const step = Math.floor(phase * steps) % steps;
  const prevStep = (step - 1 + steps) % steps;
  const stepProgress = (phase * steps) % 1;

  const currentValue = seededRandom(step, seed);
  const prevValue = seededRandom(prevStep, seed);

  const slewAmount = slew / 127;
  if (slewAmount <= 0) return currentValue;

  const t = stepProgress;
  const smoothT = t * t * (3 - 2 * t);
  const interpT = smoothT * slewAmount;

  return prevValue + (currentValue - prevValue) * interpT;
}

export function isUnipolar(waveform: WaveformType): boolean {
  return waveform === 'EXP' || waveform === 'RMP';
}

export function sampleWaveform(waveform: WaveformType, phase: number, seed: number = 0): number {
  switch (waveform) {
    case 'TRI': return sampleTriangle(phase);
    case 'SIN': return sampleSine(phase);
    case 'SQR': return sampleSquare(phase);
    case 'SAW': return sampleSawtooth(phase);
    case 'EXP': return sampleExpDecay(phase);
    case 'RMP': return sampleRamp(phase);
    case 'RND': return sampleRandom(phase, seed);
  }
}
```

### core/transforms.ts

```typescript
export function sampleWithSpeed(
  waveform: WaveformType,
  phase: number,
  speed: number,
  seed: number = 0
): number {
  // EXP special case: use different formula for negative speed
  if (waveform === 'EXP') {
    const k = 3;
    if (speed < 0) {
      return (Math.exp(phase * k) - 1) / (Math.exp(k) - 1);
    } else {
      const endValue = Math.exp(-k);
      return (Math.exp(-phase * k) - endValue) / (1 - endValue);
    }
  }

  // Sample normally then apply speed polarity
  let value = sampleWaveform(waveform, phase, seed);

  if (speed < 0) {
    if (isUnipolar(waveform)) {
      value = 1 - value; // Flip unipolar
    } else {
      value = -value; // Invert bipolar
    }
  }

  return value;
}

export function applyDepthScale(value: number, depth: number): number {
  const d = depth < -64 ? -64 : depth > 63 ? 63 : depth;
  const scale = d >= 0 ? d / 63 : d / 64;
  return value * scale;
}

export function computeLFOOutput(
  waveform: WaveformType,
  phase: number,
  speed: number,
  depth: number,
  fadeMultiplier: number = 1,
  seed: number = 0
): number {
  let value = sampleWithSpeed(waveform, phase, speed, seed);
  value = applyDepthScale(value, depth);
  value = value * fadeMultiplier;
  return value;
}
```

### core/fade.ts

```typescript
/**
 * Calculate fade duration in cycles.
 * IMPORTANT: Derived from Digitakt II hardware measurements.
 * DO NOT MODIFY without hardware verification.
 */
export function calculateFadeCycles(fadeValue: number): number {
  if (fadeValue === 0) return 0;

  const absFade = Math.abs(fadeValue);

  if (absFade <= 16) {
    return Math.max(0.5, 0.1 * absFade + 0.6);
  }

  const baseAt16 = 0.1 * 16 + 0.6;
  return baseAt16 * Math.pow(2, (absFade - 16) / 4.5);
}

export function calculateFadeMultiplier(fadeValue: number, fadeProgress: number): number {
  if (fadeValue === 0) return 1;

  const progress = fadeProgress < 0 ? 0 : fadeProgress > 1 ? 1 : fadeProgress;

  if (fadeValue < 0) {
    return progress; // Fade-in: 0 → 1
  } else {
    return 1 - progress; // Fade-out: 1 → 0
  }
}

export function calculateFadeProgress(elapsedCycles: number, fadeValue: number): number {
  if (fadeValue === 0) return 1;

  const totalCycles = calculateFadeCycles(fadeValue);
  if (totalCycles <= 0) return 1;

  const progress = elapsedCycles / totalCycles;
  return progress > 1 ? 1 : progress;
}
```

---

## Migration Steps

### Phase 1: Create Core Module (3-4 hours)
1. Create `elektron-lfo/src/core/` directory
2. Implement all pure functions with inline constants
3. Write comprehensive unit tests
4. Write property-based tests with fast-check
5. Verify existing engine tests still pass

### Phase 2: Refactor Engine (2 hours)
1. Update engine to import from `core/`
2. Remove duplicated logic from engine
3. Add engine ↔ core consistency tests
4. Generate golden masters

### Phase 3: Update Package Exports (1 hour)
1. Add `./core` export to package.json
2. Add `./types` export for type-only imports
3. Build and publish new version

### Phase 4: Test Worklet Compatibility (1 hour)
1. In wtlfo, run worklet import test
2. If wrapper pattern works: create thin wrappers
3. If wrappers fail: inline function bodies (still from single source via copy)

### Phase 5: Update wtlfo (2-3 hours)
1. Update worklets.ts to use core functions
2. Update visualization components
3. Run visual regression tests
4. Verify engine ↔ visualization consistency

### Phase 6: Cleanup (1 hour)
1. Remove old inline implementations
2. Update documentation
3. Final code review

---

## Test Strategy

### 1. Property-Based Tests (fast-check)

```typescript
test('output always bounded by |depth/63|', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'),
      fc.float({ min: 0, max: 1, noNaN: true }),
      fc.integer({ min: -64, max: 63 }),
      fc.integer({ min: -64, max: 63 }),
      fc.float({ min: 0, max: 1, noNaN: true }),
      (waveform, phase, speed, depth, fade) => {
        const output = computeLFOOutput(waveform, phase, speed, depth, fade);
        const maxMagnitude = Math.abs(depth) / 63 + 0.001;
        expect(Math.abs(output)).toBeLessThanOrEqual(maxMagnitude);
      }
    ),
    { numRuns: 10000 }
  );
});
```

### 2. Golden Master Tests

Pre-record engine outputs and verify core functions match.

### 3. Worklet Compatibility Test

```typescript
test('imported function works in useDerivedValue', () => {
  const { result } = renderHook(() => {
    const phase = useSharedValue(0.25);
    return useDerivedValue(() => {
      'worklet';
      return sampleTriangle(phase.value);
    });
  });
  expect(result.current.value).toBeCloseTo(1, 5);
});
```

---

## Risk Assessment

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Worklet wrappers don't work | Medium | Test in Phase 4 before full migration; fallback to copy-paste |
| Performance regression | Low | Benchmark hot paths; inline if needed |
| RND algorithm breaks presets | Medium | Document as known change; RND is inherently variable |
| Fade formula drift | Low | Use exact engine formula; golden master catches drift |

---

## Success Criteria

1. **Single source of truth**: All waveform/transform logic in `elektron-lfo/core/`
2. **Engine consistency**: Engine imports from core, tests verify match
3. **Visualization consistency**: wtlfo uses same functions, tests verify match
4. **Comprehensive tests**: Unit, property-based, golden master, integration
5. **No duplicate formulas**: grep for math operations shows single location

---

## Open Questions for Hardware Verification

1. **RND PRNG**: Is Digitakt II seeded or truly random?
2. **SLEW direction**: Does interpolation go prev→current or current→next?
3. **Fade formula**: Is the empirically-derived formula accurate across firmware versions?
4. **EXP K value**: Is k=3 the exact hardware value or an approximation?
