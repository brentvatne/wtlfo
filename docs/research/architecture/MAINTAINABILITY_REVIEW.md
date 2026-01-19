# Maintainability Review

**Review Date:** 2025-01-19
**Codebase:** WTLFO - LFO Visualizer and Education App for Expo

---

## Executive Summary

This is a well-structured React Native/Expo application with good separation of concerns, consistent patterns, and reasonable test coverage. The codebase demonstrates thoughtful architecture decisions, particularly in the LFO visualization components and context management. Below are detailed findings organized by category, with specific recommendations for improvement.

---

## 1. Code Organization

### Strengths

- **Clear directory structure**: The `src/` folder is well-organized with logical groupings:
  - `components/` - UI components organized by domain (lfo, destination, controls, params, learn)
  - `context/` - State management contexts
  - `data/` - Static data definitions (destinations, presets)
  - `hooks/` - Custom hooks
  - `theme/` - Styling constants
  - `types/` - TypeScript type definitions

- **Consistent barrel exports**: Each component folder has an `index.ts` that consolidates exports.

- **App routing**: Uses Expo Router with clear route groupings `(home)`, `(learn)`, `(settings)`, `(destination)`.

### Issues and Recommendations

**Issue 1: `ParameterEditor.tsx` naming confusion**
**File:** `/Users/brent/wtlfo/src/components/ParameterEditor.tsx` (lines 103-104)
The file exports both `QuickEditPanel` and `ParameterEditor` (as an alias), but `ParameterEditor` is marked as "backwards compatibility". This creates confusion about which name to use.

```typescript
// Keep the old export name for backwards compatibility
export const ParameterEditor = QuickEditPanel;
```

**Recommendation:** Decide on a single name. If `QuickEditPanel` is preferred, rename the file to `QuickEditPanel.tsx` and update all imports. Remove the alias after confirming no external dependencies.

---

**Issue 2: Orphaned component file location**
**File:** `/Users/brent/wtlfo/src/components/ParameterEditor.tsx`
This file is in the root of `components/` while similar parameter-related components are in `components/params/` or `components/controls/`.

**Recommendation:** Move to `components/params/QuickEditPanel.tsx` or `components/controls/QuickEditPanel.tsx` for consistency.

---

**Issue 3: Inconsistent test file locations**
Tests are placed in `__tests__/` folders within their parent directories, which is good. However, there's no test file for:
- `components/lfo/hooks/useWaveformPath.ts`
- `components/lfo/hooks/useSlowMotionPhase.ts`
- `hooks/useModulatedValue.ts`
- Any UI component tests

**Recommendation:** Add unit tests for custom hooks, especially `useSlowMotionPhase` which has complex phase tracking logic.

---

## 2. Documentation

### Strengths

- **JSDoc comments** are present on key functions, particularly worklet functions in `/Users/brent/wtlfo/src/components/lfo/worklets.ts` (lines 6-12, 64-69, 98-103).
- **Type definitions** in `/Users/brent/wtlfo/src/components/lfo/types.ts` include inline documentation for most properties.
- **AGENTS.md** exists with project context.

### Issues and Recommendations

**Issue 4: Missing documentation for complex algorithm**
**File:** `/Users/brent/wtlfo/src/components/lfo/hooks/useSlowMotionPhase.ts` (lines 1-22)
The file has a good header comment but the complex hysteresis and drift correction logic (lines 55-130) would benefit from more inline explanations.

```typescript
// Line 71 - magic numbers need explanation
const adaptiveThreshold = Math.max(0.05, 0.15 / Math.sqrt(factor));
```

**Recommendation:** Add comments explaining:
- Why 0.05 and 0.15 are chosen as thresholds
- The purpose of the drift correction (lines 145-158)
- What conditions trigger phase reset

---

