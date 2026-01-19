# Constants and Magic Values Review

This document analyzes all magic numbers, strings, and configuration constants in the WTLFO React Native app.

---

## Table of Contents

1. [Timing Constants](#1-timing-constants)
2. [Layout Constants](#2-layout-constants)
3. [Waveform Constants](#3-waveform-constants)
4. [Threshold Values](#4-threshold-values)
5. [Configuration Constants](#5-configuration-constants)
6. [Recommendations](#6-recommendations)

---

## 1. Timing Constants

### Animation Durations

| Value | Location | Purpose | Documented | Should be Configurable |
|-------|----------|---------|------------|------------------------|
| `100ms` | `LFOVisualizer.tsx:80` | Phase indicator fade duration | No | No (UI polish) |
| `150ms` | `SlowMotionBadge.tsx:30-31` | FadeIn/FadeOut animation | No | No (UI polish) |

**Assessment:**
- Animation durations are short and appropriate for responsive UI
- Not documented, but standard UI animation values
- Could be centralized in a `timing.ts` file for consistency

### Debounce Delays

| Value | Location | Purpose | Documented | Should be Configurable |
|-------|----------|---------|------------|------------------------|
| `100ms` | `preset-context.tsx:9` | `ENGINE_DEBOUNCE_MS` - LFO engine recreation delay | Named constant | No |

**Assessment:**
- Well-documented with named constant
- Appropriately tuned to prevent excessive engine recreations during parameter changes

### Slowdown/Visualization Timing

| Value | Location | Purpose | Documented | Should be Configurable |
|-------|----------|---------|------------|------------------------|
| `500ms` | `getSlowdownInfo.ts:19` | `targetCycleTimeMs` - Target display cycle time | Yes (JSDoc) | Yes (via `SlowdownConfig`) |
| `60 frames` | `useSlowMotionPhase.ts:147` | Drift correction interval | Yes (comment) | No (internal tuning) |

**Assessment:**
- Slowdown config is well-structured with `SlowdownConfig` interface
- Frame-based timing is appropriate for the animation system
- Comment at line 5 incorrectly states "default 250ms" but actual default is 500ms

### Spring Animation Config

| Value | Location | Purpose | Documented |
|-------|----------|---------|------------|
| `{ damping: 40, stiffness: 380, overshootClamping: true }` | `DestinationMeter.tsx:78` | Smooth value transitions | Yes (comment) |

**Assessment:**
- Spring config is inline, could be extracted to a shared animation constants file
- Values are appropriate for subtle, non-bouncy transitions

---

## 2. Layout Constants

### Centralized Constants (Good)

| Constant | Value | Location | Purpose |
|----------|-------|----------|---------|
| `DEFAULT_WIDTH` | `300` | `constants.ts:47` | LFO visualizer width |
| `DEFAULT_HEIGHT` | `150` | `constants.ts:48` | LFO visualizer height |
| `PADDING` | `8` | `constants.ts:49` | LFO visualizer padding |

**Assessment:**
- These are properly centralized in `/src/components/lfo/constants.ts`
- Exported and reusable

### Scattered Layout Values (Needs Consolidation)

| Value | Location | Purpose | Issue |
|-------|----------|---------|-------|
| `8` (padding) | Multiple files | Canvas padding | Hardcoded repeatedly |
| `32` (height) | `ParameterSlider.tsx:121`, `CenterValueSlider.tsx:114` | Slider track height | Duplicated |
| `28` | `OutputValueDisplay.tsx:42` | Container height | Inline |
| `16` | Multiple StyleSheet objects | Common padding/margin | Repeated magic number |
| `12` | `DestinationPicker.tsx:140`, `ParameterEditor.tsx:109` | borderRadius | Duplicated |

### Icon Sizing

| Constant | Value | Location |
|----------|-------|----------|
| `DEFAULT_SIZE` | `40` | `SkiaIcons.tsx:14` |
| `DEFAULT_STROKE_WIDTH` | `1.5` | `SkiaIcons.tsx:16` |

**Assessment:**
- Icon defaults are properly named constants
- Should be exported for external use if needed

### Component-Specific Dimensions

| Value | Component | Purpose |
|-------|-----------|---------|
| `width: 60, height: 108` | `DestinationMeter` | Default meter dimensions |
| `dotRadius: 6` | `PhaseIndicator` | Phase dot size |
| `strokeWidth: 2` | Multiple waveform components | Line thickness |

**Assessment:**
- Most are passed as props with sensible defaults
- Prop defaults are appropriate for component flexibility

---

## 3. Waveform Constants

### Random/S&H Generation

| Value | Location | Purpose | Documented |
|-------|----------|---------|------------|
| `78.233` | `worklets.ts:11` | Seed multiplier for deterministic random | Yes (comment) |
| `0.5` | `worklets.ts:11` | Offset for random distribution | Partially |
| `0.9` | `worklets.ts:11` | Output amplitude scaling | No |
| `16` (steps) | `worklets.ts:48,67` | Steps per cycle for S&H | Yes (comment) |

**Code excerpt:**
```typescript
// Seed 78.233 gives 8 positive, 8 negative values across 16 steps
return Math.sin(step * 78.233 + 0.5) * 0.9;
```

**Assessment:**
- The seed value is documented with its purpose (balanced positive/negative distribution)
- The `0.9` amplitude scaling is undocumented - should clarify why not `1.0`
- 16 steps matches Elektron hardware specification

### Exponential Curve

| Value | Location | Purpose | Documented |
|-------|----------|---------|------------|
| `k = 4` | `worklets.ts:38` | Exponential curve steepness | No |

**Assessment:**
- Magic number controls curve shape
- Should be documented: "Higher values = steeper exponential curve"
- May want to make configurable if different curve shapes are needed

### Resolution/Sampling

| Value | Location | Purpose | Documented |
|-------|----------|---------|------------|
| `128` | `WaveformDisplay.tsx:13`, `FadeEnvelope.tsx:31`, `LFOVisualizer.tsx:137` | Default path resolution | No |
| `16-64` | `WaveformIcon.tsx:49` | Dynamic resolution based on size | Yes (comment) |
| `12`, `16`, `24` | Various icon files | Icon sampling steps | No |

**Formula from WaveformIcon:**
```typescript
const resolution = Math.max(16, Math.min(64, Math.round(size * 1.5)));
```

**Assessment:**
- Resolution 128 is reasonable for smooth curves at typical sizes
- Dynamic resolution in WaveformIcon is clever and well-implemented
- Should document why 128 was chosen (balance of smoothness vs performance)

### Mathematical Constants

| Value | Location | Purpose |
|-------|----------|---------|
| `2 * Math.PI` | `worklets.ts:28` | Full circle for sine wave |
| `0.25`, `0.75` | `worklets.ts:23-25` | Triangle wave breakpoints |
| `0.5` | `worklets.ts:31` | Square wave threshold |

**Assessment:**
- Standard waveform mathematics, well-understood
- Triangle wave math could use comments explaining the piecewise function

---

## 4. Threshold Values

### Phase Detection Thresholds

| Value | Location | Purpose | Documented |
|-------|----------|---------|------------|
| `0.15` base | `useSlowMotionPhase.ts:71` | Discontinuity detection base | Yes (comment) |
| `0.05` minimum | `useSlowMotionPhase.ts:71` | Minimum threshold at high factors | Yes |
| `0.8`, `-0.8` | `useSlowMotionPhase.ts:100,104` | Wrap-around detection | Yes (comments) |
| `0.2`, `0.8` | `useSlowMotionPhase.ts:84` | Discontinuity detection range | Partially |
| `0.3` | `useSlowMotionPhase.ts:116` | Final sanity check | No |
| `0.02` | `useSlowMotionPhase.ts:155` | Drift correction threshold | Yes |
| `0.01` | `useSlowMotionPhase.ts:41` | Factor change detection | No |

**Adaptive threshold formula:**
```typescript
const adaptiveThreshold = Math.max(0.05, 0.15 / Math.sqrt(factor));
```

**Assessment:**
- Phase detection is complex with many interrelated thresholds
- Most are documented, but some edge cases (0.3, 0.01) need explanation
- Consider grouping these into a `PhaseDetectionConfig` interface

### Hysteresis Margins

| Value | Location | Purpose | Documented |
|-------|----------|---------|------------|
| `0.25` | `getSlowdownInfo.ts:20` | Slowdown state hysteresis | Yes (comment) |

**Comment:**
```typescript
hysteresisMargin: 0.25, // Widened from 0.15 to prevent rapid factor oscillations
```

**Assessment:**
- Well-documented with rationale
- Part of `SlowdownConfig` interface - configurable

### Fade Envelope Calculations

| Value | Location | Purpose | Documented |
|-------|----------|---------|------------|
| `64` | `PhaseIndicator.tsx:77`, `FadeEnvelope.tsx:65,69` | Fade parameter scaling | Partially |

**Formula:**
```typescript
const fadeDuration = (64 - absFade) / 64;
```

**Assessment:**
- The value 64 relates to MIDI parameter ranges (-64 to +63)
- Should be documented: "64 is the maximum fade parameter magnitude"
- Consider extracting as `FADE_MAX_VALUE = 64`

---

## 5. Configuration Constants

### BPM Configuration

| Value | Location | Purpose | Documented |
|-------|----------|---------|------------|
| `DEFAULT_BPM = 120` | `preset-context.tsx:13` | Default tempo | Named constant |
| `20-300` | `preset-context.tsx:37,145` | Valid BPM range | In validation logic |

**Assessment:**
- Default BPM is properly named
- Range validation is inline - consider extracting:
  ```typescript
  const BPM_MIN = 20;
  const BPM_MAX = 300;
  ```

### Destination Definitions

Located in `/src/data/destinations.ts` - well-structured with:
- `min`, `max`, `defaultValue` for each parameter
- All values documented in the type definition
- Centralized and maintainable

**Common ranges:**
| Range | Parameters |
|-------|------------|
| `0-127` | Most parameters (MIDI standard) |
| `-64 to 63` | Bipolar parameters (pan, pitch fine, env depth) |
| `-24 to 24` | Pitch (semitones) |

**Assessment:**
- Excellent organization
- All within MIDI standard ranges
- Default values are sensible

### Preset Defaults

Located in `/src/data/presets.ts`:

| Preset | Speed | Multiplier | Depth | Notes |
|--------|-------|------------|-------|-------|
| Init | 48 | 2 | 47 | Standard starting point |
| Wobble Bass | 16 | 8 | 48 | Fast LFO for bass |
| Ambient Drift | 1 | 1 | 24 | Very slow |
| Hi-Hat Humanizer | 32 | 64 | 12 | Random subtle variation |
| Pumping Sidechain | 32 | 4 | -63 | Inverted exponential |
| Fade-In One-Shot | 8 | 16 | 63 | One-shot with fade |

**Assessment:**
- Presets demonstrate the range of LFO capabilities
- Values are chosen for musical utility
- Could benefit from JSDoc comments explaining use cases

### Theme Colors

Located in `/src/theme/colors.ts` and `/src/components/lfo/constants.ts`:

**Theme file exports:**
- `colors.accent`: `#ff6600` (Elektron orange)
- `colors.background`: `#0a0a0a`
- `colors.textPrimary`: `#ffffff`
- etc.

**LFO Themes:**
- `DEFAULT_THEME_DARK`
- `DEFAULT_THEME_LIGHT`
- `ELEKTRON_THEME`

**Assessment:**
- Color system is well-organized
- LFO themes provide good flexibility
- Some components still hardcode colors (e.g., `CenterValueSlider.tsx` uses `#ff6600` directly instead of `colors.accent`)

---

## 6. Recommendations

### High Priority

1. **Create `/src/constants/index.ts`** for app-wide constants:
   ```typescript
   // Timing
   export const ENGINE_DEBOUNCE_MS = 100;
   export const ANIMATION_DURATION_SHORT = 100;
   export const ANIMATION_DURATION_MEDIUM = 150;

   // BPM
   export const BPM_MIN = 20;
   export const BPM_MAX = 300;
   export const BPM_DEFAULT = 120;

   // MIDI ranges
   export const MIDI_MAX = 127;
   export const MIDI_BIPOLAR_MIN = -64;
   export const MIDI_BIPOLAR_MAX = 63;

   // Waveform
   export const RANDOM_STEPS_PER_CYCLE = 16;
   export const DEFAULT_WAVEFORM_RESOLUTION = 128;
   export const EXPONENTIAL_CURVE_FACTOR = 4;
   ```

2. **Document the random seed value** in `worklets.ts`:
   ```typescript
   /**
    * Random S&H seed value.
    * 78.233 with offset 0.5 produces balanced distribution:
    * - 8 positive values and 8 negative values across 16 steps
    * - 0.9 amplitude prevents clipping at ±1.0 boundaries
    */
   const RANDOM_SEED = 78.233;
   const RANDOM_OFFSET = 0.5;
   const RANDOM_AMPLITUDE = 0.9;
   ```

3. **Fix documentation inconsistency** in `getSlowdownInfo.ts`:
   - Line 5 says "default 250ms" but actual default is 500ms

4. **Extract phase detection thresholds** to a configuration object:
   ```typescript
   export const PHASE_DETECTION_CONFIG = {
     baseThreshold: 0.15,
     minThreshold: 0.05,
     wrapThreshold: 0.8,
     discontinuityRange: { min: 0.2, max: 0.8 },
     sanityCheckMax: 0.3,
     driftCorrectionThreshold: 0.02,
     factorChangeThreshold: 0.01,
   };
   ```

### Medium Priority

5. **Replace hardcoded colors** in components with theme imports:
   - `CenterValueSlider.tsx`: Replace `#ff6600` with `colors.accent`
   - `DestinationMeter.tsx`: Extract inline color strings

6. **Add layout constants** file:
   ```typescript
   // /src/constants/layout.ts
   export const SLIDER_HEIGHT = 32;
   export const STANDARD_PADDING = 16;
   export const STANDARD_BORDER_RADIUS = 12;
   export const CANVAS_PADDING = 8;
   ```

7. **Document exponential curve factor**:
   - Explain what `k = 4` means and how different values affect the curve

### Low Priority

8. **Add JSDoc to presets** explaining musical use cases

9. **Consider extracting spring configs** to a shared animation file

10. **Standardize icon sizing** constants if used outside icon components

---

## Summary

| Category | Centralized | Documented | Needs Work |
|----------|-------------|------------|------------|
| Timing Constants | Partially | Partially | Minor cleanup |
| Layout Constants | Partially | No | Extract to constants file |
| Waveform Constants | No | Partially | Document seed values |
| Threshold Values | No | Mostly | Group into config objects |
| Configuration Constants | Yes | Yes | Good shape |

**Overall Assessment:** The codebase has good practices in some areas (destinations, themes, slowdown config) but inconsistent in others. The main areas for improvement are:
1. Consolidating scattered layout values
2. Documenting mathematical constants (especially the random seed)
3. Grouping phase detection thresholds into a single configuration object
