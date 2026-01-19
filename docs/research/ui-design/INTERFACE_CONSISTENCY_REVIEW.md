# Interface Consistency Review

## Executive Summary

This review analyzes TypeScript interfaces and prop types across the codebase for consistency, naming conventions, and best practices. Overall, the codebase demonstrates good consistency with some areas for improvement.

---

## 1. Interface Naming

### Current State

| File | Interface Name | Pattern Used |
|------|---------------|--------------|
| `src/types/destination.ts` | `DestinationDefinition` | Domain suffix |
| `src/types/destination.ts` | `LFORouting` | Domain name |
| `src/components/lfo/types.ts` | `LFOVisualizerProps` | `*Props` |
| `src/components/lfo/types.ts` | `LFOTheme` | Domain name |
| `src/components/lfo/types.ts` | `WaveformDisplayProps` | `*Props` |
| `src/components/lfo/types.ts` | `PhaseIndicatorProps` | `*Props` |
| `src/components/lfo/types.ts` | `GridLinesProps` | `*Props` |
| `src/components/lfo/types.ts` | `ParameterBadgesProps` | `*Props` |
| `src/components/lfo/types.ts` | `TimingInfoProps` | `*Props` |
| `src/components/lfo/types.ts` | `OutputValueDisplayProps` | `*Props` |
| `src/components/learn/SkiaIcons.tsx` | `SkiaIconProps` | `*Props` |
| `src/components/params/ParamBox.tsx` | `ParamBoxProps` | `*Props` |
| `src/components/params/ParamGrid.tsx` | `ParamGridProps` | `*Props` |
| `src/components/controls/SegmentedControl.tsx` | `SegmentedControlProps<T>` | `*Props` |
| `src/components/controls/ParameterSlider.tsx` | `ParameterSliderProps` | `*Props` |
| `src/components/destination/CenterValueSlider.tsx` | `CenterValueSliderProps` | `*Props` |
| `src/components/destination/DestinationMeter.tsx` | `DestinationMeterProps` | `*Props` |
| `src/components/lfo/RandomWaveform.tsx` | `RandomWaveformProps` | `*Props` |
| `src/components/lfo/FadeEnvelope.tsx` | `FadeEnvelopeProps` | `*Props` |
| `src/components/lfo/SlowMotionBadge.tsx` | `SlowMotionBadgeProps` | `*Props` |
| `src/components/ErrorBoundary.tsx` | `Props`, `State` | Generic names |

### Assessment: GOOD

- **Consistency**: 17/19 component prop interfaces use the `*Props` suffix convention
- **Clear naming**: Interface names clearly indicate their purpose

### Issues Found

1. **`ErrorBoundary.tsx`** uses generic `Props` and `State` names instead of `ErrorBoundaryProps` and `ErrorBoundaryState`
2. **Non-prop interfaces** use appropriate domain-specific names (`DestinationDefinition`, `LFORouting`, `LFOTheme`)

### Recommendation

Rename `Props` and `State` in `ErrorBoundary.tsx` to `ErrorBoundaryProps` and `ErrorBoundaryState` for consistency.

---

## 2. Prop Patterns

### Callback Naming (on* prefix)

| Component | Callback Prop | Convention |
|-----------|--------------|------------|
| `SegmentedControl` | `onChange` | `on*` prefix |
| `ParameterSlider` | `onChange` | `on*` prefix |
| `ParameterSlider` | `onSlidingStart` | `on*` prefix |
| `ParameterSlider` | `onSlidingEnd` | `on*` prefix |
| `CenterValueSlider` | `onChange` | `on*` prefix |
| `ParamBox` | `onPress` | `on*` prefix |
| `ParamGrid` | `onParamPress` | `on*` prefix |

### Assessment: EXCELLENT

All callback props consistently use the `on*` prefix convention.

### Boolean Naming (is*/has*)

