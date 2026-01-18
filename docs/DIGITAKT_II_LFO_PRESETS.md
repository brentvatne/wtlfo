# Digitakt II LFO Presets

This document contains 5 ready-to-use LFO preset configurations for the Digitakt II LFO Visualizer app. Each preset is designed for a specific musical use case with detailed parameter explanations and timing calculations.

---

## 1. Fade-In One-Shot

**Description:** A one-shot LFO that fades in modulation gradually on the first trigger, then stops. Perfect for intro swells, one-time filter sweeps, or gradual parameter reveals.

### Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| **WAVE** | RMP (Ramp) | Unipolar waveform (0 to +1), falls from max to min |
| **SPD** | 8.00 | Moderate speed |
| **MULT** | 16 | 16x tempo multiplier |
| **SPH** | 0 | Start at beginning of cycle |
| **MODE** | ONE | One-shot - runs once then stops |
| **DEP** | +63.00 | Full positive depth |
| **FADE** | -32 | Negative = fade IN (modulation starts at zero, increases to full) |

### Suggested Destination
- **FLTR > FREQ** (Filter Cutoff) - Creates a filter sweep that opens up once
- **AMP > VOL** (Volume) - Creates a volume swell
- **SRC > LVL** (Sample Level) - Fades in sample playback

### Timing Calculation

```
Product = |SPD| x MULT = 8 x 16 = 128
128 / 128 = 1 whole note (1 bar in 4/4)
```

At 120 BPM:
```
cycle_time_ms = (60000 / 120) x 4 x (128 / 128) = 500 x 4 x 1 = 2000ms (2 seconds)
```

### Why This Works

1. **ONE mode** ensures the LFO runs exactly once and stops - no continuous modulation
2. **Negative FADE (-32)** means the modulation effect fades IN over the course of the cycle
3. **RMP waveform** provides a smooth, predictable trajectory (starts high, ends low)
4. Combined with negative fade, you get a gradual increase in the falling ramp's influence
5. After one cycle completes, the LFO stops at its end position

### Tips

- Use longer cycles (lower SPD or MULT) for more dramatic, drawn-out swells
- Combine with a pad or sustained sound for maximum effect
- Stack with another LFO in HLF mode for even more complex one-shot envelopes
- Negative FADE values create a "building" effect as the modulation intensity increases

---

## 2. Ambient Drift

**Description:** An extremely slow, continuously evolving LFO for ambient and atmospheric textures. Takes multiple bars to complete one cycle, creating subtle movement that unfolds over time.

### Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| **WAVE** | SIN (Sine) | Smooth, natural modulation with no abrupt changes |
| **SPD** | 1.00 | Minimum positive speed for slowest movement |
| **MULT** | 1 | Lowest multiplier (1x tempo) |
| **SPH** | 0 | Start at zero-crossing (middle of sine) |
| **MODE** | FRE | Free-running - never restarts, continuous evolution |
| **DEP** | +24.00 | Moderate depth for subtle movement |
| **FADE** | 0 | No fade - immediate full depth |

### Suggested Destination
- **FLTR > FREQ** (Filter Cutoff) - Slowly sweeping filter
- **SRC > TUNE** (Pitch) - Very subtle pitch drift (use low depth!)
- **FX > REV** (Reverb Send) - Evolving reverb amount
- **AMP > PAN** (Panning) - Slow stereo movement

### Timing Calculation

```
Product = |SPD| x MULT = 1 x 1 = 1
128 / 1 = 128 whole notes per cycle
```

At 120 BPM:
```
cycle_time_ms = (60000 / 120) x 4 x (128 / 1) = 500 x 4 x 128 = 256,000ms
256 seconds = 4 minutes 16 seconds per complete cycle!
```

This means:
- **128 bars** to complete one full cycle
- At typical 4-bar or 8-bar patterns, the LFO takes 16-32 pattern repetitions to cycle

### Why This Works

1. **Lowest possible SPD x MULT product (1)** creates the longest possible tempo-synced cycle
2. **FRE mode** ensures continuous, uninterrupted evolution regardless of triggers
3. **SIN waveform** provides the smoothest possible modulation with no sudden changes
4. **Moderate depth (+24)** creates noticeable but not overwhelming movement
5. The result is modulation so slow you barely notice it changing moment-to-moment

### Tips

- Perfect for long-form ambient pieces or live performances
- Layer multiple tracks with this preset at different start phases for complex evolving textures
- Use with reverb/delay sends for sounds that "breathe" over time
- Consider using the fixed 120 BPM variant (1.) if you plan tempo changes
- Adjust DEP based on destination - use very low values (5-10) for pitch modulation

