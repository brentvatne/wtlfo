# Debounce Pattern Analysis

This document analyzes debounce implementations, patterns, and recommendations for the WTLFO React Native application.

## 1. Debounce Locations

### Current Implementations

#### A. Engine Config Debounce (`preset-context.tsx`)

**Location:** `/Users/brent/wtlfo/src/context/preset-context.tsx`

```typescript
const ENGINE_DEBOUNCE_MS = 100;

// Lines 117-132
useEffect(() => {
  if (debounceRef.current) {
    clearTimeout(debounceRef.current);
  }
  debounceRef.current = setTimeout(() => {
    setDebouncedConfig({ ...currentConfig });
  }, ENGINE_DEBOUNCE_MS);

  return () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  };
}, [currentConfig]);
```

**Delay:** 100ms

**Purpose:** Prevents excessive LFO engine recreation during rapid slider movements. The LFO engine (`new LFO(debouncedConfig, bpm)`) is computationally expensive to recreate.

**Assessment:** APPROPRIATE
- 100ms is a good balance for this use case
- Short enough to feel responsive (below 150ms threshold for perceived delay)
- Long enough to batch rapid slider movements during continuous dragging
- Engine recreation is the heaviest operation in the app

---

## 2. Implementation Quality

### A. Cleanup Analysis

#### Engine Debounce - PROPERLY CLEANED UP

```typescript
// Cleanup in effect dependency change
if (debounceRef.current) {
  clearTimeout(debounceRef.current);
}

// Cleanup on unmount
return () => {
  if (debounceRef.current) {
    clearTimeout(debounceRef.current);
  }
};
```

**Memory Leak Risk:** NONE
- Uses `useRef` for timeout ID storage
- Clears timeout on both dependency changes and unmount
- Pattern follows React best practices

### B. Animation Frame Management - PROPERLY CLEANED UP

The app also manages `requestAnimationFrame` loops:

```typescript
// Lines 208-221: Main animation loop
useEffect(() => {
  const animate = (timestamp: number) => {
    // ... update LFO state
    animationRef.current = requestAnimationFrame(animate);
  };
  animationRef.current = requestAnimationFrame(animate);

  return () => cancelAnimationFrame(animationRef.current);
}, [lfoPhase, lfoOutput]);
```

**Memory Leak Risk:** NONE - properly cancelled on unmount

### C. App State Background Handling - PROPERLY MANAGED

```typescript
// Lines 224-272: Background state handling
if (previousState === 'active' && (nextAppState === 'inactive' || nextAppState === 'background')) {
  cancelAnimationFrame(animationRef.current);
  animationRef.current = 0;
}
```

**Battery/Performance Impact:** EXCELLENT
- Stops animation when app backgrounds
- Resumes only when app returns to foreground
- Respects user's manual pause state

### D. Pattern Consistency

| Component | Pattern Used | Consistent |
|-----------|-------------|------------|
| `preset-context.tsx` | useRef + setTimeout | Yes |
| `ParameterSlider.tsx` | Local state + useRef | Yes |
| `CenterValueSlider.tsx` | Local state + useRef | Yes |
| `modulation-context.tsx` | Immediate (no debounce) | See note |

**Note:** `modulation-context.tsx` does NOT debounce storage writes. Each `setCenterValue` call immediately writes to storage.

---

## 3. Missing Debounces

### A. Storage Persistence (modulation-context.tsx)

**Location:** `/Users/brent/wtlfo/src/context/modulation-context.tsx`, Lines 57-73

```typescript
// Current: Writes on every state change
useEffect(() => {
  try {
    Storage.setItemSync(CENTER_VALUES_KEY, JSON.stringify(centerValues));
  } catch {
    console.warn('Failed to save center values');
  }
}, [centerValues]);

useEffect(() => {
  try {
    Storage.setItemSync(ROUTINGS_KEY, JSON.stringify(routings));
  } catch {
    console.warn('Failed to save routings');
  }
}, [routings]);
```

**Issue:** Center value changes trigger immediate storage writes. During slider dragging, this could mean 10-60 writes per second.

**Impact:** MEDIUM
- `expo-sqlite/kv-store` uses synchronous writes
- Could cause minor UI jank on lower-end devices
- Increased storage I/O wear

