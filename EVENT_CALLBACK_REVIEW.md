# Event Handling and Callback Patterns Review

## Summary

This review analyzes the callback patterns, event handling, and effect management in the WTLFO React Native app. Overall, the codebase demonstrates solid callback patterns with proper use of `useCallback`, stable dependencies, and well-structured animation callbacks. There are a few areas for improvement noted below.

---

## 1. Callback Stability

### Findings

#### Well-Implemented `useCallback` Usage

**ModulationContext** (`/Users/brent/wtlfo/src/context/modulation-context.tsx`):
- All callbacks (`setCenterValue`, `getCenterValue`, `setRouting`, `getRouting`, `setRoutingAmount`, `setActiveDestinationId`) are properly wrapped in `useCallback`
- Dependencies are correctly specified

```typescript
const setCenterValue = useCallback((destinationId: DestinationId, value: number) => {
  if (destinationId === 'none') return;
  setCenterValues(prev => ({ ...prev, [destinationId]: value }));
}, []);

const setActiveDestinationId = useCallback((id: DestinationId) => {
  setRouting('lfo1', id);
}, [setRouting]);
```

**PresetContext** (`/Users/brent/wtlfo/src/context/preset-context.tsx`):
- All major callbacks are properly memoized: `setActivePreset`, `setBPM`, `updateParameter`, `resetToPreset`, `triggerLFO`, `startLFO`, `stopLFO`, `isLFORunning`
- Dependencies correctly managed

**ParameterSlider** (`/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx`):
- Properly uses `useCallback` for `handleValueChange`, `handleSlidingStart`, `handleSlidingComplete`

#### Issues Found

**Issue 1: `getCenterValue` has stale closure risk**
Location: `/Users/brent/wtlfo/src/context/modulation-context.tsx`, lines 80-87

```typescript
const getCenterValue = useCallback((destinationId: DestinationId): number => {
  if (destinationId === 'none') return 0;
  if (centerValues[destinationId] !== undefined) {
    return centerValues[destinationId]!;
  }
  const def = DESTINATIONS.find(d => d.id === destinationId);
  return def?.defaultValue ?? 64;
}, [centerValues]);  // Depends on centerValues
```

**Severity**: Low - The dependency is correctly declared, so this works properly. The callback recreates when `centerValues` changes, which is the intended behavior.

**Issue 2: Missing `useCallback` in component handlers**
Location: `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx`, line 26

```typescript
const handleSelect = (id: DestinationId) => {
  Haptics.selectionAsync();
  setActiveDestinationId(id);
  setIsOpen(false);
};
```

**Severity**: Low - This is inside a component that doesn't pass this handler to memoized children, so re-creation on render is acceptable here.

---

## 2. Event Handler Patterns

### Findings

#### Inline Arrow Functions in Props

**Issue 3: Multiple inline arrow functions in JSX**

Location: `/Users/brent/wtlfo/src/components/ParameterEditor.tsx`, lines 38-95
```typescript
<SegmentedControl
  onChange={(value) => updateParameter('waveform', value)}
/>
<ParameterSlider
  onChange={(value) => updateParameter('speed', Math.round(value))}
/>
```

Location: `/Users/brent/wtlfo/src/components/params/ParamGrid.tsx`, lines 79-136
```typescript
onPress={() => handlePress('speed')}
onPress={() => handlePress('multiplier')}
// ... etc for all 8 parameters
```

**Severity**: Low-Medium - These create new function references on every render. Since `ParamGrid` and `QuickEditPanel` are relatively simple components and `ParamBox`/`SegmentedControl` don't use `React.memo`, this doesn't cause cascading re-renders. However, wrapping in `useCallback` would be more optimal.

**Recommendation**: Consider extracting handlers if performance becomes an issue:
```typescript
const handleSpeedPress = useCallback(() => handlePress('speed'), [handlePress]);
```

#### Properly Handled Event Data

**ParameterSlider** correctly extracts and processes event data:
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

---

## 3. Callback Props

### Findings

#### Consistent onChange/onPress Patterns

The codebase follows consistent patterns:
- `onChange` for value changes (sliders, segmented controls)
- `onPress` for button/pressable interactions
- `onSlidingStart`/`onSlidingEnd` for slider interaction lifecycle

**Good Example** (`/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx`):
```typescript
interface ParameterSliderProps {
  onChange: (value: number) => void;
  onSlidingStart?: () => void;  // Optional
  onSlidingEnd?: () => void;    // Optional
}
```

#### Callbacks Invoked at Right Times

**ParameterSlider** properly invokes callbacks:
- `onChange` called on value change (debounced by rounding check)
- `onSlidingStart` called when user starts interaction
- `onSlidingComplete` called when user releases

**Issue 4: Optional callback not null-checked before call**
Location: `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx`, lines 55-57

