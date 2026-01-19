# App Lifecycle Review

This document analyzes how the wtlfo React Native app handles various lifecycle events, state transitions, and edge cases.

## Executive Summary

The app demonstrates **good lifecycle management** in several areas, particularly around background/foreground transitions and state persistence. However, there are some gaps around memory pressure handling, deep linking, and orientation management that could be improved.

| Area | Status | Notes |
|------|--------|-------|
| Background/Foreground | Good | Animations properly paused/resumed |
| App Startup | Good | Synchronous loading, no splash screen needed |
| Memory Pressure | Missing | No memory warning handling |
| Screen Rotation | N/A | Portrait-locked by design |
| Interruptions | Partial | Basic AppState handling covers most cases |
| Deep Linking | Configured | URL scheme set but no specific handlers |
| State Persistence | Good | Synchronous KV store with validation |

---

## 1. Background/Foreground Transitions

### Implementation

**File: `/Users/brent/wtlfo/src/context/preset-context.tsx` (lines 224-272)**

The app implements proper AppState handling for background/foreground transitions:

```typescript
const handleAppStateChange = (nextAppState: AppStateStatus) => {
  const previousState = appStateRef.current;

  if (
    previousState === 'active' &&
    (nextAppState === 'inactive' || nextAppState === 'background')
  ) {
    // App is going to background
    wasRunningBeforeBackgroundRef.current = !isPausedRef.current && (lfoRef.current?.isRunning() ?? false);

    // Stop the animation loop
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
  } else if (
    (previousState === 'inactive' || previousState === 'background') &&
    nextAppState === 'active'
  ) {
    // App is coming back to foreground
    if (wasRunningBeforeBackgroundRef.current && !isPausedRef.current) {
      // Restart the animation loop
      animationRef.current = requestAnimationFrame(animate);
    }
    wasRunningBeforeBackgroundRef.current = false;
  }

  appStateRef.current = nextAppState;
};

const subscription = AppState.addEventListener('change', handleAppStateChange);
return () => subscription.remove();
```

### Analysis

**Strengths:**
- Properly cancels `requestAnimationFrame` when backgrounded (saves battery)
- Tracks whether animation was running before background transition
- Respects user-initiated pause state (`isPausedRef`) - won't auto-resume if user had paused
- Uses refs (`isPausedRef`, `wasRunningBeforeBackgroundRef`) to avoid stale closure issues
- Properly cleans up subscription on unmount

**State Preservation:**
- LFO phase and output are stored in `SharedValue` (Reanimated) which persists across background
- LFO instance (`lfoRef.current`) is preserved
- All React state (presets, BPM, config) persists naturally

**Resource Release:**
- Animation frame is cancelled when backgrounded
- No other significant resources to release (no audio, no timers running)

**Potential Issue:**
- When resuming, the animation loop function is recreated inline, which means it captures fresh closure values. This is correct but slightly duplicative of the main animation loop effect.

---

## 2. App Startup

### Implementation

The app uses synchronous initialization for critical state:

**File: `/Users/brent/wtlfo/src/context/preset-context.tsx` (lines 16-45)**

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

