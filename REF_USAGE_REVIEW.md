# Ref Usage Patterns Review

## Executive Summary

This review analyzes ref usage patterns across the React Native LFO application. The codebase generally demonstrates **good ref practices** with appropriate use cases for `useRef` vs state, proper cleanup for animation refs, and effective use of Reanimated's `useSharedValue` for UI-thread animations. A few areas warrant attention for potential improvements.

---

## 1. useRef Usage Analysis

### 1.1 Refs Used Appropriately vs State

| File | Ref | Purpose | Verdict |
|------|-----|---------|---------|
| `preset-context.tsx` | `debounceRef` | Timeout ID for debouncing | Correct - mutable, no UI update needed |
| `preset-context.tsx` | `lfoRef` | LFO engine instance | Correct - object reference, no re-render needed |
| `preset-context.tsx` | `animationRef` | requestAnimationFrame ID | Correct - cleanup tracking |
| `preset-context.tsx` | `wasRunningBeforeBackgroundRef` | Background state tracking | Correct - event handler needs latest value |
| `preset-context.tsx` | `appStateRef` | Previous AppState | Correct - comparison in event handler |
| `preset-context.tsx` | `isPausedRef` | Sync ref for isPaused state | Correct - avoids stale closure in event handler |
| `CenterValueSlider.tsx` | `lastCommittedValue` | Track last sent value | Correct - avoid duplicate onChange calls |
| `ParameterSlider.tsx` | `lastCommittedValue` | Track last sent value | Correct - avoid duplicate onChange calls |
| `useSlowMotionPhase.ts` | `prevFactorRef` | Previous slowdown factor | Correct - compare across renders without triggering updates |
| `(home)/index.tsx` | `previousFactorRef` | Hysteresis calculations | Correct - mutable tracking for slowdown logic |
| `(learn)/presets.tsx` | `lfoRef` | Local LFO instance | Correct - object reference |
| `(learn)/waveforms.tsx` | `lfoRef` | Local LFO instance | Correct - object reference |

**Verdict**: All refs are used appropriately. No refs should be converted to state.

### 1.2 Ref Initialization

| File | Ref | Initialization | Assessment |
|------|-----|----------------|------------|
| `preset-context.tsx:101` | `debounceRef` | `useRef<ReturnType<typeof setTimeout> \| null>(null)` | Properly typed with nullable initial |
| `preset-context.tsx:106` | `lfoRef` | `useRef<LFO \| null>(null)` | Correct - created later in useEffect |
| `preset-context.tsx:107` | `animationRef` | `useRef<number>(0)` | Correct - 0 is valid "no animation" state |
| `preset-context.tsx:112` | `wasRunningBeforeBackgroundRef` | `useRef<boolean>(false)` | Correct - explicit false default |
| `preset-context.tsx:113` | `appStateRef` | `useRef<AppStateStatus>(AppState.currentState)` | Correct - sync'd to actual state |
| `preset-context.tsx:115` | `isPausedRef` | `useRef(false)` | Correct - matches initial isPaused state |
| `CenterValueSlider.tsx:24` | `lastCommittedValue` | `useRef(value)` | Correct - initialized from prop |
| `ParameterSlider.tsx:33` | `lastCommittedValue` | `useRef(value)` | Correct - initialized from prop |
| `useSlowMotionPhase.ts:36` | `prevFactorRef` | `useRef(slowdownFactor)` | Correct - initialized from prop |
| `(home)/index.tsx:56` | `previousFactorRef` | `useRef(1)` | **Note**: Could initialize from actual slowdownInfo |

### 1.3 Typing Analysis

All refs are properly typed except for a few with inferred types:

```typescript
// Explicitly typed (good)
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const lfoRef = useRef<LFO | null>(null);
const animationRef = useRef<number>(0);
const wasRunningBeforeBackgroundRef = useRef<boolean>(false);
const appStateRef = useRef<AppStateStatus>(AppState.currentState);

// Inferred types (acceptable but could be explicit)
const isPausedRef = useRef(false);  // inferred as boolean
const lastCommittedValue = useRef(value);  // inferred from prop type
const prevFactorRef = useRef(slowdownFactor);  // inferred as number
```

**Recommendation**: The inferred types are clear from context. No changes needed.

---

## 2. Animation Refs Analysis

### 2.1 Animation Frame Management

