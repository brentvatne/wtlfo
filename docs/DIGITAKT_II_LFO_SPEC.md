# Elektron Digitakt II LFO Specification

## Overview

This document provides a complete technical specification for implementing an LFO visualizer app that replicates the behavior of the Elektron Digitakt II's Low Frequency Oscillators. The Digitakt II features **3 LFOs per track**, a significant upgrade from the original Digitakt's single LFO per track.

## LFO Architecture

### Audio Tracks: Three LFOs Per Track
- **LFO1**: Can be modulated by LFO2 and LFO3
- **LFO2**: Can be modulated by LFO3; can modulate LFO1
- **LFO3**: Can modulate both LFO1 and LFO2

This hierarchical structure allows for complex modulation chains where LFOs can modulate other LFOs' parameters.

### MIDI Tracks: Two LFOs Per Track
- MIDI tracks only have **LFO1** and **LFO2** (no LFO3)
- Cross-modulation: LFO2 can modulate LFO1

> **Note:** This app focuses on the Audio Track LFO system with all 3 LFOs.

---

## LFO Parameters

### 1. WAVE (Waveform)

**Available Waveforms:**

| Waveform | Polarity | Description |
|----------|----------|-------------|
| **TRI** (Triangle) | Bipolar | Symmetrical rising and falling linear ramps. Starts at zero, rises to max, falls through zero to min, returns to zero. |
| **SIN** (Sine) | Bipolar | Smooth, rounded waveform. Natural-sounding modulation with no abrupt changes. |
| **SQR** (Square) | Bipolar | Alternates instantly between maximum and minimum values. Creates rhythmic on/off modulation. |
| **SAW** (Sawtooth) | Bipolar | Rises linearly from min to max, then instantly resets. Creates "rising" modulation character. |
| **EXP** (Exponential) | Unipolar | Non-linear curve that accelerates. Stays at minimum, then rapidly rises to maximum. Good for percussive/attack-like modulation. |
| **RMP** (Ramp) | Unipolar | Falls linearly from max to min (opposite of sawtooth). Creates "falling" modulation character. |
| **RND** (Random) | Bipolar | Sample-and-hold style. Generates random values at each cycle point. Changes approximately 16x more frequently than standard waveforms at equivalent speed settings (source: Elektronauts forum research). |

**Polarity Explanation:**
- **Bipolar**: Output swings between -1.0 and +1.0 (centered at 0)
- **Unipolar**: Output ranges from 0.0 to +1.0 (no negative values)

**Visual Waveform Shapes (normalized to 0-1 for phase, assuming SPH=0):**

> Note: These diagrams show waveforms starting from Phase=0. The actual starting point depends on the SPH (Start Phase) parameter setting.

```
TRIANGLE (TRI):
    /\      Phase 0.0-0.25: Rise from 0 to +1
   /  \     Phase 0.25-0.75: Fall from +1 to -1
  /    \    Phase 0.75-1.0: Rise from -1 to 0
 /      \

SINE (SIN):
  .-""-.    Smooth sinusoidal curve
 /      \   y = sin(phase * 2 * PI)
|        |
 \      /
  `-__-'

SQUARE (SQR):
 ┌──────┐     Phase 0.0-0.5: +1
 │      │     Phase 0.5-1.0: -1
─┘      └──   Instant transitions

SAWTOOTH (SAW):
      /|      Rises linearly from -1 to +1
     / |      Then instantly resets to -1
    /  |
   /   |
  /    |

EXPONENTIAL (EXP):
        ┌     Unipolar (0 to +1)
       /      Starts slow, accelerates toward max
     _/       y = (e^(phase * k) - 1) / (e^k - 1)
____/         where k controls curve steepness

RAMP (RMP):
|\            Unipolar (0 to +1)
| \           Falls linearly from +1 to 0
|  \          Then instantly resets to +1
|   \
|    \_

RANDOM (RND):
 ┌─┐ ┌───┐    Random values held until next step
 │ │ │   │    New random value at each cycle division