function getInitialBPM(): number {
  try {
    const saved = Storage.getItemSync(BPM_STORAGE_KEY);
    if (saved !== null) {
      const bpm = parseInt(saved, 10);
      if (!isNaN(bpm) && bpm >= 20 && bpm <= 300) {
        return bpm;
      }
    }
  } catch {
    console.warn('Failed to load saved BPM');
  }
  return DEFAULT_BPM;
}
```

**File: `/Users/brent/wtlfo/src/context/modulation-context.tsx` (lines 29-48)**

Similar synchronous loading for center values and routings.

### Splash Screen Configuration

**File: `/Users/brent/wtlfo/app.json` (lines 34-42)**

```json
"plugins": [
  "expo-router",
  [
    "expo-splash-screen",
    {
      "image": "./assets/images/splash-icon.png",
      "imageWidth": 200,
      "resizeMode": "contain",
      "backgroundColor": "#000000"
    }
  ],
  "expo-sqlite"
]
```

### Analysis

**Strengths:**
- Uses synchronous `Storage.getItemSync` - no async loading, no flash of default content
- State is available immediately when components mount
- Lazy initialization with `useState(() => getInitialPreset())` pattern
- Error handling with fallback to defaults
- Splash screen configured for native loading time

**Race Conditions:**
- None detected - synchronous initialization prevents race conditions
- Providers are properly nested in root layout
- Animation loop starts immediately after mount via `useEffect`

**Initialization Efficiency:**
- Minimal work on startup - just reading 4 KV store values
- LFO engine created once debouncedConfig is ready
- No network calls or heavy computations during init

**Potential Improvement:**
- No explicit splash screen hiding - relies on Expo's auto-hide behavior
- For long initialization, could add `SplashScreen.preventAutoHideAsync()` and `hideAsync()`

---

## 3. Memory Pressure

### Current Implementation

**No memory pressure handling is implemented.**

The app does not:
- Listen for memory warnings
- Implement `didReceiveMemoryWarning` equivalent
- Have any cache clearing mechanisms
- Reduce memory usage when under pressure

### Risk Assessment

**Low Risk** - The app has a relatively small memory footprint:
- No image caching
- No large data structures
- Skia canvas is efficiently managed
- SharedValues are lightweight
- No offline data storage

### Recommendation

For a production app, consider adding:

```typescript
// iOS memory warning via AppState
AppState.addEventListener('memoryWarning', () => {
  // Clear any caches
  // Reset non-essential state
});
```

Or using a library like `react-native-device-info` for cross-platform memory monitoring.

---

## 4. Screen Rotation

### Configuration

**File: `/Users/brent/wtlfo/app.json` (line 6)**

```json
"orientation": "portrait"
```

### Analysis

The app is **portrait-locked by design**. This is appropriate for this type of music utility app.

**Implementation:**
- No rotation handling needed
- Layout uses responsive dimensions via `useWindowDimensions()`
- Visualizer width adapts to screen width
- Fixed meter width with flexible visualizer

**File: `/Users/brent/wtlfo/app/(home)/index.tsx` (lines 45-52)**

```typescript
const { width: screenWidth } = useWindowDimensions();
// ...
const visualizerWidth = screenWidth - METER_WIDTH;
```

---

## 5. Interruptions (Phone Calls, Notifications)

### Current Handling

The app relies on React Native's `AppState` to handle interruptions:
- Phone calls: App goes to `inactive` -> `background` -> `active`
- Notification interactions: Similar state transitions
- Control Center/Notification Center: May go to `inactive` briefly

### Analysis

**File: `/Users/brent/wtlfo/src/context/preset-context.tsx` (lines 228-244)**

The current implementation handles the `inactive` state:

```typescript
if (
  previousState === 'active' &&
  (nextAppState === 'inactive' || nextAppState === 'background')
) {
  // Pause animations
}
```

**Strengths:**
- Handles both `inactive` and `background` states
- Animations pause during phone calls (app goes inactive)
- Properly resumes when returning to active state

**Not Handled:**
- Picture-in-Picture transitions (not applicable)
- Split screen on iPad (not implemented, could work)
- Audio session interruptions (app doesn't play audio)

---

## 6. Deep Linking

### Configuration

**File: `/Users/brent/wtlfo/app.json` (line 8)**

```json
"scheme": "wtlfo"
```

This enables URLs like `wtlfo://...` to open the app.

### Current Implementation

**No deep link handling is implemented.** The URL scheme is configured but:
- No `Linking` listeners
- No URL parsing
- No state restoration from URL parameters

### Potential Use Cases

For this LFO app, deep linking could support:
- Loading specific presets: `wtlfo://preset/3`
- Setting specific parameters: `wtlfo://config?waveform=SIN&speed=64`
- Sharing LFO configurations

### Expo Router Integration

Since the app uses Expo Router, deep linking could be added relatively easily:
- Routes are automatically linked
- Could add parameter screens that parse URL params