**File: `/Users/brent/wtlfo/src/context/preset-context.tsx`**

```typescript
// Animation loop setup (lines 209-221)
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

**Assessment**:
- Cleanup is proper with `cancelAnimationFrame` in cleanup function
- The ref is updated before calling `requestAnimationFrame` again
- Null check on `lfoRef.current` prevents crashes

### 2.2 Background State Handling

```typescript
// Lines 224-272 - AppState handling
useEffect(() => {
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    // ...
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;  // Reset to 0 to indicate no animation
    }
    // ...
    if (wasRunningBeforeBackgroundRef.current && !isPausedRef.current) {
      const animate = (timestamp: number) => { /* ... */ };
      animationRef.current = requestAnimationFrame(animate);
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription.remove();
}, [lfoPhase, lfoOutput]);
```

**Assessment**:
- Uses `animationRef.current = 0` as sentinel value to track "no animation"
- Properly checks sentinel before canceling
- Restarts animation correctly on foreground return

### 2.3 Local Component Animation Loops

**File: `/Users/brent/wtlfo/app/(learn)/presets.tsx`** and **`waveforms.tsx`**

```typescript
useEffect(() => {
  lfoRef.current = new LFO(config, bpm);
  // ...
  let animationId: number;
  const animate = (timestamp: number) => {
    // ...
    animationId = requestAnimationFrame(animate);
  };
  animationId = requestAnimationFrame(animate);

  return () => cancelAnimationFrame(animationId);
}, [config, bpm, phase, output]);
```

**Assessment**:
- Uses local variable `animationId` instead of ref (acceptable for local scope)
- Proper cleanup in effect return
- No race conditions - effect cleanup handles unmount/dependency changes

**Potential Issue**: These components create their own LFO instances and animation loops, separate from the main `PresetProvider`. This is intentional for isolated previews but worth noting for memory/battery awareness.

---

## 3. Previous Value Refs Analysis

### 3.1 Slider Components Pattern

Both `CenterValueSlider.tsx` and `ParameterSlider.tsx` use identical patterns:

```typescript
const lastCommittedValue = useRef(value);

// Sync when prop changes externally
React.useEffect(() => {
  if (value !== lastCommittedValue.current) {
    setLocalValue(value);
    lastCommittedValue.current = value;
  }
}, [value]);

// In handler
const handleValueChange = useCallback((newValue: number) => {
  setLocalValue(newValue);
  const rounded = Math.round(newValue);
  if (rounded !== lastCommittedValue.current) {
    lastCommittedValue.current = rounded;
    onChange(rounded);
  }
}, [onChange]);
```

**Assessment**: This is a valid pattern for:
1. Preventing duplicate `onChange` calls
2. Syncing external prop changes
3. Avoiding unnecessary parent re-renders

**Alternative**: Could use `usePrevious` hook, but current implementation is clearer for this specific "last committed" semantics.

### 3.2 useSlowMotionPhase Pattern

```typescript
const prevFactorRef = useRef(slowdownFactor);

useEffect(() => {
  const oldFactor = prevFactorRef.current;
  const factorChanged = Math.abs(oldFactor - slowdownFactor) > 0.01;
  // ...
  prevFactorRef.current = slowdownFactor;

  if (factorChanged) {
    // Reset animations
  }
}, [slowdownFactor, ...]);
```

**Assessment**: Correct use for detecting changes and comparing values across renders.

### 3.3 Home Screen Hysteresis

```typescript
// (home)/index.tsx
const previousFactorRef = useRef(1);
const slowdownInfo = getSlowdownInfo(timingInfo.cycleTimeMs, previousFactorRef.current);
previousFactorRef.current = slowdownInfo.factor;
```

**Assessment**: This is updating a ref during render, which is technically safe but unconventional. The `getSlowdownInfo` function uses the previous factor for hysteresis calculations.

**Recommendation**: Consider moving this to a `useMemo` with explicit previous value tracking, or document why render-time mutation is acceptable here.

---

## 4. Mutable Refs Safety Analysis

### 4.1 Stale Closure Prevention

**Good Pattern - `isPausedRef`**:
```typescript
const isPausedRef = useRef(false);

// Keep in sync
useEffect(() => {
  isPausedRef.current = isPaused;
}, [isPaused]);

