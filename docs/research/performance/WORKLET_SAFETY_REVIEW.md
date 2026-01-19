# Worklet Safety Review

**Date:** 2026-01-19
**Reviewer:** Claude Code (Automated Analysis)
**Scope:** All files using Reanimated worklets in `/Users/brent/wtlfo/src`

---

## Executive Summary

The worklet implementation in this codebase is **generally well-structured and safe**. The code demonstrates good practices for Reanimated worklet usage, including proper `'worklet'` directives, correct thread boundary handling with `runOnJS`, and efficient pure mathematical operations. There are a few minor observations and recommendations for improvement.

**Overall Assessment:** PASS with minor recommendations

---

## Files Analyzed

| File | Worklet Functions | Status |
|------|------------------|--------|
| `src/components/lfo/worklets.ts` | 5 worklets | PASS |
| `src/components/lfo/hooks/useSlowMotionPhase.ts` | 1 worklet (in reaction) | PASS |
| `src/components/destination/DestinationMeter.tsx` | 10 derived value worklets | PASS |
| `src/components/lfo/PhaseIndicator.tsx` | 7 derived value worklets | PASS |
| `src/components/lfo/OutputValueDisplay.tsx` | 1 worklet (in reaction) | PASS |
| `src/hooks/useModulatedValue.ts` | 1 derived value worklet | PASS |

---

## 1. Worklet Declarations

### Properly Marked Worklets

All explicit worklet functions are correctly marked with the `'worklet'` directive:

**`/Users/brent/wtlfo/src/components/lfo/worklets.ts`**
```typescript
// Line 8 - getRandomStepValue
export function getRandomStepValue(step: number): number {
  'worklet';
  return Math.sin(step * 78.233 + 0.5) * 0.9;
}

// Line 19 - sampleWaveformWorklet
export function sampleWaveformWorklet(waveform: WaveformType, phase: number): number {
  'worklet';
  // ...switch statement with pure math operations
}

// Line 66 - sampleRandomWithSlew
export function sampleRandomWithSlew(phase: number, slew: number): number {
  'worklet';
  // ...interpolation logic
}

// Line 101 - isUnipolarWorklet
export function isUnipolarWorklet(waveform: WaveformType): boolean {
  'worklet';
  return waveform === 'EXP' || waveform === 'RMP';
}

// Line 114 - sampleWaveformWithSlew
export function sampleWaveformWithSlew(waveform, phase, slew = 0): number {
  'worklet';
  // ...delegates to other worklets
}
```

### Implicit Worklets (Callbacks)

The following use Reanimated hooks that automatically wrap callbacks as worklets:

**`useDerivedValue` callbacks** - All properly include `'worklet'` directive:
- `DestinationMeter.tsx`: Lines 108, 118, 123, 129, 135, 140, 145, 150, 155, 160, 165
- `PhaseIndicator.tsx`: Lines 44, 55, 98, 103, 109
- `useModulatedValue.ts`: Line 32

**`useAnimatedReaction` callbacks**:
- `useSlowMotionPhase.ts`: Line 60
- `DestinationMeter.tsx`: Line 90 (Note: callback does not have explicit directive, relies on hook)
- `OutputValueDisplay.tsx`: Line 18 (Note: callback does not have explicit directive, relies on hook)

### Recommendation

While `useAnimatedReaction` and `useDerivedValue` automatically mark their callbacks as worklets, explicitly adding `'worklet'` directives improves code clarity and self-documentation. Consider adding explicit directives to:

- `DestinationMeter.tsx` line 90-97 (useAnimatedReaction callback)
- `OutputValueDisplay.tsx` line 19-22 (useAnimatedReaction callback)

---

## 2. Worklet Safety

### React State/Props Access

**GOOD:** The codebase correctly handles the boundary between React state and worklets:

**`DestinationMeter.tsx`** - Properly bridges UI thread to JS thread:
```typescript
// Line 86-98 - State is updated via runOnJS
const [currentValue, setCurrentValue] = useState(centerValue);

useAnimatedReaction(
  () => ({ output: lfoOutput.value, center: animatedCenterValue.value }),
  ({ output, center }) => {
    const modulationAmount = output * maxModulation;
    const value = Math.round(Math.max(min, Math.min(max, center + modulationAmount)));
    runOnJS(setCurrentValue)(value);  // Correctly bridges to JS thread
  },
  [maxModulation, min, max]
);
```

**`OutputValueDisplay.tsx`** - Same correct pattern:
```typescript
// Line 17-24
useAnimatedReaction(
  () => output.value,
  (currentValue) => {
    runOnJS(updateDisplay)(currentValue);  // Correctly bridges to JS thread
  },
  [output]
);
```

### Closure Captures

**GOOD:** The codebase correctly captures primitive values in closures:

