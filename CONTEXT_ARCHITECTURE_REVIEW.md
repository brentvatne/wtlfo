# Context Architecture Review

## Executive Summary

This document provides a comprehensive analysis of the React Context API usage in the WTLFO application. The app uses two primary contexts: `PresetContext` for LFO configuration and animation state, and `ModulationContext` for destination routing and center values. Overall, the architecture is well-designed for the application's complexity level, with some opportunities for optimization.

---

## 1. Context Structure Analysis

### Current Structure

```
ErrorBoundary
  └── PresetProvider
        └── ModulationProvider
              └── NativeTabs (App Content)
```

**Files:**
- `/Users/brent/wtlfo/src/context/preset-context.tsx`
- `/Users/brent/wtlfo/src/context/modulation-context.tsx`
- `/Users/brent/wtlfo/app/_layout.tsx`

### Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| Scope appropriateness | Good | Both contexts are app-level, which matches their usage pattern |
| Context split | Good | Clear separation of concerns: presets vs. modulation routing |
| Tree level placement | Optimal | Placed at root level, available throughout the app |

### Findings

**Strengths:**
- The two-context split is logical: `PresetContext` handles LFO engine state while `ModulationContext` handles destination routing
- Both are genuinely app-wide concerns needed across all tabs
- Provider ordering is correct: `ModulationProvider` can potentially depend on `PresetContext` in the future

**Potential Concerns:**
- `PresetContext` is doing a lot - it manages 25+ values including LFO state, animation loops, app lifecycle, and persistence. Consider whether the animation-specific logic (lfoPhase, lfoOutput, animation loop) should be a separate context or hook.

---

## 2. Context Values Analysis

### PresetContext Value Shape

```typescript
interface PresetContextValue {
  // Preset state (5 values)
  activePreset: number;
  preset: LFOPreset;
  setActivePreset: (index: number) => void;
  presets: LFOPreset[];

  // Config state (6 values)
  currentConfig: LFOPresetConfig;
  debouncedConfig: LFOPresetConfig;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  updateParameter: <K extends keyof LFOPresetConfig>(key: K, value: LFOPresetConfig[K]) => void;
  resetToPreset: () => void;

  // BPM (2 values)
  bpm: number;
  setBPM: (bpm: number) => void;

  // LFO animation (4 values)
  lfoPhase: SharedValue<number>;
  lfoOutput: SharedValue<number>;
  lfoRef: React.MutableRefObject<LFO | null>;
  timingInfo: TimingInfo;

  // LFO control (6 values)
  triggerLFO: () => void;
  startLFO: () => void;
  stopLFO: () => void;
  isLFORunning: () => boolean;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
}
```

### ModulationContext Value Shape

```typescript
interface ModulationContextValue {
  // Center values (3 values)
  centerValues: Partial<Record<DestinationId, number>>;
  setCenterValue: (destinationId: DestinationId, value: number) => void;
  getCenterValue: (destinationId: DestinationId) => number;

  // Routing (4 values)
  routings: LFORouting[];
  setRouting: (lfoId: string, destinationId: DestinationId) => void;
  getRouting: (lfoId: string) => LFORouting | undefined;
  setRoutingAmount: (lfoId: string, amount: number) => void;

  // Convenience (2 values)
  activeDestinationId: DestinationId;
  setActiveDestinationId: (id: DestinationId) => void;
}
```

### Stability Analysis

| Context | Value Memoization | Callback Stability |
|---------|-------------------|-------------------|
| PresetContext | **Not memoized** | Callbacks use `useCallback` |
| ModulationContext | **Not memoized** | Callbacks use `useCallback` |

**Critical Issue:** Neither context memoizes its value object. This means every state change creates a new value object, causing all consumers to re-render.

**Example from `preset-context.tsx` (lines 280-305):**
```typescript
const value: PresetContextValue = {
  activePreset,
  preset: PRESETS[activePreset],
  // ... all other values
};

return (
  <PresetContext value={value}>
    {children}
  </PresetContext>
);
```

**Impact:** When `isPaused` changes, every component using `usePreset()` re-renders, even those only consuming `bpm`.

---

## 3. Context Consumption Patterns

