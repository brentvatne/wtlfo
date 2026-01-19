# React Re-render Analysis Report

## Executive Summary

This analysis examines re-render patterns in the wtlfo React Native app, focusing on performance optimization opportunities. The app implements an LFO (Low Frequency Oscillator) visualizer with real-time animations, making render optimization critical for smooth 60fps performance.

**Overall Assessment: Good** - The codebase demonstrates solid understanding of React performance patterns, with strategic use of Reanimated for UI thread animations. However, there are specific areas where re-renders could be reduced.

---

## 1. Render Causes Analysis

### Current Re-render Triggers

#### HomeScreen (`/app/(home)/index.tsx`)
The main screen re-renders when:
- `usePreset()` context values change (currentConfig, bpm, isEditing, isPaused, timingInfo)
- `useModulation()` context values change (activeDestinationId, getCenterValue)
- `useWindowDimensions()` returns new width (orientation change)
- `slowdownInfo` recalculates on timingInfo change

**Key Observation**: The component destructures many values from contexts, making it susceptible to re-renders on any context state change.

#### Context-Triggered Re-renders
```typescript
// preset-context.tsx - Lines 280-305
const value: PresetContextValue = {
  activePreset,
  preset: PRESETS[activePreset],  // New object ref on activePreset change
  setActivePreset,
  presets: PRESETS,  // Static - good
  currentConfig,     // Changes on slider interaction
  debouncedConfig,   // Changes 100ms after slider stops
  isEditing,         // Changes on slider touch/release
  // ... more values
};
```

### Render Tracking/Debugging
**Finding**: No render tracking utilities are implemented.

**Recommendation**: Consider adding React DevTools Profiler markers or a development-only render counter for complex components like `LFOVisualizer`.

---

## 2. Memo Usage Analysis

### Components NOT Using React.memo

| Component | Location | Recommendation |
|-----------|----------|----------------|
| `ParamBox` | `/src/components/params/ParamBox.tsx` | **Should memo** - Rendered 8x in grid, props rarely change together |
| `ParamGrid` | `/src/components/params/ParamGrid.tsx` | Consider memo - Only props are optional callbacks |
| `TimingInfo` | `/src/components/lfo/TimingInfo.tsx` | **Should memo** - Pure render based on props |
| `GridLines` | `/src/components/lfo/GridLines.tsx` | **Should memo** - Static grid, only changes on resize |
| `ParameterBadges` | `/src/components/lfo/ParameterBadges.tsx` | **Should memo** - Renders multiple Text components |
| `WaveformDisplay` | `/src/components/lfo/WaveformDisplay.tsx` | Memo may help - Skia Path generation is expensive |
| `FadeEnvelope` | `/src/components/lfo/FadeEnvelope.tsx` | Memo may help - Similar to WaveformDisplay |

### Components Correctly NOT Memoized

| Component | Reason |
|-----------|--------|
| `HomeScreen` | Root component, memo wouldn't help |
| `LFOVisualizer` | Many props change frequently during animation |
| `PhaseIndicator` | Uses animated SharedValues, memo wouldn't prevent Skia redraws |

### Over-memoization Assessment
**Finding**: No over-memoization detected. If anything, there's under-memoization.

---

## 3. Context Re-render Analysis

### PresetContext (`/src/context/preset-context.tsx`)

**Issue: Monolithic Context Value Object**

Every state change creates a new context value object, causing ALL consumers to re-render:

```typescript
// Line 280-305: Every property change triggers new value object
const value: PresetContextValue = {
  activePreset,
  preset: PRESETS[activePreset],
  setActivePreset,
  presets: PRESETS,
  currentConfig,      // Slider changes
  debouncedConfig,    // 100ms after slider
  isEditing,          // Slider touch state
  bpm,
  setBPM,
  lfoPhase,           // SharedValue (stable ref)
  lfoOutput,          // SharedValue (stable ref)
  // ...
};
```

**Cascading Render Example**:
When a slider is dragged:
1. `setIsEditing(true)` - triggers re-render
2. `updateParameter()` - triggers re-render
3. Debounce timeout - triggers re-render with `debouncedConfig`
4. `setIsEditing(false)` - triggers re-render

**Total: 4+ re-renders per slider interaction**

### ModulationContext (`/src/context/modulation-context.tsx`)

