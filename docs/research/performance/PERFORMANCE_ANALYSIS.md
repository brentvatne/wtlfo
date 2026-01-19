# LFO Visualizer Performance Analysis

**Date:** January 2026
**Analyzer:** Performance Expert Review
**App Stack:** React Native + Reanimated + Skia

---

## Executive Summary

The LFO visualization app is well-architected with several good performance patterns already in place:
- Proper use of SharedValues for 60fps animations
- Worklet-based calculations that run on the UI thread
- UseMemo for path generation
- Context separation (PresetContext, ModulationContext)

However, there are **12 optimization opportunities** identified across render performance, animation, memory, bundle size, and startup categories.

**Estimated Impact:**
- Re-renders reducible by ~30-40%
- Memory allocations reducible by ~20%
- Bundle size potentially reducible by ~5-10kb
- Startup time improvable by ~50-100ms

---

## 1. Render Performance Issues

### 1.1 Missing React.memo on Sub-Components

**Files Affected:**
- `/Users/brent/wtlfo/src/components/lfo/GridLines.tsx` (line 5)
- `/Users/brent/wtlfo/src/components/lfo/WaveformDisplay.tsx` (line 6)
- `/Users/brent/wtlfo/src/components/lfo/FadeEnvelope.tsx` (line 26)
- `/Users/brent/wtlfo/src/components/lfo/TimingInfo.tsx` (line 5)
- `/Users/brent/wtlfo/src/components/lfo/ParameterBadges.tsx` (line 5)
- `/Users/brent/wtlfo/src/components/params/ParamBox.tsx` (line 14)

**Impact:** ~8-12 unnecessary re-renders per frame when parent updates

**Issue:** These components are pure functions of their props but lack `React.memo` wrappers. When `LFOVisualizer` re-renders (e.g., theme changes, dimension changes), all children re-render even if their props haven't changed.

**Recommendation:**
```typescript
// Example for GridLines.tsx
export const GridLines = React.memo(function GridLines({
  width,
  height,
  color,
  verticalDivisions = 8,
  horizontalDivisions = 4,
}: GridLinesProps) {
  // ... existing implementation
});
```

### 1.2 Object Allocation in GridLines Render Loop

**File:** `/Users/brent/wtlfo/src/components/lfo/GridLines.tsx` (lines 18-45)

**Impact:** 14 new objects created per render (9 vertical + 5 horizontal Line elements)

**Issue:** The component creates new point objects `{ x, y }` on every render:
```typescript
<Line
  key={`v-${i}`}
  p1={{ x, y: padding }}  // New object every render
  p2={{ x, y: height - padding }}  // New object every render
  ...
/>
```

**Recommendation:** Pre-compute grid lines in useMemo:
```typescript
const lines = useMemo(() => {
  const vLines = [];
  const hLines = [];
  // ... compute all points once
  return { vLines, hLines };
}, [width, height, verticalDivisions, horizontalDivisions, padding]);
```

### 1.3 ParamGrid Re-renders All ParamBoxes

**File:** `/Users/brent/wtlfo/src/components/params/ParamGrid.tsx` (lines 68-138)

**Impact:** 8 ParamBox components re-render on any config change

**Issue:** `ParamGrid` re-renders when `currentConfig` changes (any parameter). This causes all 8 `ParamBox` components to re-render even though only 1 parameter value changed.

**Recommendation:**
1. Wrap `ParamBox` with `React.memo`
2. Add `useCallback` to `handlePress`:
```typescript
const handlePress = useCallback((param: ParamKey) => {
  router.push(`/param/${param}`);
  onParamPress?.(param);
}, [router, onParamPress]);
```
3. Consider individual param selectors instead of entire config object