**Issue 5: No inline documentation in PresetContext**
**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx`
The `PresetProvider` function (lines 90-311) is 220+ lines with complex state management, debouncing, animation loops, and app state handling. Future maintainers would benefit from section comments.

**Recommendation:** Add section comments like:
```typescript
// === State Initialization ===
// === Config Debouncing ===
// === LFO Animation Loop ===
// === App Background Handling ===
```

---

**Issue 6: Outdated/misleading constant**
**File:** `/Users/brent/wtlfo/src/data/presets.ts` (line 115)
```typescript
export const BPM = 120;
```
This constant is exported but appears unused. The actual default BPM is defined in `preset-context.tsx` line 13.

**Recommendation:** Remove the unused `BPM` export or add a deprecation notice.

---

## 3. Duplication

### Issues and Recommendations

**Issue 7: Duplicated slider logic**
**Files:**
- `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx` (lines 31-52)
- `/Users/brent/wtlfo/src/components/destination/CenterValueSlider.tsx` (lines 23-58)

Both components implement identical patterns for:
- Local value state with `lastCommittedValue` ref
- Syncing local value when prop changes
- Handling value changes with rounding
- Handling sliding complete

```typescript
// Both files have nearly identical code:
const [localValue, setLocalValue] = useState(value);
const lastCommittedValue = useRef(value);

React.useEffect(() => {
  if (value !== lastCommittedValue.current) {
    setLocalValue(value);
    lastCommittedValue.current = value;
  }
}, [value]);
```

**Recommendation:** Extract a custom hook `useSliderValue(value, onChange)` that returns `{ localValue, handleValueChange, handleSlidingComplete }`.

---

**Issue 8: Duplicated destination picker rendering logic**
**Files:**
- `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx` (lines 86-119)
- `/Users/brent/wtlfo/src/components/destination/DestinationPickerInline.tsx` (lines 43-76)

Both components render category sections and destination items with identical JSX structure and styles.

**Recommendation:** Extract a shared `DestinationList` component that accepts `onSelect` and `selectedId` props. `DestinationPicker` wraps it in a Modal, `DestinationPickerInline` renders it directly.

---

**Issue 9: Repeated style definitions**
**Files:**
- `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx` (lines 203-248)
- `/Users/brent/wtlfo/src/components/destination/DestinationPickerInline.tsx` (lines 86-132)

Both files define identical styles for `categorySection`, `categoryLabel`, `categoryItems`, `destinationItem`, etc.

**Recommendation:** Create a shared stylesheet in `components/destination/styles.ts` or use the theme system.

---

**Issue 10: Duplicated parameter formatting logic**
**Files:**
- `/Users/brent/wtlfo/app/(home)/param/[param].tsx` (lines 151-153)
- `/Users/brent/wtlfo/src/components/params/ParamGrid.tsx` (lines 17-36)

Both files have `formatMultiplier` and value formatting functions.

**Recommendation:** Move formatting utilities to a shared `utils/formatters.ts` or into the presets data module.

---

**Issue 11: Duplicated PARAM_LABELS and getStartPhaseLabel**
**Files:**
- `/Users/brent/wtlfo/app/(home)/param/[param].tsx` (lines 17-26, 29-31)
- `/Users/brent/wtlfo/src/components/params/ParamGrid.tsx` (lines 38-52)

**Recommendation:** Centralize in a single location, perhaps `src/data/parameters.ts`.

---

## 4. Coupling

### Strengths

- **Context isolation**: `PresetContext` and `ModulationContext` are cleanly separated with distinct responsibilities.
- **Component boundaries**: LFO visualization components are well-isolated and reusable.

### Issues and Recommendations

**Issue 12: Tight coupling between PresetContext and elektron-lfo**
**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx` (lines 180-206)
The context directly creates and manages `LFO` instances, mixing state management with LFO engine concerns.

**Recommendation:** Consider extracting LFO engine management into a separate hook `useLFOEngine` that:
- Takes config and BPM
- Returns phase, output SharedValues and control methods
- Handles animation loop internally

---

**Issue 13: Hidden dependency on react-native-reanimated in modulation hook**
**File:** `/Users/brent/wtlfo/src/hooks/useModulatedValue.ts`
The hook returns a `SharedValue<number>` but the interface doesn't make this clear at the call site.

```typescript
// Line 22 - return type is SharedValue but may be confused with plain number
export function useModulatedValue({...}): SharedValue<number>
```

**Recommendation:** The hook is well-designed; just ensure callers understand they're getting a SharedValue (which they need for animations).

---