| Component | Boolean Prop | Convention | Assessment |
|-----------|--------------|------------|------------|
| `ParamBox` | `isActive` | `is*` prefix | Good |
| `ParamBox` | `disabled` | None | Inconsistent |
| `LFOVisualizer` | `isEditing` | `is*` prefix | Good |
| `DestinationMeter` | `isEditing` | `is*` prefix | Good |
| `OutputValueDisplay` | `isEditing` | `is*` prefix | Good |
| `LFOVisualizer` | `showParameters` | `show*` prefix | Acceptable |
| `LFOVisualizer` | `showTiming` | `show*` prefix | Acceptable |
| `LFOVisualizer` | `showOutput` | `show*` prefix | Acceptable |
| `LFOVisualizer` | `showPhaseIndicator` | `show*` prefix | Acceptable |
| `PhaseIndicator` | `showDot` | `show*` prefix | Acceptable |
| `DestinationMeter` | `showValue` | `show*` prefix | Acceptable |
| `SlowMotionBadge` | `visible` | None | Inconsistent |
| `CenterValueSlider` | `bipolar` | None | Inconsistent |

### Assessment: GOOD with minor issues

- `is*` prefix used for state booleans: Good
- `show*` prefix used for visibility toggles: Acceptable and consistent within context
- Some booleans lack prefixes: `disabled`, `visible`, `bipolar`

### Recommendations

1. Consider `isDisabled` instead of `disabled` for consistency (though `disabled` is a common React Native pattern)
2. Consider `isVisible` instead of `visible` for `SlowMotionBadge`
3. Consider `isBipolar` instead of `bipolar` for `CenterValueSlider`

### Similar Prop Names Across Components

| Prop Name | Used In | Consistent? |
|-----------|---------|-------------|
| `width` | `GridLines`, `WaveformDisplay`, `LFOVisualizer`, `DestinationMeter`, `PhaseIndicator`, `FadeEnvelope`, `RandomWaveform` | Yes |
| `height` | Same as width | Yes |
| `color` | `GridLines`, `PhaseIndicator`, `WaveformIcon`, `SkiaIconProps` | Yes |
| `strokeWidth` | `WaveformDisplay`, `LFOVisualizer`, `WaveformIcon`, `SkiaIconProps`, `FadeEnvelope` | Yes |
| `theme` | `LFOVisualizer`, `ParameterBadges`, `TimingInfo`, `OutputValueDisplay` | Yes |
| `depth` | Multiple LFO components | Yes |
| `startPhase` | Multiple LFO components | Yes |
| `waveform` | Multiple LFO components | Yes |

### Assessment: EXCELLENT

Prop names are highly consistent across similar components.

---

## 3. Optional vs Required Props

### Analysis

| Interface | Required Props | Optional Props | Assessment |
|-----------|---------------|----------------|------------|
| `LFOVisualizerProps` | `phase`, `output`, `waveform` | 18 optional props | Good - core props required |
| `WaveformDisplayProps` | `waveform`, `width`, `height`, `strokeColor`, `strokeWidth` | `fillColor`, `resolution`, `depth`, `startPhase` | Good |
| `PhaseIndicatorProps` | `phase`, `output`, `width`, `height`, `color` | `showDot`, `dotRadius`, `startPhase`, etc. | Good |
| `ParamBoxProps` | `label`, `value`, `onPress` | `isActive`, `disabled`, `icon` | Good |
| `ParameterSliderProps` | `label`, `min`, `max`, `value`, `onChange` | `formatValue`, `step`, `onSlidingStart`, `onSlidingEnd` | Good |
| `DestinationMeterProps` | `lfoOutput`, `destination`, `centerValue`, `depth` | `waveform`, `width`, `height`, `style`, `showValue`, `isEditing` | Good |
| `SlowMotionBadgeProps` | `factor`, `visible` | None | Good |

### Assessment: EXCELLENT

- Required props are truly required for component functionality
- Optional props have sensible defaults
- No missing required props that should be optional

### Defaults Provided

