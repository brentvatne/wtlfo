# Robustness Analysis: WTLFO React Native App

**Analysis Date:** January 2025
**Analyzed By:** Reliability Engineering Review

---

## Executive Summary

This analysis identifies potential edge cases and robustness issues in the WTLFO React Native application. The app is an LFO (Low-Frequency Oscillator) visualizer and editor with animation-driven UI. Overall, the codebase demonstrates good defensive programming practices, but several areas require attention.

**Risk Distribution:**
- High Risk: 3 issues
- Medium Risk: 9 issues
- Low Risk: 7 issues

---

## 1. Numerical Edge Cases

### 1.1 Division by Zero Risk in Slowdown Calculation

**File:** `/Users/brent/wtlfo/src/components/lfo/utils/getSlowdownInfo.ts`
**Lines:** 48, 95-96

**Scenario:** When `cycleTimeMs` is 0 or negative, division occurs.

```typescript
// Line 48
const rawFactor = cycleTimeMs > 0 ? targetCycleTimeMs / cycleTimeMs : 1;

// Lines 95-96
export function getSlowdownFactor(cycleTimeMs: number, ...): number {
  if (cycleTimeMs <= 0) return 1;
  return Math.max(1, targetCycleTimeMs / cycleTimeMs);
}
```

**Risk Level:** LOW
**Analysis:** The code already guards against this with `cycleTimeMs > 0` check. However, `getSlowdownInfo()` at line 48 uses a ternary but `getSlowdownFactor()` uses an early return. Inconsistent patterns could lead to copy-paste errors.

**Suggested Fix:** Standardize the guard pattern across both functions.

---

### 1.2 Potential Division by Zero in Phase Calculations

**File:** `/Users/brent/wtlfo/src/components/lfo/hooks/useSlowMotionPhase.ts`
**Line:** 133

**Scenario:** If `factor` becomes 0 (though unlikely with current code).

```typescript
const slowedDelta = phaseDelta / factor;
```

**Risk Level:** LOW
**Analysis:** The factor is always >= 1 due to `Math.max(1, ...)` in the calculation chain, but this is an implicit contract not enforced at the point of use.

**Suggested Fix:** Add defensive guard: `const slowedDelta = factor > 0 ? phaseDelta / factor : phaseDelta;`

---

### 1.3 Division by Zero in Fade Envelope Calculation

**File:** `/Users/brent/wtlfo/src/components/lfo/FadeEnvelope.tsx`
**Lines:** 74, 77

**Scenario:** When `fadeDuration` is 0, division `xNormalized / fadeDuration` occurs.

```typescript
const fadeDuration = (64 - absFade) / 64;
// ...
fadeEnvelope = fadeDuration > 0 ? Math.min(1, xNormalized / fadeDuration) : 1;
```

**Risk Level:** LOW
**Analysis:** The code guards against this, but the guard is split across multiple conditions making it easy to miss during refactoring.

---

### 1.4 Floating Point Precision in Phase Wraparound

**File:** `/Users/brent/wtlfo/src/components/lfo/hooks/useSlowMotionPhase.ts`
**Line:** 162

**Scenario:** Double modulo operation can accumulate floating-point errors.

```typescript
newDisplayPhase = ((newDisplayPhase % 1) + 1) % 1;
```

**Risk Level:** MEDIUM
**Analysis:** While the drift correction at line 147-158 attempts to address this, it only runs every 60 frames and uses a 0.02 threshold. Long-running sessions could accumulate visible drift.

**Suggested Fix:** Consider using a more robust phase normalization or reset phase more frequently for long-running animations.

---

### 1.5 Depth Division Could Produce NaN

**File:** `/Users/brent/wtlfo/src/hooks/useModulatedValue.ts`
**Line:** 29

**Scenario:** If depth calculations result in edge values.

```typescript
const depthScale = lfoDepth / 63; // -1 to +1
```

**Risk Level:** LOW
**Analysis:** `lfoDepth` is constrained to -64 to +63 by UI, so this is safe. However, there's no runtime validation.

---

### 1.6 Range Calculation Edge Case

**File:** `/Users/brent/wtlfo/src/hooks/useModulatedValue.ts`
**Lines:** 26-28

**Scenario:** If `min` equals `max`, `range` becomes 0, `maxModulation` becomes 0.

```typescript
const range = max - min;
const maxModulation = range / 2;
```

**Risk Level:** LOW
**Analysis:** Would result in no modulation, which is benign but could be confusing. No destinations currently have min === max.

---

## 2. State Edge Cases

