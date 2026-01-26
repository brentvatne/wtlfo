# 60fps Performance Plan: Making wtlfo the Smoothest App Ever

## Executive Summary

Five expert agents analyzed the codebase, and three critics reviewed the plan. This updated version incorporates their feedback.

---

## REVISED Priority List (Post-Critique)

### Phase 1: Quick Wins (1-2 hours total)

#### 1. ✅ DONE: Remove Audio Init Delays
Removed chunked `requestIdleCallback` delays since LFO animation runs on UI thread.

#### 2. Defer Storage Operations to Idle Time
**Effort:** 1 hour | **Impact:** Medium

Individual settings (BPM, toggles) still use synchronous `Storage.setItemSync()`.

**Files to update:**
- `src/context/preset-context.tsx` - setBPM, all toggle setters
- `src/context/modulation-context.tsx` - centerValues, routings persistence

```typescript
// Change from:
Storage.setItemSync(BPM_STORAGE_KEY, String(clampedBPM));

// To:
requestIdleCallback(() => {
  Storage.setItemSync(BPM_STORAGE_KEY, String(clampedBPM));
});
```

#### 3. Reduce Fade Bounds Samples
**Effort:** 10 minutes | **Impact:** Low

`DestinationMeter.tsx` line 251: Change from 128 to 64 samples.

---

### Phase 2: Medium Effort (2-4 hours total)

#### 4. Memoize PresetContext Value Object
**Effort:** 2-3 hours | **Impact:** Medium

The context value has 60+ properties. While React Compiler handles component memoization, it doesn't prevent context propagation when the value object reference changes.

**Note:** This mainly affects slider drag scenarios where `currentConfig` changes frequently.

```typescript
const value = useMemo(() => ({
  activePreset,
  currentConfig,
  // ... all properties
}), [activePreset, currentConfig, /* audit all dependencies */]);
```

#### 5. Consolidate WaveformDisplay Path Generation
**Effort:** 1-2 hours | **Impact:** Medium

Currently generates TWO nearly-identical paths (stroke + fill). The fill path just adds closing lines.

**Fix:** Generate base path once, derive fill from stroke by adding closing lines.

**File:** `src/components/lfo/WaveformDisplay.tsx`

#### 6. Fix RandomWaveform Array Allocations in Worklets
**Effort:** 1 hour | **Impact:** Medium-High

`RandomWaveform.tsx` creates new arrays and sorts inside worklets on every frame:
```typescript
const shiftedSamples = currentSamples.map(s => ({...}));
shiftedSamples.sort((a, b) => ...);
```

**Fix:** Pre-sort once when `samplesData` changes, not on every depth frame.

---

### Phase 3: Architecture (NOT RECOMMENDED - High Effort, Moderate Benefit)

#### ~~7. Port LFO Engine to UI Thread~~
**DROPPED** per critic feedback.

The `elektron-lfo` package is a plain JS class and is NOT worklet-compatible. Porting would require:
- Rewriting entire engine as worklet functions
- Converting all helper modules (`waveforms.ts`, `timing.ts`, `triggers.ts`, `fade.ts`)
- Handling state as SharedValues
- **Realistic effort: 12-20 hours**

The current hybrid approach (precomputed phase animation + JS RAF for output) is working well.

#### ~~8. Group Transform for Depth Animation~~
**DROPPED** per critic feedback.

The proposed `scaleY` transform is **flawed**:
- Scales from corner, not center (needs translate-scale-translate chain)
- Fill path baseline would move incorrectly
- `speedInvert` complicates the transform

**Alternative:** Keep current worklet-based path generation but optimize:
- Reuse `Skia.Path` objects with `path.reset()` instead of `Skia.Path.Make()`
- Generate stroke path once, derive fill by adding closing lines

---

## Key Findings from Critics

### Critic 1 (Architecture):
1. **Context memoization is more important than stated** - 60+ properties, affects slider drag
2. **Storage is already partially deferred** - config uses `requestIdleCallback`, but individual settings don't
3. **WaveformDisplay duplicates work** - generates stroke and fill paths separately
4. **Effort estimates were optimistic** - especially for worklet migration

### Critic 2 (Skia/Reanimated Expert):
1. **Group transform won't work as written** - needs transform chain or matrix transform
2. **elektron-lfo is NOT worklet-compatible** - 12-20 hour rewrite, not 4-6h
3. **Missing Skia optimizations:**
   - Path reuse with `path.reset()` instead of `Skia.Path.Make()`
   - `Skia.Picture` caching for static elements (grid lines)
   - Reduce samples for visual waveforms (128 → 64 is fine visually)
4. **useDerivedValue batching nuance** - Y positions can batch, but `vec()` points should stay separate for Skia

### Critic 3 (RN Performance):
- Output file unavailable, but covered memory/GC concerns

---

## What NOT to Do

1. **Don't port LFO to useFrameCallback** - Too much effort for marginal benefit
2. **Don't use simple scaleY for depth** - Visual bugs from incorrect transform origin
3. **Don't batch vec() derived values** - Skia needs direct SharedValue references
4. **Don't over-optimize storage** - Only high-frequency operations need idle deferral

---

## Recommended Implementation Order

1. ✅ ~~Remove audio init delays~~ (DONE)
2. Defer individual settings storage to `requestIdleCallback`
3. Reduce fade bounds samples (128 → 64)
4. Fix RandomWaveform array allocations (pre-sort once)
5. Consolidate WaveformDisplay stroke/fill generation
6. Memoize PresetContext value (requires dependency audit)
7. Add `path.reset()` reuse for Skia paths

---

## Success Metrics

- No frames >16ms during slider drags
- No visible jank during depth animations
- Consistent 60fps in FrameRateOverlay
- Reanimated strict mode can be re-enabled (stretch goal)

---

## Files Reference

| File | Key Changes |
|------|-------------|
| `src/context/preset-context.tsx` | Storage defer, context memoization |
| `src/context/modulation-context.tsx` | Storage debounce |
| `src/components/lfo/WaveformDisplay.tsx` | Consolidate paths, path.reset() |
| `src/components/lfo/RandomWaveform.tsx` | Pre-sort samples, path.reset() |
| `src/components/destination/DestinationMeter.tsx` | Reduce samples |