| Component | Prop | Default Value |
|-----------|------|---------------|
| `GridLines` | `verticalDivisions` | `8` |
| `GridLines` | `horizontalDivisions` | `4` |
| `LFOVisualizer` | `width` | `DEFAULT_WIDTH` |
| `LFOVisualizer` | `height` | `DEFAULT_HEIGHT` |
| `LFOVisualizer` | `theme` | `'dark'` |
| `LFOVisualizer` | `showParameters` | `true` |
| `LFOVisualizer` | `showTiming` | `true` |
| `LFOVisualizer` | `showOutput` | `true` |
| `LFOVisualizer` | `showPhaseIndicator` | `true` |
| `LFOVisualizer` | `strokeWidth` | `2` |
| `LFOVisualizer` | `isEditing` | `false` |
| `WaveformIcon` | `size` | `20` |
| `WaveformIcon` | `color` | `'#ff6600'` |
| `WaveformIcon` | `strokeWidth` | `1.5` |
| `WaveformIcon` | `borderRadius` | `0` |
| `ParameterSlider` | `formatValue` | `(v) => String(Math.round(v))` |
| `ParameterSlider` | `step` | `1` |
| `DestinationMeter` | `waveform` | `'SIN'` |
| `DestinationMeter` | `width` | `60` |
| `DestinationMeter` | `height` | `108` |
| `DestinationMeter` | `showValue` | `false` |
| `DestinationMeter` | `isEditing` | `false` |
| `SkiaIconProps` | Multiple | Defined via constants |

### Assessment: EXCELLENT

All optional props have sensible defaults provided via destructuring or constants.

---

## 4. Type Exports

### Current Export Strategy

| Location | Types Exported | Export Method |
|----------|---------------|---------------|
| `src/types/destination.ts` | `DestinationId`, `DestinationCategory`, `DestinationDefinition`, `LFORouting` | Direct export |
| `src/components/lfo/types.ts` | All LFO types | Direct export |
| `src/components/lfo/index.ts` | Re-exports all types from `types.ts` | Barrel export |
| `src/components/learn/index.ts` | `SkiaIconProps` | Barrel export |
| `src/components/params/ParamBox.tsx` | `ParamBoxProps` | Inline export |

### Issues Found

1. **Missing type exports in barrel files**:
   - `src/components/params/index.ts` does not export `ParamBoxProps` or `ParamGridProps`
   - `src/components/controls/index.ts` does not export `SegmentedControlProps` or `ParameterSliderProps`
   - `src/components/destination/index.ts` does not export `CenterValueSliderProps` or `DestinationMeterProps`

2. **Inline interfaces not exported**:
   - `RandomWaveformProps` in `RandomWaveform.tsx`
   - `FadeEnvelopeProps` in `FadeEnvelope.tsx`
   - `SlowMotionBadgeProps` in `SlowMotionBadge.tsx`
   - `CenterValueSliderProps` in `CenterValueSlider.tsx`
   - `ParameterSliderProps` in `ParameterSlider.tsx`
   - `SegmentedControlProps` in `SegmentedControl.tsx`
   - `ParamGridProps` in `ParamGrid.tsx`

### Recommendations

1. Add type exports to barrel files:

```typescript
// src/components/params/index.ts
export { ParamBox } from './ParamBox';
export type { ParamBoxProps } from './ParamBox';
export { ParamGrid } from './ParamGrid';
export type { ParamGridProps } from './ParamGrid';

// src/components/controls/index.ts
export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps } from './SegmentedControl';
export { ParameterSlider } from './ParameterSlider';
export type { ParameterSliderProps } from './ParameterSlider';

// src/components/destination/index.ts
export { CenterValueSlider } from './CenterValueSlider';
export type { CenterValueSliderProps } from './CenterValueSlider';
export { DestinationMeter } from './DestinationMeter';
export type { DestinationMeterProps } from './DestinationMeter';
// ... etc
```

2. Consider moving `RandomWaveformProps`, `FadeEnvelopeProps`, and `SlowMotionBadgeProps` to `src/components/lfo/types.ts` for centralization

---

## 5. Interface Organization

### Current Organization

```
src/
  types/
    destination.ts          # Domain types (destinations, routing)
  components/
    lfo/
      types.ts              # All LFO visualization types (centralized)
      index.ts              # Re-exports components + types
    controls/
      SegmentedControl.tsx  # Interface inline
      ParameterSlider.tsx   # Interface inline
    params/
      ParamBox.tsx          # Interface inline (exported)
      ParamGrid.tsx         # Interface inline (not exported)
    destination/
      CenterValueSlider.tsx # Interface inline
      DestinationMeter.tsx  # Interface inline
    learn/
      SkiaIcons.tsx         # Shared interface (exported via index)
```

### Assessment: GOOD with recommendations

**Strengths:**
- `src/components/lfo/types.ts` centralizes all LFO visualization types - excellent pattern
- Domain types in `src/types/` separate from component props
- `SkiaIconProps` shared across multiple icon components in same file