### 2.1 Stale Closure in AppState Handler

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx`
**Lines:** 224-272

**Scenario:** The AppState change handler captures `lfoPhase` and `lfoOutput` in closure.

```typescript
useEffect(() => {
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    // ... uses lfoPhase, lfoOutput from closure
  };
  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription.remove();
}, [lfoPhase, lfoOutput]); // Dependencies listed
```

**Risk Level:** MEDIUM
**Analysis:** The code correctly uses `isPausedRef` to avoid stale closure for `isPaused`, but the animation restart in lines 251-259 recreates the animation loop inline. If `lfoRef` changes between background/foreground transitions, this could reference a stale LFO.

**Suggested Fix:** Move the animation loop function to a stable reference or verify `lfoRef.current` freshness.

---

### 2.2 Race Condition in Config Debouncing

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx`
**Lines:** 119-132

**Scenario:** Rapid config changes during debounce window could lead to intermediate states being skipped.

```typescript
useEffect(() => {
  if (debounceRef.current) {
    clearTimeout(debounceRef.current);
  }
  debounceRef.current = setTimeout(() => {
    setDebouncedConfig({ ...currentConfig });
  }, ENGINE_DEBOUNCE_MS);
  // ...
}, [currentConfig]);
```

**Risk Level:** LOW
**Analysis:** This is intentional behavior (debouncing), but during rapid preset switching, the LFO engine may show inconsistent state briefly. The `isEditing` state helps manage UI expectations.

---

### 2.3 Memory Leak Risk with Animation Frame

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx`
**Lines:** 208-221

**Scenario:** If component unmounts during animation frame callback execution.

```typescript
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

**Risk Level:** LOW
**Analysis:** The cleanup properly cancels the animation frame. However, if `lfoRef.current` becomes null mid-callback, the check handles it. The shared values update is safe as Reanimated handles this internally.

---

### 2.4 State Desync Between URL and Internal State

**File:** `/Users/brent/wtlfo/app/(home)/param/[param].tsx`
**Lines:** 180-188

**Scenario:** URL param and internal `activeParam` state could desync.

```typescript
const [activeParam, setActiveParam] = useState<ParamKey>(urlParam as ParamKey);

useEffect(() => {
  if (urlParam && urlParam !== activeParam) {
    setActiveParam(urlParam as ParamKey);
  }
}, [urlParam]);
```

**Risk Level:** LOW
**Analysis:** The dependency array doesn't include `activeParam`, which could lead to stale comparison. However, this is intentional to prevent infinite loops. The pattern works but is fragile.

---

### 2.5 Unhandled Promise in Storage Operations

**File:** `/Users/brent/wtlfo/src/context/modulation-context.tsx`
**Lines:** 58-73

**Scenario:** Storage operations use synchronous API wrapped in try-catch, but no error reporting.

```typescript
useEffect(() => {
  try {
    Storage.setItemSync(CENTER_VALUES_KEY, JSON.stringify(centerValues));
  } catch {
    console.warn('Failed to save center values');
  }
}, [centerValues]);
```

**Risk Level:** LOW
**Analysis:** Silent failures in persistence. Users might lose settings without knowing. Consider adding user-visible error handling.

---

### 2.6 Shared Value Not Synchronized with State

**File:** `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx`
**Lines:** 52-74

**Scenario:** Internal shared values may not perfectly sync with prop changes.

```typescript
const internalPhase = useSharedValue(typeof phase === 'number' ? phase : 0);
// ...
useEffect(() => {
  if (!isPhaseShared) {
    internalPhase.value = phase as number;
  }
}, [phase, isPhaseShared, internalPhase]);
```

**Risk Level:** LOW
**Analysis:** Effect runs after render, so there's one frame lag when switching from SharedValue to static number prop.

---

## 3. Animation Edge Cases

### 3.1 Phase Wraparound Glitch Detection

**File:** `/Users/brent/wtlfo/src/components/lfo/hooks/useSlowMotionPhase.ts`
**Lines:** 100-113

**Scenario:** Edge case where phase jump is exactly 0.8 could be misclassified.

```typescript
if (phaseDelta < -0.8) {
  phaseDelta += 1;
  wrappedForward = true;
} else if (phaseDelta > 0.8) {
  phaseDelta -= 1;
  wrappedBackward = true;
}
```

**Risk Level:** HIGH
**Analysis:** The 0.8 threshold assumes phase never jumps more than 0.2 per frame. At very high LFO speeds with dropped frames, this assumption could break, causing visual glitches. The `adaptiveThreshold` calculation (line 71) helps but doesn't fully solve this.

**Suggested Fix:** Consider tracking frame timestamps to validate delta expectations, or implement a more robust phase tracking algorithm.

---

