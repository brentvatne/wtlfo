# Depth Slider Performance Optimization Plan

## Problem Statement
Changing the depth parameter via slider feels choppy (~45fps with occasional frame drops) compared to the center value slider which feels smooth (60fps). This document analyzes the root causes and proposes optimization strategies.

---

## Data Flow Comparison

### Center Value Slider (SMOOTH - 60fps)
```
User drags slider
    ↓
setLocalValue() → immediate visual feedback
    ↓
setCenterValue() → React state update (only on integer change)
    ↓
DestinationMeter receives new prop
    ↓
useEffect: withTiming(centerValue, { duration: 60ms }) ← KEY: Native thread animation
    ↓
useDerivedValue worklets calculate Y positions on native thread
    ↓
Skia renders with interpolated values
```

### Depth Slider (CHOPPY - ~45fps)
```
User drags slider
    ↓
setLocalValue() → immediate visual feedback
    ↓
updateParameter('depth') → setCurrentConfig() React state
    ↓
HomeScreen re-renders (uses currentConfig)
    ↓
useWaveformPath(depth) → useMemo recalculates ← BOTTLENECK: Synchronous JS thread work
    ↓
128+ iterations of:
  - sampleWaveformWorklet() calls
  - path.lineTo() native bridge calls
    ↓
WaveformDisplay receives new paths, re-renders
    ↓
Skia renders new paths
```

---

## Identified Bottlenecks (Ranked by Impact)

### 1. Synchronous Skia Path Regeneration (95% confidence - PRIMARY)

**Location:** `src/components/lfo/hooks/useWaveformPath.ts:38-105`

**Problem:**
```typescript
return useMemo(() => {
  const path = Skia.Path.Make();
  for (let i = 0; i <= resolution; i++) {  // 128 iterations
    // Math operations + waveform sampling
    path.lineTo(x, y);  // Native bridge call each iteration
  }
  return path;
}, [depth, ...]);  // Runs on EVERY depth change
```

**Cost per execution:**
- 128 loop iterations
- 128 `sampleWaveformWorklet()` calls (Math.sin, switch statements)
- 128+ `path.lineTo()` native bridge calls
- For RND waveform: additional smoothstep calculations
- **Estimated: 2-5ms per generation** (16.6ms frame budget at 60fps)

**Why center value doesn't have this:**
Center value doesn't regenerate paths - it only animates existing UI elements.

---

### 2. No Animation Smoothing (75% confidence)

**Problem:** Depth changes apply instantly to visualization.

**Center value approach:**
```typescript
// DestinationMeter.tsx
animatedCenterValue.value = withTiming(centerValue, { duration: 60 });
```

**Depth approach:**
```typescript
// No smoothing - direct prop pass
<WaveformDisplay depth={currentConfig.depth} />
```

**Result:** Every gesture frame triggers full path recalculation instead of interpolating.

---

### 3. React State Cascade (65% confidence)

**Problem:** Depth changes trigger multiple component re-renders.

**Chain:**
1. `updateParameter()` → `setCurrentConfig()`
2. HomeScreen re-renders (consumes `currentConfig`)
3. LFOVisualizer re-renders
4. WaveformDisplay re-renders (generates new paths)
5. PhaseIndicator re-renders
6. ParameterBadges re-renders

**Center value scope:** Only DestinationMeter re-renders.

---

## Proposed Solutions

### Solution A: Animated Depth with Throttled Path Generation (RECOMMENDED)

**Concept:** Decouple visual responsiveness from path regeneration.

```typescript
// 1. Create animated depth shared value
const animatedDepth = useSharedValue(depth);

// 2. Animate depth changes (smooth visual feedback)
useEffect(() => {
  animatedDepth.value = withTiming(depth, { duration: 60 });
}, [depth]);

// 3. Throttle path regeneration (only when animation settles)
const [pathDepth, setPathDepth] = useState(depth);
useEffect(() => {
  const timeout = setTimeout(() => setPathDepth(depth), 80);
  return () => clearTimeout(timeout);
}, [depth]);

// 4. Use pathDepth for expensive path generation
const strokePath = useWaveformPath(waveform, width, height, resolution, 8, pathDepth, startPhase, false);

// 5. Use animatedDepth for real-time visual scaling
// Scale the path transform instead of regenerating
```

**Benefits:**
- Immediate visual feedback via native animation
- Path regeneration only ~12x/second instead of 60x
- JS thread freed during gesture

**Complexity:** Medium

---

### Solution B: GPU-Accelerated Depth Scaling

**Concept:** Generate path once at depth=63, use GPU transform to scale.