### 1.4 Context Value Object Recreation

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx` (lines 280-305)

**Impact:** All context consumers re-render when ANY context value changes

**Issue:** The context value object is recreated on every render:
```typescript
const value: PresetContextValue = {
  activePreset,
  preset: PRESETS[activePreset],  // New reference
  // ... all other values
};
```

**Recommendation:** Use `useMemo` for the context value:
```typescript
const value = useMemo(() => ({
  activePreset,
  preset: PRESETS[activePreset],
  setActivePreset,
  presets: PRESETS,
  currentConfig,
  debouncedConfig,
  isEditing,
  setIsEditing,
  updateParameter,
  resetToPreset,
  bpm,
  setBPM,
  lfoPhase,
  lfoOutput,
  lfoRef,
  timingInfo,
  triggerLFO,
  startLFO,
  stopLFO,
  isLFORunning,
  isPaused,
  setIsPaused,
}), [
  activePreset,
  currentConfig,
  debouncedConfig,
  isEditing,
  bpm,
  timingInfo,
  isPaused,
  // ... stable refs don't need to be listed
]);
```

### 1.5 Duplicate Waveform Path Generation

**File:** `/Users/brent/wtlfo/src/components/lfo/WaveformDisplay.tsx` (lines 17-21)

**Impact:** Path computed twice (stroke + fill) with same parameters except `closePath`

**Issue:**
```typescript
const strokePath = useWaveformPath(waveform, width, height, resolution, 8, depth, startPhase, false);
const fillPath = useWaveformPath(waveform, width, height, resolution, 8, depth, startPhase, true);
```

**Recommendation:** Generate both paths in a single useMemo:
```typescript
const { strokePath, fillPath } = useMemo(() => {
  const stroke = generatePath(/* closePath: false */);
  const fill = Skia.Path.Make();
  fill.addPath(stroke);
  fill.lineTo(endX, centerY);
  fill.lineTo(startX, centerY);
  fill.close();
  return { strokePath: stroke, fillPath: fill };
}, [waveform, width, height, resolution, depth, startPhase]);
```

---

## 2. Animation Performance Issues

### 2.1 runOnJS in Hot Path (OutputValueDisplay)

**File:** `/Users/brent/wtlfo/src/components/lfo/OutputValueDisplay.tsx` (lines 17-24)

**Impact:** ~60 JS thread invocations per second

**Issue:**
```typescript
useAnimatedReaction(
  () => output.value,
  (currentValue) => {
    runOnJS(updateDisplay)(currentValue);  // Bridges to JS thread every frame
  },
  [output]
);
```

This bridges from UI thread to JS thread 60 times per second just to update a text value.

**Recommendation:** Use Reanimated's `useAnimatedProps` or `useAnimatedStyle` with Skia text, OR throttle updates:
```typescript
// Option 1: Throttle to 10fps for text display
const lastUpdateRef = useSharedValue(0);
useAnimatedReaction(
  () => output.value,
  (currentValue) => {
    'worklet';
    const now = Date.now();
    if (now - lastUpdateRef.value > 100) {  // 10fps max
      lastUpdateRef.value = now;
      runOnJS(updateDisplay)(currentValue);
    }
  },
  [output]
);