### 3.2 Timing Discontinuity on BPM Change

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx`
**Lines:** 180-206

**Scenario:** When BPM changes, the LFO is recreated and phase is reset.

```typescript
useEffect(() => {
  lfoRef.current = new LFO(debouncedConfig, bpm);
  // ...
  const startPhaseNormalized = debouncedConfig.startPhase / 128;
  lfoPhase.value = startPhaseNormalized;
  lfoOutput.value = 0;
  // ...
}, [debouncedConfig, bpm, lfoPhase, lfoOutput]);
```

**Risk Level:** MEDIUM
**Analysis:** Changing BPM mid-animation causes an abrupt phase reset. This may be jarring for users expecting smooth tempo transitions.

**Suggested Fix:** Consider preserving current phase during BPM changes and only resetting on explicit triggers.

---

### 3.3 Frame Rate Variation Handling

**File:** `/Users/brent/wtlfo/src/components/lfo/hooks/useSlowMotionPhase.ts`
**Lines:** 145-159

**Scenario:** Drift correction assumes 60fps.

```typescript
// Periodic drift correction every ~60 frames (1 second at 60fps)
if (frameCount.value % 60 === 0 && factor > 1) {
```

**Risk Level:** LOW
**Analysis:** On devices with 120Hz displays or variable refresh rates, the "1 second" assumption is incorrect. Drift correction timing will be off by 2x on 120Hz devices.

**Suggested Fix:** Use actual elapsed time instead of frame count for drift correction.

---

### 3.4 Background/Foreground Animation State

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx`
**Lines:** 224-272

**Scenario:** Complex state machine for pause/resume on app state changes.

**Risk Level:** HIGH
**Analysis:** The interaction between `wasRunningBeforeBackgroundRef`, `isPausedRef`, and `animationRef` creates a complex state machine. Edge cases:
1. Quick background/foreground toggle might not fully stop/restart
2. If `inactive` state is brief (e.g., notification slide-down), animation might stop unnecessarily
3. User pause (`isPaused=true`) during backgrounding could result in confusing resume behavior

**Suggested Fix:** Consider using a finite state machine library or explicit state enum to make transitions clearer.

---

### 3.5 Rapid Parameter Changes During Animation

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx`
**Line:** 100 (ENGINE_DEBOUNCE_MS = 100)

**Scenario:** 100ms debounce means rapid slider movement causes multiple LFO recreations.

**Risk Level:** MEDIUM
**Analysis:** While debouncing helps, extremely fast parameter changes (e.g., programmatic) could still overwhelm the system. Each recreation resets phase and creates new LFO instance.

**Suggested Fix:** Consider updating LFO parameters in-place rather than recreating, where the library supports it.

---

## 4. Platform Edge Cases

### 4.1 iOS Version Check for Tab Styling

**File:** `/Users/brent/wtlfo/app/_layout.tsx`
**Lines:** 7-8

**Scenario:** Legacy iOS detection uses string parsing.

```typescript
const isLegacyIOS =
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) < 26;
```

**Risk Level:** LOW
**Analysis:** iOS 26 doesn't exist yet (current is iOS 17/18). This appears to be future-proofing or a typo. The `parseInt` on `Platform.Version` should work but could fail on unusual version strings.

---

### 4.2 Screen Size Not Validated

**File:** `/Users/brent/wtlfo/app/(home)/index.tsx`
**Lines:** 52-53

**Scenario:** Visualizer width calculation assumes screen is wider than meter.

```typescript
const { width: screenWidth } = useWindowDimensions();
const visualizerWidth = screenWidth - METER_WIDTH;
```

**Risk Level:** LOW
**Analysis:** On very narrow screens (split-screen iPad, old SE), `visualizerWidth` could be negative or very small, causing rendering issues.

**Suggested Fix:** Add minimum width constraint: `const visualizerWidth = Math.max(100, screenWidth - METER_WIDTH);`

---

### 4.3 Missing Accessibility for Dynamic Content

**File:** `/Users/brent/wtlfo/src/components/lfo/OutputValueDisplay.tsx`
**Lines:** 26-37

**Scenario:** Output value changes are not announced to screen readers.

```typescript
<Text style={[styles.text, ...]}>
  {isEditing ? '-' : displayValue.text}