```typescript
// Generate base path at max depth (once)
const basePath = useWaveformPath(waveform, width, height, resolution, 8, 63, startPhase, false);

// Animate depth scale on GPU
const depthScale = useDerivedValue(() => {
  'worklet';
  return animatedDepth.value / 63;
}, []);

// Apply scale transform in Skia
<Group transform={[{ scaleY: depthScale }]} origin={{ x: width/2, y: height/2 }}>
  <Path path={basePath} ... />
</Group>
```

**Benefits:**
- Path generated only on waveform/startPhase change
- Depth changes are pure GPU transforms (native thread)
- Fastest possible performance

**Limitations:**
- Negative depth (inversion) needs special handling
- Depth=0 edge case (scaleY=0)

**Complexity:** Medium-High

---

### Solution C: Path Interpolation with Caching

**Concept:** Pre-generate paths at key depth values, interpolate between them.

```typescript
// Pre-generate paths at depths: -63, -32, 0, 32, 63
const pathCache = useMemo(() => ({
  '-63': generatePath(waveform, -63),
  '-32': generatePath(waveform, -32),
  '0': generatePath(waveform, 0),
  '32': generatePath(waveform, 32),
  '63': generatePath(waveform, 63),
}), [waveform, startPhase]);

// Interpolate between cached paths based on current depth
const interpolatedPath = useDerivedValue(() => {
  'worklet';
  return interpolatePaths(pathCache, animatedDepth.value);
}, []);
```

**Benefits:**
- Smooth interpolation on native thread
- Works with all depth values including negative

**Limitations:**
- Skia path interpolation is complex
- May not work well with discontinuous waveforms (SQR)

**Complexity:** High

---

### Solution D: Reduce Path Resolution During Drag

**Concept:** Use lower resolution during interaction, full resolution at rest.

```typescript
const resolution = isEditing ? 32 : 128;
const path = useWaveformPath(waveform, width, height, resolution, ...);
```

**Benefits:**
- 4x faster path generation during drag
- Simple implementation

**Limitations:**
- Visible quality reduction during interaction
- Still regenerates on every frame

**Complexity:** Low

---

## Recommended Implementation Order

### Phase 1: Quick Wins (Solution D + partial A)
1. Add throttled path regeneration (80ms debounce)
2. Reduce resolution during editing (64 instead of 128)
3. **Expected improvement: 30-40%**

### Phase 2: Animation System (Solution A)
1. Create `animatedDepth` shared value
2. Use `withTiming` for depth changes
3. Separate visual depth from path-generation depth
4. **Expected improvement: Additional 30-40%**

### Phase 3: GPU Transform (Solution B)
1. Generate base path at max depth
2. Use GPU scaleY transform for depth changes
3. Handle negative depth with separate inverted path
4. **Expected improvement: Near 60fps parity with center value**

---

## Performance Testing Plan

### Test 1: Path Generation Timing
```typescript
// Add to useWaveformPath.ts
const start = performance.now();
// ... path generation code ...
const elapsed = performance.now() - start;
console.log(`Path generation: ${elapsed.toFixed(2)}ms`);
```

### Test 2: Frame Drop Detection
```typescript
// Add to HomeScreen
useEffect(() => {
  let lastTime = performance.now();
  const checkFrame = () => {
    const now = performance.now();
    const delta = now - lastTime;
    if (delta > 20) { // >20ms = dropped frame
      console.warn(`Frame drop: ${delta.toFixed(1)}ms`);
    }
    lastTime = now;
    requestAnimationFrame(checkFrame);
  };
  requestAnimationFrame(checkFrame);
}, []);
```

### Test 3: Re-render Counting
```typescript
// Add to WaveformDisplay
const renderCount = useRef(0);
useEffect(() => {
  renderCount.current++;
  console.log(`WaveformDisplay renders: ${renderCount.current}`);
});
```

### Test 4: Compare with Center Value
1. Drag depth slider for 2 seconds, count frame drops
2. Drag center value slider for 2 seconds, count frame drops
3. Target: <5 frame drops for depth (currently ~20-30)

---

## Files to Modify

1. `src/components/lfo/hooks/useWaveformPath.ts` - Add throttling, optional resolution
2. `src/components/lfo/WaveformDisplay.tsx` - Add animated depth, GPU transform
3. `src/context/preset-context.tsx` - Add `animatedDepth` shared value
4. `app/(tabs)/(home)/index.tsx` - Pass animated depth to visualizer

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Frame drops during 2s drag | ~20-30 | <5 |
| Path generation time | 2-5ms | <1ms or N/A (GPU) |
| Perceived smoothness | Choppy | Smooth (60fps) |
| Parity with center value | No | Yes |

---

## Next Steps

1. [ ] Add performance instrumentation (Tests 1-3)
2. [ ] Implement Phase 1 quick wins
3. [ ] Measure improvement
4. [ ] Implement Phase 2 if needed
5. [ ] Implement Phase 3 if needed
