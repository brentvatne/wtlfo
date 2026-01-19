# Frame Budget Analysis - React Native LFO Visualizer

## Executive Summary

This document analyzes the per-frame animation performance of the LFO visualizer app. The app uses a hybrid architecture combining JavaScript animation loops, Reanimated worklets, and Skia canvas rendering.

**Overall Assessment: LOW RISK of frame drops for typical usage**

The architecture is well-designed with clear separation between JS thread work and UI thread worklets. However, there are several optimization opportunities that could further reduce overhead.

---

## 1. Frame Budget Calculation

### Target Frame Rate
- **Target**: 60 FPS (16.67ms per frame)
- **iOS Budget**: ~12-14ms (accounting for OS overhead)
- **Android Budget**: ~10-12ms (more variable due to vendor differences)

### Work Distribution Per Frame

| Component | Thread | Estimated Time | Risk Level |
|-----------|--------|----------------|------------|
| LFO Engine Update | JS | 0.1-0.3ms | Low |
| SharedValue Updates | JS -> UI bridge | 0.05ms | Low |
| useDerivedValue worklets | UI | 0.1-0.5ms | Low |
| useAnimatedReaction | UI -> JS bridge | 0.2-0.5ms | **Medium** |
| Skia Canvas Render | UI | 1-3ms | Low |
| React Text Updates | JS | 0.1-0.5ms | Medium |

**Total Estimated**: 2-5ms per frame under normal conditions

### Frame Drop Risk Assessment

**Low Risk Scenarios:**
- Normal playback with static UI
- Single canvas rendering
- No user interaction during animation

**Medium Risk Scenarios:**
- Multiple DestinationMeter components visible simultaneously
- User adjusting parameters during playback (debounced, so mitigated)
- App returning from background (burst of updates)

**High Risk Scenarios (currently not present):**
- No high-risk patterns identified in current implementation

---

## 2. Worklet Analysis

### UI Thread Worklets

#### Location: `/Users/brent/wtlfo/src/components/lfo/PhaseIndicator.tsx`

The PhaseIndicator uses 6 `useDerivedValue` worklets that run on every frame:

```typescript
// Lines 44-50: xPosition calculation
const xPosition = useDerivedValue(() => {
  'worklet';
  const phaseVal = typeof phase === 'number' ? phase : phase.value;
  const displayPhase = ((phaseVal - startPhaseNormalized) % 1 + 1) % 1;
  return padding + displayPhase * drawWidth;
}, [phase, padding, drawWidth, startPhaseNormalized]);
```

**Operations per frame in PhaseIndicator:**
- 2 modulo operations
- 1 addition, 1 subtraction, 1 multiplication
- Math.sin call (for waveform sampling)
- Multiple min/max comparisons

**Assessment**: Lightweight (~0.1-0.2ms). These are simple arithmetic operations well-suited for worklets.

#### Location: `/Users/brent/wtlfo/src/components/lfo/worklets.ts`

```typescript
// sampleWaveformWorklet - called from PhaseIndicator
export function sampleWaveformWorklet(waveform: WaveformType, phase: number): number {
  'worklet';
  switch (waveform) {
    case 'SIN':
      return Math.sin(phase * 2 * Math.PI);  // Most expensive: ~0.05ms
    case 'TRI':
      // 3 comparisons, simple arithmetic
    // ... other waveforms
  }
}
```

**Assessment**: Very lightweight. Switch statement with simple math.

#### Location: `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`

8 `useDerivedValue` worklets:
- `meterFillHeight` (5 math ops)
- `upperBoundY`, `lowerBoundY` (2 math ops each)
- `currentValueY` (1 subtraction)
- `boundRangeHeight` (1 subtraction)
- `upperBoundP1`, `upperBoundP2`, etc. (vec() calls)

**Assessment**: Lightweight (~0.2-0.3ms total). Could potentially combine some values.

### Blocking Work Analysis

**No blocking work detected on UI thread.**

All worklets perform O(1) operations with no loops, no memory allocation, and no I/O.

---

## 3. JS Thread Work

### Animation Loop

**Location**: `/Users/brent/wtlfo/src/context/preset-context.tsx` (lines 209-221)

```typescript
useEffect(() => {
  const animate = (timestamp: number) => {
    if (lfoRef.current) {
      const state = lfoRef.current.update(timestamp);  // LFO engine call
      lfoPhase.value = state.phase;      // SharedValue update
      lfoOutput.value = state.output;    // SharedValue update
    }
    animationRef.current = requestAnimationFrame(animate);
  };
  animationRef.current = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationRef.current);
}, [lfoPhase, lfoOutput]);
```

