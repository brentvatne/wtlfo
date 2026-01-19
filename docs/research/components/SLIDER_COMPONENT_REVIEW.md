# Slider Component Review

This document analyzes two slider implementations in the React Native app:
- `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx`
- `/Users/brent/wtlfo/src/components/destination/CenterValueSlider.tsx`

---

## 1. ParameterSlider

### 1.1 Behavior

| Aspect | Status | Notes |
|--------|--------|-------|
| **Value updating** | Good | Uses local state (`localValue`) for smooth visual updates during dragging. Only commits to parent when rounded value changes. |
| **Step behavior** | Good | Respects configurable `step` prop (default: 1). Values are rounded before committing. |
| **Range handling** | Good | Properly passes `min`/`max` to the native slider component. |

**Details:**
- The `handleValueChange` callback updates local state immediately, providing smooth visuals.
- Only calls `onChange` when the rounded value differs from `lastCommittedValue`, reducing unnecessary updates.
- `handleSlidingComplete` ensures final value is committed even if it wasn't sent during dragging.

### 1.2 Visual Feedback

| Aspect | Status | Notes |
|--------|--------|-------|
| **Current value display** | Good | Shows formatted value in header using `formatValue` prop (defaults to rounded integer). |
| **Track fill** | Good | Uses theme color (`colors.accent` = `#ff6600`) for minimum track. |
| **Thumb position** | Good | Native slider handles thumb positioning correctly. |

**Details:**
- Value display uses `fontVariant: ['tabular-nums']` for stable number widths.
- Track colors are themed: accent for filled portion, `#3a3a3a` for unfilled.
- Thumb color matches the accent color.

### 1.3 Touch Handling

| Aspect | Status | Notes |
|--------|--------|-------|
| **Touch target** | Good | Slider height is 32px, adequate for touch interaction. |
| **Drag behavior** | Good | Native `@react-native-community/slider` provides smooth dragging. |
| **Precision** | Good | Step-based movement provides predictable precision. |

**Details:**
- Supports `onSlidingStart` and `onSlidingEnd` callbacks for parent coordination.
- Width is 100% of container, providing full-width touch area.

### 1.4 State Management

| Aspect | Status | Notes |
|--------|--------|-------|
| **Local state for dragging** | Good | `localValue` state provides smooth visual updates. |
| **Value commit timing** | Good | Commits on value change (when rounded value differs) and on sliding complete. |
| **Debouncing** | Partial | No explicit debouncing, but uses rounded value comparison to reduce calls. |

**Details:**
- Uses `useRef` for `lastCommittedValue` to track without triggering re-renders.
- `useEffect` syncs local state when prop changes externally.
- The rounded-value-diff check acts as implicit throttling.

### 1.5 Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| **Role** | Good | `accessibilityRole="adjustable"` is correct for sliders. |
| **Min/Max/Value announced** | Good | `accessibilityValue={{ min, max, now: localValue }}` properly set. |
| **Adjustment via accessibility** | Good | Native slider supports accessibility gestures. |

**Details:**
- Includes `accessibilityLabel` with parameter name.
- Includes `accessibilityHint` explaining the range.

---

## 2. CenterValueSlider

### 2.1 Behavior

| Aspect | Status | Notes |
|--------|--------|-------|
| **Value updating** | Good | Same local state pattern as ParameterSlider. |
| **Step behavior** | Fixed | Hard-coded `step={1}`, not configurable. |
| **Range handling** | Good | Properly passes `min`/`max` to slider. |

**Details:**
- Nearly identical value handling logic to ParameterSlider.
- Adds `bipolar` prop for +/- value formatting.
- No configurable step size (always 1).

### 2.2 Visual Feedback

| Aspect | Status | Notes |
|--------|--------|-------|
| **Current value display** | Good | Shows bipolar formatting (e.g., `+50`) when `bipolar=true`. |
| **Track fill** | Good | Uses `#ff6600` (same as theme accent, but hard-coded). |
| **Thumb position** | Good | Native slider handles correctly. |
| **Range labels** | Good | Shows min/max labels, and center "0" when bipolar. |

**Details:**
- Value font size is 16px vs 14px in ParameterSlider (inconsistency).
- Range labels provide helpful context for bipolar parameters.

### 2.3 Touch Handling

| Aspect | Status | Notes |
|--------|--------|-------|
| **Touch target** | Good | Same 32px height as ParameterSlider. |
| **Drag behavior** | Good | Same native slider behavior. |
| **Precision** | Good | Step=1 provides integer precision. |

**Details:**
- Missing `onSlidingStart` callback (only has `onSlidingComplete`).

### 2.4 State Management

