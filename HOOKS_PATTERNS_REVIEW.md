# React Hooks Patterns Review

## Executive Summary

This document analyzes the custom hooks and hook usage patterns in the wtlfo React Native application. Overall, the codebase demonstrates **solid React patterns** with good hook composition, proper memoization in critical paths, and well-designed context providers. There are several areas for improvement, particularly around dependency arrays and potential stale closures.

---

## 1. Custom Hook Design

### Hooks Analyzed

| Hook | Location | Purpose |
|------|----------|---------|
| `useWaveformPath` | `/src/components/lfo/hooks/useWaveformPath.ts` | Generates Skia paths for waveform visualization |
| `useSlowMotionPhase` | `/src/components/lfo/hooks/useSlowMotionPhase.ts` | Creates slowed display phase for fast LFOs |
| `useSyncDisplayPhase` | `/src/components/lfo/hooks/useSlowMotionPhase.ts` | Syncs display phase with real phase |
| `useModulatedValue` | `/src/hooks/useModulatedValue.ts` | Computes modulated destination values on UI thread |
| `useModulationInfo` | `/src/hooks/useModulatedValue.ts` | Returns modulation metadata for display |
| `useModulation` | `/src/context/modulation-context.tsx` | Context hook for modulation state |
| `usePreset` | `/src/context/preset-context.tsx` | Context hook for preset/LFO state |

### Findings

#### GOOD: Proper Naming Convention
All custom hooks follow the `use*` prefix convention:
- `useWaveformPath`
- `useSlowMotionPhase`
- `useModulatedValue`
- `useModulation`
- `usePreset`

#### GOOD: Appropriate Encapsulation
- `useWaveformPath` cleanly encapsulates Skia path generation logic
- `useModulatedValue` isolates worklet-based calculations from components
- Context hooks properly encapsulate state management

#### GOOD: Composability
- `useSlowMotionPhase` accepts a SharedValue and returns a SharedValue, making it composable with other Reanimated hooks
- `useModulatedValue` composes with `useDerivedValue` internally

#### CONCERN: useSlowMotionPhase Complexity
The `useSlowMotionPhase` hook (172 lines) is quite complex with multiple internal shared values and refs. Consider breaking into smaller composable units if complexity grows further.

```typescript
// Lines 27-36 - Many internal shared values
const displayPhase = useSharedValue(realPhase.value);
const lastRealPhase = useSharedValue(realPhase.value);
const factorValue = useSharedValue(slowdownFactor);
const frameCount = useSharedValue(0);
const realCycleCount = useSharedValue(0);
const displayCycleCount = useSharedValue(0);
const prevFactorRef = useRef(slowdownFactor);
```

---

## 2. Hook Dependencies

### Missing Dependencies

#### ISSUE: useModulatedValue - Incomplete Dependencies
**File:** `/src/hooks/useModulatedValue.ts:32-37`

```typescript
return useDerivedValue(() => {
  'worklet';
  const modulationAmount = lfoOutput.value * depthScale * maxModulation;
  const raw = centerValue + modulationAmount;
  return Math.max(min, Math.min(max, raw));
}, [lfoOutput]); // Missing: depthScale, maxModulation, centerValue, min, max
```

**Impact:** Medium - The worklet captures primitive values at creation time, but won't react to changes in `centerValue`, `depthScale`, `maxModulation`, `min`, or `max`.

**Recommendation:** Add all dependencies or document that these values intentionally create new derived values when changed:
```typescript
}, [lfoOutput, depthScale, maxModulation, centerValue, min, max]);
```

#### ISSUE: DestinationMeter - Empty Dependency Arrays
**File:** `/src/components/destination/DestinationMeter.tsx:135-168`

Multiple `useDerivedValue` hooks have empty dependency arrays despite referencing external values:

```typescript
const boundRangeHeight = useDerivedValue(() => {
  'worklet';
  return lowerBoundY.value - upperBoundY.value;
}, []); // lowerBoundY and upperBoundY are accessed
```

