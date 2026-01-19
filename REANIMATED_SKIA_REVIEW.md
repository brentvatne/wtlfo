# Reanimated + Skia Interop Review

**Date**: 2025-01-19
**Reviewer**: Claude Opus 4.5
**Scope**: Analysis of React Native Reanimated and Skia integration patterns

---

## Executive Summary

The codebase demonstrates a **solid understanding** of Reanimated-Skia interop patterns with several well-implemented solutions. The architecture correctly separates static paths from animated values, uses worklets appropriately, and follows recommended patterns for passing SharedValues to Skia components. However, there are opportunities for optimization and a few potential issues to address.

**Overall Grade: B+**

---

## 1. Shared Value to Skia Analysis

### What Works Well

**PhaseIndicator.tsx** - Excellent pattern usage:
```typescript
const xPosition = useDerivedValue(() => {
  'worklet';
  const phaseVal = typeof phase === 'number' ? phase : phase.value;
  const displayPhase = ((phaseVal - startPhaseNormalized) % 1 + 1) % 1;
  return padding + displayPhase * drawWidth;
}, [phase, padding, drawWidth, startPhaseNormalized]);
```

- Correctly uses `useDerivedValue` to transform SharedValues
- Properly marks functions as worklets with `'worklet'` directive
- Dependencies are correctly specified
- Values flow directly to Skia components without bridging

**DestinationMeter.tsx** - Proper animated coordinate calculation:
```typescript
const meterFillHeight = useDerivedValue(() => {
  'worklet';
  const modulationAmount = lfoOutput.value * maxModulation;
  const currentVal = animatedCenterValue.value + modulationAmount;
  // ... calculation
}, [maxModulation, min, max, range, height]);
```

### Issues Found

**Issue #1: Potential stale closure in dependency arrays**

In `PhaseIndicator.tsx`, the dependency array includes primitives that may cause unnecessary recalculations:
```typescript
const xPosition = useDerivedValue(() => {
  // ...
}, [phase, padding, drawWidth, startPhaseNormalized]);
```

**Recommendation**: For primitive values computed outside the worklet, consider if they truly need to be dependencies. If `padding` and `drawWidth` are derived from props that rarely change, this is fine. However, if `startPhaseNormalized` changes frequently, it could cause the derived value to be recreated unnecessarily.

**Issue #2: Conditional SharedValue access pattern**

```typescript
const phaseVal = typeof phase === 'number' ? phase : phase.value;
```

This pattern works but requires runtime type checking on every frame. Consider normalizing the input at the component boundary instead.

### Threading Considerations

**No threading issues detected.** All worklets properly use the `'worklet'` directive, and SharedValue access happens correctly on the UI thread.

---

## 2. Skia Animations Analysis

### Static Paths (Efficient)

**WaveformDisplay.tsx**, **FadeEnvelope.tsx**, **RandomWaveform.tsx**, **WaveformIcon.tsx**:
- Correctly use `useMemo` for path generation
- Paths are created once and reused until props change
- No per-frame path recreation

Example from `useWaveformPath.ts`:
```typescript
return useMemo(() => {
  const path = Skia.Path.Make();
  // ... path construction
  return path;
}, [waveform, width, height, resolution, padding, depth, startPhase, closePath]);
```

### Animated Elements (Efficient)

**PhaseIndicator.tsx** - Uses Skia's animated props correctly:
```typescript
<Circle
  cx={xPosition}  // SharedValue<number>
  cy={yPosition}  // SharedValue<number>
  r={dotRadius}
  color={color}
/>
```

Skia components accept SharedValues directly for animated properties, which is the recommended pattern.

**DestinationMeter.tsx** - Animated line positions:
```typescript
<Line
  p1={currentValueP1}  // useDerivedValue returning vec()
  p2={currentValueP2}
  color="#ffffff"
  strokeWidth={2.5}
/>
```

### Canvas Re-rendering

**Assessment**: Canvas re-renders are minimized through proper memoization.

- Static components (`WaveformDisplay`, `FadeEnvelope`, etc.) use `useMemo` for paths
- Animated components use `useDerivedValue` for dynamic props
- No evidence of excessive re-renders

---

## 3. Value Synchronization Analysis

### Architecture

The app uses a centralized animation loop in `preset-context.tsx`:

```typescript
const animate = (timestamp: number) => {
  if (lfoRef.current) {
    const state = lfoRef.current.update(timestamp);
    lfoPhase.value = state.phase;
    lfoOutput.value = state.output;
  }
  animationRef.current = requestAnimationFrame(animate);
};
```

These SharedValues (`lfoPhase`, `lfoOutput`) are then consumed by multiple Skia components.

### Synchronization Assessment

**No lag or delay issues detected.** The pattern is correct:
1. LFO engine updates on JS thread via `requestAnimationFrame`
2. SharedValue assignments propagate immediately to UI thread
3. Skia components receive updated values on the same frame

### Potential Race Condition

**useSlowMotionPhase.ts** contains complex state tracking:

```typescript
useAnimatedReaction(
  () => realPhase.value,
  (currentPhase) => {
    'worklet';
    const previousPhase = lastRealPhase.value;
    // ... complex delta calculation
  },
  [realPhase]
);
```

While this works, the complexity introduces potential for edge cases during rapid factor changes. The implementation includes safeguards (discontinuity detection, drift correction), but consider whether this complexity is necessary or if a simpler approach would suffice.

---

## 4. Performance Analysis

### Strengths

1. **No JS-UI bridge for animation values**: SharedValues flow directly to Skia
2. **Static path memoization**: Expensive Skia.Path.Make() calls are cached
3. **Worklet functions for calculations**: `sampleWaveformWorklet`, `sampleWaveformWithSlew`
4. **Path caching in WaveformIcon**: Smart cache for repeated small icons:
   ```typescript
   const pathCache = new Map<string, ReturnType<typeof Skia.Path.Make>>();
   ```

### Areas for Improvement

**Issue #3: Multiple useDerivedValue calls for related values**

In `DestinationMeter.tsx`:
```typescript
const upperBoundP1 = useDerivedValue(() => vec(meterX, upperBoundY.value), []);
const upperBoundP2 = useDerivedValue(() => vec(meterX + meterWidth, upperBoundY.value), []);
const lowerBoundP1 = useDerivedValue(() => vec(meterX, lowerBoundY.value), []);
const lowerBoundP2 = useDerivedValue(() => vec(meterX + meterWidth, lowerBoundY.value), []);
const currentValueP1 = useDerivedValue(() => vec(meterX, currentValueY.value), []);
const currentValueP2 = useDerivedValue(() => vec(meterX + meterWidth, currentValueY.value), []);
```

**Recommendation**: While functional, this creates 6 separate derived values that run on every frame. Consider batching related calculations:

```typescript
const linePositions = useDerivedValue(() => {
  'worklet';
  return {
    upperP1: vec(meterX, upperBoundY.value),
    upperP2: vec(meterX + meterWidth, upperBoundY.value),
    // ... etc
  };
}, []);
```

However, note that Skia may not accept object-style props, so the current approach may be necessary.

**Issue #4: runOnJS calls for display updates**

In `OutputValueDisplay.tsx` and `DestinationMeter.tsx`:
```typescript
useAnimatedReaction(
  () => lfoOutput.value,
  ({ output, center }) => {
    runOnJS(setCurrentValue)(value);
  },
);
```

This creates a JS-UI bridge crossing on every animation frame for display purposes. While necessary for React state updates, it adds overhead.

**Recommendation**: Consider throttling these updates (e.g., every 3-5 frames) if exact real-time accuracy isn't required for the numeric display.

---

## 5. Path Animation Analysis

### Current Implementation

The codebase does **not** use animated path interpolation (`Skia.Path.interpolate`). Instead, it uses:
- Static paths for waveforms (memoized)
- Animated point positions for indicators (SharedValue-driven)

This is actually the **correct approach** for this use case because:
1. Waveform shapes don't animate - they change discretely when parameters change
2. Only the phase indicator position animates

### Memory Considerations

**WaveformIcon.tsx** uses a path cache:
```typescript
const pathCache = new Map<string, ReturnType<typeof Skia.Path.Make>>();
```

**Potential Issue**: This cache grows unbounded. If many unique combinations are used, memory could accumulate.

**Recommendation**: Consider adding cache size limits or using WeakMap patterns if memory becomes a concern.

### Path Creation Efficiency

Paths are created using `Skia.Path.Make()` which is efficient. The `useMemo` hooks ensure paths aren't recreated unnecessarily.