| Aspect | Status | Notes |
|--------|--------|-------|
| **Local state for dragging** | Good | Same pattern as ParameterSlider. |
| **Value commit timing** | Good | Same commit logic. |
| **Debouncing** | Partial | Same rounded-value-diff approach. |

**Details:**
- Identical state management code to ParameterSlider.

### 2.5 Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| **Role** | Good | `accessibilityRole="adjustable"` is correct. |
| **Min/Max/Value announced** | Good | Same pattern as ParameterSlider. |
| **Adjustment via accessibility** | Good | Native slider support. |

**Details:**
- Accessibility hint mentions "centered at zero" when bipolar, which is helpful.

---

## 3. Code Duplication Analysis

### 3.1 Duplicated Code

The following code is nearly identical between both components:

1. **State management pattern** (15+ lines):
   ```typescript
   const [localValue, setLocalValue] = useState(value);
   const lastCommittedValue = useRef(value);

   React.useEffect(() => {
     if (value !== lastCommittedValue.current) {
       setLocalValue(value);
       lastCommittedValue.current = value;
     }
   }, [value]);
   ```

2. **Value change handler** (10+ lines):
   ```typescript
   const handleValueChange = useCallback((newValue: number) => {
     setLocalValue(newValue);
     const rounded = Math.round(newValue);
     if (rounded !== lastCommittedValue.current) {
       lastCommittedValue.current = rounded;
       onChange(rounded);
     }
   }, [onChange]);
   ```

3. **Sliding complete handler** (8+ lines):
   ```typescript
   const handleSlidingComplete = useCallback((newValue: number) => {
     const rounded = Math.round(newValue);
     if (rounded !== lastCommittedValue.current) {
       lastCommittedValue.current = rounded;
       onChange(rounded);
     }
   }, [onChange]);
   ```

4. **Slider component props** (pattern is similar):
   - `style`, `minimumValue`, `maximumValue`, `value`, `onValueChange`
   - `onSlidingComplete`, `step`, track colors, thumb color
   - Accessibility props

5. **Header layout and styles**:
   - Similar header with label and value display
   - Similar styling patterns

### 3.2 Differences

| Aspect | ParameterSlider | CenterValueSlider |
|--------|-----------------|-------------------|
| **step** | Configurable prop | Hard-coded to 1 |
| **formatValue** | Configurable prop | Internal function with bipolar support |
| **onSlidingStart** | Supported | Not supported |
| **Range labels** | None | Shows min/max/center labels |
| **bipolar** | Not supported | Supported |
| **Colors** | Uses theme import | Hard-coded values |
| **Container margin** | `marginBottom: 16` | None |
| **Value font size** | 14px | 16px |

### 3.3 Refactoring Opportunity

**Recommendation:** Create a shared base slider component or custom hook.

**Option A: Shared Base Component**
```typescript
// BaseSlider.tsx - handles common logic
interface BaseSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  onSlidingStart?: () => void;
  onSlidingEnd?: () => void;
  // Render props for customization
  renderHeader?: (value: number) => React.ReactNode;
  renderFooter?: () => React.ReactNode;
  // Style overrides
  trackColors?: { min: string; max: string };
  thumbColor?: string;
}
```

**Option B: Custom Hook**
```typescript
// useSliderValue.ts - extracts state management
function useSliderValue(
  value: number,
  onChange: (value: number) => void,
  options?: { step?: number }
) {
  // Returns: localValue, handleValueChange, handleSlidingComplete
}
```

**Benefits of refactoring:**
1. Single source of truth for slider behavior
2. Consistent accessibility implementation
3. Easier to maintain and test
4. Theme colors used consistently
5. Reduces ~50+ lines of duplicated code

---

## 4. Summary of Issues

### High Priority
- **CenterValueSlider uses hard-coded colors** instead of theme imports (inconsistent with design system).

### Medium Priority
- **CenterValueSlider lacks `onSlidingStart` callback** - may be needed for parent coordination.
- **Code duplication** - ~50+ lines of identical logic between components.
- **Inconsistent value font size** (14px vs 16px).

### Low Priority
- **CenterValueSlider has no configurable step** - hard-coded to 1.
- **No explicit debouncing** - relies on rounded-value-diff check (works but could be more explicit).

---

## 5. Recommendations

1. **Extract shared slider logic** into either a base component or custom hook.
2. **Use theme colors consistently** in CenterValueSlider instead of hard-coded hex values.
3. **Add `onSlidingStart`** callback to CenterValueSlider for API consistency.
4. **Standardize font sizes** across both components.
5. **Make step configurable** in CenterValueSlider.
6. **Consider adding explicit debounce** for high-frequency updates if performance becomes a concern.