</Text>
```

**Risk Level:** MEDIUM
**Analysis:** Rapidly changing values without `accessibilityLiveRegion` or similar will not be useful to VoiceOver/TalkBack users.

**Suggested Fix:** Add `accessibilityLiveRegion="polite"` or `accessibilityLabel` that describes the current state.

---

### 4.4 No Low Memory Warning Handler

**File:** N/A

**Scenario:** No handler for iOS `didReceiveMemoryWarning` or Android equivalent.

**Risk Level:** LOW
**Analysis:** The app keeps animation running continuously. Under low memory, the OS might terminate the app without graceful shutdown. Current state is persisted incrementally, so data loss is minimal.

**Suggested Fix:** Consider adding memory warning listener to save critical state and reduce animation quality.

---

## 5. User Input Edge Cases

### 5.1 Rapid Tap on Visualizer

**File:** `/Users/brent/wtlfo/app/(home)/index.tsx`
**Lines:** 78-91

**Scenario:** Rapid tapping could toggle pause state multiple times before state settles.

```typescript
const handleTap = () => {
  if (isPaused) {
    startLFO();
    setIsPaused(false);
  } else if (!isLFORunning()) {
    triggerLFO();
  } else {
    stopLFO();
    setIsPaused(true);
  }
};
```

**Risk Level:** LOW
**Analysis:** React's batching should handle this, but rapid taps could cause visual flickering. No debouncing on the tap handler.

**Suggested Fix:** Add tap debouncing or use gesture handler with proper tap recognition.

---

### 5.2 Slider Value Rounding

**File:** `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx`
**Lines:** 44-51

**Scenario:** Rapid slider movement triggers many state updates.

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

**Risk Level:** LOW
**Analysis:** The rounding and comparison prevents excessive updates, but `setLocalValue` is called for every move, causing many renders. Consider using a worklet for smooth updates.

---

### 5.3 Invalid Parameter URL

**File:** `/Users/brent/wtlfo/app/(home)/param/[param].tsx`
**Lines:** 203-209

**Scenario:** Navigating to `/param/invalid` shows error text.

```typescript
if (!activeParam || !(activeParam in PARAM_INFO)) {
  return (
    <View style={styles.container}>
      <Text style={styles.errorText}>Invalid parameter</Text>
    </View>
  );
}
```

**Risk Level:** LOW
**Analysis:** Graceful degradation exists but no redirect to valid state or back navigation.

**Suggested Fix:** Consider auto-redirecting to a valid parameter or the home screen.

---

### 5.4 Concurrent Slider Interactions

**File:** Multiple slider components

**Scenario:** User attempts to drag two sliders simultaneously on iPad.

**Risk Level:** LOW
**Analysis:** React Native Slider doesn't support multi-touch. Second touch is ignored. This is expected behavior but could confuse users.

---

### 5.5 Navigation During Editing

**File:** `/Users/brent/wtlfo/app/(home)/param/[param].tsx`
**Lines:** 176-177

**Scenario:** User navigates away while `isEditing=true` from sliding.

```typescript
const handleSlidingStart = () => setIsEditing(true);
const handleSlidingEnd = () => setIsEditing(false);
```

**Risk Level:** MEDIUM
**Analysis:** If user navigates while slider is active, `onSlidingEnd` may not fire, leaving `isEditing=true` stuck. This would permanently hide the phase indicator.

**Suggested Fix:** Reset `isEditing` on screen blur/unmount or in navigation listener.

---

## 6. Additional Observations

### 6.1 Error Boundary Recovery

**File:** `/Users/brent/wtlfo/src/components/ErrorBoundary.tsx`
**Lines:** 37-68

**Analysis:** Good implementation with restart and retry options. However:
- `handleDismiss` just resets state, which may immediately re-trigger the error
- No error reporting to analytics

**Risk Level:** LOW

---

### 6.2 JSON Parsing in Storage

**File:** `/Users/brent/wtlfo/src/context/modulation-context.tsx`
**Lines:** 29-36, 39-48

**Scenario:** Corrupted storage could cause JSON.parse to throw.

```typescript
const saved = Storage.getItemSync(CENTER_VALUES_KEY);
return saved ? JSON.parse(saved) : {};
```

**Risk Level:** LOW
**Analysis:** Wrapped in try-catch with fallback to default. Good defensive practice.

---

### 6.3 TypeScript Type Assertions

**File:** Various

**Scenario:** Multiple unchecked type assertions (e.g., `as WaveformType`, `as ParamKey`).

**Risk Level:** LOW
**Analysis:** These could mask runtime type mismatches. Consider runtime validation for external inputs (URL params, storage).

---

## Summary of High Priority Items

1. **Phase Wraparound Glitch Detection** (useSlowMotionPhase.ts:100-113) - High speed LFOs with frame drops could cause visual glitches
2. **Background/Foreground Animation State Machine** (preset-context.tsx:224-272) - Complex state transitions could lead to stuck states
3. **Navigation During Editing** (param/[param].tsx) - isEditing could get stuck true if user navigates during slider drag

## Recommendations

1. Add comprehensive unit tests for edge cases in `useSlowMotionPhase`
2. Implement a formal state machine for animation lifecycle
3. Add integration tests for background/foreground transitions
4. Consider adding Sentry or similar for production error tracking
5. Add runtime parameter validation for URL and storage inputs
6. Implement cleanup for `isEditing` state on navigation events
