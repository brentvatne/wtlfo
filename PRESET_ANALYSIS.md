# LFO Preset Analysis

Analysis of presets in `/src/data/presets.ts` for educational value, practical utility, and completeness.

---

## Current Preset Inventory

| # | Name | Waveform | Mode | Speed | Mult | Depth | Fade | Destination |
|---|------|----------|------|-------|------|-------|------|-------------|
| 1 | Init | SIN | FRE | 48 | 2 | +47 | 0 | Filter Cutoff |
| 2 | Wobble Bass | SIN | TRG | 16 | 8 | +48 | 0 | Filter Cutoff |
| 3 | Ambient Drift | SIN | FRE | 1 | 1 | +24 | 0 | Pan |
| 4 | Hi-Hat Humanizer | RND | FRE | 32 | 64 | +12 | 0 | Volume |
| 5 | Pumping Sidechain | EXP | TRG | 32 | 4 | -63 | 0 | Volume |
| 6 | Fade-In One-Shot | RMP | ONE | 8 | 16 | +63 | -32 | Filter Cutoff |

**Total: 6 presets**

---

## 1. Preset Variety Analysis

### Waveform Coverage

| Waveform | Count | Represented |
|----------|-------|-------------|
| TRI (Triangle) | 0 | NO |
| SIN (Sine) | 3 | YES |
| SQR (Square) | 0 | NO |
| SAW (Sawtooth) | 0 | NO |
| EXP (Exponential) | 1 | YES |
| RMP (Ramp) | 1 | YES |
| RND (Random) | 1 | YES |

**Finding:** Only 4 of 7 waveforms are used. Missing TRI, SQR, and SAW - three fundamental waveforms that are staples of LFO modulation.

### Mode Coverage

| Mode | Count | Represented |
|------|-------|-------------|
| FRE (Free) | 3 | YES |
| TRG (Trigger) | 2 | YES |
| HLD (Hold) | 0 | NO |
| ONE (One-shot) | 1 | YES |
| HLF (Half) | 0 | NO |

**Finding:** Missing HLD and HLF modes. HLD (Hold/Sample-and-Hold) is particularly important for demonstrating random stepped modulation. HLF (Half) is useful for one-direction envelope effects.

### Speed/Multiplier Range

| Category | Coverage |
|----------|----------|
| Very Slow (MULT 1-2) | YES (Ambient Drift: 1/1) |
| Medium (MULT 4-16) | YES (Wobble Bass: 16/8, Fade-In: 8/16, Sidechain: 32/4) |
| Fast (MULT 32-128) | YES (Hi-Hat: 32/64) |
| Audio Rate (MULT 256-2k) | NO |

**Finding:** No audio-rate presets demonstrating very fast modulation. The Digitakt II supports up to MULT=2k (2048x) which can create FM-like effects at high BPMs.

### Depth Range

- Positive depths only: 5 presets
- Negative depth: 1 preset (Pumping Sidechain)
- No zero-crossing demonstrations

**Finding:** Good use of negative depth for sidechain, but no preset demonstrates depth modulation from positive to negative for educational comparison.

---

## 2. Educational Value Analysis

### Concepts Demonstrated

| Concept | Preset | Quality |
|---------|--------|---------|
| Basic LFO modulation | Init | Good starting point |
| Triggered vs Free running | Wobble Bass vs Ambient Drift | Good comparison |
| Slow modulation | Ambient Drift | Good |
| Random/S&H | Hi-Hat Humanizer | Good |
| Negative depth (inverted) | Pumping Sidechain | Good |
| One-shot envelope | Fade-In One-Shot | Good |
| Fade parameter | Fade-In One-Shot | Only example |

### Concepts NOT Demonstrated

1. **Triangle wave characteristics** - Fundamental waveform, missing entirely
2. **Square wave gating** - Classic rhythmic effect, not shown
3. **Sawtooth risers/fallers** - Common in electronic music
4. **HLD mode (Sample & Hold)** - Key for random stepped values
5. **HLF mode (Half cycle)** - Useful for single-direction sweeps
6. **Phase offset usage** - Only Init uses non-zero phase (32)
7. **Fade OUT** - Only Fade IN is shown
8. **Very slow LFOs** - For ambient evolution (multi-bar cycles)
9. **Pitch modulation** - No vibrato/pitch wobble presets
10. **Delay/Reverb send modulation** - Common mix automation
11. **Fixed BPM mode** - All presets use synced BPM

### Beginner-Friendliness

**Strengths:**
- Init preset provides a sensible starting point
- Wobble Bass is immediately recognizable and satisfying
- Names are evocative of the sound

**Weaknesses:**
- No "Classic Vibrato" preset for beginners to understand pitch modulation
- No simple "Tremolo" preset (volume modulation with triangle/sine)
- Jump from Init to specialized presets is steep
- No preset specifically demonstrates "what each waveform sounds like"