─┘ └─┘   └─   (sample-and-hold behavior)
```

---

### 2. SPD (Speed)

**Range:** -64.00 to +63.00 (with fine resolution of 0.01 increments)

**Behavior:**
- Controls how fast the LFO cycles
- **Positive values**: LFO plays forward
- **Negative values**: LFO plays backward (inverted phase direction)
- The value represents "phase steps per musical division" when combined with MULT

**Recommended values for beat sync:**
- 8, 16, or 32 work well for rhythmic modulation

**Note:** The Digitakt hardware range only goes to +63 (not +64), which is a known quirk that affects certain timing calculations. This asymmetry (-64 to +63) also applies to the DEP and FADE parameters.

**Workaround for perfect sync:** Setting SPD to -64 with SPH (phase) set to 127 can compensate for this asymmetry, making multiplier values correspond directly to note lengths.

---

### 3. MULT (Multiplier)

**Available Values:**

| Value | Type | Description |
|-------|------|-------------|
| **1** | BPM | 1× project tempo |
| **2** | BPM | 2× project tempo |
| **4** | BPM | 4× project tempo |
| **8** | BPM | 8× project tempo |
| **16** | BPM | 16× project tempo |
| **32** | BPM | 32× project tempo |
| **64** | BPM | 64× project tempo |
| **128** | BPM | 128× project tempo |
| **256** | BPM | 256× project tempo |
| **512** | BPM | 512× project tempo |
| **1k** | BPM | 1024× project tempo |
| **2k** | BPM | 2048× project tempo |

**Fixed 120 BPM Variants:**
Each multiplier also has a "dot" variant (displayed with a dot suffix) that locks the LFO to a fixed 120 BPM reference instead of following the project tempo. This is useful when you want consistent LFO timing regardless of tempo changes.

| Value | Description |
|-------|-------------|
| **1.** | 1× fixed 120 BPM |
| **2.** | 2× fixed 120 BPM |
| **4.** | 4× fixed 120 BPM |
| ... | (continues for all values) |
| **2k.** | 2048× fixed 120 BPM |

---

### 4. SPH / PHASE (Start Phase)

**Range:** 0 to 127

**Behavior:**
- Sets the starting point within the waveform cycle when the LFO is triggered
- The waveform is divided into 128 discrete phase positions

| Value | Position |
|-------|----------|
| 0 | Beginning of cycle (0°) |
| 32 | Quarter cycle (90°) |
| 64 | Middle of cycle (180°) |
| 96 | Three-quarters (270°) |
| 127 | End of cycle (~360°) |

**Conversion:** `degrees = (phase_value / 128) * 360`

---

### 5. MODE (Trigger Mode)

| Mode | Name | Behavior |
|------|------|----------|
| **FRE** | Free | Default mode. LFO runs continuously and never restarts, regardless of note triggers. The LFO maintains its position in the cycle at all times. |
| **TRG** | Trigger | LFO restarts from the start phase position each time a note is triggered. |
| **HLD** | Hold | LFO runs freely in the background, but when a note triggers, the current LFO output value is sampled and held until the next trigger. Creates sample-and-hold effects. |
| **ONE** | One-shot | LFO starts at the trigger, runs through ONE complete cycle, then stops at the end position. Functions like an envelope generator. |
| **HLF** | Half | LFO starts at the trigger, runs to the MIDDLE of the cycle (phase 64), then stops. Useful for single-direction sweeps. |

---

### 6. DEP (Depth)

**Range:** -64.00 to +63.00 (with fine resolution)

**Behavior:**
- Controls the intensity and polarity of LFO modulation
- **0.00**: No modulation (LFO has no effect, but LFO continues running internally)
- **Positive values**: Normal modulation direction, amplitude scaled by depth/63
- **Negative values**: Inverted modulation direction, amplitude scaled by |depth|/63

**Calculation:**
```
modulation_output = lfo_value * (depth / 63.0)
```

Where `lfo_value` is the raw LFO output (-1 to +1 for bipolar, 0 to +1 for unipolar).

#### Depth Scaling and Inversion

**Key insight:** Waveform shapes do NOT change with depth - only amplitude and polarity change. The depth parameter acts as a linear scaling factor with sign-based inversion.

**Bipolar Waveforms (TRI, SIN, SQR, SAW, RND):**

| Waveform | depth=+63 | depth=0 | depth=-63 |
|----------|-----------|---------|-----------|
| **TRI** | -1→+1→-1 (normal) | 0 | +1→-1→+1 (inverted) |
| **SIN** | Standard sine (±1) | 0 | Inverted sine (±1) |
| **SQR** | +1 / -1 pulse | 0 | -1 / +1 pulse |
| **SAW** | -1→+1 rising | 0 | +1→-1 falling |
| **RND** | ±1 random steps | 0 | ±1 inverted random |

**Unipolar Waveforms (EXP, RMP):**

These waveforms output 0 to +1 in their raw form. With negative depth, they extend into negative territory:

| Waveform | depth=+63 | depth=0 | depth=-63 |
|----------|-----------|---------|-----------|
| **EXP** | 0→+1 curve | 0 | 0→-1 inverted curve |
| **RMP** | +1→0 linear | 0 | -1→0 inverted linear |

**Practical Example - SAW waveform:**
- Raw SAW outputs -1 to +1 (rising)
- With depth=+63: Output is -1 to +1 (rising sawtooth)
- With depth=-63: Output is +1 to -1 (falling sawtooth)
- The Elektron manual diagram showing a "falling" SAW is displaying SAW with negative depth

**Note on Asymmetry:** The depth range is -64 to +63 (not -63 to +63). This means negative depth can reach slightly higher magnitude than positive. With depth=-64, the scaling factor is -64/63 ≈ -1.016, which produces output slightly greater than 1.0 in magnitude.

---

### 7. FADE (Fade In/Out)

**Range:** -64 to +63

**Behavior:**
- Controls gradual introduction or removal of LFO modulation over time
- **Negative values (-64 to -1)**: Fade IN - modulation starts at zero and gradually increases to full depth
- **0**: No fade - modulation is immediately at full depth
- **Positive values (+1 to +63)**: Fade OUT - modulation starts at full depth and gradually decreases to zero

**Timing:** The fade time is relative to the LFO cycle time. Higher absolute values = faster fade.

---

## LFO Timing Mathematics

### Core Concept
The LFO system uses 128 phase steps to represent one complete cycle. The Speed and Multiplier parameters together determine how many phase steps advance per bar.

### Timing Formula

```
phase_steps_per_bar = |SPD| × MULT
```

### Calculating Note Length

**Step 1:** Calculate the product: `SPD × MULT`

**Step 2:** Determine cycle duration:
- If product > 128: `note_length = product / 128` (results in fractions of a whole note)
- If product < 128: `whole_notes = 128 / product` (results in multiple whole notes)
- If product = 128: Exactly 1 whole note (1 bar in 4/4)

### Examples

| SPD | MULT | Product | Calculation | Result |
|-----|------|---------|-------------|--------|
| 32 | 64 | 2048 | 2048 ÷ 128 = 16 | 1/16th note per cycle |
| 16 | 8 | 128 | 128 ÷ 128 = 1 | 1 whole note per cycle |
| 4 | 2 | 8 | 128 ÷ 8 = 16 | 16 whole notes per cycle |
| 8 | 16 | 128 | = 128 | 1 bar per cycle |
| 64 | 1 | 64 | 128 ÷ 64 = 2 | 2 whole notes per cycle |
| 1 | 128 | 128 | = 128 | 1 bar per cycle |

### BPM Relationship

When MULT is set to a BPM-synced value:
```
cycle_time_ms = (60000 / BPM) × 4 × (128 / (|SPD| × MULT))
```

Where:
- `60000 / BPM` = milliseconds per beat
- `× 4` = milliseconds per bar (in 4/4 time)
- `128 / (|SPD| × MULT)` = bars per cycle

### Frequency Calculation

For audio-rate modulation (high MULT values like 512, 1k, 2k):
```
frequency_hz = (BPM / 60) × (|SPD| × MULT / 128)
```

Example at 120 BPM with SPD=64 and MULT=512:
```
frequency_hz = (120/60) × (64 × 512 / 128) = 2 × 256 = 512 Hz
```

---

## LFO Modulation Destinations (Digitakt II)

### Audio Track Destinations

**META:**
- None

**LFO Cross-Modulation:**
- LFO1: SPD, MULT, FADE, WAVE, SPH, MODE, DEP (available as targets for LFO2/LFO3 only)
- LFO2: SPD, MULT, FADE, WAVE, SPH, MODE, DEP (available as target for LFO3 only)

**SRC (Source/Sample):**
- TUNE (Pitch/Tuning)
- PLAY (Play Mode)
- SAMP (Sample Slot)
- STRT (Sample Start)
- LEN (Sample Length)
- LOOP (Loop Position)
- LVL (Sample Level)
- Machine-specific parameters (E, F, G knobs vary by machine type)

**FLTR (Filter):**
- FREQ (Cutoff Frequency)
- RESO (Resonance)
- ENV (Envelope Depth)
- ATK (Attack Time)
- DEC (Decay Time)
- SUS (Sustain Level)
- REL (Release Time)
- BASE (Base frequency)
- WDTH (Width)
- DEL (Envelope Delay)

**AMP (Amplifier):**
- ATK (Attack Time)
- HLD (Hold Time)
- DEC (Decay Time)
- SUS (Sustain Level)
- REL (Release Time)
- VOL (Volume)
- PAN (Panning)

**FX (Effects):**
- DLY (Delay Send)
- REV (Reverb Send)
- CHO (Chorus Send)
- BIT (Bit Reduction)
- SRR (Sample Rate Reduction)
- SRRR (SRR Routing)
- OVR (Overdrive)

---

## Implementation Notes for App Development

### Waveform Generation Functions

```typescript
// Phase is always 0.0 to 1.0 representing one complete cycle