### Consumer Efficiency Analysis

| Component | Context Used | Values Consumed | Efficiency |
|-----------|--------------|-----------------|------------|
| `HomeScreen` | Both | 15+ values | Poor - consumes many values, will re-render on any change |
| `ParamGrid` | Both | 2 values each | Good - minimal consumption |
| `SettingsScreen` | Preset | 2 values | Good |
| `EditParamScreen` | Preset | 4 values | Fair |
| `DestinationPicker` | Modulation | 2 values | Good |
| `HomeLayout` | Preset | 1 value | Good |

### Patterns Observed

**Good Pattern - Minimal Consumption:**
```typescript
// From ParamGrid.tsx
const { currentConfig } = usePreset();
const { activeDestinationId } = useModulation();
```

**Inefficient Pattern - Over-consumption:**
```typescript
// From HomeScreen (app/(home)/index.tsx lines 29-42)
const {
  currentConfig,
  bpm,
  isEditing,
  lfoPhase,
  lfoOutput,
  timingInfo,
  triggerLFO,
  startLFO,
  stopLFO,
  isLFORunning,
  isPaused,
  setIsPaused,
} = usePreset();
```

### Prop Drilling Assessment

**No significant prop drilling detected.** The app uses context appropriately to avoid prop drilling. Components access context directly rather than passing values through intermediaries.

---

## 4. Provider Configuration

### Initialization

**Strengths:**
- Both contexts use synchronous storage reads for initial state (`getInitialPreset()`, `getInitialBPM()`, `getInitialCenterValues()`, `getInitialRoutings()`)
- This prevents flash of default state on app load
- Error handling is present with fallbacks to defaults

**Example from `preset-context.tsx` (lines 16-29):**
```typescript
function getInitialPreset(): number {
  try {
    const saved = Storage.getItemSync(STORAGE_KEY);
    if (saved !== null) {
      const index = parseInt(saved, 10);
      if (!isNaN(index) && index >= 0 && index < PRESETS.length) {
        return index;
      }
    }
  } catch {
    console.warn('Failed to load saved preset');
  }
  return 0;
}
```

### Provider Nesting

The nesting order is correct:
1. `ErrorBoundary` - catches errors from all providers
2. `PresetProvider` - core app state
3. `ModulationProvider` - depends on being inside app context

**No circular dependencies detected.**

---

## 5. Performance Analysis

### Re-render Triggers

| State Change | Components Affected | Severity |
|--------------|---------------------|----------|
| `currentConfig` update | All preset consumers | High |
| `isPaused` toggle | All preset consumers | High - but unnecessary for most |
| `lfoPhase`/`lfoOutput` update | None (SharedValue) | None - handled outside React |
| `centerValues` update | All modulation consumers | Medium |
| `routings` update | All modulation consumers | Medium |

### SharedValue Optimization (Excellent)

The use of `SharedValue` from Reanimated for `lfoPhase` and `lfoOutput` is excellent:
```typescript
const lfoPhase = useSharedValue(0);
const lfoOutput = useSharedValue(0);
```

These values update at 60fps without triggering React re-renders. This is the correct pattern for animation state.

### Problem Areas

1. **Unmemoized context values** - Every provider state change creates new value objects

2. **Large context value surface** - `PresetContext` exposes 23 values; any change to internal state triggers consumer re-renders

3. **Debounce creates extra renders** - The debouncing mechanism in `preset-context.tsx` (lines 117-132) causes two updates: immediate for UI, delayed for engine

4. **Derived values recomputed on every render:**
   ```typescript
   // From modulation-context.tsx line 112
   const activeDestinationId = routings.find(r => r.lfoId === 'lfo1')?.destinationId ?? DEFAULT_DESTINATION;
   ```

---

## 6. Testing Assessment

### Test Coverage

Both contexts have comprehensive test suites:
- `/Users/brent/wtlfo/src/context/__tests__/preset-context.test.tsx` - 445 lines
- `/Users/brent/wtlfo/src/context/__tests__/modulation-context.test.tsx` - 460 lines

### Test Quality

**Strengths:**
- Tests use proper wrapper pattern for provider isolation
- Error boundary cases (usage outside provider) are tested
- Storage error handling is tested
- Edge cases (NaN, out-of-range values) are covered

