# Error Recovery Patterns Review

## Executive Summary

This React Native LFO visualization app demonstrates **solid error recovery patterns** in most areas, with particularly strong handling of storage errors and context access. However, there are opportunities to improve animation error handling and provide more explicit user feedback during error states.

**Overall Rating: Good (7/10)**

---

## 1. Error Boundaries

### Current Implementation

**Location:** `/Users/brent/wtlfo/src/components/ErrorBoundary.tsx`

```typescript
export class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  handleRestart = async (): Promise<void> => {
    try {
      if (Updates.isEnabled) {
        await Updates.reloadAsync();
      } else {
        this.setState({ hasError: false, error: null, errorInfo: null });
      }
    } catch (e) {
      console.error('Failed to reload app:', e);
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  };

  handleDismiss = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };
}
```

### Findings

| Aspect | Status | Notes |
|--------|--------|-------|
| Strategic placement | **Good** | Wraps entire app at root level (`app/_layout.tsx`) |
| Recovery possible | **Good** | Two options: "Restart App" and "Try Again" |
| Retry mechanism | **Adequate** | Uses expo-updates reload; falls back to state reset |
| Error display | **Good** | Shows error message in scrollable container |

### Strengths

1. **Root-level protection**: Error boundary wraps the entire app tree, catching any uncaught errors
2. **Graceful degradation**: Falls back to state reset if `Updates.reloadAsync()` fails
3. **User-friendly UI**: Clean error screen with clear actions
4. **Error logging**: Logs both error and component stack for debugging

### Gaps Identified

1. **No nested error boundaries**: A single error in any component crashes the entire app display
2. **No error reporting**: Errors are only logged to console, not sent to a service
3. **No error categorization**: All errors are treated the same regardless of severity
4. **No retry count limit**: Users can repeatedly click "Try Again" without escalation

### Recommendations

1. Add error boundaries around critical sections (visualizer, parameter editor)
2. Implement error reporting (e.g., Sentry, Bugsnag)
3. Track retry attempts and offer escalation after N failures
4. Consider adding a "Report Issue" button

---

## 2. Storage Errors

### Current Implementation

**Locations:**
- `/Users/brent/wtlfo/src/context/preset-context.tsx`
- `/Users/brent/wtlfo/src/context/modulation-context.tsx`

#### Read Errors

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
  return 0; // Safe default
}
```

#### Write Errors

```typescript
const setActivePreset = useCallback((index: number) => {
  setActivePresetState(index);
  try {
    Storage.setItemSync(STORAGE_KEY, String(index));
  } catch {
    console.warn('Failed to save preset');
  }
}, []);
```

### Findings

| Aspect | Status | Notes |
|--------|--------|-------|
| Read failure handling | **Excellent** | Falls back to safe defaults |
| Write failure handling | **Good** | Continues with in-memory state |
| Data validation | **Excellent** | Validates parsed values (NaN, bounds) |
| Data preservation | **Partial** | In-memory state preserved; persistence lost |

### Strengths

1. **Silent degradation**: App continues working even if storage fails
2. **Comprehensive validation**: Checks for NaN, out-of-range values
3. **Synchronous initialization**: Uses `getItemSync` for predictable startup
4. **Tested behavior**: Unit tests cover storage error scenarios

### Test Coverage

```typescript
it('should handle storage read errors gracefully', () => {
  (Storage.getItemSync as jest.Mock).mockImplementation(() => {
    throw new Error('Storage read error');
  });
  // Should not throw, should use defaults
  const { result } = renderHook(() => usePreset(), { wrapper });
  expect(result.current.activePreset).toBe(0);
});
```

### Gaps Identified

1. **No user notification**: Users aren't aware when persistence fails
2. **No retry mechanism**: Failed writes aren't retried
3. **No storage quota handling**: No specific handling for storage full scenarios
4. **JSON parse errors**: Handled but logged at warn level only

### Recommendations

1. Consider showing a non-intrusive toast when persistence fails
2. Implement write retry with exponential backoff
3. Add storage quota monitoring
4. Consider storing critical data in multiple locations

---

## 3. Calculation Errors

### Current Implementation

**Locations:**
- `/Users/brent/wtlfo/src/components/lfo/worklets.ts`
- `/Users/brent/wtlfo/src/hooks/useModulatedValue.ts`
- `/Users/brent/wtlfo/src/components/lfo/utils/getSlowdownInfo.ts`

#### Division by Zero Protection

```typescript
// getSlowdownInfo.ts
const rawFactor = cycleTimeMs > 0 ? targetCycleTimeMs / cycleTimeMs : 1;
// ...
export function getSlowdownFactor(cycleTimeMs: number, ...): number {
  if (cycleTimeMs <= 0) return 1;
  return Math.max(1, targetCycleTimeMs / cycleTimeMs);
}
```

#### Value Clamping

```typescript
// useModulatedValue.ts
const modulationAmount = lfoOutput.value * depthScale * maxModulation;
const raw = centerValue + modulationAmount;
return Math.max(min, Math.min(max, raw));