**Similar Issue**: Single context object containing multiple state pieces.

```typescript
// Line 117-127
const value: ModulationContextValue = {
  centerValues,           // Changes on slider
  setCenterValue,         // Stable callback
  getCenterValue,         // Recreates on centerValues change!
  routings,               // Changes on destination change
  // ...
};
```

**Critical Issue - getCenterValue recreates on every centerValues change**:
```typescript
// Line 80-87 - useCallback has [centerValues] dependency
const getCenterValue = useCallback((destinationId: DestinationId): number => {
  if (destinationId === 'none') return 0;
  if (centerValues[destinationId] !== undefined) {
    return centerValues[destinationId]!;
  }
  // ...
}, [centerValues]);  // <-- Recreates on every center value change
```

### Recommendations for Context Optimization

1. **Split contexts by update frequency**:
   - `PresetConfigContext` - currentConfig, updateParameter (high frequency)
   - `PresetAnimationContext` - lfoPhase, lfoOutput (SharedValues, stable)
   - `PresetMetaContext` - activePreset, presets, bpm (low frequency)

2. **Use selector pattern or dedicated hooks**:
   ```typescript
   // Instead of: const { currentConfig } = usePreset();
   // Consider: const currentConfig = usePresetConfig();
   ```

3. **Memoize the context value object**:
   ```typescript
   const value = useMemo(() => ({
     // ...all values
   }), [/* explicit dependencies */]);
   ```

---

## 4. Prop Stability Analysis

### Unstable Object/Array Props

#### HomeScreen
```typescript
// Line 93-96: Inline style object created every render
<ScrollView
  style={{ flex: 1, backgroundColor: colors.background }}  // Unstable!
  contentContainerStyle={{ paddingBottom: 20 }}            // Unstable!
```

**Fix**: Move to StyleSheet or useMemo.

#### LFOVisualizer Props
```typescript
// Line 107-129: Many props passed, but most are primitives (stable)
<LFOVisualizer
  phase={displayPhase}           // SharedValue - stable ref
  output={lfoOutput}             // SharedValue - stable ref
  waveform={currentConfig.waveform as WaveformType}  // Primitive - stable
  theme={ELEKTRON_THEME}         // Imported constant - stable
  // ...
/>
```
**Assessment**: Props are generally stable due to SharedValue usage.

### Callback Memoization

#### Well-memoized callbacks in contexts:
```typescript
// preset-context.tsx Lines 134-168
const setActivePreset = useCallback((index: number) => { ... }, []);
const setBPM = useCallback((newBPM: number) => { ... }, []);
const updateParameter = useCallback(<K>(...) => { ... }, []);
```

#### Inline callbacks in JSX (Unstable):

**HomeScreen** (`/app/(home)/index.tsx`):
```typescript
// Line 173: Inline arrow function
onChange={(value) => hasDestination && setCenterValue(activeDestinationId, value)}
```

**ParamGrid** (`/src/components/params/ParamGrid.tsx`):
```typescript
// Lines 79, 87, 93, etc.: Inline arrow functions for each ParamBox
onPress={() => handlePress('speed')}
onPress={() => handlePress('multiplier')}
```

**DestinationMeter** (`/src/components/destination/DestinationMeter.tsx`):
```typescript
// Lines 90-98: Inline object in useAnimatedReaction dependency
useAnimatedReaction(
  () => ({ output: lfoOutput.value, center: animatedCenterValue.value }),  // New object each call
  ...
)
```

### Inline Definitions in JSX

| File | Line | Issue | Impact |
|------|------|-------|--------|
| HomeScreen | 93 | `style={{ flex: 1, ... }}` | Low (ScrollView) |
| HomeScreen | 173 | `onChange={(value) => ...}` | Medium (CenterValueSlider) |
| ParamGrid | 79-136 | `onPress={() => handlePress(...)}` | Medium (8 callbacks) |
| GridLines | 21-29, 33-41 | Objects in loop, but JSX elements are stable | Low |

---

## 5. State Placement Analysis

### Appropriate State Placement

#### CenterValueSlider - Local State for Responsiveness
```typescript
// /src/components/destination/CenterValueSlider.tsx Lines 22-31
const [localValue, setLocalValue] = useState(value);
const lastCommittedValue = useRef(value);
```
**Assessment**: Excellent pattern - local state for smooth UI, commits to parent only on change.