function generateTriangle(phase: number): number {
  // Bipolar output: -1 to +1
  if (phase < 0.25) return phase * 4;           // 0 to +1
  if (phase < 0.75) return 1 - (phase - 0.25) * 4; // +1 to -1
  return -1 + (phase - 0.75) * 4;               // -1 to 0
}

function generateSine(phase: number): number {
  // Bipolar output: -1 to +1
  return Math.sin(phase * 2 * Math.PI);
}

function generateSquare(phase: number): number {
  // Bipolar output: -1 or +1
  return phase < 0.5 ? 1 : -1;
}

function generateSawtooth(phase: number): number {
  // Bipolar output: -1 to +1 (rising)
  return phase * 2 - 1;
}

function generateExponential(phase: number): number {
  // Unipolar output: 0 to +1
  const k = 4; // Curve steepness
  return (Math.exp(phase * k) - 1) / (Math.exp(k) - 1);
}

function generateRamp(phase: number): number {
  // Unipolar output: +1 to 0 (falling)
  return 1 - phase;
}

function generateRandom(phase: number, prevValue: number, prevPhase: number): number {
  // Bipolar output: -1 to +1
  // Generate new random value when phase wraps or crosses certain thresholds
  // Random changes ~16x more frequently than other waveforms (verified via Elektronauts)
  const steps = 16;
  const currentStep = Math.floor(phase * steps);
  const prevStep = Math.floor(prevPhase * steps);

  if (currentStep !== prevStep || phase < prevPhase) {
    return Math.random() * 2 - 1; // New random value
  }
  return prevValue; // Hold previous value
}
```

### LFO State Machine

```typescript
interface LFOState {
  phase: number;        // 0.0 to 1.0
  output: number;       // Current output value
  isRunning: boolean;   // For ONE/HLF modes
  fadeMultiplier: number; // 0.0 to 1.0 for fade in/out
  fadeProgress: number; // Tracks fade envelope progress (0.0 to 1.0)
  randomValue: number;  // Held value for random waveform
  heldOutput: number;   // Captured output for HLD mode
  startPhaseNormalized: number; // Normalized start phase for ONE/HLF stopping
}