### Advanced Technique Gaps

Missing advanced presets for:
- LFO cross-modulation concepts (though app may not support this yet)
- Polyrhythmic modulation (unusual speed/mult combinations)
- Extreme parameter sweeps
- Stutter/gating effects

---

## 3. Practical Utility Analysis

### Real-World Production Value

| Preset | Production Use Case | Rating |
|--------|---------------------|--------|
| Init | Starting point for tweaking | 3/5 |
| Wobble Bass | Dubstep/bass music | 5/5 |
| Ambient Drift | Ambient/pad movement | 4/5 |
| Hi-Hat Humanizer | Drum humanization | 5/5 |
| Pumping Sidechain | EDM sidechain effect | 5/5 |
| Fade-In One-Shot | Filter builds | 4/5 |

### Common Elektron Use Cases

| Use Case | Covered | Notes |
|----------|---------|-------|
| Filter wobble | YES | Wobble Bass |
| Sidechain pumping | YES | Pumping Sidechain |
| Subtle humanization | YES | Hi-Hat Humanizer |
| Auto-pan | YES | Ambient Drift |
| Vibrato | NO | Missing pitch modulation |
| Tremolo | NO | Missing volume sine/tri |
| Filter envelope | PARTIAL | One-shot only |
| Rhythmic gating | NO | No square wave preset |
| Riser/sweep builds | PARTIAL | Only fade-in |
| Sample start modulation | NO | Interesting Digitakt feature |

### Missing Common Patterns

1. **Vibrato** - Subtle pitch modulation, essential for synths/samples
2. **Tremolo** - Classic volume modulation (think: old guitar amps)
3. **Rhythmic Gating** - Square wave on volume for stutter effects
4. **16th Note Filter** - Synced filter movement for rhythmic patterns
5. **Dub Delay Send** - Modulating delay send for spatial movement
6. **Lo-Fi Wobble** - Pitch + filter for tape/vinyl character
7. **Parameter Lock Style** - Fast random for per-step variation

---

## 4. Preset Naming Analysis

### Current Names

| Name | Descriptive? | Indicates Sound? | Rating |
|------|--------------|------------------|--------|
| Init | Neutral starting point | N/A | 3/5 |
| Wobble Bass | Yes, clear | Yes, "wobble" | 5/5 |
| Ambient Drift | Yes, evocative | Yes, "drift" | 5/5 |
| Hi-Hat Humanizer | Yes, clear purpose | Yes, randomization | 5/5 |
| Pumping Sidechain | Yes, exact effect | Yes, "pumping" | 5/5 |
| Fade-In One-Shot | Technical but clear | Partial | 4/5 |

**Overall:** Naming is strong. Names communicate both the technique and the sonic result.

### Naming Recommendations for New Presets

- Use format: `[Effect/Sound] [Context]` e.g., "Vibrato Lead", "Tremolo Guitar"
- Include speed indicator if relevant: "Slow Pan Sweep", "Fast Gate"
- Be genre-specific when applicable: "Techno Pump", "Dub Space"

---

## 5. Recommended New Presets

### Priority 1: Fill Waveform Gaps

```typescript
{
  name: 'Classic Vibrato',
  config: {
    waveform: 'TRI',
    speed: 24,
    multiplier: 16,
    useFixedBPM: false,
    startPhase: 0,
    mode: 'FRE',
    depth: 8,
    fade: 0,
  },
  destination: 'pitch',
  centerValue: 0,
},
{
  name: 'Rhythmic Gate',
  config: {
    waveform: 'SQR',
    speed: 32,
    multiplier: 8,
    useFixedBPM: false,
    startPhase: 0,
    mode: 'TRG',
    depth: -64,
    fade: 0,
  },
  destination: 'volume',
  centerValue: 100,
},
{
  name: 'Rising Filter',
  config: {
    waveform: 'SAW',
    speed: 16,
    multiplier: 4,
    useFixedBPM: false,
    startPhase: 0,
    mode: 'TRG',
    depth: 48,
    fade: 0,
  },
  destination: 'filter_cutoff',
  centerValue: 64,
},
```

### Priority 2: Fill Mode Gaps

```typescript
{
  name: 'Random Steps',
  config: {
    waveform: 'RND',
    speed: 32,
    multiplier: 8,
    useFixedBPM: false,
    startPhase: 0,
    mode: 'HLD',
    depth: 32,
    fade: 0,
  },
  destination: 'pitch',
  centerValue: 0,
},
{
  name: 'Half Sweep',
  config: {
    waveform: 'SIN',
    speed: 16,
    multiplier: 4,
    useFixedBPM: false,
    startPhase: 0,
    mode: 'HLF',
    depth: 48,
    fade: 0,
  },
  destination: 'filter_cutoff',
  centerValue: 32,
},
```

