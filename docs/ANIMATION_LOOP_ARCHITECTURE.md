# Animation Loop Architecture

This document describes how the LFO animation loop works in the preset context and known edge cases.

## Overview

The LFO visualization uses a `requestAnimationFrame` loop to continuously update the phase and output shared values, which drive the Skia canvas animations. This loop runs at the provider level in `PresetContext`, independent of which tab is active.

## Key Components

### Animation State (preset-context.tsx)

```typescript
const lfoPhase = useSharedValue(0);      // Current phase position (0-1)
const lfoOutput = useSharedValue(0);     // Current output value (-1 to +1, scaled by depth)
const lfoRef = useRef<LFO | null>(null); // elektron-lfo engine instance
const animationRef = useRef<number>(0);  // requestAnimationFrame handle (0 = not running)
```

### Animation Loop

The animation loop calls `lfoRef.current.update(timestamp)` each frame to get the current LFO state:

```typescript
const animate = (timestamp: number) => {
  if (lfoRef.current) {
    const state = lfoRef.current.update(timestamp);
    lfoPhase.value = state.phase;
    lfoOutput.value = state.output;
  }
  animationRef.current = requestAnimationFrame(animate);
};
```

## App Lifecycle Handling

### Background State

When the app goes to background, we cancel the animation loop to save battery:

```typescript
if (previousState === 'active' && nextAppState !== 'active') {
  // Remember if we were running (and not user-paused)
  wasRunningBeforeBackgroundRef.current = !isPausedRef.current && lfoRef.current?.isRunning();

  // Cancel animation loop
  cancelAnimationFrame(animationRef.current);
  animationRef.current = 0;
}
```

### Foreground Return

When the app returns to foreground, we restart the loop ONLY if:
- The animation was running before going to background
- The user hadn't manually paused

```typescript
if (previousState !== 'active' && nextAppState === 'active') {
  if (wasRunningBeforeBackgroundRef.current && !isPausedRef.current) {
    // Restart animation loop
    animationRef.current = requestAnimationFrame(animate);
  }
}
```

## Edge Case: Pause + Background + Unpause

### The Bug (Fixed)

There was a scenario where the visualization couldn't be restarted:

1. User pauses visualization (`isPaused = true`)
2. App goes to background - animation loop cancelled
3. App returns to foreground - loop NOT restarted (because `wasRunningBeforeBackgroundRef.current` is false since user was paused)
4. User taps to unpause (`isPaused = false`)
5. **Bug**: Animation loop stays dead because nothing restarts it

The `startLFO()` function only calls `lfoRef.current.start()` (the elektron-lfo engine), but doesn't restart the `requestAnimationFrame` loop.

### The Fix

Added a reactive effect that detects when `isPaused` becomes false and restarts the animation loop if needed:

```typescript
useEffect(() => {
  if (!isPaused && animationRef.current === 0) {
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
}, [isPaused, lfoPhase, lfoOutput]);
```

This ensures the animation loop is always running when the user expects the visualization to be active.

## Two Separate Concerns

It's important to understand there are two independent systems:

1. **elektron-lfo engine** (`lfoRef.current`)
   - Calculates waveform values based on time
   - Has its own `start()`, `stop()`, `trigger()`, `isRunning()` methods
   - Controlled by `startLFO()`, `stopLFO()`, `triggerLFO()`

2. **Animation loop** (`animationRef.current`)
   - Drives the visual updates at 60fps
   - Polls the LFO engine via `update(timestamp)`
   - Updates shared values that trigger Skia redraws
   - Managed by `requestAnimationFrame`/`cancelAnimationFrame`

The LFO engine can be "running" (calculating time-based values) even if the animation loop is stopped, and vice versa. Both must be active for the visualization to animate.

## Testing Scenarios

When testing the animation system, verify these scenarios:

1. **Normal pause/resume**: Tap to pause, tap to resume - should work
2. **Background while running**: Let animation run, background app, return - should resume
3. **Background while paused**: Pause, background app, return, unpause - should resume (this was the fixed bug)
4. **Config change while paused**: Change preset while paused - should unpause and show new animation
5. **Rapid pause/unpause**: Quick toggles shouldn't cause multiple animation loops