**Issue 14: Worklet functions duplicated in PhaseIndicator**
**File:** `/Users/brent/wtlfo/src/components/lfo/PhaseIndicator.tsx` (lines 67-88)
The fade envelope calculation is duplicated from `FadeEnvelope.tsx` (lines 63-79).

**Recommendation:** Extract the fade envelope calculation to a worklet function in `worklets.ts`:
```typescript
export function calculateFadeEnvelope(phase: number, fadeValue: number): number {
  'worklet';
  // ... calculation
}
```

---

## 5. API Design

### Strengths

- **Consistent hook patterns**: All context hooks throw helpful errors when used outside their providers.
- **Well-typed props**: Component props are properly typed with TypeScript interfaces.
- **Flexible visualizer props**: `LFOVisualizerProps` supports both static numbers and SharedValues for phase/output.

### Issues and Recommendations

**Issue 15: Large interface for LFOVisualizerProps**
**File:** `/Users/brent/wtlfo/src/components/lfo/types.ts` (lines 12-94)
The interface has 28 optional properties, making it hard to understand which combinations are meaningful.

**Recommendation:** Consider grouping related props:
```typescript
interface LFOVisualizerProps {
  state: LFOState;           // phase, output
  config: LFOConfig;         // waveform, speed, etc.
  timing?: TimingInfo;       // bpm, cycleTimeMs, etc.
  display?: DisplayOptions;  // width, height, theme, etc.
}
```

---

**Issue 16: Inconsistent method naming in contexts**
**File:** `/Users/brent/wtlfo/src/context/modulation-context.tsx`

- `setCenterValue` / `getCenterValue` (consistent)
- `setRouting` / `getRouting` (consistent)
- `setRoutingAmount` (no getter)

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx`

- `setActivePreset` / `activePreset` (property, not getter)
- `setBPM` / `bpm` (property, not getter)

**Recommendation:** Minor inconsistency; consider using consistent patterns (either all getters or all properties).

---

**Issue 17: Magic numbers in component defaults**
**File:** `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx` (lines 33-34)
```typescript
width = 60,
height = 108,
```

**Recommendation:** Export these as named constants or document why these specific values were chosen.

---

## 6. Testing

### Strengths

- **Comprehensive context tests**: Both `preset-context.test.tsx` and `modulation-context.test.tsx` have excellent coverage including edge cases and error handling.
- **Worklet unit tests**: `worklets.test.ts` thoroughly tests all waveform sampling functions.
- **Proper mocking**: Tests correctly mock external dependencies (`elektron-lfo`, Storage).

### Issues and Recommendations

**Issue 18: Missing test for isEditing state management**
**File:** `/Users/brent/wtlfo/src/context/__tests__/preset-context.test.tsx` (lines 223-244)
The test assumes `isEditing` is automatically set during `updateParameter`, but this is actually controlled externally via `setIsEditing`.

```typescript
// Test assumes isEditing becomes true automatically
it('should set isEditing to true during parameter change', async () => {
  // ...
  expect(result.current.isEditing).toBe(true); // This may not work as expected
});
```

**Recommendation:** Review and update this test to reflect actual behavior.

---

**Issue 19: No integration tests**
There are no tests that verify component rendering or user interactions.

**Recommendation:** Add at least smoke tests for key screens using React Native Testing Library:
```typescript
test('HomeScreen renders visualizer', () => {
  render(<HomeScreen />);
  expect(screen.getByAccessibilityLabel('LFO Parameters')).toBeTruthy();
});
```

---

**Issue 20: Test setup uses node environment**
**File:** `/Users/brent/wtlfo/jest.config.js` (line 20)
```javascript
testEnvironment: 'node',
```

For React Native testing with RNTL, consider using `jsdom` or the default jest-expo environment for better component testing support.

---

## 7. Dependencies

### Strengths

- **Minimal dependencies**: The project uses well-maintained, official Expo packages.
- **Appropriate library choices**:
  - `@shopify/react-native-skia` for performant graphics
  - `react-native-reanimated` for 60fps animations
  - `expo-sqlite/kv-store` for persistence

### Issues and Recommendations

**Issue 21: Unused/redundant dependencies check needed**
Some packages may be unused:
- `expo-web-browser` - verify if actually used
- `expo-image` - verify usage (vs native Image)

**Recommendation:** Run `npx depcheck` or manually audit imports.

---

**Issue 22: Version pinning strategy**
**File:** `/Users/brent/wtlfo/package.json`
Most dependencies use `~` (patch updates only) which is appropriate for Expo. The `devDependencies` use `^` which may cause issues.

**Recommendation:** Consider using `~` for devDependencies as well for more predictable builds.

---

## 8. Complexity

### Issues and Recommendations

**Issue 23: Complex useSlowMotionPhase hook**
**File:** `/Users/brent/wtlfo/src/components/lfo/hooks/useSlowMotionPhase.ts`
This 170-line hook handles:
- Phase delta tracking
- Adaptive discontinuity detection
- Wrap-around handling
- Drift correction
- State reset on factor changes

The cognitive load is high, making bugs difficult to diagnose.

**Recommendation:**
1. Add comprehensive unit tests
2. Consider extracting phase delta calculation to a separate worklet function
3. Add a state machine diagram in comments

---

**Issue 24: Complex animation loop in PresetContext**
**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx` (lines 208-272)
The animation loop and app state handling are interleaved with complex ref tracking.