---

## 3. Hi-Hat Humanizer

**Description:** Adds natural-feeling variation to hi-hat patterns using random modulation. Creates the subtle inconsistencies that make programmed beats feel more human and alive.

### Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| **WAVE** | RND (Random) | Sample-and-hold random values |
| **SPD** | 32.00 | Fast enough for 16th note changes |
| **MULT** | 64 | 64x tempo multiplier |
| **SPH** | 0 | Start phase (less relevant for random) |
| **MODE** | FRE | Free-running for continuous variation |
| **DEP** | +12.00 | Subtle depth - humanization should be felt, not heard |
| **FADE** | 0 | No fade |

### Suggested Destination
- **AMP > VOL** (Volume) - Random velocity variation (most common use)
- **SRC > TUNE** (Pitch) - Subtle pitch variation
- **SRC > STRT** (Sample Start) - Different attack characteristics per hit
- **AMP > PAN** (Panning) - Subtle stereo variation

### Timing Calculation

```
Product = |SPD| x MULT = 32 x 64 = 2048
2048 / 128 = 16 (LFO cycles 16x per bar)
```

Since RND waveform changes values ~8x more frequently than other waveforms:
```
Effective changes per bar = 16 x 8 = 128 random values per bar
```

At 16th note hi-hats (16 hits per bar), you get approximately **8 random value changes per hi-hat hit**, ensuring each hit gets unique character while maintaining some consistency within each hit.

At 120 BPM:
```
cycle_time_ms = (60000 / 120) x 4 x (128 / 2048) = 500 x 4 x 0.0625 = 125ms per cycle
Random changes every ~15.6ms (125ms / 8 steps)
```

### Why This Works

1. **RND waveform** generates unpredictable values, mimicking natural human inconsistency
2. **FRE mode** keeps variations continuous and independent of triggers
3. **Low depth (+12)** ensures variations are subtle - you want "human feel," not chaos
4. The timing aligns with 16th note subdivisions for musically relevant variation
5. Each hi-hat hit receives slightly different modulation values

### Tips

- Keep depth LOW (8-16 range) - too much randomization sounds broken, not human
- For volume humanization, this creates velocity variation similar to real drummer inconsistency
- Apply to STRT (sample start) for timbral variation - different attack transients per hit
- Works great on other percussion too: shakers, tambourines, rides
- Consider using TRG mode if you want each hit to get a fresh random value on trigger

---

## 4. Pumping Sidechain

**Description:** Recreates the classic "pumping" effect heard in electronic dance music, where the track ducks in volume on each beat as if being compressed by a kick drum.

### Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| **WAVE** | EXP (Exponential) | Unipolar, accelerating curve - mimics compressor release |
| **SPD** | 32.00 | Speed for 1/4 note cycle |
| **MULT** | 4 | 4x tempo multiplier |
| **SPH** | 0 | Start at beginning (minimum value) |
| **MODE** | TRG | Trigger - restarts on each note/beat |
| **DEP** | -63.00 | NEGATIVE depth - inverts the curve for ducking effect |
| **FADE** | 0 | No fade |

### Suggested Destination
- **AMP > VOL** (Volume) - Classic sidechain ducking
- **FLTR > FREQ** (Filter Cutoff) - "Pumping filter" effect
- **SRC > LVL** (Sample Level) - Alternative volume control

### Timing Calculation

```
Product = |SPD| x MULT = 32 x 4 = 128
128 / 128 = 1 whole note per cycle
```

**However**, in TRG mode, the LFO restarts on each trigger. If you trigger on every beat (quarter notes), you effectively get:
```
1 whole note / 4 beats = 1/4 note per "pumping" cycle
```

At 120 BPM:
```
cycle_time_ms = (60000 / 120) x 4 x (128 / 128) = 2000ms full cycle
Per quarter note trigger: 2000ms / 4 = 500ms pump recovery time
```

### Why This Works

1. **EXP waveform** starts at 0, accelerates toward 1 - this mimics a compressor's release curve
2. **Negative DEP (-63)** inverts the effect: starts at FULL attenuation, recovers to normal
3. **TRG mode** restarts the "recovery" on each beat, creating the rhythmic pump
4. The exponential curve sounds more natural than linear because real compressors have nonlinear release characteristics
5. Result: Volume drops instantly on trigger, then "swells" back up before the next beat

### Tips