interface LFOConfig {
  waveform: 'TRI' | 'SIN' | 'SQR' | 'SAW' | 'EXP' | 'RMP' | 'RND';
  speed: number;        // -64.00 to +63.00
  multiplier: number;   // 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048
  useFixedBPM: boolean; // true = use 120 BPM, false = use project BPM
  startPhase: number;   // 0 to 127
  mode: 'FRE' | 'TRG' | 'HLD' | 'ONE' | 'HLF';
  depth: number;        // -64.00 to +63.00
  fade: number;         // -64 to +63
}
```

### Timing Update Loop

```typescript
function updateLFO(
  state: LFOState,
  config: LFOConfig,
  bpm: number,
  deltaTimeMs: number
): LFOState {
  // If LFO has stopped (ONE/HLF completed), don't update
  if (!state.isRunning && (config.mode === 'ONE' || config.mode === 'HLF')) {
    return state;
  }

  const effectiveBPM = config.useFixedBPM ? 120 : bpm;

  // Calculate phase increment per millisecond
  const cyclesPerBar = (Math.abs(config.speed) * config.multiplier) / 128;
  const msPerBar = (60000 / effectiveBPM) * 4;
  const cyclesPerMs = cyclesPerBar / msPerBar;

  // Direction based on speed sign
  const direction = config.speed >= 0 ? 1 : -1;

  // Store previous phase for wrap detection
  const prevPhase = state.phase;

  // Update phase
  let newPhase = state.phase + (cyclesPerMs * deltaTimeMs * direction);

  // Track if phase wrapped (needed for ONE mode and fade)
  let phaseWrapped = false;
  while (newPhase >= 1) {
    newPhase -= 1;
    phaseWrapped = true;
  }
  while (newPhase < 0) {
    newPhase += 1;
    phaseWrapped = true;
  }

  // Handle ONE mode: stop after completing one full cycle from startPhase
  // Must work for both positive AND negative speed directions
  let isRunning = state.isRunning;
  if (config.mode === 'ONE' && isRunning) {
    const startPhase = state.startPhaseNormalized;
    if (direction > 0) {
      // Forward: stop when we wrap past start phase
      if (phaseWrapped || (newPhase >= startPhase && prevPhase < startPhase && state.fadeProgress > 0)) {
        newPhase = startPhase;
        isRunning = false;
      }
    } else {
      // Backward: stop when we wrap past start phase going backwards
      if (phaseWrapped || (newPhase <= startPhase && prevPhase > startPhase && state.fadeProgress > 0)) {
        newPhase = startPhase;
        isRunning = false;
      }
    }
  }

  // Handle HLF mode: stop at halfway point from startPhase
  if (config.mode === 'HLF' && isRunning) {
    const startPhase = state.startPhaseNormalized;
    const halfwayPhase = (startPhase + 0.5) % 1.0; // Halfway from start, wrapped

    if (direction > 0) {
      // Forward: stop when we reach or cross halfway
      if (prevPhase < halfwayPhase && newPhase >= halfwayPhase) {
        newPhase = halfwayPhase;
        isRunning = false;
      }
      // Handle wrap case
      if (halfwayPhase < startPhase && (phaseWrapped || newPhase >= halfwayPhase)) {
        newPhase = halfwayPhase;
        isRunning = false;
      }
    } else {
      // Backward: halfway is in the opposite direction
      const backwardHalfway = (startPhase - 0.5 + 1.0) % 1.0;
      if (prevPhase > backwardHalfway && newPhase <= backwardHalfway) {
        newPhase = backwardHalfway;
        isRunning = false;
      }
    }
  }

  // Generate waveform output
  const rawOutput = generateWaveform(config.waveform, newPhase, state);

  // Update fade envelope
  let fadeMultiplier = state.fadeMultiplier;
  let fadeProgress = state.fadeProgress;

  if (config.fade !== 0) {
    // Calculate fade time as proportion of cycle time
    // Higher |fade| value = faster fade (fewer cycles to complete)
    const fadeRate = Math.abs(config.fade) / 64.0;
    const fadeIncrement = cyclesPerMs * deltaTimeMs * fadeRate;

    fadeProgress = Math.min(1.0, fadeProgress + fadeIncrement);

    if (config.fade < 0) {
      // Fade IN: starts at 0, increases to 1
      fadeMultiplier = fadeProgress;
    } else {
      // Fade OUT: starts at 1, decreases to 0
      fadeMultiplier = 1.0 - fadeProgress;
    }
  }

  // Apply depth
  const scaledOutput = rawOutput * (config.depth / 64);

  // Apply fade
  const fadedOutput = scaledOutput * fadeMultiplier;

  // For HLD mode, return the held output value (LFO still runs in background)
  const finalOutput = config.mode === 'HLD' ? state.heldOutput : fadedOutput;

  return {
    ...state,
    phase: newPhase,
    output: finalOutput,
    isRunning,
    fadeMultiplier,
    fadeProgress,
  };
}
```

### Trigger Handling

```typescript
function handleTrigger(state: LFOState, config: LFOConfig): LFOState {
  const startPhaseNormalized = config.startPhase / 128;

  switch (config.mode) {
    case 'FRE':
      // Free mode: do nothing on trigger
      return state;

    case 'TRG':
      // Trigger mode: restart from start phase, reset fade
      return {
        ...state,
        phase: startPhaseNormalized,
        startPhaseNormalized,
        isRunning: true,
        fadeProgress: 0,
        fadeMultiplier: config.fade < 0 ? 0 : 1, // Fade IN starts at 0, Fade OUT starts at 1
      };

    case 'HLD':
      // Hold mode: sample and freeze the current output value
      // The LFO continues running in the background but output is held
      return {
        ...state,
        heldOutput: state.output, // Capture current output
      };

    case 'ONE':
      // One-shot: restart and run one full cycle, then stop
      return {
        ...state,
        phase: startPhaseNormalized,
        startPhaseNormalized,
        isRunning: true,
        fadeProgress: 0,
        fadeMultiplier: config.fade < 0 ? 0 : 1,
      };

    case 'HLF':
      // Half: restart and run to middle (half cycle), then stop
      return {
        ...state,
        phase: startPhaseNormalized,
        startPhaseNormalized,
        isRunning: true,
        fadeProgress: 0,
        fadeMultiplier: config.fade < 0 ? 0 : 1,
      };
  }
}

