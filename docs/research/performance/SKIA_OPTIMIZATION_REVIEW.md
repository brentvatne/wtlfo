# Skia Canvas Rendering Optimization Review

**Date:** 2026-01-19
**Reviewed Files:**
- `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx`
- `/Users/brent/wtlfo/src/components/lfo/hooks/useWaveformPath.ts`
- `/Users/brent/wtlfo/src/components/lfo/PhaseIndicator.tsx`
- `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`
- `/Users/brent/wtlfo/src/components/lfo/WaveformIcon.tsx`
- Supporting files: `WaveformDisplay.tsx`, `GridLines.tsx`, `FadeEnvelope.tsx`, `RandomWaveform.tsx`, `worklets.ts`, `OutputValueDisplay.tsx`

---

## Executive Summary

The codebase demonstrates **good overall Skia usage patterns** with appropriate memoization and worklet usage. There are several optimization opportunities, primarily around path recreation, draw call batching, and derived value dependencies. The architecture is well-structured but has some redundant computations and suboptimal component composition.

**Overall Rating:** 7/10 - Good foundation with room for improvement

---

## 1. Path Creation Analysis

### Findings

#### Positive Patterns

| Pattern | Location | Assessment |
|---------|----------|------------|
| Path memoization with `useMemo` | `useWaveformPath.ts:38-90` | Correctly memoizes path with all dependencies |
| External path cache | `WaveformIcon.tsx:36-75` | Module-level cache prevents recreation across renders |
| Consistent resolution | Multiple files | Uses resolution=128 consistently |

#### Issues Found

**ISSUE 1: Duplicate Path Generation in WaveformDisplay**

```typescript
// WaveformDisplay.tsx:17-20
const strokePath = useWaveformPath(waveform, width, height, resolution, 8, depth, startPhase, false);
const fillPath = useWaveformPath(waveform, width, height, resolution, 8, depth, startPhase, true);
```

**Problem:** Creates two nearly identical paths - one open for stroke, one closed for fill. Both iterate through 129 points calculating the same waveform values.

**Impact:** 2x path computation on every waveform change
**Severity:** Medium

**Recommendation:** Generate a single path and derive both versions:
```typescript
const basePath = useWaveformPath(...);
const fillPath = useMemo(() => {
  const closed = basePath.copy();
  closed.lineTo(endX, centerY);
  closed.lineTo(startX, centerY);
  closed.close();
  return closed;
}, [basePath]);
```

---

**ISSUE 2: Path Recreation in RandomWaveform on Sample Changes**

```typescript
// RandomWaveform.tsx:34-96
const { strokePath, fillPath } = useMemo(() => {
  // Creates two paths every time samples change
}, [samples, width, height, depthScale, startPhaseNormalized]);
```

**Problem:** The `samples` array reference likely changes frequently as LFO runs, triggering path recreation.

**Impact:** Frequent full path regeneration during animation
**Severity:** Medium-High

**Recommendation:**
- Consider using `useDerivedValue` for animated paths
- Or stabilize sample array reference with shallow comparison

---

**ISSUE 3: FadeEnvelope Creates Path on Every Fade Change**

```typescript
// FadeEnvelope.tsx:42-93
const path = useMemo(() => {
  // Full path regeneration
}, [waveform, width, height, resolution, depthScale, fade, startPhaseNormalized]);
```

**Problem:** Path is recreated when `fade` changes, even for small adjustments.

**Impact:** Medium - only affects fade editing scenarios
**Severity:** Low-Medium

---

### Path Creation Score: 6/10

---

## 2. Draw Operations Analysis

### Findings

#### Positive Patterns

| Pattern | Location | Assessment |
|---------|----------|------------|
| Conditional rendering | `LFOVisualizer.tsx:118-176` | Components only render when needed |
| Efficient primitives | `PhaseIndicator.tsx` | Uses Line and Circle primitives correctly |

#### Issues Found

**ISSUE 4: GridLines Creates Individual Draw Calls**

```typescript
// GridLines.tsx:14-45
for (let i = 0; i <= verticalDivisions; i++) {
  verticalLines.push(<Line key={...} />);
}
for (let i = 0; i <= horizontalDivisions; i++) {
  horizontalLines.push(<Line key={...} />);
}
```

**Problem:** Creates 9 vertical + 5 horizontal + 1 center = 15 individual `<Line>` components, resulting in 15 separate draw calls.

**Impact:** High - GridLines renders on every frame
**Severity:** Medium-High

**Recommendation:** Batch all grid lines into a single `Path`:
```typescript
const gridPath = useMemo(() => {
  const path = Skia.Path.Make();
  // Add all lines to single path
  for (...) {
    path.moveTo(x, y1);
    path.lineTo(x, y2);
  }
  return path;
}, [width, height, divisions]);

return <Path path={gridPath} .../>;
```