```typescript
const handleSlidingStart = useCallback(() => {
  onSlidingStart?.();  // Correct: using optional chaining
}, [onSlidingStart]);
```

**Status**: Already handled correctly with optional chaining.

---

## 4. Async Callbacks

### Findings

#### Safe Async Handling

**ErrorBoundary** (`/Users/brent/wtlfo/src/components/ErrorBoundary.tsx`):
```typescript
handleRestart = async (): Promise<void> => {
  try {
    if (Updates.isEnabled) {
      await Updates.reloadAsync();
    } else {
      this.setState({ ... });
    }
  } catch (e) {
    console.error('Failed to reload app:', e);
    this.setState({ ... });
  }
};
```

**Severity**: N/A - Proper try/catch with fallback behavior.

#### Haptics Async Calls

Location: `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx`
```typescript
const handleSelect = (id: DestinationId) => {
  Haptics.selectionAsync();  // Fire-and-forget
  setActiveDestinationId(id);
  setIsOpen(false);
};
```

**Severity**: Low - `Haptics.selectionAsync()` is intentionally fire-and-forget. No error handling needed as haptic failure shouldn't block UI.

#### Potential Race Condition

**Issue 5: Storage persistence without error handling for race conditions**
Location: `/Users/brent/wtlfo/src/context/preset-context.tsx`, lines 134-142

```typescript
const setActivePreset = useCallback((index: number) => {
  setActivePresetState(index);
  try {
    Storage.setItemSync(STORAGE_KEY, String(index));  // Sync operation
  } catch {
    console.warn('Failed to save preset');
  }
}, []);
```

**Severity**: Low - Using synchronous storage APIs prevents race conditions. The try/catch handles potential storage failures appropriately.

---

## 5. Effect Callbacks

### Findings

#### Cleanup Functions

**PresetContext animation loop cleanup**:
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

  return () => cancelAnimationFrame(animationRef.current);  // Proper cleanup
}, [lfoPhase, lfoOutput]);
```

**AppState listener cleanup**:
```typescript
useEffect(() => {
  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription.remove();  // Proper cleanup
}, [lfoPhase, lfoOutput]);
```

**Issue 6: Debounce timer cleanup is correct**
Location: `/Users/brent/wtlfo/src/context/preset-context.tsx`, lines 119-132

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

**Status**: Correctly clears both on effect re-run and unmount.

#### Effect Dependencies

**Issue 7: Effect with many dependencies may fire too frequently**
Location: `/Users/brent/wtlfo/src/context/preset-context.tsx`, lines 180-206

```typescript
useEffect(() => {
  lfoRef.current = new LFO(debouncedConfig, bpm);
  // ... timing calculations and setup
  setIsPaused(false);
}, [debouncedConfig, bpm, lfoPhase, lfoOutput]);
```

**Severity**: Low - `lfoPhase` and `lfoOutput` are SharedValues that don't change identity (created once with `useSharedValue`), so they don't trigger re-runs. This is intentional and correct.

**Issue 8: `useSlowMotionPhase` effect has exhaustive dependencies**
Location: `/Users/brent/wtlfo/src/components/lfo/hooks/useSlowMotionPhase.ts`, lines 39-54

```typescript
useEffect(() => {
  // ... reset logic
}, [slowdownFactor, factorValue, displayPhase, realPhase, lastRealPhase, frameCount, realCycleCount, displayCycleCount]);
```

**Status**: All dependencies are SharedValues or primitives. SharedValues don't change identity, so only `slowdownFactor` changes trigger this effect.

---

## 6. Animation Callbacks

### Findings

#### Worklet Callbacks

**PhaseIndicator** (`/Users/brent/wtlfo/src/components/lfo/PhaseIndicator.tsx`):
```typescript
const xPosition = useDerivedValue(() => {
  'worklet';
  const phaseVal = typeof phase === 'number' ? phase : phase.value;
  const displayPhase = ((phaseVal - startPhaseNormalized) % 1 + 1) % 1;
  return padding + displayPhase * drawWidth;
}, [phase, padding, drawWidth, startPhaseNormalized]);
```

**Status**: Correct worklet usage with `'worklet'` directive.

#### Animation Completion Callbacks

**Issue 9: Spring animations without completion callbacks**
Location: `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`, lines 78-83

```typescript
useEffect(() => {
  animatedCenterValue.value = withSpring(centerValue, springConfig);
  animatedLowerBound.value = withSpring(targetLowerBound, springConfig);
  animatedUpperBound.value = withSpring(targetUpperBound, springConfig);
}, [centerValue, targetLowerBound, targetUpperBound]);
```

**Severity**: Low - Completion callbacks are not needed here since we don't need to know when the animation finishes.

#### Gesture Callbacks

No gesture handler implementations found in the reviewed components. The app uses standard touch handling via `Pressable` components.

#### `useAnimatedReaction` Usage

**Correct pattern in DestinationMeter**:
```typescript
useAnimatedReaction(
  () => ({ output: lfoOutput.value, center: animatedCenterValue.value }),
  ({ output, center }) => {
    const modulationAmount = output * maxModulation;
    const value = Math.round(Math.max(min, Math.min(max, center + modulationAmount)));
    runOnJS(setCurrentValue)(value);
  },
  [maxModulation, min, max]
);
```

**Status**: Properly uses `runOnJS` to update React state from worklet context.

**OutputValueDisplay**:
```typescript
useAnimatedReaction(
  () => output.value,
  (currentValue) => {
    runOnJS(updateDisplay)(currentValue);
  },
  [output]
);
```

**Status**: Correct usage pattern.

---

## 7. Parent-Child Communication

### Findings

#### Callback Prop Drilling

**Good structure**: Context providers (`PresetProvider`, `ModulationProvider`) at root level prevent excessive prop drilling for shared state.

**ParamGrid to ParamBox**:
```typescript
// ParamGrid passes onPress directly
<ParamBox
  onPress={() => handlePress('speed')}