---

## 6. Canvas Update Analysis

### Update Frequency

The Canvas updates are driven by SharedValue changes, which happen every `requestAnimationFrame` (typically 60fps).

### Over-rendering Assessment

**No over-rendering detected.** The architecture is sound:
- Canvas doesn't re-render when React state changes (for static elements)
- Only animated props (SharedValues) trigger Skia redraws
- React components use proper memoization

### Batching

Skia handles batching internally. All animated prop updates within a single frame are batched into one GPU draw call.

---

## 7. Best Practices Analysis

### Patterns Being Followed Correctly

1. **`useDerivedValue` for transformed animations**: Used consistently
2. **Worklet directive**: Present in all worklet functions
3. **Static path memoization**: Implemented correctly
4. **Direct SharedValue passing to Skia**: No unnecessary bridging
5. **Dependency arrays**: Generally correct

### Anti-Patterns Detected

**Anti-Pattern #1: Empty dependency arrays with implicit dependencies**

```typescript
const boundRangeHeight = useDerivedValue(() => {
  'worklet';
  return lowerBoundY.value - upperBoundY.value;
}, []);  // Empty array but depends on lowerBoundY and upperBoundY
```

The empty dependency array is intentional here (SharedValues don't need to be in deps), but it can be confusing. Consider adding a comment explaining why deps are empty.

**Anti-Pattern #2: Mixed static/animated prop patterns**

In `PhaseIndicator.tsx`:
```typescript
<Group opacity={opacity}>
  <Line
    p1={p1}          // Animated
    p2={p2}          // Animated
    color={color}    // Static
    strokeWidth={1}  // Static
    opacity={lineOpacity}  // Animated
  />
```

This is actually fine, but documentation could clarify which props are animated vs static.

### Missing Patterns

**Missing: useAnimatedProps for complex Skia transformations**

If you need to animate Skia transforms or complex properties, consider using `useAnimatedProps`:

```typescript
const animatedProps = useAnimatedProps(() => ({
  transform: [{ rotate: rotation.value }],
}));

<Path animatedProps={animatedProps} ... />
```

This pattern isn't currently needed but may be useful for future features.

---

## 8. Specific File Recommendations

### LFOVisualizer.tsx

**Good**: Clean composition of static and animated components
**Suggestion**: Consider lazy loading of WaveformDisplay for performance on low-end devices

### PhaseIndicator.tsx

**Good**: Excellent use of useDerivedValue for coordinate calculations
**Suggestion**: The waveform sampling in yPosition calculation duplicates logic from other components. Consider extracting to a shared utility.

### DestinationMeter.tsx

**Good**: Proper use of withSpring for smooth transitions
**Suggestion**: The springConfig could be extracted to a constants file for consistency
**Suggestion**: Consider debouncing the runOnJS call for setCurrentValue

### worklets.ts

**Excellent**: Well-structured worklet functions with proper 'worklet' directives
**Suggestion**: Consider adding JSDoc comments explaining the mathematical formulas

### useSlowMotionPhase.ts

**Good**: Sophisticated phase tracking with drift correction
**Concern**: High complexity may make debugging difficult
**Suggestion**: Add more inline comments explaining the algorithm

---

## 9. Summary of Recommendations

### High Priority

1. **Add throttling to runOnJS display updates** to reduce JS-UI bridge traffic
2. **Review useSlowMotionPhase complexity** - consider if simpler approach is viable

### Medium Priority

3. **Add comments to empty dependency arrays** explaining SharedValue handling
4. **Consider batching related useDerivedValue calls** where Skia supports it
5. **Add cache size limits to WaveformIcon path cache**

### Low Priority

6. **Extract spring configurations** to constants
7. **Normalize SharedValue inputs** at component boundaries to avoid runtime checks
8. **Add JSDoc to worklet functions** for mathematical clarity

---

## 10. Conclusion

The Reanimated-Skia integration in this codebase is **well-implemented** and follows most recommended patterns. The separation between static (memoized paths) and animated (SharedValue-driven props) is correct, worklets are properly used, and there are no obvious threading issues.

The main opportunities for improvement are:
1. Reducing JS-UI bridge crossings for display updates
2. Simplifying complex state tracking logic
3. Adding documentation for non-obvious patterns

The architecture is sound and should scale well as features are added.