// Use in event handler (avoids stale closure)
const handleAppStateChange = (nextAppState: AppStateStatus) => {
  wasRunningBeforeBackgroundRef.current = !isPausedRef.current && ...;
  // ...
  if (wasRunningBeforeBackgroundRef.current && !isPausedRef.current) { ... }
};
```

**Assessment**: This is a well-documented pattern for accessing current state values in event handlers that have stale closures. The sync effect runs synchronously after state changes.

### 4.2 Timing of Updates

| Ref | When Updated | Risk |
|-----|--------------|------|
| `debounceRef` | In useEffect | Safe |
| `lfoRef` | In useEffect | Safe |
| `animationRef` | In useEffect + event handler | Safe (proper cleanup) |
| `wasRunningBeforeBackgroundRef` | In event handler | Safe |
| `appStateRef` | In event handler | Safe |
| `isPausedRef` | In useEffect | Safe |
| `lastCommittedValue` | In callback + useEffect | Safe |
| `prevFactorRef` | In useEffect | Safe |
| `previousFactorRef` | During render | **Unconventional** |

### 4.3 Risk Assessment

**No Critical Issues Found**

Minor observation: The `previousFactorRef` update during render works because:
1. It's deterministic (same inputs = same outputs)
2. The component doesn't rely on the old value elsewhere in the same render
3. React's concurrent features don't affect this usage in the current implementation

---

## 5. Component Refs / forwardRef Analysis

### 5.1 Current Status

**No `forwardRef` or `useImperativeHandle` usage found in the codebase.**

### 5.2 Assessment

This is appropriate because:
1. No components expose imperative methods to parents
2. The LFO controls are managed through context, not refs
3. No native components need direct ref access for measurement/focus

### 5.3 Potential Use Cases (Not Currently Needed)

- If `LFOVisualizer` needed to expose methods like `seek(phase)` or `pause()`
- If sliders needed programmatic focus control
- If canvas needed direct drawing commands

**Current architecture uses context and callbacks, which is the preferred React pattern.**

---

## 6. Reanimated SharedValue Analysis

### 6.1 Initialization Patterns

**Proper Initialization**:
```typescript
// preset-context.tsx
const lfoPhase = useSharedValue(0);
const lfoOutput = useSharedValue(0);

// LFOVisualizer.tsx
const internalPhase = useSharedValue(typeof phase === 'number' ? phase : 0);
const internalOutput = useSharedValue(typeof output === 'number' ? output : 0);
const phaseIndicatorOpacity = useSharedValue(1);

// useSlowMotionPhase.ts
const displayPhase = useSharedValue(realPhase.value);  // Initialized from another SharedValue
const lastRealPhase = useSharedValue(realPhase.value);
const factorValue = useSharedValue(slowdownFactor);
const frameCount = useSharedValue(0);
const realCycleCount = useSharedValue(0);
const displayCycleCount = useSharedValue(0);

// DestinationMeter.tsx
const animatedCenterValue = useSharedValue(centerValue);
const animatedLowerBound = useSharedValue(targetLowerBound);
const animatedUpperBound = useSharedValue(targetUpperBound);

// PhaseIndicator.tsx
const defaultOpacity = useSharedValue(1);
```

**All initializations are correct** - values are initialized from props/constants, not left undefined.

### 6.2 Type Safety

The codebase properly types SharedValue usage:

```typescript
// Type imports
import type { SharedValue } from 'react-native-reanimated';

// Interface definitions
interface PresetContextValue {
  lfoPhase: SharedValue<number>;
  lfoOutput: SharedValue<number>;
  lfoRef: React.MutableRefObject<LFO | null>;
}

// Function parameters
function useSlowMotionPhase(
  realPhase: SharedValue<number>,
  slowdownFactor: number
): SharedValue<number> { ... }

// Props with union types
interface LFOVisualizerProps {
  phase: number | SharedValue<number>;
  output: number | SharedValue<number>;
}
```

### 6.3 Worklet Usage

**Good Patterns**:
```typescript
// useDerivedValue with worklet
const displayOutput = useDerivedValue(() => {
  'worklet';
  const rawOutput = sampleWaveformWorklet(waveformForWorklet, displayPhase.value);
  return rawOutput * (depthForWorklet / 63);
}, [waveformForWorklet, depthForWorklet]);