### Priority 3: Common Production Patterns

```typescript
{
  name: 'Smooth Tremolo',
  config: {
    waveform: 'SIN',
    speed: 24,
    multiplier: 8,
    useFixedBPM: false,
    startPhase: 64,
    mode: 'FRE',
    depth: 24,
    fade: 0,
  },
  destination: 'volume',
  centerValue: 90,
},
{
  name: 'Dub Delay Throw',
  config: {
    waveform: 'RMP',
    speed: 8,
    multiplier: 2,
    useFixedBPM: false,
    startPhase: 0,
    mode: 'ONE',
    depth: 63,
    fade: 0,
  },
  destination: 'delay_send',
  centerValue: 0,
},
{
  name: 'Slow Evolution',
  config: {
    waveform: 'TRI',
    speed: 2,
    multiplier: 1,
    useFixedBPM: false,
    startPhase: 0,
    mode: 'FRE',
    depth: 32,
    fade: 0,
  },
  destination: 'filter_cutoff',
  centerValue: 80,
},
{
  name: '16th Note Pulse',
  config: {
    waveform: 'SQR',
    speed: 32,
    multiplier: 16,
    useFixedBPM: false,
    startPhase: 0,
    mode: 'FRE',
    depth: 48,
    fade: 0,
  },
  destination: 'filter_cutoff',
  centerValue: 64,
},
{
  name: 'Fade Out Swell',
  config: {
    waveform: 'SIN',
    speed: 8,
    multiplier: 8,
    useFixedBPM: false,
    startPhase: 0,
    mode: 'TRG',
    depth: 48,
    fade: 32,
  },
  destination: 'filter_cutoff',
  centerValue: 100,
},
```

### Priority 4: Educational Contrast Presets

```typescript
{
  name: 'Fast Modulation',
  config: {
    waveform: 'SIN',
    speed: 64,
    multiplier: 128,
    useFixedBPM: false,
    startPhase: 0,
    mode: 'FRE',
    depth: 32,
    fade: 0,
  },
  destination: 'pitch_fine',
  centerValue: 0,
},
{
  name: 'Fixed Tempo LFO',
  config: {
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    useFixedBPM: true, // Key difference: uses fixed 120 BPM
    startPhase: 0,
    mode: 'FRE',
    depth: 48,
    fade: 0,
  },
  destination: 'filter_cutoff',
  centerValue: 64,
},
```

---

## 6. Summary of Recommendations

### Immediate Additions (High Impact)

1. **Classic Vibrato** (TRI, pitch) - Fill waveform gap, beginner-friendly
2. **Rhythmic Gate** (SQR, volume) - Fill waveform gap, common technique
3. **Rising Filter** (SAW, filter) - Fill waveform gap, production staple
4. **Random Steps** (HLD mode) - Fill mode gap, educational
5. **Smooth Tremolo** (SIN, volume) - Missing basic effect

### Secondary Additions (Complete Coverage)

6. **Half Sweep** (HLF mode) - Fill mode gap
7. **Dub Delay Throw** (delay_send) - New destination type
8. **Slow Evolution** (very slow) - Ambient technique
9. **Fade Out Swell** (fade out) - Currently no fade-out preset
10. **Fixed Tempo LFO** (useFixedBPM: true) - Demonstrate this feature

### Stretch Goals

11. **16th Note Pulse** - Rhythmic production staple
12. **Fast Modulation** - Near-audio-rate demonstration
13. **Sample Start Wobble** - Unique Digitakt feature
14. **Lo-Fi Tape Wobble** - Genre-specific character preset

---

## 7. Preset Organization Suggestion

Consider organizing presets into categories for better UX:

```
BASICS
- Init
- Classic Vibrato
- Smooth Tremolo

RHYTHMIC
- Wobble Bass
- Rhythmic Gate
- 16th Note Pulse
- Pumping Sidechain

MOVEMENT
- Ambient Drift
- Slow Evolution
- Rising Filter

ONE-SHOTS & ENVELOPES
- Fade-In One-Shot
- Fade Out Swell
- Half Sweep
- Dub Delay Throw

RANDOMIZATION
- Hi-Hat Humanizer
- Random Steps

ADVANCED
- Fast Modulation
- Fixed Tempo LFO
```

---

## Conclusion

The current preset collection is small but thoughtfully designed. Each preset serves a clear purpose and demonstrates a useful technique. However, with only 6 presets, there are significant gaps in waveform, mode, and destination coverage.

**Key metrics:**
- Waveform coverage: 4/7 (57%)
- Mode coverage: 3/5 (60%)
- Destination variety: 3/18 (17%)

Adding 10-14 presets as recommended above would create a comprehensive learning tool that covers all fundamental LFO concepts while providing practical, production-ready starting points for Elektron users.