**Test Wrapper Pattern (Good):**
```typescript
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PresetProvider>{children}</PresetProvider>
);

const { result } = renderHook(() => usePreset(), { wrapper });
```

**Missing Coverage:**
- No tests for re-render behavior/performance
- No tests for context value stability
- Animation loop tests are basic (just verifies methods exist)

---

## 7. Alternative Approaches

### Current State That Works Well as Context

| State | Reason |
|-------|--------|
| `activePreset`, `presets` | App-wide, accessed by multiple screens |
| `currentConfig` | Needed by visualizer, editor, parameter grid |
| `bpm` | Global setting, needed across tabs |
| `lfoPhase`, `lfoOutput` | Shared animation state across screens |
| `routings`, `centerValues` | Global modulation settings |

### State That Could Be Reconsidered

| State | Current Location | Alternative | Reasoning |
|-------|------------------|-------------|-----------|
| `isEditing` | PresetContext | Local hook or passed as prop | Only needed by visualizer components |
| `isPaused` | PresetContext | Local state in HomeScreen | Only used in one screen |
| `timingInfo` | PresetContext | Derived in component | Computed from debouncedConfig and bpm |

### State Machine Consideration

The LFO control logic (`triggerLFO`, `startLFO`, `stopLFO`, `isLFORunning`, `isPaused`) follows a state machine pattern:

```
States: Running, Paused, Stopped
Transitions:
  Running -> Paused (stopLFO when !isPaused)
  Running -> Stopped (ONE/HLF mode completes)
  Paused -> Running (startLFO)
  Stopped -> Running (triggerLFO)
```

This could be modeled with XState or a reducer, but the current implementation is simple enough that it's not necessary.

---

## 8. Recommendations

### High Priority

1. **Memoize context values**
   ```typescript
   const value = useMemo(() => ({
     activePreset,
     preset: PRESETS[activePreset],
     // ... other values
   }), [activePreset, currentConfig, debouncedConfig, bpm, isEditing, isPaused, timingInfo]);
   ```

2. **Consider splitting PresetContext**
   - `LFOEngineContext` - lfoRef, lfoPhase, lfoOutput, control methods
   - `PresetContext` - activePreset, currentConfig, updateParameter, etc.

   This would reduce re-render scope when only animation state changes.

### Medium Priority

3. **Memoize derived values**
   ```typescript
   // In ModulationContext
   const activeDestinationId = useMemo(() =>
     routings.find(r => r.lfoId === 'lfo1')?.destinationId ?? DEFAULT_DESTINATION,
     [routings]
   );
   ```

4. **Add selector hooks for fine-grained subscriptions**
   ```typescript
   // New hook for minimal subscription
   export function usePresetBPM() {
     const { bpm, setBPM } = usePreset();
     return { bpm, setBPM };
   }

   export function useLFOControls() {
     const { triggerLFO, startLFO, stopLFO, isLFORunning, isPaused, setIsPaused } = usePreset();
     return { triggerLFO, startLFO, stopLFO, isLFORunning, isPaused, setIsPaused };
   }
   ```

### Low Priority

5. **Move `isEditing` to a dedicated hook**
   - It's only needed for visual feedback during slider interaction
   - Could be prop-drilled from HomeScreen or handled via local state

6. **Add performance tests**
   - Test that context updates don't cause unexpected re-renders
   - Use `@testing-library/react-hooks` to count renders

---

## 9. Summary

### Strengths
- Clean separation between preset configuration and modulation routing
- Excellent use of SharedValue for 60fps animation without React re-renders
- Comprehensive test coverage
- Proper synchronous initialization from storage
- Good error handling with fallbacks

### Areas for Improvement
- Context values should be memoized to prevent unnecessary re-renders
- PresetContext is large and could be split for better render isolation
- Some derived values should be memoized
- Could benefit from selector hooks for fine-grained subscriptions

### Overall Rating: B+

The architecture is solid for the app's current complexity. The SharedValue pattern for animation is particularly well-implemented. The main improvements would focus on memoization and potentially splitting the larger context to reduce re-render scope as the app grows.