// DestinationMeter.tsx
const clampedValue = Math.max(min, Math.min(max, currentVal));
```

### Findings

| Aspect | Status | Notes |
|--------|--------|-------|
| NaN handling | **Adequate** | Checked during parsing; not in calculations |
| Infinity handling | **Implicit** | Division by zero prevented, clamping limits range |
| Default values | **Excellent** | Comprehensive defaults throughout |
| Worklet safety | **Good** | Deterministic calculations, no external dependencies |

### Strengths

1. **Defensive clamping**: All output values are clamped to valid ranges
2. **Division guards**: Explicit checks for zero/negative divisors
3. **Unknown type fallbacks**: Worklets return 0 for unknown waveform types
4. **Tested edge cases**: Tests cover zero, negative, and boundary values

### Test Coverage

```typescript
// getSlowdownInfo.test.ts
it('handles zero and negative values', () => {
  expect(getSlowdownFactor(0)).toBe(1);
  expect(getSlowdownFactor(-10)).toBe(1);
});

// preset-context.test.tsx
it('should fall back to defaults for NaN saved values', () => {
  (Storage.getItemSync as jest.Mock).mockImplementation((key) => {
    if (key === 'activePreset') return 'not-a-number';
    return null;
  });
  expect(result.current.activePreset).toBe(0);
});
```

### Gaps Identified

1. **No explicit NaN checks in worklets**: While inputs are validated, calculations could theoretically produce NaN
2. **No Infinity guards**: Clamping handles Infinity, but it's implicit
3. **Floating-point drift**: `useSlowMotionPhase` has drift correction, but it's periodic

### Recommendations

1. Add explicit NaN/Infinity checks in critical worklet calculations
2. Consider adding `Number.isFinite()` guards where appropriate
3. Document the expected input ranges for calculation functions

---

## 4. Context Errors

### Current Implementation

**Locations:**
- `/Users/brent/wtlfo/src/context/preset-context.tsx`
- `/Users/brent/wtlfo/src/context/modulation-context.tsx`

```typescript
export function usePreset() {
  const context = React.use(PresetContext);
  if (!context) {
    throw new Error('usePreset must be used within a PresetProvider');
  }
  return context;
}

export function useModulation() {
  const context = React.use(ModulationContext);
  if (!context) {
    throw new Error('useModulation must be used within a ModulationProvider');
  }
  return context;
}
```

### Findings

| Aspect | Status | Notes |
|--------|--------|-------|
| Error detection | **Good** | Null check with descriptive throw |
| Error message | **Excellent** | Specific, actionable error message |
| Recovery possible | **No** | Throws immediately; caught by ErrorBoundary |
| Provider structure | **Good** | Proper nesting in `_layout.tsx` |

### Strengths

1. **Fail-fast approach**: Errors are caught early in development
2. **Developer-friendly messages**: Clear guidance on how to fix
3. **Proper nesting**: Providers wrap children correctly in app layout
4. **Tested behavior**: Tests verify error is thrown outside provider

### Test Coverage

```typescript
it('should throw error when used outside provider', () => {
  expect(() => {
    renderHook(() => usePreset());
  }).toThrow('usePreset must be used within a PresetProvider');
});
```

### Gaps Identified

1. **No optional context access**: Can't safely check if context is available
2. **No default context fallback**: Must use provider or app crashes
3. **Error caught by global boundary**: No local recovery possible

### Recommendations

1. Consider adding optional hooks: `usePresetOptional()` returning `null` if no provider
2. For library components, consider default context values
3. Add TypeScript strict null checking to catch usage errors at compile time

---

## 5. Animation Errors

### Current Implementation

**Locations:**
- `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx`
- `/Users/brent/wtlfo/src/components/lfo/PhaseIndicator.tsx`
- `/Users/brent/wtlfo/src/components/lfo/hooks/useSlowMotionPhase.ts`
- `/Users/brent/wtlfo/src/context/preset-context.tsx`

#### Animation Loop

```typescript
// preset-context.tsx
useEffect(() => {
  const animate = (timestamp: number) => {
    if (lfoRef.current) {
      const state = lfoRef.current.update(timestamp);
      lfoPhase.value = state.phase;
      lfoOutput.value = state.output;
    }
    animationRef.current = requestAnimationFrame(animate);
  };
  animationRef.current = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationRef.current);
}, [lfoPhase, lfoOutput]);
```

#### Slow Motion Phase Recovery

```typescript
// useSlowMotionPhase.ts - Discontinuity detection
if (isDiscontinuity) {
  displayPhase.value = currentPhase;
  lastRealPhase.value = currentPhase;
  realCycleCount.value = 0;
  displayCycleCount.value = 0;
  return;
}