**Impact:** Low - These are SharedValues, so they update reactively. However, the empty array is misleading and could cause issues if refactored.

#### ISSUE: PhaseIndicator - Incomplete Dependencies
**File:** `/src/components/lfo/PhaseIndicator.tsx:44-50`

```typescript
const xPosition = useDerivedValue(() => {
  'worklet';
  const phaseVal = typeof phase === 'number' ? phase : phase.value;
  const displayPhase = ((phaseVal - startPhaseNormalized) % 1 + 1) % 1;
  return padding + displayPhase * drawWidth;
}, [phase, padding, drawWidth, startPhaseNormalized]);
```

The `phase` dependency is correct, but the hook references `padding` and `drawWidth` which are computed from `width` and `height` props - these should be stable. This is acceptable as-is.

### Correct Dependencies

#### GOOD: useWaveformPath
**File:** `/src/components/lfo/hooks/useWaveformPath.ts:38-90`

Complete and correct dependency array:
```typescript
}, [waveform, width, height, resolution, padding, depth, startPhase, closePath]);
```

#### GOOD: useSlowMotionPhase useEffect
**File:** `/src/components/lfo/hooks/useSlowMotionPhase.ts:39-54`

```typescript
useEffect(() => {
  // ... reset logic
}, [slowdownFactor, factorValue, displayPhase, realPhase, lastRealPhase, frameCount, realCycleCount, displayCycleCount]);
```

All SharedValues are correctly included. Note: SharedValues in deps are stable references, so this doesn't cause unnecessary re-runs.

### Unnecessary Dependencies

#### MINOR: PresetContext Animation Effects
**File:** `/src/context/preset-context.tsx:209-221`

```typescript
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
```

**Impact:** None - `lfoPhase` and `lfoOutput` are stable SharedValue references created with `useSharedValue`, so they won't change between renders.

---

## 3. Memoization Analysis

### Appropriate useMemo Usage

#### GOOD: useWaveformPath
Path generation is expensive (Skia operations, iteration over 128+ points). Memoization is critical here.

```typescript
return useMemo(() => {
  const path = Skia.Path.Make();
  // ... path generation logic
  return path;
}, [waveform, width, height, resolution, padding, depth, startPhase, closePath]);
```

#### GOOD: RandomWaveform
```typescript
const { strokePath, fillPath } = useMemo(() => {
  // ... expensive path calculation
}, [samples, width, height, depthScale, startPhaseNormalized]);
```

#### GOOD: FadeEnvelope
```typescript
const path = useMemo(() => {
  // ... path with fade envelope calculation
}, [waveform, width, height, resolution, depthScale, fade, startPhaseNormalized]);
```

#### GOOD: LFOVisualizer Theme Resolution
```typescript
const resolvedTheme: LFOTheme = useMemo(() => {
  if (typeof theme === 'object') return theme;
  return theme === 'dark' ? DEFAULT_THEME_DARK : DEFAULT_THEME_LIGHT;
}, [theme]);
```

### useCallback Usage

#### GOOD: Context Callbacks
All context callbacks are properly memoized:

**ModulationContext:**
```typescript
const setCenterValue = useCallback((destinationId: DestinationId, value: number) => {
  if (destinationId === 'none') return;
  setCenterValues(prev => ({ ...prev, [destinationId]: value }));
}, []);

const getCenterValue = useCallback((destinationId: DestinationId): number => {
  // ...
}, [centerValues]);
```

**PresetContext:**
```typescript
const setActivePreset = useCallback((index: number) => {
  setActivePresetState(index);
  // ...
}, []);

const updateParameter = useCallback(<K extends keyof LFOPresetConfig>(
  key: K,
  value: LFOPresetConfig[K]
) => {
  setCurrentConfig(prev => {
    if (prev[key] === value) return prev; // Optimization!
    return { ...prev, [key]: value };
  });
}, []);
```

#### GOOD: Slider Callbacks
```typescript
const handleValueChange = useCallback((newValue: number) => {
  setLocalValue(newValue);
  const rounded = Math.round(newValue);
  if (rounded !== lastCommittedValue.current) {
    lastCommittedValue.current = rounded;
    onChange(rounded);
  }
}, [onChange]);
```

