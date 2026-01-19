# Code Smells and Anti-Patterns Review

**Project:** wtlfo - LFO Visualizer React Native App
**Review Date:** 2026-01-19
**Files Reviewed:** 40+ TypeScript/TSX files in `/src` and `/app` directories

---

## Summary

Overall, this is a well-structured React Native codebase with good separation of concerns, proper use of context for state management, and thoughtful component architecture. However, there are several areas that could be improved.

**Critical Issues:** 2
**Medium Issues:** 8
**Minor Issues:** 10

---

## 1. React Anti-Patterns

### 1.1 Index as Key in List Rendering (MEDIUM)

**File:** `/Users/brent/wtlfo/src/components/lfo/ParameterBadges.tsx`
**Lines:** 27-28

```tsx
{badges.map((badge, index) => (
  <View key={index} style={[styles.badge, { backgroundColor: theme.accent + '30' }]}>
```

**Problem:** Using array index as a key can cause issues with React's reconciliation when items are reordered, filtered, or inserted. This can lead to incorrect component state and subtle rendering bugs.

**Suggestion:** Use a unique identifier from the badge object (e.g., `badge.label`) as the key:
```tsx
{badges.map((badge) => (
  <View key={badge.label} style={[styles.badge, ...
```

---

### 1.2 Inline Object Creation in JSX (MINOR)

**File:** `/Users/brent/wtlfo/app/(home)/index.tsx`
**Lines:** 94-97

```tsx
<ScrollView
  style={{ flex: 1, backgroundColor: colors.background }}
  contentContainerStyle={{ paddingBottom: 20 }}
```

**Problem:** Inline objects in JSX are recreated on every render, potentially causing unnecessary re-renders of child components that use reference equality checks.

**Suggestion:** Move these to a `StyleSheet.create()` definition or use `useMemo`:
```tsx
const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 20 },
});
```

**Also found in:**
- `/Users/brent/wtlfo/app/(home)/_layout.tsx` - lines 28-33 (inline style object)
- `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx` - line 92

---

### 1.3 Missing useCallback Dependencies Warning (MINOR)

**File:** `/Users/brent/wtlfo/app/(home)/param/[param].tsx`
**Lines:** 183-187

```tsx
useEffect(() => {
  if (urlParam && urlParam !== activeParam) {
    setActiveParam(urlParam as ParamKey);
  }
}, [urlParam]);
```

**Problem:** The `activeParam` state is referenced in the effect but not included in the dependency array. While this may be intentional to prevent infinite loops, it should be explicitly documented.

**Suggestion:** Add a comment explaining the intentional omission, or restructure to avoid the pattern:
```tsx
// Note: activeParam intentionally omitted to only sync from URL -> state, not vice versa
useEffect(() => { ... }, [urlParam]);
```

---

### 1.4 Component Prop Drilling Could Benefit from Context (MINOR)

**File:** `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx`
**Lines:** 18-43

**Problem:** The `LFOVisualizer` component accepts 22+ props, many of which are passed down to child components. While this provides flexibility, it creates verbose prop chains.

**Suggestion:** Consider creating an `LFOVisualizerContext` for deeply nested components, or use a configuration object pattern:
```tsx
interface LFOVisualizerConfig {
  display: { showParameters: boolean; showTiming: boolean; showOutput: boolean; };
  dimensions: { width: number; height: number; strokeWidth: number; };
  theme: LFOTheme | 'dark' | 'light';
}
```

---

## 2. JavaScript/TypeScript Anti-Patterns

### 2.1 Magic Numbers (MEDIUM)

**File:** `/Users/brent/wtlfo/src/components/lfo/worklets.ts`
**Line:** 11

```tsx
return Math.sin(step * 78.233 + 0.5) * 0.9;
```

**Problem:** The numbers `78.233`, `0.5`, and `0.9` are unexplained magic numbers that affect the random generation behavior.

**Suggestion:** Extract to named constants with explanations:
```tsx
// Random seed chosen for balanced positive/negative distribution (8 each across 16 steps)
const RANDOM_SEED = 78.233;
const RANDOM_PHASE_OFFSET = 0.5;
const RANDOM_AMPLITUDE_SCALE = 0.9; // Slightly below 1 to prevent clipping
```

