# Plan: Reverse Engineer LFO Behaviors

## Background

Three behaviors need investigation:

1. **Fade timing**: Our formula `128 / |FADE|` cycles produces much slower fades than Digitakt
   - Test showed: ENG=[60-70] vs DT=[24-103] for fade-in with FADE=-16

2. **Negative speed**: Our output inversion doesn't match Digitakt
   - Test showed: At t=0, SAW with SPD=-16 has DT=103 but ENG=24 (completely opposite)

3. **RMP/Unipolar depth scaling**: Engine outputs half the expected depth for unipolar waveforms
   - Test showed: RMP with depth 40 gives DT=[64-103] (39 CC range) but ENG=[64-84] (20 CC range)

## Hypotheses

### Fade Timing
- **Current formula**: `128 / |FADE|` cycles (FADE=-16 → 8 cycles)
- **Alternative 1**: `|FADE| / 8` cycles (FADE=-16 → 2 cycles) - much faster
- **Alternative 2**: `|FADE| / 16` cycles (FADE=-16 → 1 cycle)
- **Alternative 3**: Fade is time-based, not cycle-based

### Negative Speed
- **Current approach**: Invert output (multiply by -1)
- **Alternative 1**: Reverse phase direction (phase runs backward)
- **Alternative 2**: Our SAW definition is inverted vs Digitakt's
- **Alternative 3**: Negative speed affects starting position, not direction

### RMP/Unipolar Depth Scaling
- **Current behavior**: Unipolar waveforms output [0, 1] range, scaled by depth
  - With depth 40: output [0, 1] → CC [64, 64+40] = [64, 104]
  - But engine produces [64, 84] - only half!
- **Alternative 1**: Unipolar should double the depth: `output * depth * 2`
  - Would give [64, 144] → clamped to [64, 127]
- **Alternative 2**: Unipolar output should be [-1, 1] like bipolar (just shifted)
  - RMP = `phase * 2 - 1` instead of `phase`
- **Alternative 3**: Depth applies differently (multiplicative vs additive)
- **Alternative 4**: Engine bug - depth being halved somewhere in the chain

## Experiments

### Experiment 1: SAW Waveform Direction (Baseline)

**Goal**: Verify our SAW waveform definition matches Digitakt's

**Setup**:
```
Waveform: SAW
Speed: +16
Multiplier: 4
Depth: 40
Mode: TRG
StartPhase: 0
Duration: 5000ms
```

**Observe**:
- First CC value after trigger
- Direction of change over first 500ms

**Our model predicts**: SAW = `1 - phase * 2`
- phase 0 → output +1 → CC ~103
- phase 0.5 → output 0 → CC 64
- phase 1 → output -1 → CC ~24

So: Start HIGH (103), fall to LOW (24)

**Record**: Actual start value and direction

---

### Experiment 2: Negative Speed on SAW

**Goal**: Determine what negative speed does

**Setup**:
```
Waveform: SAW
Speed: -16
Multiplier: 4
Depth: 40
Mode: TRG
StartPhase: 0
Duration: 5000ms
```

**Compare with Experiment 1**:
| Behavior | Positive SPD | Negative SPD |
|----------|--------------|--------------|
| Start value | ? | ? |
| Direction | ? | ? |
| Cycle time | ~4000ms | ~4000ms (should be same) |

**Possible outcomes**:
1. If start is LOW, rises to HIGH → Digitakt inverts output (like our model)
2. If start is HIGH, falls to LOW → Digitakt reverses phase direction
3. If waveform shape changes → More complex transformation

---

### Experiment 3: Negative Speed on TRI

**Goal**: Confirm negative speed behavior on symmetric waveform

**Setup**:
```
Waveform: TRI
Speed: +16 and -16
Multiplier: 4
Depth: 40
Mode: TRG
StartPhase: 0
Duration: 5000ms
```

TRI is symmetric: starts at center (64), rises to max, falls to min, returns to center.

**Compare**:
- Positive SPD: Should start at 64, go UP first
- Negative SPD: What happens?

If negative inverts output: Start at 64, go DOWN first
If negative reverses phase: Start at 64, go DOWN first (same result for TRI!)

TRI won't distinguish these, but confirms the effect.

---

### Experiment 4: Fade Timing Measurement

**Goal**: Measure actual cycles to complete fade

**Setup**:
```
Waveform: TRI
Speed: 32
Multiplier: 8
Depth: 40
Mode: TRG
Duration: 8000ms
```

This gives 1000ms cycle time (fast enough to see multiple cycles).

**Test each FADE value**:
| FADE | Our Formula (cycles) | Test Duration |
|------|---------------------|---------------|
| -64 | 2 cycles = 2000ms | 8000ms |
| -32 | 4 cycles = 4000ms | 8000ms |
| -16 | 8 cycles = 8000ms | 10000ms |
| -8 | 16 cycles = 16000ms | 20000ms |