### Over-Memoization

No significant over-memoization anti-patterns detected. The codebase appropriately memoizes expensive calculations without excessive micro-optimization.

---

## 4. State Management

### Appropriate useState Usage

#### GOOD: Local UI State
Components correctly use local state for UI-only concerns:

```typescript
// DestinationPicker.tsx
const [isOpen, setIsOpen] = useState(false);

// QuickEditPanel
const [expanded, setExpanded] = useState(false);

// CenterValueSlider - local state for smooth dragging
const [localValue, setLocalValue] = useState(value);
```

#### GOOD: Derived State Pattern in Sliders
Both `ParameterSlider` and `CenterValueSlider` implement a smart pattern for smooth slider interaction:

```typescript
const [localValue, setLocalValue] = useState(value);
const lastCommittedValue = useRef(value);

React.useEffect(() => {
  if (value !== lastCommittedValue.current) {
    setLocalValue(value);
    lastCommittedValue.current = value;
  }
}, [value]);
```

This allows immediate local updates while syncing with external prop changes.

### States That Could Be Derived (useMemo)

#### POTENTIAL ISSUE: DestinationMeter Bounds Calculation
**File:** `/src/components/destination/DestinationMeter.tsx:53-70`

The `targetLowerBound` and `targetUpperBound` are calculated as local variables, then stored in animated shared values. This is intentional for animation, but the calculation itself could be memoized:

```typescript
// Current - recalculates every render
let targetLowerBound: number;
let targetUpperBound: number;
if (isUnipolar) { /* ... */ } else { /* ... */ }
```

Since this component can re-render frequently (due to LFO output updates via `runOnJS`), consider:
```typescript
const { targetLowerBound, targetUpperBound } = useMemo(() => {
  // ... calculation
}, [isUnipolar, depth, centerValue, swing, min, max]);
```

#### MINOR: DestinationScreen Modulation Range
**File:** `/src/app/(destination)/index.tsx:55-61`

```typescript
const range = destMax - destMin;
const maxModulation = range / 2;
const depthScale = Math.abs(currentConfig.depth / 63);
const depthSign = Math.sign(currentConfig.depth) || 1;
const swing = maxModulation * depthScale;
const minValue = Math.max(destMin, Math.round(centerValue - swing));
const maxValue = Math.min(destMax, Math.round(centerValue + swing));
```

These could be memoized, but the computation is simple enough that the optimization may not be worthwhile.

### State Granularity

#### GOOD: PresetContext State Structure
The context maintains appropriate separation:
- `currentConfig` - Immediate updates for UI
- `debouncedConfig` - Delayed updates for engine recreation
- `isEditing` - UI state for editing mode
- `isPaused` - Pause state
- Shared values for animations (`lfoPhase`, `lfoOutput`)

#### GOOD: ModulationContext Structure
Clean separation between:
- `centerValues` - Per-destination remembered values
- `routings` - LFO routing configuration
- Derived `activeDestinationId` for convenience

---

## 5. Effect Patterns

### Cleanup Analysis

#### GOOD: Animation Loop Cleanup
**File:** `/src/context/preset-context.tsx:209-221`

```typescript
useEffect(() => {
  const animate = (timestamp: number) => {
    // ...
    animationRef.current = requestAnimationFrame(animate);
  };
  animationRef.current = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationRef.current);
}, [lfoPhase, lfoOutput]);
```

#### GOOD: AppState Listener Cleanup
**File:** `/src/context/preset-context.tsx:224-272`

```typescript
useEffect(() => {
  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => {
    subscription.remove();
  };
}, [lfoPhase, lfoOutput]);
```

#### GOOD: Debounce Timer Cleanup
**File:** `/src/context/preset-context.tsx:119-132`

```typescript
useEffect(() => {
  if (debounceRef.current) {
    clearTimeout(debounceRef.current);
  }
  debounceRef.current = setTimeout(() => {
    setDebouncedConfig({ ...currentConfig });
  }, ENGINE_DEBOUNCE_MS);
  return () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  };
}, [currentConfig]);
```

