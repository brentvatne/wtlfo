# 60fps Performance Plan: Making wtlfo the Smoothest App Ever

## Executive Summary

Five expert agents analyzed the codebase across Reanimated animations, Skia rendering, React components, JS thread workload, and Audio/MIDI performance. This plan consolidates their findings into a prioritized roadmap for achieving consistent 60fps.

---

## Critical Issues (Must Fix)

### 1. Reanimated Strict Mode Disabled - Threading Violations
**Severity: CRITICAL** | **Impact: Architectural debt, potential race conditions**

**Problem:** The LFO engine runs on the JS thread via `requestAnimationFrame` and directly writes to SharedValues (`lfoPhase.value`, `lfoOutput.value`, `lfoFadeMultiplier.value`), violating Reanimated's threading model. Strict mode is disabled to suppress warnings.

**Files:**
- `src/context/preset-context.tsx` (lines 841-843, 918-920)
- `src/components/lfo/LFOVisualizer.tsx` (lines 77-78)
- `app/_layout.tsx` (line 56 - strict mode disabled)

**Options:**
| Option | Effort | Risk | Benefit |
|--------|--------|------|---------|
| A. Accept current pattern | None | Medium | Works now |
| B. Use `useFrameCallback` (UI thread) | High (4-6h) | Low | Full compliance, better perf |
| C. Bridge with `useAnimatedReaction` | Medium (2-3h) | Low | Partial compliance |

**Recommendation:** Option B - Port LFO engine to UI thread using `useFrameCallback`. This eliminates JS→UI thread overhead and enables strict mode.

---

### 2. Synchronous Storage Operations Blocking Main Thread
**Severity: CRITICAL** | **Impact: Frame drops during parameter changes**

**Problem:** `Storage.setItemSync()` with `JSON.stringify()` runs synchronously during user interactions, blocking the JS thread.

**Files:**
- `src/context/modulation-context.tsx` (lines 103, 112) - saves on every change
- `src/context/preset-context.tsx` (38+ locations) - BPM, toggles, settings
- `src/context/midi-context.tsx` (8 locations)

**Current pattern (BAD):**
```typescript
const setBPM = useCallback((newBPM: number) => {
  setBPMState(clampedBPM);
  Storage.setItemSync(BPM_STORAGE_KEY, String(clampedBPM)); // BLOCKS
}, []);
```

**Fixed pattern (GOOD):**
```typescript
const setBPM = useCallback((newBPM: number) => {
  setBPMState(clampedBPM);
  requestIdleCallback(() => {
    Storage.setItemSync(BPM_STORAGE_KEY, String(clampedBPM));
  });
}, []);
```

**Effort:** 2-3 hours
**Impact:** Eliminates slider drag jank

---

### 3. Audio Parameter Updates Not Optimized
**Severity: CRITICAL** | **Impact: Unnecessary per-frame computation**

**Problem:** `updateAudioParams` runs every frame via RAF with full switch/case evaluation and expensive math (`Math.pow` in frequency calculations).

**File:** `src/context/audio-context.tsx` (lines 221-296)

**Issues:**
- No caching of destination-specific update functions
- Web Audio API scheduled ramps conflict with per-frame `.value` assignments
- Expensive conversions (midiToFilterFreq, midiToPitch) run every frame

**Fix:**
1. Cache destination-specific updater functions
2. Use `linearRampToValueAtTime` instead of per-frame value assignments
3. Only update when value actually changes (delta check)

**Effort:** 2-3 hours

---

### 4. Path Regeneration in Worklets Every Frame
**Severity: HIGH** | **Impact: CPU waste during depth animation**

**Problem:** `WaveformDisplay.tsx` and `RandomWaveform.tsx` regenerate 128-sample Skia paths inside `useDerivedValue` on every depth animation frame.

**Files:**
- `src/components/lfo/WaveformDisplay.tsx` (lines 54-90, 93-136)
- `src/components/lfo/RandomWaveform.tsx` (lines 95-144)

**Current:** Path regenerates 60x/second during depth animation (120ms × 60fps = 7+ regenerations)

**Fix:** Use Group transform for depth scaling instead of path regeneration:
```typescript
// Build path ONCE at full depth
const basePath = useMemo(() => buildPath(/*...*/), [waveform, width, height]);

// Animate via transform (cheap)
const transform = useDerivedValue(() => [
  { scaleY: depthScale.value }
]);

<Group transform={transform}>
  <Path path={basePath} />
</Group>
```

