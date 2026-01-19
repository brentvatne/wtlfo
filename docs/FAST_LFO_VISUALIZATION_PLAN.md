# Fast LFO Visualization Plan

## Problem Statement

When the LFO runs at very high speeds (e.g., multiplier 256 with speed +48), the phase indicator and output values update so rapidly that they become meaningless visual noise. Users cannot perceive what the LFO is actually doing.

### The Math

At extreme settings (multiplier 256, speed +48, BPM 120):
- Product: 256 * 48 = 12,288
- Cycle time: ~5.2ms (approximately 192 Hz)
- At 60fps (~16.7ms per frame), the LFO completes ~3 full cycles per frame

This means the phase indicator jumps to essentially random positions each frame, and the output value display becomes an unreadable blur of numbers.

### When Does This Become a Problem?

| Multiplier | Speed | Product | Cycle Time | Frequency | Frames/Cycle |
|------------|-------|---------|------------|-----------|--------------|
| 64         | 8     | 512     | 1000ms     | 1 Hz      | 60 frames    |
| 64         | 32    | 2048    | 250ms      | 4 Hz      | 15 frames    |
| 128        | 32    | 4096    | 125ms      | 8 Hz      | 7.5 frames   |
| 256        | 16    | 4096    | 125ms      | 8 Hz      | 7.5 frames   |
| 256        | 48    | 12288   | 5.2ms      | 192 Hz    | 0.3 frames   |
| 512        | 32    | 16384   | 31ms       | 32 Hz     | 1.9 frames   |
| 1k         | 32    | 32768   | 15.6ms     | 64 Hz     | 0.9 frames   |
| 2k         | 32    | 65536   | 7.8ms      | 128 Hz    | 0.47 frames  |

**Threshold for meaningful visualization:** ~4-8 Hz (product ~2048-4096)
- Above this, the phase indicator moves too fast to track
- The output value display becomes unreadable flickering numbers

---

## Research: How Others Handle This

### 1. Oscilloscopes - Time Base / Sweep Speed

Digital oscilloscopes handle this by adjusting the **time base** (sweep speed). Rather than showing real-time at 1:1, they display a time-stretched view where multiple cycles are captured and displayed statically or slowly.

**Key insight:** The waveform shape stays the same regardless of frequency - only the time scale changes.

