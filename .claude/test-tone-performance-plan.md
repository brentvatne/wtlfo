# Test Tone Performance Improvement Plan

## Problem Statement

The test tone feature has two performance issues:
1. **Slowdown when enabling** - Frame drops during audio initialization
2. **Frame drops when disabling** - Jank when stopping audio

## Root Cause Analysis

### Current Architecture

The current implementation creates and destroys the entire audio graph on each toggle:

```
Enable: new AudioContext() -> createOscillator() -> createGain() -> createFilter() -> createPanner() -> connect() -> start()
Disable: stop() -> close()
```

### Why This Causes Frame Drops

**On Enable:**
- `new AudioContextClass()` - Initializes native audio hardware (expensive)
- Even with chunked initialization across 6 frames, each node creation is synchronous
- The audio context creation itself can block for 10-50ms on iOS

**On Disable:**
- `audioContext.close()` is synchronous and:
  - Stops all audio processing immediately
  - Releases native audio resources
  - May trigger garbage collection
  - All happens in one frame

## Proposed Solution: Persistent AudioContext with Suspend/Resume

### Key Changes

1. **Create AudioContext once** - On first toggle, not repeatedly
2. **Keep it alive** - Don't call `close()` when stopping
3. **Use `suspend()`/`resume()`** - Instead of create/destroy cycle
4. **Mute before suspend** - Fade gain to 0, then suspend
5. **Only recreate oscillator** - The cheap part, when needed

### Benefits

- AudioContext creation happens only once (first enable)
- `suspend()` is much faster than `close()` + `new AudioContext()`
- `resume()` is nearly instant since graph is already built
- No garbage collection pressure from repeated object creation
- Fade-out before suspend prevents audio clicks

## Implementation Plan

### Phase 1: Refactor to Persistent AudioContext

```typescript
// Lifecycle change:
// Old: toggle -> create -> play -> stop -> destroy
// New: first toggle -> create -> play <-> suspend/resume -> destroy on unmount only

// State tracking:
const audioGraphReadyRef = useRef(false);  // Graph built once
const isPlayingRef = useRef(false);        // Currently making sound
```

**`buildAudioGraph()` changes:**
- Call only once (on first enable)
- Don't start oscillator here - just build the graph
- Connect nodes but leave gain at 0
- Set `audioGraphReadyRef.current = true`

**`start()` changes:**
```typescript
const start = useCallback(async () => {
  if (isPlaying) return;

  // Build graph if first time
  if (!audioGraphReadyRef.current) {
    const success = await buildAudioGraphChunked();
    if (!success) return;
    audioGraphReadyRef.current = true;
  }

  // Resume context if suspended
  const ctx = audioContextRef.current;
  if (ctx?.state === 'suspended') {
    await ctx.resume();
  }

  // Create and start fresh oscillator (cheap)
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 220;
  osc.connect(gainNodeRef.current);
  oscillatorRef.current = osc;

  // Fade in
  gainNodeRef.current.gain.value = 0;
  osc.start();
  gainNodeRef.current.gain.linearRampToValueAtTime(DEFAULT_GAIN, ctx.currentTime + FADE_IN_DURATION);

  setIsPlaying(true);
}, [...]);
```

**`stop()` changes:**
```typescript
const stop = useCallback(async () => {
  if (!isPlaying) return;

  const ctx = audioContextRef.current;
  const gain = gainNodeRef.current;
  const osc = oscillatorRef.current;

  if (!ctx || !gain || !osc) return;

  // Fade out first (prevents click and spreads work)
  const fadeOutDuration = 0.05; // 50ms
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeOutDuration);

  // After fade completes, stop oscillator and suspend
  setTimeout(() => {
    osc.stop();
    oscillatorRef.current = null;

    // Suspend context (keeps graph alive but stops processing)
    ctx.suspend();
  }, fadeOutDuration * 1000 + 10); // +10ms buffer

  setIsPlaying(false);
}, [...]);
```

### Phase 2: Optimize the Update Loop

Current issue: `updateAudioParams` reads from Reanimated SharedValues on JS thread every frame.

**Option A: Keep current approach but optimize**
- SharedValue reads are fast, but we're doing multiple per frame
- Cache destination-specific logic outside the loop
- Only read values that changed

**Option B: Use `runOnJS` from worklet (if LFO runs on UI thread)**
- Have the worklet call a JS function with the value
- Reduces polling overhead

For now, keep Option A - the current approach works and the main perf issue is create/destroy.

### Phase 3: Cleanup Changes

**Only close on unmount:**
```typescript
useEffect(() => {
  return () => {
    // Only destroy on actual unmount
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };
}, []);
```

**Handle pause/resume efficiently:**
- On LFO pause: fade out + stop oscillator + suspend (don't destroy)
- On LFO resume: resume context + create oscillator + fade in

**Handle app background:**
- Going to background: suspend() (don't destroy)
- Coming to foreground: resume() if was playing

## Testing Plan

1. Toggle test tone rapidly - should not cause frame drops
2. Enable test tone, switch tabs, come back - should resume smoothly
3. Enable test tone, pause LFO, unpause - should resume smoothly
4. Enable test tone, background app, foreground - should resume smoothly
5. Profile with Flipper/Instruments - verify no main thread spikes

## Migration Notes

- The warmup code can be simplified or removed (context persists)
- Remove `destroyAudioGraph()` calls except in cleanup
- `isInitializingRef` still needed for first-time build
- `initCancelledRef` still needed if user toggles off during first build

## Risks

1. **Memory**: Keeping AudioContext alive uses some memory
   - Mitigated: Only one context, suspend releases most resources

2. **Audio session**: iOS audio session stays active when suspended
   - Mitigated: Call `suspend()` which should release the session

3. **Edge cases**: Multiple rapid toggles during initialization
   - Mitigated: Keep `isInitializingRef` guard

## Estimated Impact

- **Enable time**: ~50-100ms -> ~5-10ms (after first enable)
- **Disable time**: ~20-50ms -> ~0-5ms (fade handles perceived latency)
- **First enable**: Same as before (one-time cost)