### Async Effect Safety

#### POTENTIAL ISSUE: No Abort Signal in Storage Operations
Storage operations are synchronous (`Storage.setItemSync`), so there's no async race condition concern. However, if these were converted to async operations, abort handling would be needed.

### Effect Timing

#### OBSERVATION: useEffect vs useLayoutEffect
The codebase uses `useEffect` consistently, which is appropriate for React Native where there's no visual "flash" concern like in web React.

**Exception:** If layout measurements are needed before paint, consider `useLayoutEffect`. Current usage doesn't require this.

---

## 6. Ref Usage

### Appropriate Ref Usage

#### GOOD: Animation Frame ID Storage
```typescript
const animationRef = useRef<number>(0);
```
Correctly uses ref for mutable value that shouldn't trigger re-render.

#### GOOD: LFO Instance Storage
```typescript
const lfoRef = useRef<LFO | null>(null);
```
Appropriate for storing class instance across renders.

#### GOOD: Slider Committed Value Tracking
```typescript
const lastCommittedValue = useRef(value);
```
Proper use for tracking last committed value without causing re-renders.

#### GOOD: Previous Factor Tracking
```typescript
const previousFactorRef = useRef(1);
// HomeScreen.tsx:56-61
const slowdownInfo = getSlowdownInfo(
  timingInfo.cycleTimeMs,
  previousFactorRef.current
);
previousFactorRef.current = slowdownInfo.factor;
```
Correctly used for hysteresis calculations.

### Refs vs State

#### OBSERVATION: isPausedRef Pattern
**File:** `/src/context/preset-context.tsx:114-116, 174-177`

```typescript
const isPausedRef = useRef(false);

useEffect(() => {
  isPausedRef.current = isPaused;
}, [isPaused]);
```

This pattern syncs a ref with state to avoid stale closures in the AppState handler. This is a valid pattern but indicates complexity in the callback.

**Alternative:** Consider restructuring the AppState handler to not need the ref, or use `useCallback` with the state as a dependency.

---

## 7. Custom Hook Issues

### Conditional Hook Calls

#### GOOD: No Conditional Hooks
The codebase correctly avoids conditional hook calls. For example, in `LFOVisualizer`:

```typescript
// IMPORTANT: Always call hooks unconditionally to satisfy Rules of Hooks
// Create internal shared values that we'll sync with props
const internalPhase = useSharedValue(typeof phase === 'number' ? phase : 0);
const internalOutput = useSharedValue(typeof output === 'number' ? output : 0);

// Then conditionally use values, not hooks
const phaseValue = isPhaseShared ? (phase as SharedValue<number>) : internalPhase;
```

### Stale Closure Issues

#### POTENTIAL ISSUE: AppState Handler Stale Closure
**File:** `/src/context/preset-context.tsx:225-265`

The `handleAppStateChange` callback is defined inside the effect and closes over mutable refs. The `isPausedRef` pattern addresses the stale `isPaused` state issue, but this is a code smell.

```typescript
const handleAppStateChange = (nextAppState: AppStateStatus) => {
  // Uses isPausedRef.current instead of isPaused directly
  wasRunningBeforeBackgroundRef.current = !isPausedRef.current && (lfoRef.current?.isRunning() ?? false);
  // ...
};
```

**Recommendation:** Document this pattern or consider using a reducer for more predictable state updates.

#### POTENTIAL ISSUE: Animation Loop Closure
**File:** `/src/context/preset-context.tsx:251-259`

The animation function recreated in the AppState handler doesn't capture the latest refs correctly if the effect hasn't re-run:

```typescript
if (wasRunningBeforeBackgroundRef.current && !isPausedRef.current) {
  const animate = (timestamp: number) => {
    if (lfoRef.current) {
      const state = lfoRef.current.update(timestamp);
      lfoPhase.value = state.phase;  // lfoPhase captured from effect closure
      lfoOutput.value = state.output; // lfoOutput captured from effect closure
    }
    animationRef.current = requestAnimationFrame(animate);
  };
  animationRef.current = requestAnimationFrame(animate);
}
```