**Effort:** 2-3 hours
**Impact:** Eliminates path computation during animation

---

## High Priority Issues

### 5. Multiple RAF Callbacks Without Coordination
**Severity: HIGH** | **Impact: Potential double animation loops**

**Problem:** Same `animationRef.current` is reused across multiple code paths (main loop, editing recovery, background recovery) with race conditions between them.

**File:** `src/context/preset-context.tsx` (lines 838-847, 923-926, 970-979)

**Fix:** Implement state machine control:
```typescript
type AnimationState = 'running' | 'paused' | 'editing' | 'background';
const animationStateRef = useRef<AnimationState>('paused');

// Single RAF callback that checks state
const animate = (timestamp: number) => {
  if (animationStateRef.current !== 'running') return;
  // ... animation logic
  animationRef.current = requestAnimationFrame(animate);
};
```

**Effort:** 1-2 hours

---

### 6. Audio Ramp/RAF Conflicts
**Severity: HIGH** | **Impact: Audio clicks/pops during fades**

**Problem:** RAF loop updates `gain.gain.value` while `linearRampToValueAtTime` is active.

**File:** `src/context/audio-context.tsx` (lines 345-346, 375)

**Fix:** Pause RAF parameter updates during ramp sequences, or use flag to indicate "ramping":
```typescript
const isRampingRef = useRef(false);

// In updateAudioParams:
if (isRampingRef.current) return; // Skip during ramps
```

**Effort:** 30 minutes

---

### 7. Excessive useDerivedValue Hooks in DestinationMeter
**Severity: HIGH** | **Impact: 18+ derived values computed per component**

**Problem:** `DestinationMeter.tsx` has 18+ `useDerivedValue` hooks for different line positions.

**File:** `src/components/destination/DestinationMeter.tsx` (lines 228-382)

**Fix:** Batch related calculations into fewer hooks:
```typescript
// Instead of 6 separate hooks for line positions:
const linePositions = useDerivedValue(() => {
  'worklet';
  const upper = meterHeight - (animatedUpperBound.value - min) / range * meterHeight;
  const lower = meterHeight - (animatedLowerBound.value - min) / range * meterHeight;
  // ... calculate all positions in one pass
  return { upperP1, upperP2, lowerP1, lowerP2, currentP1, currentP2 };
});
```

**Effort:** 1-2 hours

---

### 8. Heavy Fade Bounds Calculation
**Severity: MEDIUM-HIGH** | **Impact: 128 iterations on every parameter change**

**Problem:** `useMemo` samples waveform 128 times with 11 dependencies.

**File:** `src/context/DestinationMeter.tsx` (lines 251-296)

**Fix:**
1. Reduce samples from 128 to 64 (negligible visual difference)
2. Split dependencies - fade bounds depend on fewer params than final scaling

**Effort:** 30 minutes

---

## Medium Priority Issues

### 9. MIDI Device Polling
**Severity: MEDIUM** | **Impact: 2-second interval keeps JS thread awake**

**Problem:** Polling every 2 seconds while waiting for auto-connect.

**File:** `src/context/midi-context.tsx` (lines 156-161)

**Fix:** Use exponential backoff or native event listeners instead of fixed interval.

**Effort:** 1 hour

---

### 10. Context Value Object Recreation
**Severity: MEDIUM** | **Impact: Unnecessary object allocation per render**

**Problem:** `PresetContext` value object with 40+ properties recreated every render.

**File:** `src/context/preset-context.tsx` (lines 1002-1063)

**Fix:** Wrap in `useMemo` with proper dependencies:
```typescript
const value = useMemo(() => ({
  activePreset,
  preset: PRESETS[activePreset],
  // ...
}), [activePreset, currentConfig, /* ... */]);
```

**Effort:** 30 minutes

---

### 11. Off-Screen Animation Not Paused
**Severity: MEDIUM** | **Impact: Battery drain when visualization hidden**

**Problem:** Animation only pauses on app background, not when navigating to other tabs or pushing modals.

**File:** `src/context/preset-context.tsx` (lines 929-994)