**Also found in:**
- `/Users/brent/wtlfo/src/components/lfo/hooks/useSlowMotionPhase.ts` - line 71: `0.15`, `0.05`
- `/Users/brent/wtlfo/src/context/preset-context.tsx` - lines 37-38: `20`, `300` (BPM limits)
- `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx` - lines 43, 78

---

### 2.2 Duplicated Code Pattern (MEDIUM)

**File:** `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx` and `/Users/brent/wtlfo/src/components/destination/DestinationPickerInline.tsx`

**Problem:** These two components share nearly identical styling and rendering logic for destination items (lines 86-132 in both files). This is copy-paste code that will need to be updated in two places.

**Suggestion:** Extract shared components:
```tsx
// DestinationItem.tsx
export function DestinationItem({ dest, isSelected, onSelect }: DestinationItemProps) { ... }

// Shared styles
export const destinationStyles = StyleSheet.create({ ... });
```

---

### 2.3 Duplicated formatValue/formatMultiplier Functions (MINOR)

**File:** `/Users/brent/wtlfo/src/components/params/ParamGrid.tsx` - lines 17-36
**File:** `/Users/brent/wtlfo/app/(home)/param/[param].tsx` - lines 151-153
**File:** `/Users/brent/wtlfo/src/components/ParameterEditor.tsx` - lines 11-16

**Problem:** Similar value formatting logic appears in multiple places.

**Suggestion:** Create a shared utility:
```tsx
// utils/formatters.ts
export function formatMultiplier(value: number): string { ... }
export function formatSignedValue(value: number): string { ... }
```

---

### 2.4 Overly Complex Conditional Logic (MINOR)

**File:** `/Users/brent/wtlfo/src/components/lfo/hooks/useSlowMotionPhase.ts`
**Lines:** 80-94

```tsx
const isDiscontinuity =
  frameCount.value <= 1 ||
  (absRawDelta > 0.2 && absRawDelta < 0.8);

if (isDiscontinuity) { ... }

if (phaseDelta < -0.8) { ... }
else if (phaseDelta > 0.8) { ... }
else if (absRawDelta > adaptiveThreshold * 2 && isEarlyFrame) { ... }
```

**Problem:** The wrap-around detection logic is complex with multiple magic thresholds that are hard to understand and maintain.

**Suggestion:** Extract into a separate function with clear documentation and named constants:
```tsx
function detectPhaseDiscontinuity(delta: number, threshold: number): 'forward_wrap' | 'backward_wrap' | 'discontinuity' | 'normal' {
  // Clear documentation of each case
}
```

---

### 2.5 Non-Null Assertion Operator Overuse (MINOR)

**File:** `/Users/brent/wtlfo/src/context/modulation-context.tsx`
**Line:** 83

```tsx
return centerValues[destinationId]!;
```

**Problem:** The non-null assertion `!` bypasses TypeScript's null checking. While there's a guard above, a refactor could break this.

**Suggestion:** Use early return pattern that TypeScript can infer:
```tsx
const stored = centerValues[destinationId];
if (stored !== undefined) return stored;
```

---

## 3. State Management Anti-Patterns

### 3.1 Storing Derived State (MEDIUM)

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx`
**Lines:** 92-97

```tsx
const [currentConfig, setCurrentConfig] = useState<LFOPresetConfig>(...);
const [debouncedConfig, setDebouncedConfig] = useState<LFOPresetConfig>(...);
```

**Problem:** `debouncedConfig` is derived from `currentConfig`. Having two separate state values that should stay in sync can lead to bugs if one is updated without the other.

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx`
**Line:** 282

```tsx
preset: PRESETS[activePreset],
```

**Problem:** `preset` is derived directly from `activePreset` and `PRESETS`. This is computed inline which is fine, but conceptually it's derived state.

**Suggestion:** Consider using a custom hook like `useDebouncedValue` to make the relationship explicit:
```tsx
const debouncedConfig = useDebouncedValue(currentConfig, ENGINE_DEBOUNCE_MS);
```

---

### 3.2 Prop-State Synchronization Pattern (MINOR)

**File:** `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx`
**Lines:** 32-41

```tsx
const [localValue, setLocalValue] = useState(value);
const lastCommittedValue = useRef(value);

React.useEffect(() => {
  if (value !== lastCommittedValue.current) {
    setLocalValue(value);
    lastCommittedValue.current = value;
  }
}, [value]);
```