- Place triggers on beat 1 of each bar, or on every quarter note for constant pumping
- For half-time feel, use SPD=16 and MULT=4 (or trigger every 2 beats)
- Adjust SPD for different "tightness" - higher values = faster recovery
- Apply to bass, pads, or full mix bus for different characters
- Combine with actual kick drum triggers for true sidechain-style ducking
- For eighth note pumping, double the product: SPD=32, MULT=8 (or trigger on eighths)

---

## 5. Wobble Bass

**Description:** The classic dubstep/bass music wobble effect - a rhythmic, tempo-synced filter modulation that creates the characteristic "wub wub" sound.

### Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| **WAVE** | SIN (Sine) | Smooth, round wobble character |
| **SPD** | 16.00 | Base speed for easy note division math |
| **MULT** | 8 | 8x tempo multiplier |
| **SPH** | 32 | Start at peak (90 degrees) - filter starts open |
| **MODE** | TRG | Trigger - restarts on each bass note |
| **DEP** | +48.00 | Strong depth for dramatic filter sweep |
| **FADE** | 0 | No fade |

### Suggested Destination
- **FLTR > FREQ** (Filter Cutoff) - THE classic wobble target
- **FLTR > RESO** (Resonance) - Add some for extra squelch

### Timing Calculation

```
Product = |SPD| x MULT = 16 x 8 = 128
128 / 128 = 1 whole note (1 bar) per cycle
```

This gives you a **1-bar wobble** - the filter sweeps through one complete cycle per bar.

At 120 BPM:
```
cycle_time_ms = (60000 / 120) x 4 x 1 = 2000ms per cycle
```

### Common Wobble Variations

| Rhythm | SPD | MULT | Product | Result |
|--------|-----|------|---------|--------|
| 1 bar | 16 | 8 | 128 | 1 wobble per bar |
| 1/2 note | 16 | 16 | 256 | 2 wobbles per bar |
| 1/4 note | 16 | 32 | 512 | 4 wobbles per bar |
| 1/8 note | 32 | 32 | 1024 | 8 wobbles per bar |
| 1/16 note | 32 | 64 | 2048 | 16 wobbles per bar |

### Why This Works

1. **SIN waveform** creates the smooth, rounded wobble character (vs. harsher square/saw)
2. **SPH=32 (90 degrees)** starts the filter at its peak/open position on trigger
3. **TRG mode** ensures the wobble resets with each bass note, staying rhythmically locked
4. **Strong depth (+48)** creates dramatic filter sweeps for maximum "wub"
5. The 1-bar cycle provides a foundational wobble that can be easily adjusted

### Tips

- Use TRI (triangle) waveform for a more aggressive, "sharper" wobble character
- Modulate MULT with another LFO for evolving wobble speeds (LFO2 > LFO1 MULT)
- Start with filter cutoff around 40-60% so there's room to sweep both directions
- Add resonance (RESO) around 40-60 for extra "squelch" on the wobble peaks
- For live performance, map SPD or MULT to a knob to change wobble speed on the fly
- Classic dubstep often alternates between 1/4, 1/8, and 1/16 note wobbles within a track
- Use SPH=96 (270 degrees) to start with filter CLOSED instead of open

---

## Quick Reference Table

| Preset | WAVE | SPD | MULT | SPH | MODE | DEP | FADE | Cycle Length |
|--------|------|-----|------|-----|------|-----|------|--------------|
| Fade-In One-Shot | RMP | 8 | 16 | 0 | ONE | +63 | -32 | 1 bar |
| Ambient Drift | SIN | 1 | 1 | 0 | FRE | +24 | 0 | 128 bars |
| Hi-Hat Humanizer | RND | 32 | 64 | 0 | FRE | +12 | 0 | 1/16 note |
| Pumping Sidechain | EXP | 32 | 4 | 0 | TRG | -63 | 0 | 1 bar (per trigger) |
| Wobble Bass | SIN | 16 | 8 | 32 | TRG | +48 | 0 | 1 bar |

---

## Formula Reference

**Cycle Duration:**
```
product = |SPD| x MULT
if product > 128: note_value = product / 128 (fraction of whole note)
if product < 128: whole_notes = 128 / product (multiple whole notes)
if product = 128: exactly 1 whole note (1 bar in 4/4)
```

**Time in Milliseconds:**
```
cycle_time_ms = (60000 / BPM) x 4 x (128 / product)
```

**Phase to Degrees:**
```
degrees = (SPH / 128) x 360
```