**Fix:** Add visibility tracking:
```typescript
const { isFocused } = useIsFocused(); // or use navigation events
useEffect(() => {
  if (!isFocused) pauseAnimation();
  else resumeAnimation();
}, [isFocused]);
```

**Effort:** 1 hour

---

### 12. Modulation Context Storage Not Debounced
**Severity: MEDIUM** | **Impact: I/O on every center value change**

**Problem:** Effects persist immediately on every `centerValues` change.

**File:** `src/context/modulation-context.tsx` (lines 101-116)

**Fix:** Add 300-500ms debounce before persisting.

**Effort:** 30 minutes

---

## Low Priority Issues

### 13. Static Skia Icons Not Memoized
**Severity: LOW** | **Impact: Path creation on every render**

**Files:** `src/components/learn/SkiaIcons.tsx`, `src/components/params/ParamIcons.tsx`

These icons create `Skia.Path.Make()` in component body. For static icons, this is acceptable but could be optimized.

**Fix:** Move path creation to module scope or useMemo.

**Effort:** 1 hour

---

### 14. Inconsistent Animation Durations
**Severity: LOW** | **Impact: Visual inconsistency**

**Problem:** Mix of 16ms (instant), 96ms, 448ms, and 752ms animations.

**File:** `src/context/preset-context.tsx` (lines 31-37)

**Fix:** Standardize durations and consider `useReducedMotion()`.

**Effort:** 30 minutes

---

## Implementation Phases

### Phase 1: Critical Fixes (1-2 days)
| Task | Effort | Impact |
|------|--------|--------|
| Defer all Storage.setItemSync to requestIdleCallback | 2-3h | High |
| Fix audio RAF/ramp conflicts | 30m | High |
| Add delta check to audio parameter updates | 1h | Medium |

### Phase 2: Architecture Improvements (2-3 days)
| Task | Effort | Impact |
|------|--------|--------|
| Port LFO engine to UI thread (useFrameCallback) | 4-6h | Critical |
| Use Group transform for depth animation | 2-3h | High |
| Consolidate RAF callbacks with state machine | 1-2h | High |
| Batch DestinationMeter derived values | 1-2h | Medium |

### Phase 3: Optimization Polish (1-2 days)
| Task | Effort | Impact |
|------|--------|--------|
| Reduce fade bounds samples to 64 | 30m | Medium |
| Add visibility-based animation pausing | 1h | Medium |
| Debounce modulation context storage | 30m | Medium |
| Memoize context value objects | 30m | Low |
| Event-driven MIDI polling | 1h | Low |

### Phase 4: Re-enable Strict Mode
After Phase 2 is complete:
1. Remove `strict: false` from Reanimated logger config
2. Verify no warnings in development
3. Add documentation for intentional patterns

---

## Success Metrics

1. **Frame Rate:** Consistent 60fps during:
   - Parameter slider drags
   - Depth animations
   - Tab switches
   - Audio enable/disable

2. **Profiler Targets:**
   - JS thread: No frames >16ms
   - UI thread: No frames >16ms
   - No GC pauses during animation

3. **Reanimated Strict Mode:** Enabled with zero warnings

4. **Battery:** Animation pauses when not visible

---

## Testing Plan

1. **Manual Testing:**
   - Rapid slider drag on all parameters
   - Toggle test tone on/off rapidly
   - Switch tabs during animation
   - Background/foreground app during playback

2. **Profiling:**
   - Use Flipper/Instruments to verify frame times
   - Check for GC pressure during sustained animation
   - Verify RAF callback count (should be 1)

3. **Automated:**
   - Add performance regression tests
   - Monitor frame drop rate in production via EAS Observe

---

## Appendix: Files Changed

| File | Changes |
|------|---------|
| `src/context/preset-context.tsx` | Storage defer, RAF consolidation, context memoization |
| `src/context/audio-context.tsx` | Ramp coordination, parameter update optimization |
| `src/context/modulation-context.tsx` | Storage debounce |
| `src/context/midi-context.tsx` | Event-driven polling |
| `src/components/lfo/WaveformDisplay.tsx` | Group transform for depth |
| `src/components/lfo/RandomWaveform.tsx` | Group transform for depth |
| `src/components/destination/DestinationMeter.tsx` | Batch derived values |
| `app/_layout.tsx` | Re-enable strict mode |
