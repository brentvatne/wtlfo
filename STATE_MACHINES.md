# State Machines Documentation

This document describes the state machines that govern the behavior of the WTLFO app. Understanding these state machines is crucial for debugging, extending, and maintaining the application.

## Table of Contents

1. [LFO Animation State Machine](#1-lfo-animation-state-machine)
2. [Parameter Editing State Machine](#2-parameter-editing-state-machine)
3. [App Lifecycle State Machine](#3-app-lifecycle-state-machine)
4. [Preset State Machine](#4-preset-state-machine)
5. [Modulation Routing State Machine](#5-modulation-routing-state-machine)
6. [Slow Motion Display State Machine](#6-slow-motion-display-state-machine)

---

## 1. LFO Animation State Machine

**Location:** `/src/context/preset-context.tsx`

The LFO animation is managed by the `elektron-lfo` library and coordinated through React context. The animation loop runs continuously at the provider level, independent of individual tab/screen components.

### State Diagram

```
                                    ┌─────────────────┐
                                    │                 │
                       ┌────────────│   STOPPED       │◄───────────────┐
                       │            │  (ONE/HLF done) │                │
                       │            └─────────────────┘                │
                       │                    │                          │
                       │                    │ tap (when stopped)       │
                       │                    │ triggerLFO()             │
                       │                    ▼                          │
    ┌──────────────────┴──────────┐                                    │
    │                             │                                    │
    │   ┌─────────────────┐       │       ┌─────────────────┐          │
    │   │                 │───────┴──────►│                 │          │
    │   │    RUNNING      │   config      │    RUNNING      │──────────┤
    │   │   (FRE mode)    │   change      │  (TRG/ONE/HLF)  │  cycle   │
    │   │                 │◄──────────────│                 │  complete│
    │   └─────────────────┘               └─────────────────┘          │
    │          │  ▲                              │  ▲                  │
    │          │  │                              │  │                  │
    │   tap    │  │ tap                    tap   │  │ tap              │
    │ stopLFO  │  │ startLFO            stopLFO  │  │ startLFO         │
    │          │  │                              │  │                  │
    │          ▼  │                              ▼  │                  │
    │   ┌─────────────────┐               ┌─────────────────┐          │
    │   │                 │               │                 │          │
    │   │    PAUSED       │               │    PAUSED       │──────────┘
    │   │  (user-init)    │               │  (user-init)    │
    │   │                 │               │                 │
    │   └─────────────────┘               └─────────────────┘
    │
    └──────────────────────────────────────────────────────────────────►
                               BACKGROUNDED
                          (animation loop stopped)
```

### States

| State | Description | Visual Indication |
|-------|-------------|-------------------|
| `RUNNING` | Animation loop active, LFO updating phase/output | Normal opacity, phase indicator moving |
| `PAUSED` | User manually paused via tap | 50% opacity (`isPaused: true`) |
| `STOPPED` | LFO completed (ONE/HLF modes) | Phase indicator at end position |
| `BACKGROUNDED` | App in background, loop cancelled | No visual (app not visible) |

### Transitions

| From | To | Trigger | Implementation |
|------|-----|---------|----------------|
| RUNNING | PAUSED | User tap | `stopLFO()`, `setIsPaused(true)` |
| PAUSED | RUNNING | User tap | `startLFO()`, `setIsPaused(false)` |
| RUNNING | STOPPED | ONE/HLF cycle complete | LFO engine internal |
| STOPPED | RUNNING | User tap | `triggerLFO()` |
| RUNNING | BACKGROUNDED | App → background | `cancelAnimationFrame()` |
| BACKGROUNDED | RUNNING | App → foreground | `requestAnimationFrame()` restart |
| * | RUNNING | Config change | Auto-trigger for TRG/ONE/HLF modes |

### Key Implementation Details

```typescript
// Animation loop (lines 209-221)
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

### Edge Cases

1. **Background detection with user pause**: If user pauses then app backgrounds, `wasRunningBeforeBackgroundRef` correctly stores `false`, preventing auto-resume on foreground.

2. **Stale closure prevention**: `isPausedRef` is maintained alongside `isPaused` state to ensure AppState handlers have fresh values.

3. **Config changes clear pause**: When `debouncedConfig` changes, `setIsPaused(false)` is called (line 205) to ensure new presets start running.

4. **Mode-specific auto-trigger**: TRG/ONE/HLF modes call `lfoRef.current.trigger()` on config change (lines 200-202).

---

## 2. Parameter Editing State Machine

**Locations:**
- `/src/context/preset-context.tsx` (debounce logic)
- `/src/components/controls/ParameterSlider.tsx` (interaction tracking)
- `/app/(home)/param/[param].tsx` (editing callbacks)

### State Diagram

```
                    ┌─────────────────────────────────┐
                    │                                 │
    ┌───────────────│           IDLE                  │◄─────────────────┐
    │               │  (currentConfig = debouncedConfig)                 │
    │               └─────────────────────────────────┘                  │
    │                              │                                     │
    │                              │ onSlidingStart / value change       │
    │                              │ setIsEditing(true)                  │
    │                              ▼                                     │
    │               ┌─────────────────────────────────┐                  │
    │               │                                 │                  │
    │               │          EDITING                │                  │
    │               │    (isEditing: true)            │                  │
    │               │  currentConfig updating rapidly │                  │
    │               └─────────────────────────────────┘                  │
    │                              │                                     │
    │                              │ onSlidingComplete                   │
    │                              │ setIsEditing(false)                 │
    │                              ▼                                     │
    │               ┌─────────────────────────────────┐     100ms        │
    │               │                                 │     debounce     │
    │               │        DEBOUNCING               │─────────────────►│
    │               │   (waiting for more changes)    │                  │
    │               │                                 │◄─────┐           │
    │               └─────────────────────────────────┘      │           │
    │                              │                         │           │
    │                              │ new value change        │           │
    │                              │ (restarts timer)        │           │
    │                              └─────────────────────────┘           │
    │                                                                    │
    │               ┌─────────────────────────────────┐                  │
    │               │                                 │                  │
    └──────────────►│       CONFIG COMMITTED          │──────────────────┘
                    │  debouncedConfig = currentConfig │
                    │  LFO engine recreated            │
                    └─────────────────────────────────┘
```

### States

| State | `isEditing` | `currentConfig` | `debouncedConfig` | Visual Effect |
|-------|-------------|-----------------|-------------------|---------------|
| IDLE | `false` | matches debounced | final values | Phase indicator visible |
| EDITING | `true` | updating | stale | Phase indicator fades out |
| DEBOUNCING | `false` | updated | stale | Phase indicator visible |
| COMMITTED | `false` | matches debounced | updated | LFO engine recreates |

### Dual-Level State Tracking

The system uses two levels of configuration:

1. **`currentConfig`**: Updates immediately on every slider change for responsive UI
2. **`debouncedConfig`**: Updates 100ms after the last change, used for LFO engine recreation

```typescript
// Debounce logic (lines 117-132)
useEffect(() => {
  if (debounceRef.current) {
    clearTimeout(debounceRef.current);
  }
  debounceRef.current = setTimeout(() => {
    setDebouncedConfig({ ...currentConfig });
  }, ENGINE_DEBOUNCE_MS); // 100ms

  return () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  };
}, [currentConfig]);
```

### Slider Local State Pattern

Sliders maintain their own local state for smooth visual updates:

```typescript
// ParameterSlider.tsx (lines 31-51)
const [localValue, setLocalValue] = useState(value);
const lastCommittedValue = useRef(value);

// Sync local value when prop changes externally
React.useEffect(() => {
  if (value !== lastCommittedValue.current) {
    setLocalValue(value);
    lastCommittedValue.current = value;
  }
}, [value]);

// Handle slider changes - update local state immediately
const handleValueChange = useCallback((newValue: number) => {
  setLocalValue(newValue);
  const rounded = Math.round(newValue);
  if (rounded !== lastCommittedValue.current) {
    lastCommittedValue.current = rounded;
    onChange(rounded);  // Propagate only on rounded value change
  }
}, [onChange]);
```

### Edge Cases

1. **Rapid sliding**: Multiple rapid changes only trigger one LFO recreation (debounce coalesces)

2. **Value unchanged optimization**: `updateParameter` skips update if value equals current (line 165)

3. **Modal navigation during edit**: If user navigates away mid-edit, `onSlidingEnd` may not fire; however, the value is already committed since `handleValueChange` calls `onChange` on each change

4. **Phase indicator fade**: Uses Reanimated `withTiming` (100ms) to smoothly fade out during editing

---

## 3. App Lifecycle State Machine

**Location:** `/src/context/preset-context.tsx` (lines 224-272)

### State Diagram

```
                    ┌─────────────────────────────────┐
                    │                                 │
                    │          ACTIVE                 │
                    │   (animation loop running)      │
                    │                                 │
                    └─────────────────────────────────┘
                           │              ▲
                           │              │
        AppState:          │              │  AppState:
        'inactive' or      │              │  'active'
        'background'       │              │
                           │              │
                           ▼              │
                    ┌─────────────────────────────────┐
                    │                                 │
                    │       INACTIVE/BACKGROUND       │
                    │    (animation loop cancelled)   │
                    │                                 │
                    └─────────────────────────────────┘
```

### Resume Logic Decision Tree

```
On foreground resume:
  │
  ├─ wasRunningBeforeBackgroundRef.current === false?
  │     └─ Do NOT resume (was paused or stopped)
  │
  └─ isPausedRef.current === true?
        └─ Do NOT resume (user had manually paused)
        │
        └─ RESUME: Restart animation loop
```

### Key Implementation

```typescript
// AppState handler (lines 224-272)
useEffect(() => {
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    const previousState = appStateRef.current;

    if (
      previousState === 'active' &&
      (nextAppState === 'inactive' || nextAppState === 'background')
    ) {
      // Going to background - remember running state
      wasRunningBeforeBackgroundRef.current =
        !isPausedRef.current && (lfoRef.current?.isRunning() ?? false);

      // Stop animation to save battery
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
    } else if (
      (previousState === 'inactive' || previousState === 'background') &&
      nextAppState === 'active'
    ) {
      // Coming to foreground - resume if appropriate
      if (wasRunningBeforeBackgroundRef.current && !isPausedRef.current) {
        // Restart animation loop
        const animate = (timestamp: number) => { /* ... */ };
        animationRef.current = requestAnimationFrame(animate);
      }
      wasRunningBeforeBackgroundRef.current = false;
    }

    appStateRef.current = nextAppState;
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription.remove();
}, [lfoPhase, lfoOutput]);
```

### Edge Cases

1. **iOS 'inactive' state**: On iOS, app may briefly go to 'inactive' (e.g., Control Center pull-down) before 'background'. Both are handled identically.

2. **Rapid foreground/background**: If app backgrounds and foregrounds rapidly, `wasRunningBeforeBackgroundRef` is reset to `false` on foreground, preventing double-starts.

3. **Config change while backgrounded**: If config changes while backgrounded (unlikely but possible via deep links), the LFO is recreated but animation won't resume until foreground.

---

## 4. Preset State Machine

**Location:** `/src/context/preset-context.tsx`, `/app/(home)/presets.tsx`

### State Diagram

```
                    ┌─────────────────────────────────┐
                    │                                 │
    ┌──────────────►│      DEFAULT (Clean)            │
    │               │  currentConfig = PRESETS[n]     │
    │               └─────────────────────────────────┘
    │                              │
    │                              │ updateParameter()
    │                              │
    │                              ▼
    │               ┌─────────────────────────────────┐
    │               │                                 │
    │               │         MODIFIED                │
    │               │   currentConfig != PRESETS[n]   │
    │               │                                 │
    │               └─────────────────────────────────┘
    │                    │              │
    │                    │              │
    │   resetToPreset()  │              │ setActivePreset(m)
    │                    │              │ (where m != n)
    │                    │              │
    │                    │              ▼
    │                    │    ┌─────────────────────────────────┐
    │                    │    │                                 │
    └────────────────────┴───►│    PRESET SWITCHED             │
                              │  Load PRESETS[m].config         │
                              │  Load destination if defined    │
                              │  Load centerValue if defined    │
                              └─────────────────────────────────┘
```

### Preset Loading Flow

```typescript
// From presets.tsx (lines 12-25)
const handleSelect = (index: number) => {
  const preset = presets[index];
  setActivePreset(index);

  // Also load destination settings from preset
  if (preset.destination) {
    setActiveDestinationId(preset.destination);
    if (preset.centerValue !== undefined) {
      setCenterValue(preset.destination, preset.centerValue);
    }
  }

  router.back();
};
```

### State Persistence

| Data | Storage Key | Default |
|------|-------------|---------|
| Active preset index | `'activePreset'` | `0` |
| BPM | `'bpm'` | `120` |

### Transition Table

| Action | State Change | Side Effects |
|--------|--------------|--------------|
| `setActivePreset(n)` | MODIFIED → DEFAULT | Persists to storage, syncs currentConfig |
| `updateParameter(k, v)` | DEFAULT → MODIFIED | Triggers debounce timer |
| `resetToPreset()` | MODIFIED → DEFAULT | Reloads PRESETS[activePreset].config |
| Storage load on init | — | Restores activePreset, validates bounds |

### Edge Cases

1. **Invalid saved preset**: If saved index >= PRESETS.length or NaN, falls back to 0 (lines 16-28)

2. **BPM clamping**: BPM is clamped to 20-300 range and rounded (lines 144-152)

3. **No "unsaved changes" warning**: Switching presets immediately discards modifications

4. **Preset includes destination**: Presets can optionally set destination and centerValue, creating a complete "scene"

---

## 5. Modulation Routing State Machine

**Location:** `/src/context/modulation-context.tsx`

### State Diagram

```
                    ┌─────────────────────────────────┐
                    │                                 │
                    │      DESTINATION: none          │
                    │   (meter dimmed, no modulation) │
                    │                                 │
                    └─────────────────────────────────┘
                                   │ ▲
                                   │ │
          setActiveDestinationId() │ │ setActiveDestinationId('none')
                                   │ │
                                   ▼ │
                    ┌─────────────────────────────────┐
                    │                                 │
                    │    DESTINATION: <parameter>     │
                    │  centerValues[id] remembered    │
                    │                                 │
                    └─────────────────────────────────┘
                                   │
                                   │ setCenterValue(id, value)
                                   ▼
                    ┌─────────────────────────────────┐
                    │                                 │
                    │     CENTER VALUE MODIFIED       │
                    │  (persisted per destination)    │
                    │                                 │
                    └─────────────────────────────────┘
```

### Center Value Resolution

```typescript
// getCenterValue logic (lines 80-87)
const getCenterValue = useCallback((destinationId: DestinationId): number => {
  if (destinationId === 'none') return 0;
  if (centerValues[destinationId] !== undefined) {
    return centerValues[destinationId]!;
  }
  const def = DESTINATIONS.find(d => d.id === destinationId);
  return def?.defaultValue ?? 64;
}, [centerValues]);
```

### State Persistence

| Data | Storage Key | Structure |
|------|-------------|-----------|
| Center values | `'centerValues'` | `{ [destinationId]: number }` |
| Routings | `'routings'` | `[{ lfoId, destinationId, amount }]` |

### Multi-LFO Support

The routing system supports multiple LFOs, though currently only `lfo1` is used:

```typescript
routings: LFORouting[];  // Array supports multiple LFOs
// Convenience properties for single-LFO mode:
activeDestinationId: DestinationId;        // = routings['lfo1'].destinationId
setActiveDestinationId(id): void;          // = setRouting('lfo1', id)
```

### Edge Cases

1. **'none' destination**: Returns 0 for center value, visual indication is dimmed

2. **Missing routing**: If lfo1 routing is somehow missing, defaults to `DEFAULT_DESTINATION`

3. **Amount preservation**: Changing destination preserves the existing amount value

4. **Zero as valid value**: `centerValues[id] !== undefined` check allows zero as a valid stored value

---

## 6. Slow Motion Display State Machine

**Location:** `/src/components/lfo/hooks/useSlowMotionPhase.ts`

This state machine handles phase tracking for slow-motion display of fast LFOs.

### State Diagram

```
                    ┌─────────────────────────────────┐
                    │                                 │
                    │          SYNCHRONIZED           │
                    │  displayPhase tracks realPhase  │
                    │  (factor = 1)                   │
                    │                                 │
                    └─────────────────────────────────┘
                                   │
                                   │ factor change > 0.01
                                   │ (hysteresis applied)
                                   ▼
                    ┌─────────────────────────────────┐
                    │                                 │
                    │         SLOWED TRACKING         │──────┐
                    │  displayPhase = accumulated      │      │
                    │  slowedDelta                     │      │
                    │                                 │◄─────┘
                    └─────────────────────────────────┘  normal
                         │         │          │          frame
                         │         │          │
          discontinuity  │         │          │ every 60 frames
          detected       │         │          │
                         │         │          ▼
                         │         │    ┌────────────────┐
                         │         │    │ DRIFT          │
                         │         │    │ CORRECTION     │
                         │         │    │ (gradual sync) │
                         │         │    └────────────────┘
                         │         │
                         │         │ factor change
                         ▼         ▼
                    ┌─────────────────────────────────┐
                    │                                 │
                    │           RESET                 │
                    │   displayPhase = realPhase      │
                    │   counters cleared              │
                    │                                 │
                    └─────────────────────────────────┘
```

### Discontinuity Detection

```typescript
// Adaptive threshold based on slowdown factor (lines 70-71)
const adaptiveThreshold = Math.max(0.05, 0.15 / Math.sqrt(factor));

// Discontinuity conditions (lines 82-84)
const isDiscontinuity =
  frameCount.value <= 1 ||
  (absRawDelta > 0.2 && absRawDelta < 0.8);
```

### Phase Accumulation Logic

```typescript
// Slowed delta accumulation (lines 133-143)
const slowedDelta = phaseDelta / factor;
let newDisplayPhase = displayPhase.value + slowedDelta;

// Track display cycles
if (newDisplayPhase >= 1) {
  displayCycleCount.value++;
  newDisplayPhase -= 1;
} else if (newDisplayPhase < 0) {
  displayCycleCount.value--;
  newDisplayPhase += 1;
}
```

### Edge Cases

1. **Wrap-around detection**: Deltas near ±1 are interpreted as wrap-around (0.95→0.05), not jumps

2. **Floating-point drift**: Every 60 frames, accumulated error is corrected by 10% toward expected

3. **Factor change reset**: ANY significant factor change (>0.01) resets tracking to prevent jumps

4. **Extended frame window**: First 10 frames after changes use more lenient discontinuity detection

5. **Backward LFO**: Negative speed values produce negative deltas, handled by wrap-backward logic

---

## Race Conditions and Known Issues

### 1. Config Change During Debounce
**Scenario:** User changes parameter, then switches preset before debounce completes.
**Behavior:** Preset switch calls `setCurrentConfig()`, debounce timer fires with stale config.
**Resolution:** The useEffect dependency on `currentConfig` means the debounce timer is reset when preset changes, and `setDebouncedConfig({ ...currentConfig })` uses the latest state.

### 2. AppState and Pause Interaction
**Scenario:** User pauses LFO, then backgrounds app, then resumes paused state, then foregrounds.
**Behavior:** `wasRunningBeforeBackgroundRef` correctly stores `false` because `isPausedRef.current` was true.
**Resolution:** Proper ref tracking prevents auto-resume when user had manually paused.

### 3. Slider Value Commit Timing
**Scenario:** User rapidly slides, then lifts finger exactly when value changes.
**Behavior:** Both `onValueChange` and `onSlidingComplete` may fire with same value.
**Resolution:** `lastCommittedValue.current` check prevents duplicate commits.

### 4. Slow Motion Factor Hysteresis
**Scenario:** Cycle time oscillates around threshold boundary (e.g., 99ms ↔ 101ms).
**Behavior:** Could cause rapid factor switching and visual stuttering.
**Resolution:** `getSlowdownInfo()` uses `previousFactor` parameter for hysteresis (see `/src/components/lfo/utils/getSlowdownInfo.ts`).

---

## File Reference

| State Machine | Primary Files |
|---------------|---------------|
| LFO Animation | `/src/context/preset-context.tsx` |
| Parameter Editing | `/src/context/preset-context.tsx`, `/src/components/controls/ParameterSlider.tsx` |
| App Lifecycle | `/src/context/preset-context.tsx` |
| Preset | `/src/context/preset-context.tsx`, `/app/(home)/presets.tsx` |
| Modulation Routing | `/src/context/modulation-context.tsx` |
| Slow Motion Display | `/src/components/lfo/hooks/useSlowMotionPhase.ts` |

## Testing

State machine behaviors are tested in:
- `/src/context/__tests__/preset-context.test.tsx`
- `/src/context/__tests__/modulation-context.test.tsx`

Key test scenarios:
- Storage error handling (read/write failures)
- BPM clamping and validation
- Preset switching and config sync
- Routing persistence and retrieval
- Center value resolution with fallbacks
