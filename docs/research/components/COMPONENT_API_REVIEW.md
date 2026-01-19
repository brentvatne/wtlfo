# Component API Review

A comprehensive analysis of the React component APIs in this React Native LFO visualizer application.

---

## Executive Summary

The codebase demonstrates **generally good component design** with:
- Well-structured TypeScript interfaces
- Good accessibility support
- Consistent naming conventions in most areas

**Key areas for improvement:**
- Reduce theme/styling inconsistencies between component groups
- Address prop drilling in ParamGrid
- Unify slider component APIs (ParameterSlider vs CenterValueSlider)
- Add JSDoc documentation for complex props

---

## Component Analysis

### 1. LFOVisualizer (`/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx`)

#### Props Design

**Strengths:**
- Clean separation between required LFO state props (`phase`, `output`, `waveform`) and optional display props
- Flexible `phase` and `output` props accept both static numbers and SharedValues - excellent for animation flexibility
- Sensible defaults from constants file (`DEFAULT_WIDTH`, `DEFAULT_HEIGHT`)
- Theme prop accepts string literal union OR custom theme object - good flexibility

**Issues:**

1. **Too many props (23 total)** - The component accepts a large number of props, making it harder to use:
   ```typescript
   // Current: many individual props
   <LFOVisualizer
     phase={...} output={...} waveform={...} speed={...}
     multiplier={...} startPhase={...} mode={...} depth={...}
     fade={...} bpm={...} cycleTimeMs={...} noteValue={...}
     steps={...} width={...} height={...} theme={...}
     showParameters={...} showTiming={...} showOutput={...}
     showPhaseIndicator={...} strokeWidth={...} isEditing={...}
     fadeMultiplier={...} randomSamples={...}
   />
   ```

2. **Recommendation:** Group related props into objects:
   ```typescript
   interface LFOVisualizerProps {
     // Core state (required)
     phase: number | SharedValue<number>;
     output: number | SharedValue<number>;
     waveform: WaveformType;

     // Grouped: LFO parameters
     parameters?: {
       speed?: number;
       multiplier?: number | string;
       startPhase?: number;
       mode?: TriggerMode;
       depth?: number;
       fade?: number;
     };

     // Grouped: Timing display
     timing?: {
       bpm?: number;
       cycleTimeMs?: number;
       noteValue?: string;
       steps?: number;
     };

     // Grouped: Display options
     display?: {
       showParameters?: boolean;
       showTiming?: boolean;
       showOutput?: boolean;
       showPhaseIndicator?: boolean;
     };

     // Styling
     width?: number;
     height?: number;
     theme?: 'dark' | 'light' | LFOTheme;
     strokeWidth?: number;

     // State
     isEditing?: boolean;
     fadeMultiplier?: number;
     randomSamples?: Array<{ phase: number; value: number }>;
   }
   ```

3. **Optional props that should probably be required:**
   - `depth` affects waveform rendering but defaults to undefined
   - `mode` affects fade behavior but defaults to undefined

#### Component Composition

**Strengths:**
- Excellent decomposition into sub-components (WaveformDisplay, RandomWaveform, FadeEnvelope, PhaseIndicator, etc.)
- Each sub-component has a focused responsibility
- Good use of conditional rendering based on display flags

**Issues:**
- The component does dimension calculations for child components:
  ```typescript
  const parameterHeight = showParameters ? 40 : 0;
  const timingHeight = showTiming ? 40 : 0;
  const outputHeight = showOutput ? 28 : 0;
  const canvasHeight = height - parameterHeight - timingHeight - outputHeight;
  ```
  These magic numbers (`40`, `28`) are duplicated knowledge from child components.

#### TypeScript Types

**Strengths:**
- Types are well-organized in a separate `types.ts` file
- Good use of JSDoc comments for complex props
- Union types for `phase` and `output` (number | SharedValue) are properly handled

**Issues:**
- `randomSamples` type could use a named interface:
  ```typescript
  // Current
  randomSamples?: Array<{ phase: number; value: number }>;

  // Better
  interface RandomSample {
    phase: number;
    value: number;
  }
  randomSamples?: RandomSample[];
  ```

#### Documentation

- Good JSDoc in types.ts for most props
- Missing documentation for the interaction between `isEditing`, `fadeMultiplier`, and animation behavior

---

### 2. DestinationMeter (`/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`)

#### Props Design

**Strengths:**
- Props interface is clearly defined with good JSDoc for `isEditing`
- Sensible defaults (`width = 60`, `height = 108`, `showValue = false`)
- Optional `style` prop for external styling

**Issues:**

1. **Inconsistent prop naming with ParameterSlider:**
   - This component uses `showValue` (boolean)
   - Should this be `showValueDisplay` for clarity?

2. **`destination` accepts `null`** - This is handled internally but creates complexity:
   ```typescript
   destination: DestinationDefinition | null;
   // Then internally:
   const min = destination?.min ?? 0;
   const max = destination?.max ?? 127;
   ```
   Consider requiring destination and letting parent handle the null case, or provide a `NullDestinationMeter` variant.

3. **Missing `testID` prop** for testing

#### Component Composition