**Per-frame JS work:**
1. `lfoRef.current.update(timestamp)` - LFO engine computation
2. Two SharedValue assignments

### LFO Engine Analysis

**Location**: `node_modules/elektron-lfo/src/engine/lfo.ts`

The `update()` method performs:
- Delta time calculation (1 subtraction)
- Cycle time calculation (involves speed/multiplier lookup)
- Phase increment calculation
- Waveform generation (switch + math)
- Fade envelope update
- Depth scaling

**Total operations**: ~20-30 simple arithmetic operations per frame.

**Assessment**: Very efficient. No allocations except final state copy.

### runOnJS Calls

**Found 2 runOnJS calls that execute every frame:**

1. **OutputValueDisplay.tsx** (line 21):
```typescript
useAnimatedReaction(
  () => output.value,
  (currentValue) => {
    runOnJS(updateDisplay)(currentValue);  // Triggers React state update
  },
  [output]
);
```

2. **DestinationMeter.tsx** (line 95):
```typescript
useAnimatedReaction(
  () => ({ output: lfoOutput.value, center: animatedCenterValue.value }),
  ({ output, center }) => {
    runOnJS(setCurrentValue)(value);  // Triggers React state update
  },
  [maxModulation, min, max]
);
```

**Impact**: Each `runOnJS` call causes a thread hop and potentially triggers React re-renders.

### State Update Frequency

**OutputValueDisplay**: Updates `displayValue` state on EVERY frame (60 times/second)
**DestinationMeter**: Updates `currentValue` state on EVERY frame (60 times/second)

**This is excessive.** The human eye cannot perceive changes faster than ~15-20 FPS for numeric displays.

---

## 4. Skia Rendering Analysis

### Draw Calls Per Frame

#### LFOVisualizer Canvas

| Element | Draw Calls | Notes |
|---------|------------|-------|
| GridLines | 14 | 9 vertical + 5 horizontal + 1 center line |
| WaveformDisplay | 2 | Fill path + stroke path |
| FadeEnvelope | 1 | Optional, only when fade active |
| PhaseIndicator | 2-3 | Line + Circle (+ optional Group) |

**Total**: 17-20 draw calls per frame

#### DestinationMeter Canvas

| Element | Draw Calls | Notes |
|---------|------------|-------|
| RoundedRect background | 1 | |
| Grid lines | 5 | 4 divisions + endpoints |
| Modulation range Rect | 1 | When depth != 0 |
| Upper/Lower bound Lines | 2 | When depth != 0 |
| Current value Line | 1 | When not editing |

**Total**: 8-10 draw calls per frame

### Path Generation Efficiency

**WaveformDisplay** (`useWaveformPath` hook):
- Uses `useMemo` with proper dependencies
- Path only regenerated when waveform/depth/startPhase changes
- Resolution: 128 points (129 lineTo calls during generation)

**FadeEnvelope**:
- Also uses `useMemo` for path generation
- Same 128-point resolution

**RandomWaveform**:
- Uses `useMemo` with sample array dependency
- Path regenerated when samples change (which happens when LFO config changes)

**Assessment**: Path generation is properly memoized. Paths are NOT regenerated every frame.

### Canvas Clearing

Skia Canvas in React Native Skia **implicitly clears** on each frame. This is handled by the library and is highly optimized (GPU-based clear).

No manual canvas clearing is performed, which is correct.

---

## 5. Optimization Opportunities

### High Priority

#### 5.1 Throttle Text Display Updates

**Files**:
- `/Users/brent/wtlfo/src/components/lfo/OutputValueDisplay.tsx`
- `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`

**Problem**: `runOnJS` + `setState` called every frame (~60 times/second) for numeric displays.

**Solution**: Throttle updates to 10-15 FPS max for text displays:

```typescript
// Example throttled update
const lastUpdateRef = useRef(0);
const THROTTLE_MS = 66; // ~15 FPS

useAnimatedReaction(
  () => output.value,
  (currentValue) => {
    const now = Date.now();
    if (now - lastUpdateRef.current >= THROTTLE_MS) {
      lastUpdateRef.current = now;
      runOnJS(updateDisplay)(currentValue);
    }
  },
  [output]
);
```

**Estimated savings**: 45 runOnJS calls/second per component

### Medium Priority

#### 5.2 Consolidate useDerivedValue in DestinationMeter

**File**: `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`

**Current**: 8 separate useDerivedValue hooks
**Proposed**: Consolidate into 2-3 worklets that return objects