**Recommendation:** Extract to a custom hook `useAnimationLoop`:
```typescript
function useAnimationLoop(
  lfoRef: RefObject<LFO>,
  lfoPhase: SharedValue<number>,
  lfoOutput: SharedValue<number>,
  isPaused: boolean
) {
  // Handle animation frame loop
  // Handle app state changes
}
```

---

**Issue 25: Long EditParamScreen component**
**File:** `/Users/brent/wtlfo/app/(home)/param/[param].tsx`
This file is 465 lines with:
- Static parameter info (could be in data file)
- Navigation logic
- Multiple control renderers
- Styling

**Recommendation:**
1. Move `PARAM_INFO` to `src/data/parameterInfo.ts`
2. Extract `renderControl()` switch cases to individual components
3. Move styles to a separate file or use theme

---

**Issue 26: Deeply nested callback in DestinationMeter**
**File:** `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx` (lines 90-98)
The `useAnimatedReaction` callback creates a new object on every frame.

```typescript
useAnimatedReaction(
  () => ({ output: lfoOutput.value, center: animatedCenterValue.value }),
  // ...
);
```

**Recommendation:** This is necessary for the current approach but consider if the component could be simplified.

---

## Summary of Priority Recommendations

### High Priority (Technical Debt)
1. **Extract shared slider logic** into a custom hook (Issue 7)
2. **Add tests for useSlowMotionPhase** (Issue 3, 23)
3. **Extract fade envelope calculation** to shared worklet (Issue 14)

### Medium Priority (Maintainability)
4. **Consolidate destination picker rendering** (Issues 8, 9)
5. **Centralize parameter formatting and labels** (Issues 10, 11)
6. **Add section comments to PresetContext** (Issue 5)
7. **Move PARAM_INFO to data file** (Issue 25)

### Low Priority (Cleanup)
8. **Rename/relocate ParameterEditor** (Issues 1, 2)
9. **Remove unused BPM constant** (Issue 6)
10. **Audit unused dependencies** (Issue 21)

---

## File Reference Summary

| Area | Key Files |
|------|-----------|
| State Management | `src/context/preset-context.tsx`, `src/context/modulation-context.tsx` |
| LFO Visualization | `src/components/lfo/LFOVisualizer.tsx`, `src/components/lfo/worklets.ts` |
| Animation Hooks | `src/components/lfo/hooks/useSlowMotionPhase.ts`, `src/components/lfo/hooks/useWaveformPath.ts` |
| Destination System | `src/components/destination/`, `src/data/destinations.ts`, `src/types/destination.ts` |
| Controls | `src/components/controls/ParameterSlider.tsx`, `src/components/controls/SegmentedControl.tsx` |
| Tests | `src/context/__tests__/`, `src/components/lfo/__tests__/` |

---

*This review was generated for the WTLFO codebase. For questions about specific findings, refer to the file paths and line numbers provided.*