// Option 2: Use ReText from react-native-redash for UI-thread text
```

### 2.2 runOnJS in DestinationMeter

**File:** `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx` (lines 90-98)

**Impact:** ~60 JS thread invocations per second

**Issue:** Same pattern as OutputValueDisplay:
```typescript
useAnimatedReaction(
  () => ({ output: lfoOutput.value, center: animatedCenterValue.value }),
  ({ output, center }) => {
    // ...
    runOnJS(setCurrentValue)(value);  // Bridges every frame
  },
```

**Recommendation:** Same throttling approach or use Skia text rendering.

### 2.3 Multiple useDerivedValue for Simple Vectors

**File:** `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx` (lines 140-168)

**Impact:** 8 separate derived value calculations per frame

**Issue:** Creating multiple vec() objects in separate useDerivedValue hooks:
```typescript
const upperBoundP1 = useDerivedValue(() => vec(meterX, upperBoundY.value));
const upperBoundP2 = useDerivedValue(() => vec(meterX + meterWidth, upperBoundY.value));
const lowerBoundP1 = useDerivedValue(() => vec(meterX, lowerBoundY.value));
// ... 5 more
```

**Recommendation:** Consolidate into fewer derived values or compute inline in render with Skia's animated props:
```typescript
const positions = useDerivedValue(() => ({
  upperY: upperBoundY.value,
  lowerY: lowerBoundY.value,
  currentY: currentValueY.value,
}));
```

### 2.4 Expensive Calculations in useSlowMotionPhase

**File:** `/Users/brent/wtlfo/src/components/lfo/hooks/useSlowMotionPhase.ts` (lines 57-167)

**Impact:** Complex math operations every frame

**Issue:** The worklet performs multiple conditional checks, modulo operations, and drift correction every frame:
```typescript
useAnimatedReaction(
  () => realPhase.value,
  (currentPhase) => {
    'worklet';
    // ... 100+ lines of calculations every frame
  }
);
```

**Recommendation:**
1. Simplify the algorithm - the current drift correction logic runs every 60 frames but the calculation happens every frame
2. Use early returns more aggressively
3. Consider caching more intermediate values in shared values

---

## 3. Memory Performance Issues

### 3.1 Path Object Creation in useMemo

**Files:**
- `/Users/brent/wtlfo/src/components/lfo/hooks/useWaveformPath.ts` (line 39)
- `/Users/brent/wtlfo/src/components/lfo/FadeEnvelope.tsx` (line 43)
- `/Users/brent/wtlfo/src/components/lfo/RandomWaveform.tsx` (line 35)

**Impact:** New Skia Path objects created on parameter changes (~500 bytes each)

**Issue:**
```typescript
const path = Skia.Path.Make();  // Allocates native memory
```

These paths are recreated when dependencies change. While useMemo prevents unnecessary recreation, there's no cleanup of old paths.

**Recommendation:** Consider path reuse pattern:
```typescript
const pathRef = useRef<SkPath | null>(null);

const path = useMemo(() => {
  if (pathRef.current) {
    pathRef.current.reset();  // Reuse existing path
  } else {
    pathRef.current = Skia.Path.Make();
  }
  // ... populate path
  return pathRef.current;
}, [dependencies]);
```

### 3.2 Animation Loop Object Creation

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx` (lines 209-221)

**Impact:** State object created every animation frame

**Issue:**
```typescript
const animate = (timestamp: number) => {
  if (lfoRef.current) {
    const state = lfoRef.current.update(timestamp);  // New object per frame
    lfoPhase.value = state.phase;
    lfoOutput.value = state.output;
  }
  animationRef.current = requestAnimationFrame(animate);
};
```

**Recommendation:** If `elektron-lfo` supports it, provide a pre-allocated output object:
```typescript
const stateBuffer = { phase: 0, output: 0 };
const state = lfoRef.current.update(timestamp, stateBuffer);
```

### 3.3 Repeated Badge Array Creation

**File:** `/Users/brent/wtlfo/src/components/lfo/ParameterBadges.tsx` (lines 15-23)

**Impact:** New array and objects created per render

**Issue:**
```typescript
const badges = [
  { label: 'WAVE', value: waveform },
  speed !== undefined && { label: 'SPD', value: speed.toFixed(2) },
  // ...
].filter(Boolean) as { label: string; value: string }[];
```

**Recommendation:** Memoize badge computation:
```typescript
const badges = useMemo(() => [
  { label: 'WAVE', value: waveform },
  // ...
].filter(Boolean), [waveform, speed, multiplier, mode, depth, fade, startPhase]);
```

---

## 4. Bundle Size Issues

### 4.1 Large Icon Library Import

**File:** `/Users/brent/wtlfo/package.json`

**Impact:** `@expo/vector-icons` can add 50-100kb if not tree-shaken properly

**Recommendation:**
1. Verify only used icon families are imported
2. Consider using SF Symbols (already using `expo-symbols`) consistently instead of vector icons

### 4.2 Unused Exports from Index Files

**File:** `/Users/brent/wtlfo/src/components/lfo/index.ts`

**Impact:** Barrel exports can prevent tree-shaking

**Issue:** All components are exported but not all may be used:
```typescript
export { WaveformDisplay } from './WaveformDisplay';
export { PhaseIndicator } from './PhaseIndicator';
export { FadeEnvelope } from './FadeEnvelope';
// ... many more
```

**Recommendation:**
1. Verify all exports are actually imported elsewhere
2. Consider direct imports for internal components:
```typescript
// Instead of:
import { GridLines } from '@/src/components/lfo';
// Use:
import { GridLines } from '@/src/components/lfo/GridLines';
```

### 4.3 Full React Navigation Import

**File:** `/Users/brent/wtlfo/package.json`

**Impact:** Multiple navigation packages (~30-50kb combined)

**Issue:** Using both `@react-navigation/bottom-tabs` and `@react-navigation/elements` alongside `expo-router`.

**Recommendation:** Since Expo Router is the primary navigation solution, verify these peer dependencies are actually required or if they're just peer deps of expo-router.

---

## 5. Startup Performance Issues

### 5.1 Synchronous Storage Reads on Load

**Files:**
- `/Users/brent/wtlfo/src/context/preset-context.tsx` (lines 16-45)
- `/Users/brent/wtlfo/src/context/modulation-context.tsx` (lines 29-48)

**Impact:** ~5-20ms blocking main thread at startup per read

**Issue:**
```typescript
function getInitialPreset(): number {
  try {
    const saved = Storage.getItemSync(STORAGE_KEY);  // Synchronous!
    // ...
  }
}
```

Multiple synchronous reads happen during initial render.

**Recommendation:**
1. Use async loading with suspense/loading state
2. Or batch reads into single JSON object:
```typescript
// Instead of multiple reads:
const preset = Storage.getItemSync('activePreset');
const bpm = Storage.getItemSync('bpm');
const centerValues = Storage.getItemSync('centerValues');

// Use single read:
const appState = Storage.getItemSync('appState');
const { preset, bpm, centerValues } = JSON.parse(appState);
```

### 5.2 LFO Engine Initialization

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx` (line 181)

**Impact:** LFO class instantiation on every config change

**Issue:**
```typescript
useEffect(() => {
  lfoRef.current = new LFO(debouncedConfig, bpm);  // New instance
  // ...
}, [debouncedConfig, bpm, lfoPhase, lfoOutput]);
```

**Recommendation:** If `elektron-lfo` supports it, update config rather than recreate:
```typescript
useEffect(() => {
  if (lfoRef.current) {
    lfoRef.current.setConfig(debouncedConfig);
    lfoRef.current.setBPM(bpm);
  } else {
    lfoRef.current = new LFO(debouncedConfig, bpm);
  }
}, [debouncedConfig, bpm]);
```

### 5.3 Early Context Provider Mounting

**File:** `/Users/brent/wtlfo/app/_layout.tsx` (lines 10-38)

**Impact:** Full context initialization before any UI renders

**Issue:** Both PresetProvider and ModulationProvider wrap the entire app:
```typescript
<PresetProvider>
  <ModulationProvider>
    <NativeTabs>
```

This means all context setup (storage reads, LFO creation, animation loops) happens before first render.

**Recommendation:** Consider lazy initialization patterns:
1. Defer LFO animation loop start until HomeScreen mounts
2. Use React.lazy for non-critical tabs (Learn, Settings)

---

## 6. Positive Patterns (Keep These!)

The codebase already implements several excellent performance patterns:

1. **SharedValues for animations** - Phase and output are SharedValues, enabling UI-thread animation
2. **Worklet functions** - `sampleWaveformWorklet`, `isUnipolarWorklet` run on UI thread
3. **useMemo for paths** - Expensive path calculations are memoized
4. **useCallback for handlers** - Most event handlers are properly memoized
5. **Debounced config updates** - 100ms debounce prevents excessive LFO recreation
6. **App state handling** - Animation pauses when app backgrounds
7. **Local slider state** - Sliders use local state for smooth dragging

---

## Priority Ranking

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| P0 | runOnJS in OutputValueDisplay/DestinationMeter | High (60 bridges/sec) | Medium |
| P1 | Missing React.memo on components | Medium (8-12 re-renders) | Low |
| P2 | Context value memoization | Medium (cascading re-renders) | Low |
| P3 | Duplicate waveform path generation | Medium (2x computation) | Low |
| P4 | GridLines object allocation | Low-Medium | Low |
| P5 | Synchronous storage reads | Low (startup only) | Medium |
| P6 | Path object reuse | Low | Medium |

---

## Implementation Checklist

- [ ] Add React.memo to: GridLines, WaveformDisplay, FadeEnvelope, TimingInfo, ParameterBadges, ParamBox
- [ ] Throttle runOnJS calls in OutputValueDisplay and DestinationMeter to 10fps
- [ ] Wrap context value in useMemo in preset-context.tsx
- [ ] Consolidate WaveformDisplay dual path generation
- [ ] Memoize GridLines point calculations
- [ ] Memoize badges array in ParameterBadges
- [ ] Consider batching storage reads
- [ ] Audit @expo/vector-icons usage

---

## Metrics to Track

After implementing optimizations, measure:

1. **JS FPS** - Should stay at 60fps during animation
2. **UI FPS** - Should stay at 60fps during animation
3. **Re-render count** - Use React DevTools Profiler
4. **Memory usage** - Check for growth over time
5. **Time to Interactive** - Measure app startup
6. **Bundle size** - Track with `npx expo export` output

---

*Generated by Performance Analysis*