**Issues:**

1. **Component does too much:**
   - Calculates modulation bounds (business logic)
   - Manages animation state
   - Renders canvas graphics
   - Displays value text

   Consider extracting:
   - `useModulationBounds(destination, depth, waveform, centerValue)` hook
   - Separate `MeterCanvas` and `MeterValueDisplay` components

2. **Hardcoded colors:**
   ```typescript
   color="rgba(255, 102, 0, 0.2)"  // modulation range
   color="#ff6600"                  // bound lines
   color="#ffffff"                  // current value
   ```
   Should use theme or accept color props for consistency.

#### TypeScript Types

**Strengths:**
- Good use of imported types (`SharedValue`, `DestinationDefinition`, `WaveformType`)
- Props interface is properly exported-ready (though not currently exported)

**Issues:**
- Props interface is defined inline rather than exported:
  ```typescript
  interface DestinationMeterProps { ... }  // Not exported
  ```
  Should export for reuse and documentation.

---

### 3. ParamBox (`/Users/brent/wtlfo/src/components/params/ParamBox.tsx`)

#### Props Design

**Strengths:**
- Clean, focused props interface
- `ParamBoxProps` is exported for reuse
- Good accessibility props built in
- Optional `icon` prop allows flexible customization

**Issues:**

1. **`value` type is too loose:**
   ```typescript
   value: string | number;
   ```
   This works but loses type safety. Consider:
   ```typescript
   value: string;  // Require formatting before passing
   ```
   And let the parent format the display value.

2. **Missing `testID` prop** for testing

3. **No size variants** - Component has fixed styling. Consider:
   ```typescript
   size?: 'small' | 'medium' | 'large';
   ```

#### Component Composition

**Strengths:**
- Component is appropriately granular
- Single responsibility (display a parameter value with interaction)

**Issues:**
- Accessibility attributes are good but label construction is implicit:
  ```typescript
  accessibilityLabel={`${label} parameter, current value: ${value}`}
  ```
  Consider allowing custom accessibility label override.

#### Documentation

- Props are self-documenting due to good naming
- Missing JSDoc for the `icon` prop (what type/size of icon is expected?)

---

### 4. SegmentedControl (`/Users/brent/wtlfo/src/components/controls/SegmentedControl.tsx`)

#### Props Design

**Strengths:**
- Excellent use of generics: `<T extends string | number>`
- Clean API with sensible defaults for `formatOption`
- Good accessibility implementation (radiogroup pattern)

**Issues:**

1. **Missing disabled state** - No way to disable the entire control or individual options:
   ```typescript
   // Suggested addition
   disabled?: boolean;
   disabledOptions?: T[];
   ```

2. **No controlled/uncontrolled pattern** - Always controlled. Consider adding uncontrolled variant:
   ```typescript
   defaultValue?: T;  // For uncontrolled usage
   ```

3. **Missing `testID` prop**

#### Consistency

**Compared to ParameterSlider:**
- Both use `label` (good)
- Both use `value` and `onChange` (good)
- Naming is consistent

---

### 5. ParameterSlider (`/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx`)

#### Props Design

**Strengths:**
- Clear required/optional distinction
- Good callback naming (`onSlidingStart`, `onSlidingEnd`)
- JSDoc comments for the sliding callbacks
- Sensible default for `formatValue` and `step`

**Issues:**

1. **Duplication with CenterValueSlider:**
   These two components share ~80% of their code:
   ```typescript
   // ParameterSlider
   interface ParameterSliderProps {
     label: string;
     min: number;
     max: number;
     value: number;
     onChange: (value: number) => void;
     formatValue?: (value: number) => string;
     step?: number;
     onSlidingStart?: () => void;
     onSlidingEnd?: () => void;
   }

   // CenterValueSlider
   interface CenterValueSliderProps {
     value: number;
     onChange: (value: number) => void;
     min: number;
     max: number;
     label: string;
     bipolar?: boolean;
   }
   ```

   **Recommendation:** Unify into one component:
   ```typescript
   interface SliderProps {
     label: string;
     min: number;
     max: number;
     value: number;
     onChange: (value: number) => void;
     formatValue?: (value: number) => string;
     step?: number;
     onSlidingStart?: () => void;
     onSlidingEnd?: () => void;
     showRangeLabels?: boolean;  // From CenterValueSlider
     bipolar?: boolean;          // From CenterValueSlider
   }
   ```

2. **Missing `testID` prop**

3. **Prop order inconsistency:**
   - ParameterSlider: `label, min, max, value, onChange`
   - CenterValueSlider: `value, onChange, min, max, label`

   These should be consistent.

---

### 6. ParamGrid (`/Users/brent/wtlfo/src/components/params/ParamGrid.tsx`)

#### Props Design

**Issues:**

1. **Prop drilling concern:**
   The component uses context (`usePreset`, `useModulation`) and router internally. This reduces reusability:
   ```typescript
   // Current - tightly coupled
   export function ParamGrid({ onParamPress, activeParam }: ParamGridProps) {
     const { currentConfig } = usePreset();
     const { activeDestinationId } = useModulation();
     const router = useRouter();
   ```

   **Better approach - props for data, callbacks for actions:**
   ```typescript
   interface ParamGridProps {
     config: LFOConfig;
     activeDestinationId: DestinationId;
     onParamPress: (param: ParamKey) => void;
     activeParam?: ParamKey | null;
   }
   ```