```typescript
// Current (8 worklets)
const upperBoundY = useDerivedValue(() => { ... });
const lowerBoundY = useDerivedValue(() => { ... });
const upperBoundP1 = useDerivedValue(() => vec(...) });
// etc.

// Proposed (2 worklets)
const bounds = useDerivedValue(() => {
  'worklet';
  const upperY = meterTop + meterHeight - ((animatedUpperBound.value - min) / range) * meterHeight;
  const lowerY = meterTop + meterHeight - ((animatedLowerBound.value - min) / range) * meterHeight;
  return {
    upperY,
    lowerY,
    rangeHeight: lowerY - upperY,
    upperP1: vec(meterX, upperY),
    upperP2: vec(meterX + meterWidth, upperY),
    lowerP1: vec(meterX, lowerY),
    lowerP2: vec(meterX + meterWidth, lowerY),
  };
});
```

**Estimated savings**: Reduces worklet call overhead by ~50%

#### 5.3 Pre-compute Grid Lines

**File**: `/Users/brent/wtlfo/src/components/lfo/GridLines.tsx`

**Current**: Grid lines created via loops during render
**Proposed**: Memoize grid lines since they only depend on dimensions

```typescript
const gridLines = useMemo(() => {
  const lines = [];
  // ... generate lines
  return lines;
}, [width, height, verticalDivisions, horizontalDivisions]);
```

**Note**: This may already be effectively optimized by React's reconciliation, but explicit memoization ensures it.

### Low Priority

#### 5.4 Move LFO Engine to Worklet (Future)

Currently, the LFO engine runs on JS thread with `requestAnimationFrame`. For maximum performance, the entire engine could be ported to a Reanimated worklet using `useFrameCallback`.

**Tradeoffs**:
- Pro: Eliminates JS thread dependency for animation
- Con: Would require significant refactoring of elektron-lfo library
- Con: Worklets have limited API access (no classes, limited Math)

**Recommendation**: Not worth the effort given current performance is acceptable.

#### 5.5 Reduce PhaseIndicator Y Calculation Complexity

**File**: `/Users/brent/wtlfo/src/components/lfo/PhaseIndicator.tsx`

The `yPosition` worklet (lines 55-95) has complex logic including:
- Waveform sampling
- Depth scaling
- Fade envelope calculation

This duplicates logic from the LFO engine. Consider:
- Using `output` SharedValue directly (already calculated by LFO engine)
- Only use complex calculation for visualization purposes when needed

---

## 6. Performance Monitoring Recommendations

### Add Development Performance Logging

```typescript
// In preset-context.tsx animation loop
const animate = (timestamp: number) => {
  const start = performance.now();

  if (lfoRef.current) {
    const state = lfoRef.current.update(timestamp);
    lfoPhase.value = state.phase;
    lfoOutput.value = state.output;
  }

  if (__DEV__) {
    const elapsed = performance.now() - start;
    if (elapsed > 8) { // Warn if > 50% of frame budget
      console.warn(`LFO update took ${elapsed.toFixed(2)}ms`);
    }
  }

  animationRef.current = requestAnimationFrame(animate);
};
```

### Use React Native Performance Monitor

Enable the performance monitor in development to track:
- JS thread frame rate
- UI thread frame rate
- Memory usage

---

## 7. Summary of Findings

### Architecture Strengths

1. **Clean separation** between JS animation loop and UI worklets
2. **Proper memoization** of expensive path generation
3. **SharedValues** used correctly for cross-thread communication
4. **Lightweight worklets** with no blocking operations
5. **Background handling** pauses animation when app is not visible

### Areas for Improvement

| Issue | Impact | Effort | Priority |
|-------|--------|--------|----------|
| Excessive runOnJS calls | Medium | Low | High |
| Multiple useDerivedValue consolidation | Low | Medium | Medium |
| Grid line memoization | Very Low | Low | Low |

### Conclusion

The current implementation is well-optimized and should maintain 60 FPS on modern devices. The main optimization opportunity is throttling `runOnJS` calls for text displays, which would reduce JS thread overhead without any visible impact to users.

---

## Appendix: File Reference

| File | Purpose | Performance Notes |
|------|---------|-------------------|
| `src/context/preset-context.tsx` | Animation loop, LFO engine | Main JS thread work |
| `src/components/lfo/LFOVisualizer.tsx` | Main visualizer canvas | ~20 draw calls |
| `src/components/lfo/PhaseIndicator.tsx` | Animated dot/line | 6 useDerivedValue worklets |
| `src/components/lfo/WaveformDisplay.tsx` | Static waveform path | Properly memoized |
| `src/components/lfo/OutputValueDisplay.tsx` | Numeric output | runOnJS every frame |
| `src/components/destination/DestinationMeter.tsx` | Modulation meter | 8 useDerivedValue + runOnJS |
| `src/components/lfo/worklets.ts` | Waveform sampling | Lightweight worklet functions |