**Issues:**
1. Inline interfaces in component files are acceptable but create inconsistency
2. Some interfaces could be shared but aren't

### Duplication Found

1. **Dimension props pattern** (`width`, `height`) repeated across many interfaces - acceptable, these are not exactly duplicated
2. **Styling props pattern** (`color`, `strokeWidth`, `backgroundColor`, `borderRadius`) - acceptable, context-specific
3. **Waveform-related props** (`waveform`, `depth`, `startPhase`) - centralized in `types.ts` via `WaveformDisplayProps`

### Recommendations for Organization

1. **Keep the current `src/components/lfo/types.ts` pattern** - it's well-organized
2. **Consider creating `src/components/controls/types.ts`** if controls become more complex
3. **Move inline interfaces to shared types files** when:
   - Interface is used by multiple components
   - Interface represents a domain concept beyond a single component

---

## Summary Table

| Category | Score | Notes |
|----------|-------|-------|
| Interface Naming | 9/10 | Consistent `*Props` suffix, one exception |
| Callback Naming | 10/10 | All use `on*` prefix |
| Boolean Naming | 8/10 | Mostly `is*`/`show*`, some exceptions |
| Prop Consistency | 10/10 | Excellent cross-component consistency |
| Optional/Required | 10/10 | Well-designed, sensible defaults |
| Type Exports | 6/10 | Many types not exported from barrels |
| Organization | 8/10 | Good centralization in LFO, some inline |

**Overall Score: 8.7/10**

---

## Priority Fixes

### High Priority
1. Add type exports to barrel files (`params/index.ts`, `controls/index.ts`, `destination/index.ts`)

### Medium Priority
2. Rename `Props`/`State` in `ErrorBoundary.tsx` to `ErrorBoundaryProps`/`ErrorBoundaryState`
3. Consider moving inline interfaces from LFO sub-components to `types.ts`

### Low Priority
4. Consider boolean naming consistency (`visible` -> `isVisible`, `bipolar` -> `isBipolar`)
5. Document the type export pattern for future contributors

---

## Files Reviewed

- `/Users/brent/wtlfo/src/types/destination.ts`
- `/Users/brent/wtlfo/src/components/lfo/types.ts`
- `/Users/brent/wtlfo/src/components/lfo/GridLines.tsx`
- `/Users/brent/wtlfo/src/components/lfo/ParameterBadges.tsx`
- `/Users/brent/wtlfo/src/components/lfo/WaveformDisplay.tsx`
- `/Users/brent/wtlfo/src/components/lfo/RandomWaveform.tsx`
- `/Users/brent/wtlfo/src/components/lfo/OutputValueDisplay.tsx`
- `/Users/brent/wtlfo/src/components/lfo/WaveformIcon.tsx`
- `/Users/brent/wtlfo/src/components/lfo/FadeEnvelope.tsx`
- `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx`
- `/Users/brent/wtlfo/src/components/lfo/TimingInfo.tsx`
- `/Users/brent/wtlfo/src/components/lfo/PhaseIndicator.tsx`
- `/Users/brent/wtlfo/src/components/lfo/SlowMotionBadge.tsx`
- `/Users/brent/wtlfo/src/components/lfo/index.ts`
- `/Users/brent/wtlfo/src/components/controls/SegmentedControl.tsx`
- `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx`
- `/Users/brent/wtlfo/src/components/controls/index.ts`
- `/Users/brent/wtlfo/src/components/params/ParamBox.tsx`
- `/Users/brent/wtlfo/src/components/params/ParamGrid.tsx`
- `/Users/brent/wtlfo/src/components/params/ParamIcons.tsx`
- `/Users/brent/wtlfo/src/components/params/index.ts`
- `/Users/brent/wtlfo/src/components/destination/CenterValueSlider.tsx`
- `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`
- `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx`
- `/Users/brent/wtlfo/src/components/destination/DestinationPickerInline.tsx`
- `/Users/brent/wtlfo/src/components/destination/index.ts`
- `/Users/brent/wtlfo/src/components/learn/SkiaIcons.tsx`
- `/Users/brent/wtlfo/src/components/learn/index.ts`
- `/Users/brent/wtlfo/src/components/ErrorBoundary.tsx`
- `/Users/brent/wtlfo/src/components/ParameterEditor.tsx`