**`useModulatedValue.ts`** - Excellent pattern:
```typescript
// Lines 23-29 - Primitives extracted OUTSIDE the worklet
const destination = getDestination(destinationId);
const min = destination?.min ?? 0;
const max = destination?.max ?? 127;
const range = max - min;
const maxModulation = range / 2;
const depthScale = lfoDepth / 63;

// Line 32-37 - Only primitives and SharedValue.value accessed in worklet
return useDerivedValue(() => {
  'worklet';
  const modulationAmount = lfoOutput.value * depthScale * maxModulation;
  const raw = centerValue + modulationAmount;
  return Math.max(min, Math.min(max, raw));
}, [lfoOutput]);
```

### Shared Value Access

**GOOD:** All `.value` accesses on SharedValues occur correctly within worklets:

- `lfoOutput.value` - accessed in worklet callbacks
- `animatedCenterValue.value` - accessed in derived values
- `phase.value` - handled polymorphically (supports both number and SharedValue)

**`PhaseIndicator.tsx`** - Handles polymorphic phase input safely:
```typescript
// Lines 46-49
const xPosition = useDerivedValue(() => {
  'worklet';
  const phaseVal = typeof phase === 'number' ? phase : phase.value;
  // ... rest of calculation
}, [phase, padding, drawWidth, startPhaseNormalized]);
```

---

## 3. Thread Safety

### runOnJS Usage

**CORRECT USAGE:** All `runOnJS` calls are appropriate:

| Location | Usage | Status |
|----------|-------|--------|
| `DestinationMeter.tsx:95` | `runOnJS(setCurrentValue)(value)` | CORRECT |
| `OutputValueDisplay.tsx:21` | `runOnJS(updateDisplay)(currentValue)` | CORRECT |

### runOnUI Usage

**NOT USED:** The codebase does not use `runOnUI`, which is appropriate since:
- All worklet code is driven by Reanimated hooks (`useDerivedValue`, `useAnimatedReaction`)
- No JS-initiated UI thread operations are needed

### Potential Race Conditions

**NONE IDENTIFIED.** The architecture avoids race conditions by:

1. Using unidirectional data flow (SharedValues -> Derived Values -> runOnJS -> React State)
2. Not mutating SharedValues from multiple sources simultaneously
3. Using `useAnimatedReaction` with proper dependencies to react to changes

**`useSlowMotionPhase.ts`** - Complex but race-condition-free:
```typescript
// Multiple shared values are updated atomically within single reaction
if (isDiscontinuity) {
  displayPhase.value = currentPhase;
  lastRealPhase.value = currentPhase;
  realCycleCount.value = 0;
  displayCycleCount.value = 0;
  return;
}
```

---

## 4. Shared Value Usage

### Correct Modifications

**GOOD:** SharedValues are modified correctly:

**`useSlowMotionPhase.ts`**:
```typescript
displayPhase.value = newDisplayPhase;   // Direct assignment in worklet
lastRealPhase.value = currentPhase;     // Direct assignment in worklet
```

**`preset-context.tsx`** (JS thread):
```typescript
lfoPhase.value = state.phase;           // Direct assignment in animation loop
lfoOutput.value = state.output;         // Direct assignment in animation loop
```

### Derived Value Dependencies

**OBSERVATION:** Some `useDerivedValue` calls have empty dependency arrays `[]` that rely on closure captures:

**`DestinationMeter.tsx`** - Lines 135-158:
```typescript
const boundRangeHeight = useDerivedValue(() => {
  'worklet';
  return lowerBoundY.value - upperBoundY.value;
}, []);  // Empty deps - relies on closure capture of SharedValues
```

**This is correct** for Reanimated because SharedValues are tracked automatically. However, the explicit dependency arrays like `[meterTop, meterHeight, min, range]` on other derived values (lines 121, 126) are good documentation but not strictly necessary for SharedValue tracking.

---

## 5. Performance in Worklets

### Heavy Computations

**GOOD:** All worklets perform lightweight operations:

| Worklet | Operations | Performance |
|---------|-----------|-------------|
| `sampleWaveformWorklet` | Switch + Math.sin/exp | O(1), ~microseconds |
| `sampleRandomWithSlew` | Basic arithmetic + smoothstep | O(1), ~microseconds |
| `getRandomStepValue` | Math.sin | O(1), ~nanoseconds |
| `isUnipolarWorklet` | String comparison | O(1), ~nanoseconds |

### Allocations in Hot Paths

**GOOD:** No object allocations in worklet hot paths.

**`PhaseIndicator.tsx`** - Uses `vec()` which may allocate, but this is:
1. Called in derived values, not animation callbacks
2. Necessary for Skia interop
3. Cached by useDerivedValue

```typescript
const upperBoundP1 = useDerivedValue(() => {
  'worklet';
  return vec(meterX, upperBoundY.value);  // vec() creates Point object
}, []);
```

### Math Function Efficiency

**GOOD:** Standard Math functions are used appropriately:

- `Math.sin` - Used for waveform generation (unavoidable)
- `Math.exp` - Used for exponential curve (appropriate)
- `Math.floor`, `Math.max`, `Math.min` - Efficient integer/clamping operations
- `Math.abs` - Used for fade calculations

**`sampleRandomWithSlew`** - Efficient smoothstep without function call:
```typescript
// Line 89 - Inline smoothstep calculation
const smoothT = t * t * (3 - 2 * t);
```

---

## 6. Error Handling