// Drift correction
if (frameCount.value % 60 === 0 && factor > 1) {
  const drift = newDisplayPhase - expectedDisplayPhase;
  if (Math.abs(drift) > 0.02 && Math.abs(drift) < 0.5) {
    newDisplayPhase -= drift * 0.1;
  }
}
```

### Findings

| Aspect | Status | Notes |
|--------|--------|-------|
| Animation failure | **Implicit** | RAF continues; no explicit error handling |
| Reanimated errors | **Uncaught** | Would propagate to ErrorBoundary |
| Rendering preserved | **Partial** | null checks prevent some crashes |
| Recovery mechanisms | **Good** | Discontinuity detection, drift correction |

### Strengths

1. **Null guards**: `if (lfoRef.current)` prevents calls on null
2. **Discontinuity recovery**: `useSlowMotionPhase` detects and recovers from phase jumps
3. **Drift correction**: Periodic floating-point drift correction
4. **Background handling**: Animation paused when app goes to background

### Gaps Identified

1. **No worklet error handling**: Worklets can't use try/catch normally
2. **No animation failure detection**: If RAF stops, no retry mechanism
3. **Skia rendering errors**: No specific handling for Canvas failures
4. **No performance monitoring**: Dropped frames not detected

### Recommendations

1. Add error boundaries around Canvas components specifically
2. Implement animation health monitoring (detect stopped animations)
3. Consider fallback rendering if Skia fails
4. Add performance monitoring for frame drops

---

## 6. User Actions

### Current Implementation

**Locations:**
- `/Users/brent/wtlfo/app/(home)/index.tsx`
- `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx`
- `/Users/brent/wtlfo/src/components/destination/CenterValueSlider.tsx`

#### Input Handling

```typescript
// ParameterSlider.tsx
const handleValueChange = useCallback((newValue: number) => {
  setLocalValue(newValue);
  const rounded = Math.round(newValue);
  if (rounded !== lastCommittedValue.current) {
    lastCommittedValue.current = rounded;
    onChange(rounded);
  }
}, [onChange]);

// preset-context.tsx
const setBPM = useCallback((newBPM: number) => {
  const clampedBPM = Math.max(20, Math.min(300, Math.round(newBPM)));
  setBPMState(clampedBPM);
  // ...
}, []);
```

### Findings

| Aspect | Status | Notes |
|--------|--------|-------|
| Can users cause errors | **Unlikely** | All inputs are constrained |
| Invalid input handling | **Excellent** | Clamping, rounding, validation |
| Error feedback | **Limited** | No explicit error messages shown |
| Rapid interaction | **Handled** | Debouncing prevents rapid state changes |

### Strengths

1. **Input constraints**: Sliders have min/max values; values are clamped
2. **Value rounding**: All numeric inputs are rounded to integers
3. **Debouncing**: Config changes are debounced (100ms) before engine restart
4. **Accessibility**: Sliders have proper a11y attributes

### User Input Flow

```
User drags slider
    -> setLocalValue (immediate visual feedback)
    -> Math.round() (integer constraint)
    -> lastCommittedValue check (deduplication)
    -> onChange callback
    -> updateParameter (context update)
    -> debounce timer starts
    -> debouncedConfig updates (engine restart)