---

**ISSUE 5: DestinationMeter Grid Lines Same Pattern**

```typescript
// DestinationMeter.tsx:171-184
for (let i = 0; i <= gridDivisions; i++) {
  gridLines.push(<Line key={...} />);
}
```

**Problem:** 5 individual Line components for grid.

**Impact:** Moderate
**Severity:** Low-Medium

---

**ISSUE 6: Redundant Group Wrapper in DestinationMeter**

```typescript
// DestinationMeter.tsx:237-245
{!isEditing && (
  <Group>  // Unnecessary Group
    <Line ... />
  </Group>
)}
```

**Problem:** Wraps a single Line in a Group with no additional properties.

**Impact:** Negligible but adds overhead
**Severity:** Very Low

---

### Draw Operations Score: 6/10

---

## 3. Paint Objects Analysis

### Findings

#### Positive Patterns

| Pattern | Location | Assessment |
|---------|----------|------------|
| Direct color props | All files | Using `color` prop directly instead of Paint objects |
| Style props inline | Path components | `style="stroke"`, `strokeWidth={n}` are efficient |

#### Issues Found

**ISSUE 7: No Paint Object Reuse for Repeated Styles**

Multiple components use identical paint configurations:

```typescript
// Repeated across files:
<Path color={color} style="stroke" strokeWidth={strokeWidth} strokeCap="round" strokeJoin="round" />
```

**Problem:** While Skia may internally optimize, explicit Paint reuse guarantees efficiency.

**Impact:** Low - Skia likely handles this
**Severity:** Low

**Recommendation:** For critical rendering paths, consider:
```typescript
const strokePaint = useMemo(() => {
  const paint = Skia.Paint();
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(strokeWidth);
  paint.setStrokeCap(StrokeCap.Round);
  paint.setStrokeJoin(StrokeJoin.Round);
  paint.setColor(Skia.Color(color));
  return paint;
}, [color, strokeWidth]);
```

---

### Paint Objects Score: 8/10

---

## 4. Canvas Sizing Analysis

### Findings

#### Positive Patterns

| Pattern | Location | Assessment |
|---------|----------|------------|
| Fixed dimensions | `LFOVisualizer.tsx:108` | Canvas has explicit width/height |
| Computed sizing | `LFOVisualizer.tsx:86-89` | Dynamic height calculation is clean |

#### Issues Found

**ISSUE 8: No Pixel Density Handling**

```typescript
// LFOVisualizer.tsx:108
<Canvas style={{ width, height: canvasHeight }} pointerEvents="none">
```

**Problem:** Canvas renders at logical pixels, not device pixels. On high-DPI devices (2x, 3x), this may result in blurry rendering or unnecessary high-resolution rendering.

**Impact:** Visual quality on retina displays / performance on high-DPI
**Severity:** Medium

**Recommendation:**
```typescript
import { PixelRatio } from 'react-native';

const scale = PixelRatio.get();
// Either scale canvas or adjust resolution based on DPI
```

---

**ISSUE 9: Resolution Not DPI-Aware**

```typescript
// useWaveformPath.ts - resolution = 128 fixed
// WaveformIcon.tsx:49 - dynamic but not DPI-aware
const resolution = Math.max(16, Math.min(64, Math.round(size * 1.5)));
```

**Problem:** Fixed resolution regardless of canvas physical size or device DPI.

**Impact:** Over-rendering on small canvases, under-rendering on large/high-DPI
**Severity:** Low-Medium

---

### Canvas Sizing Score: 6/10

---

## 5. Animated Values Analysis

### Findings

#### Positive Patterns

| Pattern | Location | Assessment |
|---------|----------|------------|
| Proper worklet usage | `PhaseIndicator.tsx:44-95` | All animated calculations in worklets |
| useDerivedValue for positions | `PhaseIndicator.tsx:44-106` | Correct pattern for derived animations |
| 'worklet' directive | `worklets.ts` | All sampling functions are worklet-compatible |

#### Issues Found

**ISSUE 10: Excessive useDerivedValue Dependencies in PhaseIndicator**

```typescript
// PhaseIndicator.tsx:50, 95, 101, 106, 112
}, [phase, padding, drawWidth, startPhaseNormalized]);
}, [phase, output, centerY, scaleY, waveform, depthScale, fadeApplies, fadeValue, startPhaseNormalized]);
}, [xPosition]);
}, [xPosition]);
}, [opacity]);
```

**Problem:** Large dependency arrays, and some dependencies (like `padding`, `drawWidth`) are constants that don't need tracking.

**Impact:** Unnecessary recalculations when any dependency changes
**Severity:** Low-Medium