**Recommendation:** Add 300-500ms debounce for storage persistence:

```typescript
// Suggested improvement
const storageDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  if (storageDebounceRef.current) {
    clearTimeout(storageDebounceRef.current);
  }
  storageDebounceRef.current = setTimeout(() => {
    try {
      Storage.setItemSync(CENTER_VALUES_KEY, JSON.stringify(centerValues));
    } catch {
      console.warn('Failed to save center values');
    }
  }, 300);

  return () => {
    if (storageDebounceRef.current) {
      clearTimeout(storageDebounceRef.current);
    }
  };
}, [centerValues]);
```

### B. BPM Slider (settings/index.tsx)

**Location:** `/Users/brent/wtlfo/app/(settings)/index.tsx`, Line 92

```typescript
<ParameterSlider
  label="BPM"
  min={30}
  max={300}
  value={bpm}
  onChange={setBPM}  // Direct call, no debounce
  formatValue={(v) => String(Math.round(v))}
/>
```

**Issue:** BPM changes trigger LFO recreation through the debounced config. However, BPM changes ALSO trigger immediate storage writes in `preset-context.tsx`:

```typescript
const setBPM = useCallback((newBPM: number) => {
  const clampedBPM = Math.max(20, Math.min(300, Math.round(newBPM)));
  setBPMState(clampedBPM);
  try {
    Storage.setItemSync(BPM_STORAGE_KEY, String(clampedBPM));  // Immediate!
  } catch {
    console.warn('Failed to save BPM');
  }
}, []);
```

**Impact:** LOW-MEDIUM
- BPM slider movements cause rapid storage writes
- Less critical than center values (BPM is adjusted less frequently)

**Recommendation:** Debounce storage writes, not state updates:

```typescript
const bpmStorageDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const setBPM = useCallback((newBPM: number) => {
  const clampedBPM = Math.max(20, Math.min(300, Math.round(newBPM)));
  setBPMState(clampedBPM);

  // Debounce storage write
  if (bpmStorageDebounceRef.current) {
    clearTimeout(bpmStorageDebounceRef.current);
  }
  bpmStorageDebounceRef.current = setTimeout(() => {
    try {
      Storage.setItemSync(BPM_STORAGE_KEY, String(clampedBPM));
    } catch {
      console.warn('Failed to save BPM');
    }
  }, 300);
}, []);
```

### C. Settings Screen Missing onSlidingStart/End

**Location:** `/Users/brent/wtlfo/app/(settings)/index.tsx`

The BPM slider does not use `onSlidingStart` and `onSlidingEnd` callbacks, so `isEditing` state is not tracked during BPM changes.

**Impact:** LOW
- The visualizer phase indicator doesn't fade during BPM adjustments
- Not critical since BPM changes are typically less frequent

---

## 4. Throttle vs Debounce Analysis

### When to Use Throttle

**Throttle:** Execute at most once per interval, useful for continuous events where you want regular updates.

**Debounce:** Wait until activity stops, useful for "commit" actions.

### Current App Patterns

| Operation | Current Pattern | Better Pattern | Reason |
|-----------|----------------|----------------|--------|
| Slider visual update | Immediate | Keep as-is | Must feel instant |
| Slider value commit | Immediate with rounding | Keep as-is | Rounding provides natural batching |
| Engine config update | Debounce (100ms) | Keep as-is | Wait for final value |
| Storage persistence | Immediate | Debounce (300ms) | Wait for final value |
| Animation frames | RAF loop | Keep as-is | Native 60fps timing |
| Haptic feedback | Immediate | Keep as-is | Must be instant |

### Recommendation: No Throttle Needed

The current app doesn't have use cases that would benefit from throttle over debounce:
- Sliders already use local state for immediate visual feedback
- Engine updates correctly wait for user to stop adjusting
- No network requests that need rate limiting
- No scroll handlers that need regular sampling

---

## 5. User Experience Analysis

### A. Immediate Feedback Despite Debounce - EXCELLENT

The app implements a two-tier system:

1. **Immediate Layer (`currentConfig`):** Updates instantly for UI display
2. **Debounced Layer (`debouncedConfig`):** Updates 100ms after last change for engine

This is visible in the context:

```typescript
// Line 59: Immediate config - updates instantly for UI display
currentConfig: LFOPresetConfig;
// Line 61: Debounced config - updates 100ms after last change
debouncedConfig: LFOPresetConfig;
```

**Result:** Users see immediate visual feedback while expensive operations are batched.

### B. Slider Local State Pattern - EXCELLENT

Both `ParameterSlider` and `CenterValueSlider` use local state:

```typescript
// From ParameterSlider.tsx
const [localValue, setLocalValue] = useState(value);
const lastCommittedValue = useRef(value);

const handleValueChange = useCallback((newValue: number) => {
  setLocalValue(newValue);  // Instant visual
  const rounded = Math.round(newValue);
  if (rounded !== lastCommittedValue.current) {
    lastCommittedValue.current = rounded;
    onChange(rounded);  // Propagate only on integer change
  }
}, [onChange]);
```

**Benefits:**
- Visual value updates at 60fps during drag
- Only propagates changes when integer value changes
- Prevents unnecessary re-renders up the component tree

### C. Perceived Delays Assessment

| Interaction | Delay | Perception |
|-------------|-------|------------|
| Slider drag | 0ms | Instant |
| Waveform update | 0ms | Instant |
| Engine restart | ~100ms | Imperceptible |
| Segmented control | 0ms | Instant |
| Haptic feedback | 0ms | Instant |

**Overall UX Rating:** EXCELLENT - No perceived delays in the current implementation.

### D. isEditing State for Phase Indicator

The app uses `isEditing` to fade the phase indicator during slider interaction:

```typescript
// param/[param].tsx
const handleSlidingStart = () => setIsEditing(true);
const handleSlidingEnd = () => setIsEditing(false);

// LFOVisualizer.tsx
useEffect(() => {
  phaseIndicatorOpacity.value = withTiming(isEditing ? 0 : 1, {
    duration: 100,
    easing: Easing.inOut(Easing.ease),
  });
}, [isEditing, phaseIndicatorOpacity]);
```

**Purpose:** Prevents the moving phase indicator from distracting while user adjusts parameters.

**Assessment:** GOOD UX PATTERN - Clear visual indication that the system is responding.

---

## 6. Summary of Recommendations

### Priority 1: Add Storage Write Debouncing

**Files to modify:**
- `/Users/brent/wtlfo/src/context/modulation-context.tsx`
- `/Users/brent/wtlfo/src/context/preset-context.tsx` (for BPM)

**Delay:** 300ms

**Benefit:** Reduces I/O operations by ~95% during slider interactions.

### Priority 2: Add onSlidingStart/End to Settings BPM Slider

**File:** `/Users/brent/wtlfo/app/(settings)/index.tsx`

**Benefit:** Consistent behavior with other sliders, phase indicator fades during BPM adjustment.

### No Action Needed

- Engine debounce (100ms) - appropriately tuned
- Slider local state pattern - well implemented
- Animation frame management - properly cleaned up
- App background handling - correctly implemented

---

## 7. Test Coverage

The existing test file covers debounce behavior:

```typescript
// preset-context.test.tsx
it('should debounce config changes', async () => {
  jest.useFakeTimers();
  // ... tests verify debounced config doesn't update immediately
  // and only updates after 150ms (100ms debounce + buffer)
});
```

**Recommendation:** Add test for storage write debouncing once implemented.

---

## 8. Code Quality Notes

### Positive Patterns

1. **Consistent ref cleanup** - All setTimeout/RAF refs are properly cleared
2. **Two-tier state** - Immediate UI state separate from debounced engine state
3. **Local slider state** - Prevents prop drilling performance issues
4. **Stable callbacks** - useCallback used for all context functions

### Minor Improvements

1. Consider extracting debounce logic to a custom hook for reusability:

```typescript
function useDebouncedEffect<T>(
  value: T,
  callback: (value: T) => void,
  delay: number
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => callback(value), delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, callback, delay]);
}
```

2. Consider a shared constant file for timing values:

```typescript
// constants/timing.ts
export const DEBOUNCE_MS = {
  ENGINE_CONFIG: 100,
  STORAGE_PERSIST: 300,
  SEARCH_INPUT: 300, // for future search features
} as const;
```

---

*Analysis completed: 2025-01-19*