**Measure for each**:
1. Time when CC first exceeds 100 (near full positive)
2. Time when CC first drops below 28 (near full negative)
3. Whichever happens second = fade complete time

**Calculate**:
```
actual_cycles = fade_complete_time / 1000ms
```

**Look for pattern**:
- If `actual_cycles = |FADE| / N`, solve for N
- If `actual_cycles = C / |FADE|`, solve for C

---

### Experiment 5: Fade-Out Measurement

**Goal**: Verify fade-out follows same formula as fade-in

**Setup**: Same as Experiment 4 but with positive FADE values

**Measure**:
- Time when amplitude first drops to <50% of expected
- Time when amplitude reaches ~0 (CC stays at 64)

---

### Experiment 6: RMP Depth Range Measurement

**Goal**: Determine actual CC range for RMP at various depths

**Setup**:
```
Waveform: RMP
Speed: 16
Multiplier: 4
Mode: TRG
StartPhase: 0
Duration: 5000ms
```

**Test each DEPTH value**:
| DEPTH | Expected (if 1x) | Expected (if 2x) | Actual |
|-------|------------------|------------------|--------|
| 20    | [64, 84]         | [64, 104]        | ?      |
| 40    | [64, 104]        | [64, 127]        | ?      |
| 63    | [64, 127]        | [64, 127]        | ?      |

**Observe**:
- Minimum CC value reached
- Maximum CC value reached
- Shape: Does it ramp linearly from min to max?

**Calculate**:
```
actual_range = max_cc - min_cc
depth_multiplier = actual_range / depth
```

---

### Experiment 7: EXP Depth Range Measurement

**Goal**: Verify EXP (also unipolar) follows same depth formula as RMP

**Setup**:
```
Waveform: EXP
Speed: 16
Multiplier: 4
Depth: 40
Mode: TRG
StartPhase: 0
Duration: 5000ms
```

**Compare**:
- Does EXP produce same CC range as RMP?
- If both show 2x depth scaling, confirms unipolar waveforms need adjustment

---

### Experiment 8: Bipolar vs Unipolar Comparison

**Goal**: Compare SAW (bipolar) vs RMP (unipolar) to understand depth handling

**Setup for both**:
```
Speed: 16
Multiplier: 4
Depth: 40
Mode: TRG
StartPhase: 0
Duration: 5000ms
```

**Expected for SAW (bipolar)**:
- Output [-1, 1] → CC [64-40, 64+40] = [24, 104]
- Total swing = 80 CC units

**Expected for RMP (unipolar)**:
- If output [0, 1] with 1x depth: [64, 104] - swing = 40 CC units
- If output [0, 1] with 2x depth: [64, 144→127] - swing = 63 CC units
- If output [-1, 1] like SAW: [24, 104] - swing = 80 CC units

**This experiment distinguishes** between depth scaling and output range hypotheses.

---

## Implementation

### Option A: Manual Testing
1. Add these as individual test configs in useLfoVerification.ts
2. Run each test and manually observe CC output
3. Record results in this document

### Option B: Automated Data Collection
1. Create a new test mode that captures raw CC data without pass/fail
2. Export data for analysis
3. Plot CC values vs time to visualize

### Option C: Dedicated Investigation Hook
Create `useLfoInvestigation.ts` that:
- Runs single experiments
- Captures full CC stream
- Computes statistics (first peak time, cycle count, etc.)
- Outputs structured data for analysis

## Expected Outcomes

### If SAW definition is wrong:
- Fix waveform.ts to match Digitakt's SAW
- Negative speed inversion may then work correctly

### If negative speed is phase reversal:
- Change from `output = -output` to `phase = 1 - phase` at each update
- Or reverse the phase increment direction

### If fade formula is `|FADE| / 8`:
- Update fade.ts: `fadeCycles = Math.abs(fadeValue) / 8`
- Much faster fades, matching Digitakt

### If fade formula is `|FADE| / 16`:
- Update fade.ts: `fadeCycles = Math.abs(fadeValue) / 16`
- Even faster fades

### If unipolar depth needs 2x multiplier:
- Update waveform.ts or depth application: multiply unipolar output by 2
- Or: apply depth*2 for RMP/EXP waveforms

### If unipolar waveforms should output [-1, 1]:
- Update RMP: `phase * 2 - 1` instead of `phase`
- Update EXP: `(1 - Math.exp(-phase * 4)) * 2 - 1` or similar
- This would make depth behave consistently across all waveforms

## Next Steps

1. Run Experiments 1-2 first (SAW direction & negative speed)
2. Based on results, either fix SAW definition or negative speed logic
3. Run Experiments 4-5 (fade timing)
4. Run Experiments 6-8 (RMP/unipolar depth)
5. Update elektron-lfo with correct formulas
6. Re-run full test suite to verify improvements

## Priority Order

Based on test failure impact:
1. **RMP depth** - Affects all unipolar waveform tests (most common failure)
2. **Negative speed** - Affects all negative speed tests
3. **Fade timing** - Affects fade tests (less common in test suite)