References:
- [Tektronix Oscilloscope Systems and Controls](https://www.tek.com/en/documents/primer/oscilloscope-systems-and-controls)
- [SparkFun - How to Use an Oscilloscope](https://learn.sparkfun.com/tutorials/how-to-use-an-oscilloscope/all)

### 2. DAW/Synth UIs - Static Waveform + Modulation Indicators

Software synthesizers like Serum and Ableton's Wavetable take a different approach:
- Display a **static waveform shape** that doesn't animate
- Show modulation amount via **rings around knobs** or **overlay indicators**
- Focus on the **configuration** rather than real-time state

**Key insight:** At audio rates, visualization of instantaneous position is meaningless anyway - what matters is the waveform shape and modulation routing.

References:
- [Xfer Serum Tips](https://www.productionmusiclive.com/blogs/news/10-quick-serum-tips)
- [Learning Synthesis: LFOs - Perfect Circuit](https://www.perfectcircuit.com/signal/learning-synthesis-lfos)

### 3. Envelope Followers - RMS/Average Display

Audio meters and envelope followers solve similar problems by displaying **averaged** or **RMS** values rather than instantaneous values. This creates a stable, meaningful display even with rapidly changing signals.

**Key insight:** Show the "energy" or "activity level" rather than exact instantaneous values.

References:
- [Digital Envelope Detection - DSPRelated](https://www.dsprelated.com/showarticle/938.php)

### 4. Wagon-Wheel Effect / Strobing

An interesting phenomenon: when a periodic signal's frequency approaches or exceeds the display frame rate, you get aliasing effects. The wagon-wheel effect makes wheels appear to spin backwards or stand still in films.

**Key insight:** Rather than fighting this, we could potentially use it - but it's generally confusing for users.

References:
- [Wagon-wheel effect - Wikipedia](https://en.wikipedia.org/wiki/Wagon-wheel_effect)
- [Temporal Aliasing - UC Davis](https://www.cs.ucdavis.edu/~koehl/Teaching/ECS17/Chapters/Chapter1/wagon.html)

---

## Proposed Solutions

### Solution 1: Time-Dilated Visualization (Recommended)

**Concept:** When the LFO is "too fast," display the animation at a slowed-down rate while clearly indicating this to the user.

**How it works:**
1. Calculate the LFO frequency
2. If frequency exceeds a threshold (e.g., 4 Hz), enable "time dilation"
3. Display the phase/output as if the LFO were running at a slower, viewable rate
4. Show a clear indicator that visualization is slowed down

**Implementation:**
```typescript
// In the animation loop or visualizer
const FAST_LFO_THRESHOLD_HZ = 4; // ~250ms cycle time
const TARGET_VISUAL_HZ = 0.5; // Slow enough to clearly see

const actualFrequency = 1000 / cycleTimeMs;
const isTimeDilated = actualFrequency > FAST_LFO_THRESHOLD_HZ;
const dilationFactor = isTimeDilated
  ? TARGET_VISUAL_HZ / actualFrequency
  : 1;

// Apply dilation to displayed phase
const visualPhase = isTimeDilated
  ? (actualPhase * dilationFactor) % 1
  : actualPhase;
```

**Pros:**
- Users can still see the waveform shape and behavior
- Intuitive - matches how oscilloscopes work
- Non-destructive - actual LFO behavior unchanged

**Cons:**
- Requires clear UI indicator to avoid confusion
- Visual phase position doesn't match actual phase position

**User indication options:**
- Badge: "2x" or "SLOW" indicator next to visualizer
- Different phase indicator color (e.g., yellow instead of white)
- Pulsing/animated border around the visualizer
- Text label: "Visualization slowed 32x"

---

### Solution 2: Freeze-Frame / Snapshot Mode

**Concept:** At high speeds, show a static waveform with no phase animation, but display frequency/cycle information prominently.

**How it works:**
1. When LFO exceeds threshold, stop animating the phase indicator
2. Keep the static waveform visible
3. Display frequency (e.g., "64 Hz") prominently
4. Optionally show a subtle "shimmer" or "blur" effect to indicate high-speed activity

**Implementation:**
```typescript
const showPhaseAnimation = cycleTimeMs > 100; // Only animate if > 100ms cycle

<LFOVisualizer
  showPhaseIndicator={showPhaseAnimation}
  // Show frequency badge when frozen
  showFrequencyBadge={!showPhaseAnimation}
/>
```

**Pros:**
- Very simple to implement
- Clean, non-confusing display
- Matches how many synth UIs work

**Cons:**
- Loses the "live" feel of the visualization
- Users might think the LFO is broken/stopped

---

### Solution 3: Envelope/Activity Indicator

**Concept:** Replace the precise phase indicator with an "activity" visualization that shows the LFO is running fast without trying to show exact position.

**How it works:**
1. At high speeds, replace the dot/line phase indicator with:
   - A glowing/pulsing effect across the waveform
   - A "blur trail" effect
   - An RMS-style activity meter
2. Keep the static waveform visible

**Visual options:**
- **Glow effect:** The entire waveform pulses or glows
- **Blur trail:** Instead of a single dot, show a semi-transparent trail
- **Activity bar:** A separate small bar showing "LFO activity level"

**Pros:**
- Clearly communicates that the LFO is active and fast
- Visually interesting
- Doesn't try to show impossible-to-perceive data

**Cons:**
- More complex to implement
- Loses the educational aspect of seeing the phase position

---

### Solution 4: Hybrid Approach (Most Comprehensive)

**Concept:** Combine multiple solutions with user control.

**Implementation:**
1. **Auto mode (default):**
   - Below 4 Hz: Normal real-time visualization
   - 4-16 Hz: Time-dilated visualization with indicator
   - Above 16 Hz: Freeze-frame with frequency display

2. **User toggle:** Let users choose:
   - "Real-time" (always show actual, even if jumpy)
   - "Smart" (auto-adjust based on speed)
   - "Freeze" (always static waveform)

**UI mockup:**
```
[Visualizer]
+------------------------------------------+
|  [SLOW 8x]              SPD: 48  MULT: 256|
|                                           |
|     ~~~waveform with animated phase~~~    |
|                                           |
|  Cycle: 5.2ms  |  192 Hz  |  1/16 note   |
+------------------------------------------+
        [REAL] [SMART] [FREEZE]  <- toggle
```

---

## Recommended Implementation Plan

### Phase 1: Core Time-Dilation (MVP)

**Goal:** Implement basic time-dilation that "just works" without user configuration.

**Files to modify:**
1. `/src/components/lfo/LFOVisualizer.tsx` - Add dilated phase calculation
2. `/src/components/lfo/PhaseIndicator.tsx` - Accept dilated phase
3. `/src/components/lfo/OutputValueDisplay.tsx` - Show dilated output or freeze
4. `/src/components/lfo/types.ts` - Add new props
5. `/app/(home)/index.tsx` - Calculate and pass dilation factor

**New props for LFOVisualizer:**
```typescript
interface LFOVisualizerProps {
  // ... existing props

  /**
   * Frequency in Hz for determining visualization mode.
   * If > threshold, visualization will be time-dilated or frozen.
   */
  frequencyHz?: number;

  /**
   * Visualization speed mode
   * - 'auto': Automatically adjust based on frequency (default)
   * - 'realtime': Always show real-time (may be jumpy)
   * - 'freeze': Always show static waveform
   */
  visualizationMode?: 'auto' | 'realtime' | 'freeze';
}
```

**Implementation steps:**

1. **Add frequency calculation to home screen:**
```typescript
// In app/(home)/index.tsx
const [timingInfo, setTimingInfo] = useState({
  cycleTimeMs: 0,
  noteValue: '',
  frequencyHz: 0, // Add this
});
```

2. **Calculate dilated phase in visualizer:**
```typescript
// New hook: useDilatedPhase.ts
export function useDilatedPhase(
  actualPhase: SharedValue<number>,
  frequencyHz: number,
  mode: 'auto' | 'realtime' | 'freeze'
): { phase: SharedValue<number>; isDilated: boolean; dilationFactor: number }
```

3. **Add time-dilation indicator component:**
```typescript
// New component: TimeDilationBadge.tsx
export function TimeDilationBadge({
  dilationFactor,
  isVisible
}: {
  dilationFactor: number;
  isVisible: boolean;
})
```

### Phase 2: Enhanced Indicators

**Goal:** Make it very clear when visualization is dilated.

**Options to implement:**
1. **Badge indicator:** "SLOW 8x" or "1/8 speed" badge
2. **Color change:** Phase indicator turns yellow/orange when dilated
3. **Border indicator:** Subtle animated border when in slow-mo mode

### Phase 3: User Controls (Optional)

**Goal:** Let advanced users choose their preference.

**Implementation:**
1. Add visualization mode toggle to settings or the visualizer itself
2. Persist preference to storage
3. Add to preset context or create separate visualization settings context

---

## Edge Cases and Considerations

### 1. Mode Transitions
When the user adjusts speed/multiplier, the LFO might cross the threshold repeatedly. Need smooth transitions:
- Use hysteresis (different thresholds for entering/exiting dilation mode)
- Animate the transition between modes

### 2. Different Waveforms
Random (RND) waveform behaves differently - it samples at discrete points. Time dilation might make it look different than expected. Consider:
- Showing actual random values even when dilated
- Or clearly indicating that random visualization is approximate

### 3. Trigger Modes (ONE, HLF, TRG)
These modes have specific phase behaviors. Dilation should:
- Still show the "shape" of one-shot/half behaviors
- Not interfere with understanding of trigger timing

### 4. Fade Envelope
When fade is applied, the output envelope changes over time. In dilated mode:
- Fade should also be dilated to match
- Or show fade at actual rate with note about dilation

### 5. BPM Sync
At very high BPMs with high multipliers, even "normal" LFOs can get fast. The threshold should potentially scale with BPM, or use frequency directly rather than just multiplier.

### 6. Performance
Time dilation adds calculation overhead. Ensure:
- Dilation factor calculation is memoized
- Only recalculate when relevant params change
- Use worklet-friendly code for smooth 60fps

---

## Testing Plan

### Unit Tests
1. Dilation factor calculation at various frequencies
2. Phase wrapping behavior with dilation
3. Mode transition logic (hysteresis)

### Visual Tests
1. Verify smooth animation at normal speeds
2. Verify readable animation when dilated
3. Verify indicator visibility/clarity
4. Test all waveform types at high speeds
5. Test trigger modes with dilation

### User Testing Questions
1. Is it obvious that visualization is slowed down?
2. Does the slowed visualization help understand the LFO behavior?
3. Is the dilation factor indicator clear and non-distracting?
4. Would you want to toggle this behavior?

---

## Implementation Timeline

| Phase | Description | Estimated Effort |
|-------|-------------|------------------|
| 1a | Add frequency to timing info | 30 min |
| 1b | Create useDilatedPhase hook | 2 hours |
| 1c | Integrate dilated phase into visualizer | 1 hour |
| 1d | Add basic dilation indicator badge | 1 hour |
| 2 | Enhanced indicators (color, border) | 2 hours |
| 3 | User toggle controls | 3 hours |
| Testing | All phases | 2 hours |

**Total estimated: 1-2 days**

---

## Appendix: Reference Calculations

### Frequency Thresholds

```typescript
// Suggested thresholds based on human perception
const THRESHOLDS = {
  // Below this: normal real-time visualization
  NORMAL_MAX_HZ: 4,

  // Below this: time-dilated visualization
  DILATE_MAX_HZ: 64,

  // Above this: freeze-frame mode
  FREEZE_MIN_HZ: 64,

  // Target visual frequency when dilated
  TARGET_VISUAL_HZ: 0.5, // 2-second cycle, very easy to follow
};

// Hysteresis to prevent mode flickering
const HYSTERESIS = {
  ENTER_DILATION: 4.5,  // Enter dilation at 4.5 Hz
  EXIT_DILATION: 3.5,   // Exit dilation at 3.5 Hz
};
```

### Dilation Factor Examples

| Actual Hz | Dilation Factor | Visual Cycle Time |
|-----------|-----------------|-------------------|
| 4 Hz      | 1x (no dilation)| 250ms            |
| 8 Hz      | 16x             | 2000ms           |
| 16 Hz     | 32x             | 2000ms           |
| 64 Hz     | 128x            | 2000ms           |
| 192 Hz    | 384x            | 2000ms           |

---

## Conclusion

The recommended approach is **Solution 4 (Hybrid)** with an MVP of **Solution 1 (Time-Dilation)**. This provides the best balance of:
- Maintaining the educational/intuitive feel of seeing the LFO animate
- Handling edge cases gracefully
- Not confusing users about actual LFO behavior
- Being implementable in a reasonable timeframe

The key success metric is: **Users can understand what the LFO is doing at any speed setting.**