### Can Worklets Throw?

**LOW RISK:** The worklets are designed to not throw:

1. **No division by zero:** Guarded conditions prevent divide-by-zero
   ```typescript
   if (slew === 0) return currentValue;  // Guard before division
   if (fadeDuration > 0) ...             // Guard before division
   ```

2. **No array access:** No array indexing that could throw
3. **No object property access:** Only primitive operations
4. **Default cases:** Switch statements have default returns

**`sampleWaveformWorklet`** - Has safe default:
```typescript
default:
  return 0;  // Unknown waveform returns 0, doesn't throw
```

### Error Recovery

**NOT APPLICABLE:** Since worklets don't throw, no recovery mechanism is needed.

### What Happens If Worklets Fail?

If the Reanimated infrastructure fails:
1. Animations would freeze
2. The app would not crash (Reanimated has internal error boundaries)
3. Values would remain at last computed state

---

## 7. Testing Worklets

### Current Test Coverage

**`/Users/brent/wtlfo/src/components/lfo/__tests__/worklets.test.ts`**

**EXCELLENT COVERAGE** for the core worklet functions:

| Function | Tests | Coverage |
|----------|-------|----------|
| `sampleWaveformWorklet` | 50+ tests | All waveforms, edge cases |
| `isUnipolarWorklet` | 8 tests | All waveform types |
| `sampleRandomWithSlew` | NOT TESTED | Gap identified |
| `sampleWaveformWithSlew` | NOT TESTED | Gap identified |
| `getRandomStepValue` | Indirectly via RND | Partial |

### Test Characteristics

The tests correctly:
- Test pure function behavior (no mocking needed)
- Cover edge cases (phase 0, phase 1, very small/large values)
- Verify value ranges (-1 to 1 for bipolar, 0 to 1 for unipolar)
- Test determinism for RND waveform
- Test consistency between `isUnipolarWorklet` and actual waveform outputs

### Recommendations for Test Coverage

1. **Add tests for `sampleRandomWithSlew`:**
   ```typescript
   describe('sampleRandomWithSlew', () => {
     it('should return instant value when slew is 0', () => { ... });
     it('should interpolate between values when slew > 0', () => { ... });
     it('should use smoothstep interpolation', () => { ... });
   });
   ```

2. **Add tests for `sampleWaveformWithSlew`:**
   ```typescript
   describe('sampleWaveformWithSlew', () => {
     it('should delegate to sampleRandomWithSlew for RND with slew', () => { ... });
     it('should delegate to sampleWaveformWorklet for non-RND', () => { ... });
   });
   ```

3. **Add tests for `getRandomStepValue`:**
   ```typescript
   describe('getRandomStepValue', () => {
     it('should return consistent value for same step', () => { ... });
     it('should return different values for different steps', () => { ... });
     it('should return values in expected range', () => { ... });
   });
   ```

---

## Detailed Findings by File

### `/Users/brent/wtlfo/src/components/lfo/worklets.ts`

**Status:** EXCELLENT

- All functions properly marked as worklets
- Pure mathematical operations only
- No side effects
- Good documentation
- Well-organized module

### `/Users/brent/wtlfo/src/components/lfo/hooks/useSlowMotionPhase.ts`

**Status:** GOOD with observation

**Observation:** Complex phase tracking logic that handles:
- Discontinuity detection
- Wrap-around handling
- Drift correction
- Factor changes

The worklet correctly:
- Updates multiple SharedValues atomically
- Uses early returns for edge cases
- Has adaptive thresholds

**Minor concern:** The drift correction logic (lines 146-158) performs modulo operations that could accumulate floating-point errors over very long running times, but the periodic correction (every 60 frames) should mitigate this.

### `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`

**Status:** GOOD

- Multiple derived values for animation
- Correct `runOnJS` usage for state updates
- Spring animations for smooth transitions
- Good separation of concerns

### `/Users/brent/wtlfo/src/components/lfo/PhaseIndicator.tsx`

**Status:** GOOD

- Handles polymorphic `phase` input (number | SharedValue)
- Correctly samples waveforms in derived values
- Properly calculates fade envelope in worklet

### `/Users/brent/wtlfo/src/hooks/useModulatedValue.ts`

**Status:** EXCELLENT

- Demonstrates best practice: extract primitives outside worklet
- Clean, minimal worklet body
- Proper dependency tracking

---

## Summary of Recommendations

### High Priority
None - the codebase is well-implemented.

### Medium Priority
1. Add explicit `'worklet'` directives to `useAnimatedReaction` callbacks for documentation clarity

### Low Priority
1. Add test coverage for `sampleRandomWithSlew`, `sampleWaveformWithSlew`, and `getRandomStepValue`
2. Consider documenting the drift correction behavior in `useSlowMotionPhase.ts`

---

## Conclusion

The worklet implementation in this codebase follows Reanimated best practices:

- Proper thread boundary handling with `runOnJS`
- Pure, lightweight worklet functions
- Correct SharedValue usage patterns
- Good test coverage for core functions
- No race conditions or thread safety issues

The code is production-ready from a worklet safety perspective.