#### ParameterSlider - Same Pattern
```typescript
// /src/components/controls/ParameterSlider.tsx Lines 32-40
const [localValue, setLocalValue] = useState(value);
const lastCommittedValue = useRef(value);
```
**Assessment**: Consistent, well-implemented.

### State That Could Be Lower

#### PresetContext `isEditing` State
```typescript
// preset-context.tsx Line 99
const [isEditing, setIsEditing] = useState(false);
```

**Issue**: Global editing state causes all context consumers to re-render when ANY slider is touched.

**Alternative**: Pass `isEditing` to specific components that need it via props, or use a separate context for editing state.

### State That Could Be Lifted

**DestinationMeter `currentValue` State**:
```typescript
// Line 86
const [currentValue, setCurrentValue] = useState(centerValue);
```

This is correctly local since it's only used for display within this component.

---

## 6. Expensive Render Analysis

### Computationally Expensive Components

#### 1. WaveformDisplay / useWaveformPath
**Location**: `/src/components/lfo/hooks/useWaveformPath.ts`

```typescript
// Lines 38-91: Path generation in useMemo
return useMemo(() => {
  const path = Skia.Path.Make();
  for (let i = 0; i <= resolution; i++) {  // 128+ iterations
    // ... math operations
    path.lineTo(x, y);
  }
  return path;
}, [waveform, width, height, resolution, padding, depth, startPhase, closePath]);
```

**Impact**: Creates Skia path with 128+ points. Memoization is correctly applied.

**Optimization Opportunity**: Consider caching paths for common waveforms at fixed sizes.

#### 2. FadeEnvelope
**Location**: `/src/components/lfo/FadeEnvelope.tsx`

```typescript
// Lines 42-93: Similar path generation
const path = useMemo(() => {
  const p = Skia.Path.Make();
  for (let i = 0; i <= resolution; i++) { ... }
  return p;
}, [waveform, width, height, resolution, depthScale, fade, startPhaseNormalized]);
```

**Assessment**: Properly memoized.

#### 3. GridLines
**Location**: `/src/components/lfo/GridLines.tsx`

```typescript
// Lines 14-45: Creates arrays of JSX elements
const verticalLines = [];
const horizontalLines = [];
for (let i = 0; i <= verticalDivisions; i++) { ... }
for (let i = 0; i <= horizontalDivisions; i++) { ... }
```

**Issue**: Recreates arrays on every render. Component should be wrapped in React.memo.

#### 4. DestinationMeter Grid Lines
```typescript
// Lines 171-184: Similar pattern
const gridLines = [];
for (let i = 0; i <= gridDivisions; i++) {
  gridLines.push(<Line key={...} ... />);
}
```

**Recommendation**: Memoize or move to a sub-component.

### Lazy Evaluation Opportunities

1. **ParameterBadges**: Only rendered when `showParameters={true}`. Consider lazy component:
   ```typescript
   const ParameterBadges = React.lazy(() => import('./ParameterBadges'));
   ```

2. **FadeEnvelope**: Only rendered when `fade !== 0 && mode !== 'FRE'`. Already conditionally rendered, good.

3. **PARAM_INFO Object** in EditParamScreen: Large static object could be moved to separate file to avoid re-parsing.

---

## 7. Animation Re-render Analysis

### Reanimated Usage - Excellent Architecture

#### SharedValues for Phase/Output (No JS Re-renders)
```typescript
// preset-context.tsx Lines 104-105
const lfoPhase = useSharedValue(0);
const lfoOutput = useSharedValue(0);
```

**Assessment**: Correct use of SharedValue - animations run on UI thread without JS re-renders.

#### Animation Loop - Pure UI Thread
```typescript
// preset-context.tsx Lines 209-221
useEffect(() => {
  const animate = (timestamp: number) => {
    if (lfoRef.current) {
      const state = lfoRef.current.update(timestamp);
      lfoPhase.value = state.phase;      // UI thread update
      lfoOutput.value = state.output;    // UI thread update
    }
    animationRef.current = requestAnimationFrame(animate);
  };
  // ...
}, [lfoPhase, lfoOutput]);
```

**Assessment**: Animation updates SharedValues without causing React re-renders. This is the correct pattern.