// useAnimatedReaction for side effects
useAnimatedReaction(
  () => realPhase.value,
  (currentPhase) => {
    'worklet';
    // Complex animation logic
  },
  [realPhase]
);
```

### 6.4 JS-Thread/UI-Thread Communication

**Proper Pattern**:
```typescript
// DestinationMeter.tsx - runOnJS for React state updates
useAnimatedReaction(
  () => ({ output: lfoOutput.value, center: animatedCenterValue.value }),
  ({ output, center }) => {
    const value = Math.round(...);
    runOnJS(setCurrentValue)(value);  // Correct - uses runOnJS
  },
  [maxModulation, min, max]
);
```

**Potential Issue - Animation Loop**:
```typescript
// preset-context.tsx
const animate = (timestamp: number) => {
  if (lfoRef.current) {
    const state = lfoRef.current.update(timestamp);
    lfoPhase.value = state.phase;    // Writing to SharedValue from JS thread
    lfoOutput.value = state.output;  // Writing to SharedValue from JS thread
  }
  animationRef.current = requestAnimationFrame(animate);
};
```

**Assessment**: This is acceptable because:
1. The LFO engine runs on JS thread (not a native module)
2. SharedValue writes from JS thread are valid (just less performant than worklet)
3. The animation reads these values in worklets, which is fine

For maximum performance, the LFO could be implemented as a Worklet, but the current architecture prioritizes simplicity and works well.

---

## 7. Recommendations

### 7.1 High Priority

None - the codebase demonstrates good ref practices.

### 7.2 Medium Priority

1. **Document render-time ref mutation** in `(home)/index.tsx`:
   ```typescript
   // The previous factor ref is updated during render for hysteresis.
   // This is safe because getSlowdownInfo is pure and deterministic.
   const previousFactorRef = useRef(1);
   ```

2. **Consider extracting the slider "last committed value" pattern** into a custom hook if it's used in more places:
   ```typescript
   function useCommittedValue<T>(value: T, isEqual = Object.is) {
     const [localValue, setLocalValue] = useState(value);
     const lastCommitted = useRef(value);
     // ...
   }
   ```

### 7.3 Low Priority

1. **Add explicit types to inferred refs** for consistency (optional):
   ```typescript
   const isPausedRef = useRef<boolean>(false);
   const prevFactorRef = useRef<number>(slowdownFactor);
   ```

2. **Initialize `previousFactorRef` from computed value** (optional):
   ```typescript
   // Instead of
   const previousFactorRef = useRef(1);
   // Could be
   const previousFactorRef = useRef(
     getSlowdownInfo(timingInfo.cycleTimeMs, 1).factor
   );
   ```

---

## 8. Files Reviewed

| File | Refs Found | Issues |
|------|------------|--------|
| `/Users/brent/wtlfo/src/context/preset-context.tsx` | 6 | None |
| `/Users/brent/wtlfo/src/context/modulation-context.tsx` | 0 | N/A |
| `/Users/brent/wtlfo/src/components/destination/CenterValueSlider.tsx` | 1 | None |
| `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx` | 1 | None |
| `/Users/brent/wtlfo/src/components/lfo/hooks/useSlowMotionPhase.ts` | 1 | None |
| `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx` | 0 (uses SharedValues) | None |
| `/Users/brent/wtlfo/src/components/lfo/PhaseIndicator.tsx` | 0 (uses SharedValues) | None |
| `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx` | 0 (uses SharedValues) | None |
| `/Users/brent/wtlfo/src/hooks/useModulatedValue.ts` | 0 (uses SharedValues) | None |
| `/Users/brent/wtlfo/app/(home)/index.tsx` | 1 | Minor (render-time mutation) |
| `/Users/brent/wtlfo/app/(learn)/presets.tsx` | 1 | None |
| `/Users/brent/wtlfo/app/(learn)/waveforms.tsx` | 1 | None |

---

## 9. Conclusion

The codebase demonstrates **excellent ref usage patterns** overall:

- **Refs vs State**: All refs correctly store values that don't need to trigger re-renders
- **Animation Management**: Proper cleanup and race condition prevention
- **Stale Closure Handling**: The `isPausedRef` pattern correctly syncs state for event handlers
- **Reanimated Integration**: SharedValues are properly initialized, typed, and used in worklets
- **No forwardRef Needed**: The context-based architecture is appropriate for this app

The only minor observation is the render-time ref mutation in the home screen, which works correctly but could benefit from documentation.