/>

// ParamBox receives and uses it
export function ParamBox({ onPress }: ParamBoxProps) {
  return <Pressable onPress={onPress} />;
}
```

**Severity**: N/A - One level of prop passing is appropriate.

#### Missing Callback Props

**Issue 10: `LFOVisualizer` lacks interaction callbacks**
Location: `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx`

The visualizer sets `pointerEvents="none"`, which is intentional, but the parent component in `HomeScreen` wraps it in a `Pressable`. This works but creates a slight coupling.

```typescript
// In HomeScreen:
<Pressable onPress={handleTap}>
  <LFOVisualizer ... />
</Pressable>
```

**Severity**: Low - Current pattern works. An `onTap` prop on `LFOVisualizer` would provide better encapsulation but isn't strictly necessary.

#### Event Bubbling

The app correctly handles event propagation through React Native's touch responder system. No issues found with event bubbling.

---

## Summary of Issues

| Issue | Severity | Location | Description |
|-------|----------|----------|-------------|
| 1 | Low | modulation-context.tsx:80-87 | `getCenterValue` recreates on centerValues change (by design) |
| 2 | Low | DestinationPicker.tsx:26 | Handler not wrapped in useCallback |
| 3 | Low-Medium | ParameterEditor.tsx, ParamGrid.tsx | Inline arrow functions in JSX props |
| 4 | N/A | ParameterSlider.tsx:55-57 | Already handled with optional chaining |
| 5 | Low | preset-context.tsx:134-142 | Storage uses sync API (no race condition) |
| 6 | N/A | preset-context.tsx:119-132 | Debounce cleanup is correct |
| 7 | Low | preset-context.tsx:180-206 | SharedValue deps don't cause re-runs |
| 8 | N/A | useSlowMotionPhase.ts:39-54 | Dependencies are correct |
| 9 | Low | DestinationMeter.tsx:78-83 | No completion callbacks needed |
| 10 | Low | LFOVisualizer.tsx | Lacks onTap prop (parent handles it) |

---

## Recommendations

### High Priority
None - the codebase demonstrates solid callback and event handling patterns.

### Medium Priority

1. **Consider memoizing inline handlers in ParamGrid** if you notice performance issues during profiling:
   ```typescript
   const handlers = useMemo(() => ({
     speed: () => handlePress('speed'),
     multiplier: () => handlePress('multiplier'),
     // ... etc
   }), [handlePress]);
   ```

### Low Priority

2. **Add `useCallback` to `DestinationPicker.handleSelect`** for consistency:
   ```typescript
   const handleSelect = useCallback((id: DestinationId) => {
     Haptics.selectionAsync();
     setActiveDestinationId(id);
     setIsOpen(false);
   }, [setActiveDestinationId]);
   ```

3. **Consider adding `onTap` callback prop to LFOVisualizer** for better encapsulation:
   ```typescript
   interface LFOVisualizerProps {
     onTap?: () => void;
   }
   ```

---

## Positive Patterns Observed

1. **Consistent use of `useCallback`** in context providers
2. **Proper effect cleanup** for animation loops and event listeners
3. **Correct `runOnJS` usage** in worklet callbacks
4. **Optional callback props** with proper null checks using optional chaining
5. **Context-based state management** reduces prop drilling
6. **Synchronous storage operations** avoid race conditions
7. **Refs used appropriately** for values that shouldn't trigger re-renders
8. **Proper worklet directives** in animation code
9. **Debouncing pattern** correctly implemented with cleanup
10. **AppState handling** with proper background/foreground state tracking