2. **Hard to test** due to context/router dependencies

3. **`ParamKey` type is defined locally** but could be exported for reuse

#### Component Composition

**Issues:**
- `formatValue` and `getStartPhaseLabel` are defined inside the file but could be utility functions
- Layout is hardcoded (2 rows of 4) - not configurable

---

### 7. DestinationPicker (`/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx`)

#### Props Design

**Critical Issue: No props at all!**
```typescript
export function DestinationPicker() {
  const [isOpen, setIsOpen] = useState(false);
  const { activeDestinationId, setActiveDestinationId } = useModulation();
```

This component is entirely self-contained, getting all data from context. This limits reusability.

**Recommended props:**
```typescript
interface DestinationPickerProps {
  value: DestinationId;
  onChange: (id: DestinationId) => void;
  label?: string;
  categories?: DestinationCategory[];  // Filter categories to show
  disabled?: boolean;
}
```

#### Component Composition

- Combines trigger button and modal - could be split for more flexibility
- Consider a `DestinationPickerModal` that accepts `isOpen`, `onClose`, `onSelect`

---

## Cross-Cutting Concerns

### Theme Inconsistency

The codebase has **three different theming approaches:**

1. **LFO components** use `LFOTheme` object with specific color keys
2. **Controls/params** use `@/src/theme` with `colors` object
3. **DestinationMeter** uses hardcoded colors

**Recommendation:** Unify theming:
- Create a single theme context
- All components accept `theme` prop or use context
- Standardize color key names

### Color Values

Hardcoded colors appear throughout:
```typescript
// DestinationMeter
color="rgba(255, 255, 255, 0.15)"
color="#ff6600"

// ParamBox
backgroundColor: 'rgba(255, 102, 0, 0.1)'

// CenterValueSlider
minimumTrackTintColor="#ff6600"
```

Should reference theme colors consistently.

### Accessibility

**Strengths:**
- Most interactive components have accessibility labels, roles, and hints
- Good use of `accessibilityState` for selection states
- `accessibilityValue` used correctly for sliders

**Gaps:**
- Some components missing `accessibilityLiveRegion` for dynamic updates
- Canvas-based visualizations (LFOVisualizer, DestinationMeter) should have fallback text descriptions

### Testing Support

**Missing across all components:**
- `testID` props for React Native Testing Library
- Consider adding:
  ```typescript
  testID?: string;
  testIDs?: {
    container?: string;
    label?: string;
    value?: string;
  };
  ```

---

## Recommendations Summary

### High Priority

1. **Unify slider components** - Merge ParameterSlider and CenterValueSlider
2. **Add testID props** to all components
3. **Export prop interfaces** from all component files
4. **Standardize theme approach** across component families

### Medium Priority

5. **Reduce LFOVisualizer props** by grouping related props
6. **Make DestinationPicker accept props** instead of relying entirely on context
7. **Standardize prop order** (label, value, onChange, min, max, ...)
8. **Extract business logic from DestinationMeter** into hooks

### Low Priority

9. **Add JSDoc documentation** for complex props
10. **Consider size variants** for ParamBox
11. **Add disabled states** to SegmentedControl
12. **Create utility formatters** (move from component files to shared utils)

---

## Consistency Matrix

| Component | Exports Types | Has testID | Uses Theme | Has Docs | Accessibility |
|-----------|--------------|------------|------------|----------|---------------|
| LFOVisualizer | Yes (separate file) | No | Yes (custom) | Partial | Basic |
| DestinationMeter | No | No | No (hardcoded) | Minimal | Basic |
| ParamBox | Yes | No | No (hardcoded) | No | Good |
| SegmentedControl | No | No | Yes | No | Good |
| ParameterSlider | No | No | Yes | Partial | Good |
| CenterValueSlider | No | No | No (hardcoded) | No | Good |
| ParamGrid | No | No | No (hardcoded) | No | Good |
| DestinationPicker | No | No | No (hardcoded) | No | Good |

---

## File Paths Reviewed

- `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx`
- `/Users/brent/wtlfo/src/components/lfo/types.ts`
- `/Users/brent/wtlfo/src/components/lfo/constants.ts`
- `/Users/brent/wtlfo/src/components/lfo/OutputValueDisplay.tsx`
- `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`
- `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx`
- `/Users/brent/wtlfo/src/components/destination/CenterValueSlider.tsx`
- `/Users/brent/wtlfo/src/components/params/ParamBox.tsx`
- `/Users/brent/wtlfo/src/components/params/ParamGrid.tsx`
- `/Users/brent/wtlfo/src/components/controls/SegmentedControl.tsx`
- `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx`
- `/Users/brent/wtlfo/src/components/ParameterEditor.tsx`
- `/Users/brent/wtlfo/src/types/destination.ts`
- `/Users/brent/wtlfo/src/theme/colors.ts`