**Recommendation:** Move constants outside the dependency arrays:
```typescript
const PADDING = 8; // Module constant
// Only include truly reactive dependencies
const xPosition = useDerivedValue(() => {
  'worklet';
  const phaseVal = phase.value;
  return PADDING + ((phaseVal - startPhaseNormalized + 1) % 1) * drawWidth;
}, [phase]); // startPhaseNormalized should be derived or stable
```

---

**ISSUE 11: Redundant Derived Values in DestinationMeter**

```typescript
// DestinationMeter.tsx:140-168
const upperBoundP1 = useDerivedValue(() => vec(meterX, upperBoundY.value), []);
const upperBoundP2 = useDerivedValue(() => vec(meterX + meterWidth, upperBoundY.value), []);
const lowerBoundP1 = useDerivedValue(() => vec(meterX, lowerBoundY.value), []);
const lowerBoundP2 = useDerivedValue(() => vec(meterX + meterWidth, lowerBoundY.value), []);
const currentValueP1 = useDerivedValue(() => vec(meterX, currentValueY.value), []);
const currentValueP2 = useDerivedValue(() => vec(meterX + meterWidth, currentValueY.value), []);
```

**Problem:** 6 separate `useDerivedValue` hooks that could be consolidated. Each creates a derived value callback.

**Impact:** Overhead from multiple derived value subscriptions
**Severity:** Medium

**Recommendation:** Use single derived value returning object, or pass scalar values directly:
```typescript
// Skia Line can accept SharedValue for p1.y directly
<Line
  p1={{ x: meterX, y: upperBoundY }}
  p2={{ x: meterX + meterWidth, y: upperBoundY }}
/>
```

---

**ISSUE 12: Empty Dependency Arrays in DestinationMeter**

```typescript
// DestinationMeter.tsx:135-168
const boundRangeHeight = useDerivedValue(() => {
  'worklet';
  return lowerBoundY.value - upperBoundY.value;
}, []);  // Empty array but reads lowerBoundY and upperBoundY
```

**Problem:** Empty dependency arrays while accessing shared values inside. This works due to how Reanimated tracks reads, but is unclear.

**Impact:** Confusing code, potential maintenance issues
**Severity:** Low

---

### Animated Values Score: 7/10

---

## 6. Component Structure Analysis

### Findings

#### Positive Patterns

| Pattern | Location | Assessment |
|---------|----------|------------|
| Single Canvas, multiple children | `LFOVisualizer.tsx:108-178` | Good - single canvas context |
| Conditional rendering | Throughout | Proper use of `&&` for optional elements |
| Separation of concerns | File structure | Clean component hierarchy |

#### Issues Found

**ISSUE 13: Unnecessary Group Wrapper in LFOVisualizer**

```typescript
// LFOVisualizer.tsx:109-177
<Canvas style={{ width, height: canvasHeight }}>
  <Group>  // This Group adds no value
    <GridLines ... />
    {waveform === 'RND' ? <RandomWaveform /> : <WaveformDisplay />}
    {fade && <FadeEnvelope />}
    {showPhaseIndicator && <PhaseIndicator />}
  </Group>
</Canvas>
```

**Problem:** The outer Group has no properties (no transform, opacity, clip, etc.) and serves no purpose.

**Impact:** Minor overhead
**Severity:** Very Low

---

**ISSUE 14: OutputValueDisplay Uses runOnJS Bridge**

```typescript
// OutputValueDisplay.tsx:18-24
useAnimatedReaction(
  () => output.value,
  (currentValue) => {
    runOnJS(updateDisplay)(currentValue);
  },
  [output]
);
```

**Problem:** Bridges to JS thread on every output change for text update. This is necessary for React Native Text but creates bridge traffic.

**Impact:** Bridge overhead on every frame during animation
**Severity:** Medium

**Recommendation:** Consider Skia Text for pure canvas rendering, or throttle updates:
```typescript
// Throttled version
let lastUpdate = 0;
useAnimatedReaction(
  () => output.value,
  (currentValue) => {
    const now = Date.now();
    if (now - lastUpdate > 50) { // 20fps for text
      lastUpdate = now;
      runOnJS(updateDisplay)(currentValue);
    }
  },
  [output]
);
```

---

**ISSUE 15: DestinationMeter Similar runOnJS Pattern**

```typescript
// DestinationMeter.tsx:90-98
useAnimatedReaction(
  () => ({ output: lfoOutput.value, center: animatedCenterValue.value }),
  ({ output, center }) => {
    runOnJS(setCurrentValue)(value);
  },
);
```

**Problem:** Same bridge overhead issue.

**Impact:** Bridge traffic during animation
**Severity:** Medium

---

### Component Structure Score: 7/10