// Initial state factory
function createInitialState(config: LFOConfig): LFOState {
  const startPhaseNormalized = config.startPhase / 128;
  return {
    phase: startPhaseNormalized,
    output: 0,
    isRunning: config.mode === 'FRE', // FRE mode starts running, others wait for trigger
    fadeMultiplier: config.fade < 0 ? 0 : 1,
    fadeProgress: 0,
    randomValue: Math.random() * 2 - 1,
    heldOutput: 0,
    startPhaseNormalized,
  };
}
```

---

## UI Recommendations

### Parameter Controls

1. **Waveform Selector**: Dropdown or segmented control with visual waveform icons
2. **Speed**: Slider with -64.00 to +63.00 range, show decimal values
3. **Multiplier**: Dropdown with all values (OFF, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1k, 2k)
4. **Fixed BPM Toggle**: Checkbox or switch for 120 BPM lock
5. **Start Phase**: Slider 0-127 with degree indicator (0°-360°)
6. **Mode**: Segmented control (FRE, TRG, HLD, ONE, HLF)
7. **Depth**: Slider -64.00 to +63.00
8. **Fade**: Slider -64 to +63 with "IN" and "OUT" labels

### Visualization

1. **Waveform Display**: Show the current waveform shape with a vertical line indicating current phase position
2. **Output Value**: Numerical display of current output value
3. **Time Display**: Show calculated cycle time in ms and musical note value
4. **BPM Input**: Allow user to set project BPM for timing calculations

### Animation

- Update visualization at 60fps for smooth animation
- Show the phase position moving through the waveform
- Display the modulated output value in real-time
- Optional: Show multiple LFOs (LFO1, LFO2, LFO3) simultaneously

---

## References

- [Elektron Digitakt II Manual](https://www.elektron.se/support-downloads/digitakt-ii)
- [Elektronauts Forum: LFO Insights](https://www.elektronauts.com/t/a-few-insights-on-digitakt-lfo/47854)
- [Elektronauts Forum: Understanding LFOs](https://www.elektronauts.com/t/i-finally-solved-and-understand-the-lfos/194190)
- [Elektronauts Forum: LFO Speed/Multiplier](https://www.elektronauts.com/t/lfo-speed-and-multiplier-explanation/18264)
- [ManualsLib: Digitakt II Manual](https://www.manualslib.com/manual/3436437/Elektron-Digitakt-Ii.html)
- [Sound On Sound: Digitakt II Review](https://www.soundonsound.com/reviews/elektron-digitakt-ii)
- Dave Mech Digitakt II Cheatsheet v1.15