**Problem:** This is a controlled/uncontrolled hybrid pattern that synchronizes props to internal state. While sometimes necessary for performance, it adds complexity and potential for state mismatches.

**Also found in:** `/Users/brent/wtlfo/src/components/destination/CenterValueSlider.tsx` - lines 23-32

**Suggestion:** Document the pattern with a comment explaining why it's necessary (smooth visual updates during drag), or consider using a library like `use-controllable-state`.

---

### 3.3 Large Context Value Object (MEDIUM)

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx`
**Lines:** 280-305

**Problem:** The `PresetContext` provides 20+ values/functions, making it a "god context" that causes all consumers to re-render whenever any value changes. Components that only need `bpm` will re-render when `isPaused` changes.

**Suggestion:** Split into focused contexts:
```tsx
// PresetContext - just preset selection
// LFOEngineContext - phase, output, timing, controls
// LFOConfigContext - currentConfig, updateParameter
```

Or use selector patterns with `useSyncExternalStore`.

---

## 4. Performance Anti-Patterns

### 4.1 Missing Memoization for Expensive Computations (MINOR)

**File:** `/Users/brent/wtlfo/app/(home)/index.tsx`
**Lines:** 57-61

```tsx
const slowdownInfo = getSlowdownInfo(
  timingInfo.cycleTimeMs,
  previousFactorRef.current
);
previousFactorRef.current = slowdownInfo.factor;
```

**Problem:** `getSlowdownInfo` is called on every render. While it's lightweight, it modifies a ref and could benefit from memoization.

**Suggestion:** Wrap in `useMemo`:
```tsx
const slowdownInfo = useMemo(() => {
  const info = getSlowdownInfo(timingInfo.cycleTimeMs, previousFactorRef.current);
  previousFactorRef.current = info.factor;
  return info;
}, [timingInfo.cycleTimeMs]);
```

---

### 4.2 useEffect with Object Dependencies (MINOR)

**File:** `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`
**Lines:** 79-83

```tsx
useEffect(() => {
  animatedCenterValue.value = withSpring(centerValue, springConfig);
  animatedLowerBound.value = withSpring(targetLowerBound, springConfig);
  animatedUpperBound.value = withSpring(targetUpperBound, springConfig);
}, [centerValue, targetLowerBound, targetUpperBound]);
```

**Problem:** The `springConfig` object is defined inline (line 78) and recreated every render. If it were in the dependency array, it would trigger the effect on every render.

**Suggestion:** Move `springConfig` outside the component or memoize it:
```tsx
const SPRING_CONFIG = { damping: 40, stiffness: 380, overshootClamping: true };
```

---

### 4.3 Potential Animation Loop Leak (CRITICAL)

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx`
**Lines:** 251-260

```tsx
// App coming back to foreground
if (wasRunningBeforeBackgroundRef.current && !isPausedRef.current) {
  const animate = (timestamp: number) => {
    if (lfoRef.current) {
      const state = lfoRef.current.update(timestamp);
      lfoPhase.value = state.phase;
      lfoOutput.value = state.output;
    }
    animationRef.current = requestAnimationFrame(animate);
  };
  animationRef.current = requestAnimationFrame(animate);
}
```

**Problem:** A new `animate` function is created inside the effect handler, duplicating the animation loop logic from lines 210-220. If both loops somehow run simultaneously, it could cause double updates.

**Suggestion:** Extract the animation loop to a reusable function and ensure single-instance execution:
```tsx
const startAnimationLoop = useCallback(() => {
  const animate = (timestamp: number) => { ... };
  animationRef.current = requestAnimationFrame(animate);
}, [lfoPhase, lfoOutput]);
```

---

## 5. Code Organization Smells

### 5.1 God Component (MEDIUM)

**File:** `/Users/brent/wtlfo/app/(home)/param/[param].tsx`

**Problem:** This component handles:
- URL parameter parsing
- Navigation between parameters
- Parameter-specific rendering logic (switch with 7+ cases)
- Parameter metadata/descriptions
- Slider interaction tracking

At 465 lines, it's doing too much.