---

## 7. Memory Analysis

### Findings

#### Positive Patterns

| Pattern | Location | Assessment |
|---------|----------|------------|
| Static path cache | `WaveformIcon.tsx:36` | Module-level Map prevents GC thrashing |
| useMemo for paths | Throughout | Prevents recreation, aids GC |
| No manual Skia object management | Throughout | Relies on automatic cleanup |

#### Issues Found

**ISSUE 16: WaveformIcon Path Cache Never Cleared**

```typescript
// WaveformIcon.tsx:36
const pathCache = new Map<string, ReturnType<typeof Skia.Path.Make>>();
```

**Problem:** Module-level cache grows indefinitely. If many size/strokeWidth combinations are used, memory accumulates.

**Impact:** Potential memory growth in long-running apps
**Severity:** Low (limited waveform types and typical size ranges)

**Recommendation:** Add LRU behavior or size limit:
```typescript
const MAX_CACHE_SIZE = 50;
function getCachedPath(...) {
  // ... existing logic
  if (pathCache.size > MAX_CACHE_SIZE) {
    const firstKey = pathCache.keys().next().value;
    pathCache.delete(firstKey);
  }
}
```

---

**ISSUE 17: No Explicit Path Disposal**

Skia paths are native objects. While react-native-skia handles cleanup, explicit disposal could help in memory-constrained scenarios.

**Impact:** Potential native memory pressure
**Severity:** Low

---

**ISSUE 18: SharedValue Cleanup on Unmount**

```typescript
// Multiple files create SharedValues
const internalPhase = useSharedValue(0);
const internalOutput = useSharedValue(0);
// etc.
```

**Problem:** Reanimated handles cleanup, but many SharedValues created per component instance.

**Impact:** Memory during mount/unmount cycles
**Severity:** Very Low

---

### Memory Score: 8/10

---

## Summary of Issues by Priority

### High Priority (Fix Soon)

| Issue | Component | Impact | Effort |
|-------|-----------|--------|--------|
| #4 GridLines individual draw calls | GridLines | High | Low |
| #1 Duplicate path generation | WaveformDisplay | Medium | Low |
| #2 RandomWaveform path recreation | RandomWaveform | Medium-High | Medium |

### Medium Priority

| Issue | Component | Impact | Effort |
|-------|-----------|--------|--------|
| #8 No pixel density handling | Canvas sizing | Medium | Medium |
| #11 Redundant derived values | DestinationMeter | Medium | Low |
| #14 runOnJS bridge overhead | OutputValueDisplay | Medium | Medium |
| #15 runOnJS bridge overhead | DestinationMeter | Medium | Medium |

### Low Priority (Nice to Have)

| Issue | Component | Impact | Effort |
|-------|-----------|--------|--------|
| #3 FadeEnvelope path recreation | FadeEnvelope | Low-Medium | Medium |
| #5 DestinationMeter grid lines | DestinationMeter | Low-Medium | Low |
| #9 Resolution not DPI-aware | Path generation | Low-Medium | Medium |
| #10 Excessive dependencies | PhaseIndicator | Low-Medium | Low |
| #16 Path cache unbounded | WaveformIcon | Low | Low |

---

## Recommended Optimization Order

1. **Batch GridLines into single Path** - Quick win, high impact
2. **Merge WaveformDisplay paths** - Easy refactor, moderate impact
3. **Stabilize RandomWaveform samples** - Investigate sample array reference stability
4. **Consolidate DestinationMeter derived values** - Clean up redundancy
5. **Add text update throttling** - Reduce bridge traffic
6. **Implement DPI-aware rendering** - Improve visual quality and performance balance

---

## Architecture Recommendations

### Consider Skia Text for Numeric Displays

Replace React Native Text with Skia Text for `OutputValueDisplay` and `DestinationMeter` value displays to eliminate JS bridge calls during animation.

### Implement Path Pooling

For frequently regenerated paths (RandomWaveform, FadeEnvelope), consider a path pool to reuse native Skia objects.

### Add Performance Monitoring

Consider adding Skia frame timing instrumentation during development:
```typescript
import { Canvas } from '@shopify/react-native-skia';
<Canvas onDraw={(canvas, info) => {
  if (__DEV__) console.log('Frame time:', info.timestamp);
}}>
```

---

## Conclusion

The codebase follows many Skia best practices and has a clean component architecture. The main optimization opportunities lie in:

1. **Batching draw calls** (GridLines, DestinationMeter grids)
2. **Reducing path recreation** (WaveformDisplay duplicates, RandomWaveform volatility)
3. **Minimizing JS bridge traffic** (text display updates)

Implementing the high-priority fixes should yield noticeable performance improvements, especially on lower-end devices during active LFO animation.