```

### Gaps Identified

1. **No haptic feedback**: Invalid actions don't provide tactile response
2. **Silent value correction**: User doesn't know when value was clamped
3. **No undo functionality**: Users can't revert changes
4. **No confirmation for destructive actions**: "Reset to Preset" happens immediately

### Recommendations

1. Add haptic feedback when hitting min/max bounds
2. Consider visual indication when value is clamped
3. Implement undo/redo for parameter changes
4. Add confirmation dialog for reset actions

---

## 7. Recovery Actions

### Current Implementation

#### Error Boundary Recovery

```typescript
// ErrorBoundary.tsx
handleRestart = async (): Promise<void> => {
  try {
    if (Updates.isEnabled) {
      await Updates.reloadAsync();
    } else {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  } catch (e) {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }
};

handleDismiss = (): void => {
  this.setState({ hasError: false, error: null, errorInfo: null });
};
```

#### Preset Reset

```typescript
// preset-context.tsx
const resetToPreset = useCallback(() => {
  setCurrentConfig({ ...PRESETS[activePreset].config });
}, [activePreset]);
```

### Findings

| Aspect | Status | Notes |
|--------|--------|-------|
| Retry failed operations | **Partial** | Error boundary retry; no operation-level retry |
| Reset option | **Available** | "Reset to Preset" and "Restart App" |
| Data loss minimized | **Partial** | In-memory state lost on restart; persisted data preserved |

### Strengths

1. **Multiple recovery paths**: "Try Again" vs "Restart App"
2. **State preservation**: Storage data survives restarts
3. **Clean restart**: `Updates.reloadAsync()` provides fresh state
4. **Local recovery**: State reset allows recovery without full restart

### Gaps Identified

1. **No automatic retry**: Failed operations require manual user action
2. **No partial recovery**: Can't recover individual components
3. **No state backup**: If storage write fails, data is only in memory
4. **No recovery logging**: Failed recovery attempts aren't tracked

### Recommendations

1. Implement automatic retry for transient failures (network, storage)
2. Add periodic state backup to prevent data loss
3. Consider local component recovery before full app restart
4. Log recovery attempts for debugging

---

## Summary Matrix

| Area | Handling | Recovery | Testing | User Feedback |
|------|----------|----------|---------|---------------|
| Error Boundaries | Good | Good | N/A | Good |
| Storage Errors | Excellent | Partial | Excellent | Poor |
| Calculation Errors | Good | Implicit | Good | N/A |
| Context Errors | Good | None | Good | Dev Only |
| Animation Errors | Partial | Partial | Limited | None |
| User Actions | Excellent | N/A | Limited | Limited |
| Recovery Actions | Good | Partial | N/A | Good |

---

## Priority Recommendations

### High Priority

1. **Add nested error boundaries** around critical UI sections (visualizer, canvas)
2. **Implement animation health monitoring** to detect and recover from stopped animations
3. **Add user notification for persistence failures** to prevent silent data loss

### Medium Priority

4. **Add Skia/Canvas fallback rendering** for animation failures
5. **Implement automatic retry** for storage write failures
6. **Add undo/redo functionality** for parameter changes

### Low Priority

7. **Add haptic feedback** for boundary conditions
8. **Implement error reporting service** integration
9. **Add recovery logging** for debugging production issues

---

## Files Reviewed

- `/Users/brent/wtlfo/src/components/ErrorBoundary.tsx`
- `/Users/brent/wtlfo/src/context/preset-context.tsx`
- `/Users/brent/wtlfo/src/context/modulation-context.tsx`
- `/Users/brent/wtlfo/src/components/lfo/worklets.ts`
- `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx`
- `/Users/brent/wtlfo/src/components/lfo/PhaseIndicator.tsx`
- `/Users/brent/wtlfo/src/components/lfo/hooks/useSlowMotionPhase.ts`
- `/Users/brent/wtlfo/src/components/lfo/utils/getSlowdownInfo.ts`
- `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx`
- `/Users/brent/wtlfo/src/components/destination/CenterValueSlider.tsx`
- `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`
- `/Users/brent/wtlfo/src/hooks/useModulatedValue.ts`
- `/Users/brent/wtlfo/src/data/destinations.ts`
- `/Users/brent/wtlfo/app/_layout.tsx`
- `/Users/brent/wtlfo/app/(home)/index.tsx`
- `/Users/brent/wtlfo/src/context/__tests__/preset-context.test.tsx`
- `/Users/brent/wtlfo/src/context/__tests__/modulation-context.test.tsx`
- `/Users/brent/wtlfo/src/components/lfo/__tests__/worklets.test.ts`
- `/Users/brent/wtlfo/src/components/lfo/utils/__tests__/getSlowdownInfo.test.ts`