**Impact:** Low - The shared values are stable references, so this works correctly. However, it's worth documenting.

### Hook Ordering

#### GOOD: Consistent Hook Order
All components maintain consistent hook ordering:
1. Context hooks (`usePreset`, `useModulation`)
2. State hooks (`useState`)
3. Ref hooks (`useRef`)
4. Effect hooks (`useEffect`)
5. Memo hooks (`useMemo`)

---

## 8. Reanimated-Specific Patterns

### SharedValue Handling

#### GOOD: Proper Worklet Annotation
All worklet code properly includes the `'worklet'` directive:

```typescript
return useDerivedValue(() => {
  'worklet';
  const modulationAmount = lfoOutput.value * depthScale * maxModulation;
  // ...
}, [lfoOutput]);
```

#### GOOD: UI Thread Optimization
`useModulatedValue` correctly extracts primitives outside the worklet to avoid object access on the UI thread:

```typescript
// Extract primitives OUTSIDE the worklet to avoid object access in worklet
const destination = getDestination(destinationId);
const min = destination?.min ?? 0;
const max = destination?.max ?? 127;
// ...
```

#### GOOD: runOnJS for State Updates
Components correctly use `runOnJS` to update React state from worklets:

```typescript
useAnimatedReaction(
  () => output.value,
  (currentValue) => {
    runOnJS(updateDisplay)(currentValue);
  },
  [output]
);
```

### useAnimatedReaction Patterns

#### GOOD: Proper Reaction Setup
```typescript
useAnimatedReaction(
  () => realPhase.value,  // What to track
  (currentPhase) => {     // What to do when it changes
    'worklet';
    // ... complex phase tracking logic
  },
  [realPhase]  // Dependencies for the tracker function
);
```

---

## 9. Test Coverage Analysis

### Strengths

- **Context Testing:** Both `modulation-context` and `preset-context` have comprehensive test suites
- **Edge Cases:** Tests cover storage errors, invalid inputs, and boundary conditions
- **Hook Isolation:** Tests use `renderHook` correctly with proper wrappers

### Gaps

- **Custom Hooks:** No dedicated tests for `useWaveformPath`, `useSlowMotionPhase`, or `useModulatedValue`
- **Reanimated Mocking:** The tests mock Reanimated primitives but don't test worklet logic
- **Component Hook Usage:** No tests for hook usage within components

---

## 10. Recommendations

### High Priority

1. **Fix useModulatedValue Dependencies**
   Add all primitive dependencies to the `useDerivedValue` call to ensure reactivity.

2. **Document Stale Closure Patterns**
   Add comments explaining the `isPausedRef` pattern in PresetContext.

### Medium Priority

3. **Add Custom Hook Tests**
   Create test files for:
   - `useWaveformPath` - Test path generation with various inputs
   - `useSlowMotionPhase` - Test phase tracking and slowdown logic
   - `useModulatedValue` - Test modulation calculations

4. **Consider useReducer for PresetContext**
   The complex state interactions in PresetContext might benefit from a reducer pattern for more predictable updates.

### Low Priority

5. **Memoize DestinationMeter Bounds**
   Add `useMemo` for the bounds calculation to avoid recalculation on every render.

6. **Clean Up Empty Dependency Arrays**
   Review and fill in empty dependency arrays in `useDerivedValue` calls, even for SharedValues, for clarity.

---

## Conclusion

The wtlfo codebase demonstrates **strong React hook patterns** overall. The main areas of concern are:

1. **Dependency completeness** in some Reanimated hooks
2. **Stale closure complexity** in the AppState handling
3. **Test coverage gaps** for custom hooks

The positive patterns include:
- Proper hook naming and encapsulation
- Appropriate memoization without over-optimization
- Clean context design with proper useCallback usage
- Correct Reanimated worklet patterns
- Good cleanup in effects

These findings can guide future refactoring and code review efforts.