#### useDerivedValue - UI Thread Computation
```typescript
// HomeScreen Lines 69-75
const displayOutput = useDerivedValue(() => {
  'worklet';
  const rawOutput = sampleWaveformWorklet(waveformForWorklet, displayPhase.value);
  return rawOutput * (depthForWorklet / 63);
}, [waveformForWorklet, depthForWorklet]);
```

**Assessment**: Correctly uses worklet for UI thread execution.

### Bridge Crossings

#### useAnimatedReaction with runOnJS - Intentional Bridge Crossing
```typescript
// DestinationMeter Lines 90-98
useAnimatedReaction(
  () => ({ output: lfoOutput.value, center: animatedCenterValue.value }),
  ({ output, center }) => {
    const value = Math.round(...);
    runOnJS(setCurrentValue)(value);  // Bridge crossing!
  },
  [maxModulation, min, max]
);
```

**Purpose**: Updates React state for text display of current value.

**Impact**: Causes JS re-render on every animation frame when value changes.

**Optimization**: Consider using Reanimated's `ReText` or a Skia text element to display the value entirely on UI thread.

#### OutputValueDisplay - Same Pattern
```typescript
// OutputValueDisplay.tsx Lines 18-24
useAnimatedReaction(
  () => output.value,
  (currentValue) => {
    runOnJS(updateDisplay)(currentValue);  // Bridge crossing every frame!
  },
  [output]
);
```

**Impact**: High-frequency bridge crossings for display update.

**Recommendation**: Use Reanimated text components or reduce update frequency with frame skipping.

### Animation Performance Summary

| Aspect | Status | Notes |
|--------|--------|-------|
| SharedValue usage | Excellent | Phase/output on UI thread |
| useDerivedValue | Correct | Worklet computations |
| useAnimatedReaction | Mixed | Some unnecessary bridge crossings |
| Skia Canvas | Correct | Canvas renders driven by SharedValues |
| Frame rate | Good | Main loop is optimized |

---

## Priority Recommendations

### High Priority

1. **Add React.memo to frequently-rendered pure components**:
   - `ParamBox` (rendered 8x)
   - `TimingInfo`
   - `GridLines`

2. **Fix getCenterValue callback recreation**:
   ```typescript
   // Change from:
   const getCenterValue = useCallback((destinationId) => {
     if (centerValues[destinationId] !== undefined) { ... }
   }, [centerValues]);  // Recreates on every value change

   // Change to:
   const getCenterValueRef = useRef(getCenterValue);
   useEffect(() => { getCenterValueRef.current = getCenterValue; }, [centerValues]);
   const getCenterValue = useCallback((id) => getCenterValueRef.current(id), []);
   ```

3. **Eliminate bridge crossings for value displays**:
   - Use Reanimated Text components or Skia Text for `OutputValueDisplay`
   - Use Skia Text for `DestinationMeter` current value

### Medium Priority

4. **Split PresetContext** into config/animation/meta contexts to reduce cascade re-renders

5. **Memoize ParamGrid callbacks**:
   ```typescript
   const handlePressSpeed = useCallback(() => handlePress('speed'), [handlePress]);
   // Use for each param
   ```

6. **Move inline styles to StyleSheet**:
   ```typescript
   // HomeScreen Lines 93-96
   const styles = StyleSheet.create({
     scrollView: { flex: 1, backgroundColor: colors.background },
     scrollContent: { paddingBottom: 20 },
   });
   ```

### Low Priority

7. **Consider path caching** for common waveform/size combinations in `useWaveformPath`

8. **Add development render tracking** for profiling complex interactions

9. **Lazy load parameter editor screens** if not already code-split by Expo Router

---

## Summary Metrics

| Category | Score | Notes |
|----------|-------|-------|
| Render Tracking | 2/5 | No built-in profiling |
| Memo Usage | 3/5 | Under-memoized leaf components |
| Context Design | 3/5 | Monolithic, causes cascades |
| Prop Stability | 4/5 | Good use of SharedValues |
| State Placement | 4/5 | Local state patterns are excellent |
| Expensive Renders | 4/5 | Good memoization of paths |
| Animation Renders | 4/5 | UI thread architecture, some bridge crossings |

**Overall Performance Grade: B+**

The codebase demonstrates strong React Native performance patterns, especially around Reanimated integration. The main opportunities for improvement are in context splitting and adding React.memo to leaf components.
