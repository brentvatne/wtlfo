# Documentation Review

## Executive Summary

This codebase demonstrates **generally good documentation practices**, particularly for the LFO waveform and algorithm implementations. The core worklet functions, hook interfaces, and context providers have appropriate JSDoc comments. However, there are opportunities for improvement in some UI components and the documentation of complex state management patterns.

**Overall Score: 7/10**

---

## 1. Comment Presence

### Well-Documented Areas

| File | Coverage | Notes |
|------|----------|-------|
| `src/components/lfo/worklets.ts` | Excellent | All exported functions have JSDoc with descriptions |
| `src/components/lfo/hooks/useSlowMotionPhase.ts` | Excellent | Comprehensive algorithm documentation |
| `src/components/lfo/hooks/useWaveformPath.ts` | Good | Hook and re-exports documented |
| `src/components/lfo/utils/getSlowdownInfo.ts` | Excellent | Interface and function documentation |
| `src/types/destination.ts` | Good | Interface properties have inline comments |
| `src/hooks/useModulatedValue.ts` | Good | Both hooks have JSDoc comments |

### Under-Documented Areas

| File | Issue |
|------|-------|
| `src/context/preset-context.tsx` | Complex state machine lacks high-level documentation |
| `src/components/destination/DestinationMeter.tsx` | Inline comments present but no JSDoc |
| `src/components/lfo/LFOVisualizer.tsx` | No component-level documentation |
| `src/components/ErrorBoundary.tsx` | Class methods lack JSDoc |
| `src/data/presets.ts` | Preset configurations lack documentation on purpose/use case |

---

## 2. Comment Quality

### Strengths

**Comments explain "why" effectively:**

```typescript
// worklets.ts - Line 9-11
// Deterministic "random" with seed that gives good positive/negative distribution
// Seed 78.233 gives 8 positive, 8 negative values across 16 steps
```

```typescript
// useSlowMotionPhase.ts - Lines 7-22
// Instead of dividing phase (which limits range to 0-1/factor), this hook
// tracks phase deltas and accumulates them at a slower rate. This ensures
// the display phase still completes full 0-1 cycles, just slower.
```

```typescript
// FadeEnvelope.tsx - Lines 59-68
// Fade duration is proportional to |fade| / 64
// fade = -64 means instant (no fade), fade = -1 means slow fade over full cycle
// fade = -32 means fade completes at phase 0.5
```

### Areas for Improvement

1. **preset-context.tsx**: The animation loop and app state handling are complex but lack explanatory comments:
   ```typescript
   // Lines 208-221 - Animation loop has no documentation
   useEffect(() => {
     const animate = (timestamp: number) => {
       // Missing: Why timestamp is passed to update()
       // Missing: What state.phase and state.output represent
     };
   }, [lfoPhase, lfoOutput]);
   ```

2. **DestinationMeter.tsx**: Magic calculations without explanation:
   ```typescript
   // Line 108-115 - Complex calculation with no comment
   const meterFillHeight = useDerivedValue(() => {
     const modulationAmount = lfoOutput.value * maxModulation;
     // Why is clampedValue calculated this way?
   });
   ```

---

## 3. JSDoc/TSDoc Analysis

### Well-Documented Public APIs

**worklets.ts:**
```typescript
/**
 * Sample RND waveform with SLEW (smoothing) applied
 *
 * @param phase - Current phase (0-1)
 * @param slew - Slew amount (0-127). 0 = no smoothing, 127 = max smoothing
 * @returns Smoothed random value
 */
export function sampleRandomWithSlew(phase: number, slew: number): number
```

**useWaveformPath.ts:**
```typescript
/**
 * Hook to generate a Skia Path for the waveform
 *
 * Uses bipolar coordinate system (-1 to 1, centered).
 * Applies depth scaling to show the actual output shape.
 *
 * @param depth - Optional depth value (-64 to +63). Scales and potentially inverts the waveform.
 * @param startPhase - Optional start phase offset (0-127). Shifts the waveform so this phase appears at x=0.
 * @param closePath - If true, closes the path to the baseline for proper fill rendering.
 */
```

### Missing JSDoc

| File | Function/Component | Issue |
|------|-------------------|-------|
| `preset-context.tsx` | `PresetProvider` | Missing component documentation |
| `modulation-context.tsx` | `ModulationProvider` | Missing component documentation |
| `ErrorBoundary.tsx` | All methods | Missing JSDoc for lifecycle methods |
| `LFOVisualizer.tsx` | Component | Missing component-level documentation |
| `DestinationMeter.tsx` | Component | Missing component-level documentation |
| `RandomWaveform.tsx` | Component | Missing param documentation for `samples` prop |
| `ParameterEditor.tsx` | `QuickEditPanel` | Missing component documentation |

---

## 4. TODO/FIXME Analysis