---

## 7. State Persistence

### What Is Persisted

| Key | Storage Location | Data |
|-----|------------------|------|
| `activePreset` | expo-sqlite/kv-store | Preset index (0-N) |
| `bpm` | expo-sqlite/kv-store | BPM value (20-300) |
| `centerValues` | expo-sqlite/kv-store | Per-destination center values |
| `routings` | expo-sqlite/kv-store | LFO-to-destination mappings |

### What Is NOT Persisted

- Current LFO phase/position
- Modified preset parameters (resets to preset on reload)
- Pause state
- Editing state

### Persistence Reliability

**File: `/Users/brent/wtlfo/src/context/preset-context.tsx`**

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

**Strengths:**
- Synchronous writes prevent data loss
- Error handling with graceful degradation
- Writes happen immediately on state change

**Data Validation on Restore:**

```typescript
if (!isNaN(index) && index >= 0 && index < PRESETS.length) {
  return index;
}
// Falls back to default
```

**Strong Validation:**
- Checks for NaN
- Validates range against actual presets array
- BPM validated to 20-300 range
- Invalid JSON parsing caught and uses defaults

### Test Coverage

**File: `/Users/brent/wtlfo/src/context/__tests__/preset-context.test.tsx`**

Comprehensive tests exist for:
- Loading saved values
- Invalid value fallbacks
- NaN handling
- Storage read/write errors
- Range validation

---

## 8. Error Boundary

### Implementation

**File: `/Users/brent/wtlfo/src/components/ErrorBoundary.tsx`**

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
    if (Updates.isEnabled) {
      await Updates.reloadAsync();
    } else {
      // Reset state to attempt recovery
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  };
}
```

**File: `/Users/brent/wtlfo/app/_layout.tsx`**

```typescript
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <PresetProvider>
        <ModulationProvider>
          <NativeTabs ... />
        </ModulationProvider>
      </PresetProvider>
    </ErrorBoundary>
  );
}
```

### Analysis

**Strengths:**
- Wraps entire app at root level
- Provides user-friendly error UI
- Offers "Restart App" (full reload) and "Try Again" (state reset) options
- Uses expo-updates for production reloads
- Logs errors and component stack for debugging

**Recovery Options:**
1. Full app reload via `Updates.reloadAsync()`
2. State reset to attempt in-place recovery

---

## Recommendations Summary

### High Priority

1. **Consider persisting modified preset parameters** - Currently, users lose their tweaks on app restart. Consider saving the current config or providing a "Save as User Preset" feature.

### Medium Priority

2. **Add memory warning handling** - Even if the app is lightweight, adding the listener is defensive:
   ```typescript
   AppState.addEventListener('memoryWarning', handleMemoryWarning);
   ```

3. **Implement deep link handlers** - The URL scheme is configured but unused. Could enhance sharing/preset loading.

### Low Priority

4. **Explicit splash screen control** - For guaranteed smooth startup:
   ```typescript
   import * as SplashScreen from 'expo-splash-screen';
   SplashScreen.preventAutoHideAsync();
   // After init
   SplashScreen.hideAsync();
   ```

5. **Consolidate animation loop restart logic** - The foreground resume recreates the animate function; could extract to a shared ref.

---

## Files Analyzed

- `/Users/brent/wtlfo/src/context/preset-context.tsx` - Primary lifecycle handling
- `/Users/brent/wtlfo/src/context/modulation-context.tsx` - State persistence
- `/Users/brent/wtlfo/app/_layout.tsx` - Root layout with error boundary
- `/Users/brent/wtlfo/src/components/ErrorBoundary.tsx` - Error handling
- `/Users/brent/wtlfo/app.json` - App configuration
- `/Users/brent/wtlfo/app/(home)/index.tsx` - Main screen implementation
- `/Users/brent/wtlfo/src/context/__tests__/preset-context.test.tsx` - Test coverage
- `/Users/brent/wtlfo/src/context/__tests__/modulation-context.test.tsx` - Test coverage