**Suggestion:** Extract:
1. `ParameterControls` - the switch statement for rendering controls
2. `useParamNavigation` - navigation logic hook
3. Move `PARAM_INFO` to a separate data file

---

### 5.2 Feature Envy (MINOR)

**File:** `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`
**Lines:** 45-70

```tsx
const isUnipolar = UNIPOLAR_WAVEFORMS.includes(waveform);
// ... 25 lines of calculation logic
```

**Problem:** The component contains detailed knowledge about waveform polarity and modulation math that arguably belongs in the domain/data layer, not a UI component.

**Suggestion:** Move modulation calculation to a utility:
```tsx
// utils/modulation.ts
export function calculateModulationBounds(centerValue, depth, waveform, min, max): ModulationBounds { ... }
```

---

### 5.3 Inappropriate Intimacy (MINOR)

**File:** `/Users/brent/wtlfo/src/components/lfo/PhaseIndicator.tsx`

**Problem:** This component directly imports and uses `sampleWaveformWorklet` to calculate its position, duplicating logic that also exists in `WaveformDisplay` and `FadeEnvelope`. All three components sample waveforms but in slightly different ways.

**Suggestion:** Consider a shared hook or ensure all components use the same sampling approach:
```tsx
// useWaveformSample(waveform, phase, options)
```

---

## 6. TypeScript Issues

### 6.1 Type Assertion to Avoid Proper Typing (MINOR)

**File:** `/Users/brent/wtlfo/app/(home)/index.tsx`
**Lines:** 107-114

```tsx
waveform={currentConfig.waveform as WaveformType}
mode={currentConfig.mode as TriggerMode}
```

**Problem:** Multiple type assertions suggest the `currentConfig` type doesn't properly align with component prop types.

**Suggestion:** Ensure the source types are compatible to avoid runtime surprises:
```tsx
// In presets.ts, ensure LFOPresetConfig uses the same types
import type { WaveformType, TriggerMode } from '@/src/components/lfo/types';
```

---

### 6.2 Any-Like Generic Type (MINOR)

**File:** `/Users/brent/wtlfo/app/(learn)/index.tsx`
**Line:** 130

```tsx
onPress={() => router.push(topic.route as any)}
```

**Problem:** Using `as any` bypasses type checking entirely.

**Suggestion:** Define proper route types or use a type-safe routing pattern:
```tsx
type LearnRoutes = '/intro' | '/parameters' | '/waveforms' | ...;
route: LearnRoutes;
```

---

## 7. Minor Style/Convention Issues

### 7.1 Inconsistent Color Usage

**Problem:** Some files use the `colors` theme object, while others use hardcoded hex values:
- `/Users/brent/wtlfo/src/components/params/ParamBox.tsx` - hardcoded `#777788`, `#ffffff`
- `/Users/brent/wtlfo/src/components/destination/DestinationPickerInline.tsx` - hardcoded `#1a1a1a`, `#ff6600`

**Suggestion:** Use the theme consistently:
```tsx
import { colors } from '@/src/theme';
// Use colors.textSecondary, colors.accent, etc.
```

---

### 7.2 Dead Export (MINOR)

**File:** `/Users/brent/wtlfo/src/data/presets.ts`
**Line:** 115

```tsx
export const BPM = 120;
```

**Problem:** This constant appears unused (default BPM is handled in preset-context.tsx).

**Suggestion:** Remove if unused, or document its purpose.

---

## Recommendations Summary

### High Priority
1. Fix the potential animation loop duplication in preset-context.tsx
2. Split the large PresetContext into focused contexts
3. Extract duplicated destination picker code into shared components

### Medium Priority
4. Add named constants for magic numbers
5. Extract formatValue utilities to a shared location
6. Break up the param/[param].tsx god component
7. Fix index-as-key in ParameterBadges

### Low Priority
8. Move inline styles to StyleSheet
9. Consolidate color usage through theme
10. Add type safety to route navigation
11. Document intentional dependency array omissions

---

## Positive Patterns Observed

- Good use of React Context for global state
- Proper separation of worklet code for Reanimated
- Well-structured file organization with clear module boundaries
- Comprehensive accessibility labels on interactive elements
- Good use of TypeScript interfaces for props
- Proper cleanup in useEffect hooks
- Smart use of refs for values that shouldn't trigger re-renders
- Good error boundary implementation