**Finding: No outstanding TODO/FIXME comments found.**

A grep search for `TODO`, `FIXME`, `XXX`, and `HACK` patterns returned no results, which indicates:
- Either the codebase is well-maintained with issues tracked elsewhere
- Or there may be undocumented technical debt that should be captured

**Recommendation**: Consider adding TODO comments for known limitations or future improvements to help new developers understand areas that need attention.

---

## 5. Magic Numbers/Values

### Well-Documented Constants

**worklets.ts:**
```typescript
// Line 11 - Seed value explained
return Math.sin(step * 78.233 + 0.5) * 0.9;
// Comment above explains: "Seed 78.233 gives 8 positive, 8 negative values across 16 steps"
```

**getSlowdownInfo.ts:**
```typescript
export const DEFAULT_SLOWDOWN_CONFIG: SlowdownConfig = {
  targetCycleTimeMs: 500,
  hysteresisMargin: 0.25, // Widened from 0.15 to prevent rapid factor oscillations
};
```

### Undocumented Magic Numbers

| File | Line | Value | Should Document |
|------|------|-------|-----------------|
| `preset-context.tsx` | 9 | `ENGINE_DEBOUNCE_MS = 100` | Named but needs explanation why 100ms |
| `preset-context.tsx` | 14 | `DEFAULT_BPM = 120` | Named but could explain standard tempo |
| `preset-context.tsx` | 186 | `15000 / bpm` | Formula for ms per step needs comment |
| `LFOVisualizer.tsx` | 86-88 | `40`, `40`, `28` | Heights for UI sections unnamed |
| `useSlowMotionPhase.ts` | 71 | `0.15 / Math.sqrt(factor)` | Threshold formula needs explanation |
| `useSlowMotionPhase.ts` | 74 | `10` | Frame detection window unexplained |
| `useSlowMotionPhase.ts` | 147 | `60` | Drift correction interval unexplained |
| `DestinationMeter.tsx` | 78 | `{ damping: 40, stiffness: 380 }` | Spring config rationale |
| `constants.ts` | 47-49 | `300`, `150`, `8` | Default dimensions named but not explained |

### Recommended Named Constants

The following should be extracted to named constants with documentation:

```typescript
// Suggested additions to constants.ts:

/** Number of S&H steps per LFO cycle for RND waveform */
export const RANDOM_STEPS_PER_CYCLE = 16;

/** Seed for deterministic random that gives balanced positive/negative distribution */
export const RANDOM_SEED = 78.233;

/** Default frame rate assumption for timing calculations */
export const ASSUMED_FPS = 60;

/** Frames to wait after parameter change before accepting phase deltas */
export const POST_CHANGE_STABILITY_FRAMES = 10;
```

---

## 6. Algorithm Documentation

### Waveform Algorithms (worklets.ts) - EXCELLENT

Each waveform type is well-commented with its mathematical behavior:

```typescript
case 'TRI': // Triangle - Bipolar
  if (phase < 0.25) return phase * 4;
  if (phase < 0.75) return 1 - (phase - 0.25) * 4;
  return -1 + (phase - 0.75) * 4;
```

The random/slew algorithm has particularly good documentation:
```typescript
// Calculate slew amount (0-127 maps to 0-1 transition time as fraction of step)
// At slew=127, we interpolate over the entire step duration
const slewFraction = slew / 127;
```

### Slow-Motion Logic (useSlowMotionPhase.ts) - EXCELLENT

The hook has comprehensive documentation explaining:
- The problem being solved (phase division vs delta accumulation)
- Fixed issues from previous implementations
- Parameter explanations

```typescript
/**
 * Fixed issues:
 * 1. Reset on ANY factor change (not just 1↔>1 transitions)
 * 2. Adaptive discontinuity thresholds based on slowdown factor
 * 3. Periodic drift correction to prevent accumulated floating-point errors
 * 4. Extended frame detection window for post-change stability
 * 5. Improved wrap-around detection with expected delta estimation
 */
```

### Timing Calculations - NEEDS IMPROVEMENT

**preset-context.tsx** has timing calculations that need better documentation:

```typescript
// Lines 185-192 - Should explain the formula
const msPerStep = 15000 / bpm;  // Why 15000? (60000ms / 4 beats per bar)
const steps = info.cycleTimeMs / msPerStep;
```

### Fade Envelope (FadeEnvelope.tsx) - GOOD

Has inline comments explaining the fade duration calculation but could benefit from a formula summary at the top:

```typescript
// Suggested addition:
/**
 * Fade envelope calculation:
 * - fadeDuration = (64 - |fade|) / 64
 * - At fade = -64: instant (duration = 0)
 * - At fade = -1: full cycle (duration ≈ 0.98)
 * - Negative fade: fade-in (0 → 1)
 * - Positive fade: fade-out (1 → 0)
 */
```

### Modulation Calculations (useModulatedValue.ts) - GOOD

Clear worklet separation reasoning:
```typescript
// Extract primitives OUTSIDE the worklet to avoid object access in worklet
```

---

## 7. Missing Documentation

### Critical Documentation Needs

#### 1. PresetProvider State Machine

The `PresetProvider` manages complex state including:
- LFO engine lifecycle
- Animation loop management
- App background/foreground transitions
- Debounced configuration updates

**Recommendation**: Add a high-level comment block explaining the state flow:

```typescript
/**
 * PresetProvider manages the global LFO state including:
 *
 * STATE MANAGEMENT:
 * - activePreset: Index of currently selected preset
 * - currentConfig: Immediate config (updates instantly for UI)
 * - debouncedConfig: Delayed config (updates after 100ms, triggers engine recreation)
 *
 * ANIMATION LIFECYCLE:
 * - Animation loop runs via requestAnimationFrame
 * - Pauses when app goes to background (battery saving)
 * - Resumes when app returns to foreground (if not user-paused)
 *
 * LFO ENGINE:
 * - Recreated when debouncedConfig changes
 * - Phase resets to startPhase on recreation
 * - Auto-triggers for TRG, ONE, HLF modes
 */
```

#### 2. ModulationProvider Purpose

**Recommendation**: Add component-level documentation:

```typescript
/**
 * ModulationProvider manages LFO routing and destination center values.
 *
 * Center values are persisted globally and remembered when switching destinations.
 * This allows users to set up different "home" positions for each parameter
 * that persist across preset changes.
 *
 * Supports multiple LFO routing (designed for future multi-LFO support).
 */
```

#### 3. LFOVisualizer Architecture

The component accepts both static numbers and SharedValues but this dual-mode behavior is not documented:

```typescript
/**
 * LFOVisualizer - Animated LFO waveform display component
 *
 * Supports two modes:
 * - Static: Pass numbers for phase/output (useful for previews, documentation)
 * - Animated: Pass SharedValues for real-time animation from LFO engine
 *
 * The component automatically detects which mode based on prop types.
 */
```

#### 4. Worklet Boundary Documentation

Files using Reanimated worklets should document the UI thread boundary:

```typescript
// Recommended addition to worklets.ts:
/**
 * WORKLET FUNCTIONS
 *
 * These functions run on the UI thread via Reanimated worklets.
 * They must:
 * - Include 'worklet' directive as first statement
 * - Avoid accessing JS thread objects/closures
 * - Use only primitive values and pure math operations
 *
 * Call these from useDerivedValue, useAnimatedReaction, or useAnimatedStyle.
 */
```

### Documentation for New Developers

A new developer joining this project would benefit from:

1. **ARCHITECTURE.md** - High-level overview of:
   - Component hierarchy
   - Context providers and their responsibilities
   - Worklet/UI thread boundaries
   - Data flow from LFO engine to visualization

2. **Inline explanations for domain concepts**:
   - What is "phase" (0-1 normalized position in cycle)
   - Bipolar vs unipolar waveforms
   - What "depth" means (amplitude scaling)
   - What "slew" means for RND waveform (smoothing between steps)

3. **Interface documentation for props**:
   - `LFOVisualizerProps` has comments but some props could be clearer
   - `DestinationMeterProps` needs param documentation

---

## 8. Recommendations Summary

### High Priority

1. **Document PresetProvider state machine** - Complex state management needs overview
2. **Add JSDoc to context provider components** - `PresetProvider`, `ModulationProvider`
3. **Document timing calculation formulas** - `15000 / bpm`, step calculations
4. **Extract and name magic numbers** - Spring configs, frame counts, thresholds

### Medium Priority

1. **Add component-level JSDoc to visualizer components** - `LFOVisualizer`, `DestinationMeter`
2. **Document worklet boundary requirements** - Help developers understand UI thread rules
3. **Add examples to complex hooks** - Usage examples in JSDoc for `useSlowMotionPhase`
4. **Document preset configurations** - What each preset is designed for

### Low Priority

1. **Add TODO comments for known improvements** - Currently no TODO tracking in code
2. **Document accessibility implementations** - Already present but could explain rationale
3. **Add architecture documentation** - Separate ARCHITECTURE.md file

---

## Positive Highlights

1. **Excellent waveform algorithm documentation** - Clear comments on each waveform type
2. **Good use of JSDoc for public APIs** - Worklets and hooks are well-documented
3. **Explanatory comments for complex math** - Slew, fade, and phase calculations explained
4. **No stale TODO/FIXME comments** - Codebase appears well-maintained
5. **Type definitions include documentation** - `types.ts` files have helpful comments
6. **Good accessibility attributes** - Components include appropriate ARIA attributes

---

*Review generated on: 2026-01-19*
*Files analyzed: 30+ source files in /Users/brent/wtlfo/src*
