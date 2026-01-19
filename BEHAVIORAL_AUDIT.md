# LFO Visualization App - Behavioral Correctness Audit

**Audit Date:** 2026-01-19
**Auditor:** QA Engineering
**Scope:** Verify all combinations of LFO settings produce correct results

---

## Executive Summary

This audit examined the behavioral correctness of the LFO visualization application across all waveform types, trigger modes, speed/multiplier combinations, depth variations, start phase behavior, fade in/out, slow-motion visualization, and destination meter synchronization.

**Overall Assessment: MOSTLY CORRECT with several issues identified**

| Category | Status | Issues Found |
|----------|--------|--------------|
| Waveform Types | PASS with notes | 2 minor issues |
| Trigger Modes | PARTIAL | Missing test coverage |
| Speed/Multiplier | PASS | 0 issues |
| Depth Variations | FAIL | 2 significant issues |
| Start Phase | PASS with notes | 1 inconsistency |
| Fade In/Out | PASS | 1 edge case |
| Slow-Motion | PASS with notes | 2 edge cases |
| Destination Meter Sync | FAIL | 1 significant issue |

---

## 1. Waveform Types Audit

### Files Examined
- `/Users/brent/wtlfo/src/components/lfo/worklets.ts`
- `/Users/brent/wtlfo/src/components/lfo/__tests__/worklets.test.ts`

### TRI (Triangle) - PASS

**Implementation:**
```typescript
case 'TRI':
  if (phase < 0.25) return phase * 4;
  if (phase < 0.75) return 1 - (phase - 0.25) * 4;
  return -1 + (phase - 0.75) * 4;
```

**Verification:**
| Phase | Expected | Implementation | Correct |
|-------|----------|----------------|---------|
| 0.00  | 0        | 0              | YES     |
| 0.25  | 1        | 1              | YES     |
| 0.50  | 0        | 0              | YES     |
| 0.75  | -1       | -1             | YES     |
| 1.00  | 0        | ~0             | YES     |

**Test Coverage:** Complete - all key points verified

---

### SIN (Sine) - PASS

**Implementation:**
```typescript
case 'SIN':
  return Math.sin(phase * 2 * Math.PI);
```

**Verification:** Standard sine wave formula. Correctly outputs:
- 0 at phase 0
- 1 at phase 0.25
- 0 at phase 0.5
- -1 at phase 0.75
- 0 at phase 1

**Test Coverage:** Complete

---

### SQR (Square) - PASS

**Implementation:**
```typescript
case 'SQR':
  return phase < 0.5 ? 1 : -1;
```

**Verification:** 50% duty cycle square wave. Correct bipolar output.

**Test Coverage:** Complete

---

### SAW (Sawtooth) - PASS

**Implementation:**
```typescript
case 'SAW':
  return phase * 2 - 1;
```

**Verification:** Rising sawtooth from -1 to +1. Linear progression.

**Test Coverage:** Complete

---

### EXP (Exponential) - PASS

**Implementation:**
```typescript
case 'EXP': {
  const k = 4;
  return (Math.exp(phase * k) - 1) / (Math.exp(k) - 1);
}
```

**Verification:**
- Unipolar 0-1 range - CORRECT
- Exponential curve (slow start, fast end) - CORRECT
- k=4 provides good curve shape for musical applications

**Test Coverage:** Complete including curve shape verification

---

### RMP (Ramp) - PASS

**Implementation:**
```typescript
case 'RMP':
  return 1 - phase;
```

**Verification:**
- Unipolar 0-1 range - CORRECT
- Falling from 1 to 0 - CORRECT
- Linear - CORRECT

**Test Coverage:** Complete

---

### RND (Random) - PASS with NOTE

**Implementation:**
```typescript
case 'RND': {
  const steps = 16;
  const step = Math.floor(phase * steps);
  return getRandomStepValue(step);
}

function getRandomStepValue(step: number): number {
  'worklet';
  return Math.sin(step * 78.233 + 0.5) * 0.9;
}
```

**Verification:**
- 16-step sample-and-hold pattern - CORRECT
- Deterministic (same phase = same value) - CORRECT
- Range is -0.9 to +0.9 (not full -1 to +1) - INTENTIONAL

**Issue RND-1 (Minor):**
- **Location:** `worklets.ts` line 11
- **Description:** Maximum output range is 0.9, not 1.0
- **Impact:** Random waveform has slightly less range than other bipolar waveforms
- **Severity:** Low - likely intentional for avoiding harsh extremes

**Issue RND-2 (Minor):**
- **Location:** `worklets.test.ts` lines 216-221
- **Description:** Test comment says "Max value is 0.8" but implementation uses 0.9
- **Impact:** Documentation inconsistency
- **Code:**
  ```typescript
  // Test comment says:
  // Based on implementation: Math.sin(step * 12.9898) * 0.8
  // But actual implementation is:
  // Math.sin(step * 78.233 + 0.5) * 0.9
  ```

**Test Coverage:** Adequate, but test comment needs update

---

## 2. Trigger Modes Audit

### Files Examined
- `/Users/brent/wtlfo/src/components/lfo/types.ts`
- `/Users/brent/wtlfo/src/context/preset-context.tsx`
- `/Users/brent/wtlfo/src/data/presets.ts`

### Defined Modes
```typescript
type TriggerMode = 'FRE' | 'TRG' | 'HLD' | 'ONE' | 'HLF';
```

### Mode Behaviors

| Mode | Description | Auto-triggers on Load | Fade Applies |
|------|-------------|----------------------|--------------|
| FRE  | Free running | NO | NO |
| TRG  | Triggered | YES | YES |
| HLD  | Hold | NO | YES |
| ONE  | One-shot | YES | YES |
| HLF  | Half cycle | YES | YES |

**Implementation in preset-context.tsx (lines 199-202):**
```typescript
if (debouncedConfig.mode === 'TRG' || debouncedConfig.mode === 'ONE' || debouncedConfig.mode === 'HLF') {
  lfoRef.current.trigger();
}
```

### Issue MODE-1 (Medium - Missing Test Coverage)

**Description:** No tests exist for trigger mode behaviors

**Missing Test Scenarios:**
1. FRE mode continues running without trigger
2. TRG mode requires trigger to start
3. HLD mode holds at current value
4. ONE mode runs single cycle then stops
5. HLF mode runs half cycle then stops

**Impact:** Cannot verify correct mode behavior without manual testing

**Recommendation:** Add test file `/Users/brent/wtlfo/src/context/__tests__/trigger-modes.test.tsx`

### Issue MODE-2 (Low - HLD Mode Not Auto-Triggered)

**Location:** `preset-context.tsx` lines 199-202

**Description:** HLD (Hold) mode is not in the auto-trigger list, but this is correct behavior since hold mode should wait for external trigger.

**Status:** VERIFIED CORRECT

---

## 3. Speed and Multiplier Combinations Audit

### Files Examined
- `/Users/brent/wtlfo/src/data/presets.ts`
- `/Users/brent/wtlfo/src/context/preset-context.tsx`

### Speed Range
- Range: -64 to +63 (based on Elektron spec)
- Used in presets: 1, 8, 16, 32, 48

### Multiplier Values
- Valid values (from presets): 1, 2, 4, 8, 16, 64
- Type cast: `multiplier: 2 as Multiplier`

### Timing Calculation

**Implementation (preset-context.tsx lines 185-192):**
```typescript
const info = lfoRef.current.getTimingInfo();
const msPerStep = 15000 / bpm;  // 1/16 note in ms
const steps = info.cycleTimeMs / msPerStep;
setTimingInfo({
  cycleTimeMs: info.cycleTimeMs,
  noteValue: info.noteValue,
  steps,
});
```

**Verification:**
- At 120 BPM: msPerStep = 15000/120 = 125ms (correct 1/16 note duration)
- 60000ms/BPM/4 = 125ms at 120 BPM (verified against MIDI standard)

**Status:** PASS - Timing calculations are correct

---

## 4. Depth Variations Audit

### Files Examined
- `/Users/brent/wtlfo/src/hooks/useModulatedValue.ts`
- `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`
- `/Users/brent/wtlfo/src/components/lfo/hooks/useWaveformPath.ts`

### Depth Range
- Range: -64 to +63
- Used in presets: -63, -32, 12, 24, 47, 48, 63

### Issue DEPTH-1 (Significant - Inconsistent Depth Scaling)

**Location:** Multiple files

**Description:** Depth scaling uses inconsistent divisors across files:

| File | Calculation | Max Scale |
|------|-------------|-----------|
| useModulatedValue.ts | `lfoDepth / 63` | 1.0 at 63 |
| DestinationMeter.tsx | `depth / 63` | 1.0 at 63 |
| useWaveformPath.ts | `depth / 63` | 1.0 at 63 |
| PhaseIndicator.tsx | `depth / 63` | 1.0 at 63 |
| FadeEnvelope.tsx | `depth / 63` | 1.0 at 63 |

**Problem:** When depth is -64, the scale becomes -64/63 = -1.0159, exceeding the expected -1.0 to +1.0 range.

**Impact:** At depth = -64:
- Modulation output is 101.59% of expected maximum
- Could cause clipping or values slightly outside destination bounds

**Evidence:**
```typescript
// useModulatedValue.ts line 29
const depthScale = lfoDepth / 63; // -1 to +1

// With depth = -64: depthScale = -1.0159 (exceeds -1.0)
// With depth = +63: depthScale = +1.0000 (correct)
```

**Recommendation:** Use `depth / 64` for symmetrical scaling, or clamp the result

---

### Issue DEPTH-2 (Significant - Negative Depth Double-Application)

**Location:** `/Users/brent/wtlfo/app/(destination)/index.tsx` (as noted in ANALYSIS_FINDINGS.md)

**Description:** The `depthSign` variable may cause double-application of depth direction if the LFO engine already outputs depth-scaled values.

**Code Pattern:**
```typescript
const depthSign = Math.sign(currentConfig.depth) || 1;
// Later in animation:
const modulation = output * swing * depthSign;
```

**Concern:** If `elektron-lfo` engine's `output` already incorporates depth direction, multiplying by `depthSign` again will:
- Make negative depth behave like positive depth
- OR double-invert the signal

**Status:** UNVERIFIED - Requires checking `elektron-lfo` library behavior

**Recommendation:** Add test to verify LFO engine output characteristics

---

### Negative Depth Behavior (Visualization)

**Files:** useWaveformPath.ts, FadeEnvelope.tsx

**Verification:**
- `depthScale = depth / 63`
- When depth < 0, waveform is inverted
- WaveformDisplay shows inverted shape - CORRECT

**Status:** PASS for visualization

---

## 5. Start Phase Behavior Audit

### Files Examined
- `/Users/brent/wtlfo/src/context/preset-context.tsx`
- `/Users/brent/wtlfo/src/components/lfo/hooks/useWaveformPath.ts`
- `/Users/brent/wtlfo/src/components/lfo/PhaseIndicator.tsx`

### Start Phase Range
- Range: 0-127 (mapped to 0.0-~0.992 normalized)
- Used in presets: 0, 32

### Initialization Behavior

**Implementation (preset-context.tsx lines 194-197):**
```typescript
const startPhaseNormalized = debouncedConfig.startPhase / 128;
lfoPhase.value = startPhaseNormalized;
lfoOutput.value = 0;
```

**Verification:**
- Phase correctly initialized to startPhase value
- Division by 128 gives correct 0-~0.992 range

### Issue STARTPHASE-1 (Minor - Dual Meaning for RND)

**Location:** Multiple files (useWaveformPath.ts, PhaseIndicator.tsx)

**Description:** For RND waveform, `startPhase` is repurposed as SLEW control instead of phase offset:

```typescript
// useWaveformPath.ts lines 54-56
const isRandom = waveform === 'RND';
const slewValue = isRandom ? (startPhase || 0) : 0;
const startPhaseNormalized = isRandom ? 0 : (startPhase || 0) / 128;
```

**Impact:**
- Inconsistent parameter meaning across waveforms
- User might expect start phase to work the same for all waveforms

**Severity:** Low - This appears to be intentional design matching Elektron behavior

**Recommendation:** Document this behavior in UI/help text

---

## 6. Fade In/Out Behavior Audit

### Files Examined
- `/Users/brent/wtlfo/src/components/lfo/FadeEnvelope.tsx`
- `/Users/brent/wtlfo/src/components/lfo/PhaseIndicator.tsx`
- `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx`

### Fade Range
- Range: -64 to +63
- Negative = fade-in, Positive = fade-out
- Used in presets: -32, 0

### Fade Formula

**Implementation (FadeEnvelope.tsx lines 63-80):**
```typescript
if (fade !== undefined && fade !== 0) {
  const absFade = Math.abs(fade);
  const fadeDuration = (64 - absFade) / 64;

  let fadeEnvelope: number;
  if (fade < 0) {
    // Fade-in: envelope goes from 0 to 1 over fadeDuration
    fadeEnvelope = fadeDuration > 0 ? Math.min(1, xNormalized / fadeDuration) : 1;
  } else {
    // Fade-out: envelope goes from 1 to 0 over fadeDuration
    fadeEnvelope = fadeDuration > 0 ? Math.max(0, 1 - xNormalized / fadeDuration) : 0;
  }
  value = value * fadeEnvelope;
}
```

**Verification:**

| Fade Value | Duration | Behavior |
|------------|----------|----------|
| -64        | 0%       | Instant full amplitude (no fade) |
| -32        | 50%      | Fade-in completes at phase 0.5 |
| -1         | ~98%     | Slow fade-in over almost full cycle |
| 0          | N/A      | No fade applied |
| +1         | ~98%     | Slow fade-out over almost full cycle |
| +32        | 50%      | Fade-out completes at phase 0.5 |
| +63        | ~1.6%    | Very fast fade-out |

### Issue FADE-1 (Edge Case - fade = +64 behavior)

**Description:** If fade could be +64, fadeDuration would be 0, causing division issues.

**Mitigation:** Range is -64 to +63, so +64 is not valid. However, no validation exists in code.

**Status:** PASS - Edge case is naturally avoided by parameter range

### Fade Application Conditions

**Implementation (LFOVisualizer.tsx lines 145-157):**
```typescript
{fade !== undefined && fade !== 0 && mode !== 'FRE' && resolvedTheme.fadeCurve && (
  <FadeEnvelope ... />
)}
```

**Verification:**
- Fade only applies when fade !== 0 - CORRECT
- Fade does not apply in FRE (free-running) mode - CORRECT
- This matches Elektron behavior where fade only applies to triggered modes

**Status:** PASS

---

## 7. Slow-Motion Visualization Audit

### Files Examined
- `/Users/brent/wtlfo/src/components/lfo/hooks/useSlowMotionPhase.ts`

### Mechanism

The hook accumulates phase deltas at a reduced rate to display slower animation while maintaining full 0-1 cycle range.

**Key Implementation Details:**

1. **Delta Accumulation:**
```typescript
const slowedDelta = phaseDelta / factor;
let newDisplayPhase = displayPhase.value + slowedDelta;
```

2. **Wrap-Around Detection:**
```typescript
if (phaseDelta < -0.8) {
  phaseDelta += 1;  // Forward wrap
  wrappedForward = true;
} else if (phaseDelta > 0.8) {
  phaseDelta -= 1;  // Backward wrap
  wrappedBackward = true;
}
```

3. **Discontinuity Detection:**
```typescript
const isDiscontinuity =
  frameCount.value <= 1 ||
  (absRawDelta > 0.2 && absRawDelta < 0.8);
```

### Issue SLOWMO-1 (Edge Case - Adaptive Threshold Calculation)

**Location:** useSlowMotionPhase.ts line 71

**Code:**
```typescript
const adaptiveThreshold = Math.max(0.05, 0.15 / Math.sqrt(factor));
```

**Concern:** At very high slowdown factors (e.g., 100x), threshold becomes 0.015, which may be too sensitive.

| Factor | Threshold |
|--------|-----------|
| 1      | 0.150     |
| 4      | 0.075     |
| 10     | 0.047     |
| 100    | 0.015 (clamped to 0.05) |

**Status:** PASS - Minimum clamp of 0.05 provides safety

### Issue SLOWMO-2 (Edge Case - Drift Correction Timing)

**Location:** useSlowMotionPhase.ts lines 147-159

**Code:**
```typescript
if (frameCount.value % 60 === 0 && factor > 1) {
  const expectedDisplayPhase = (realPhase.value / factor) % 1;
  const drift = newDisplayPhase - expectedDisplayPhase;
  if (Math.abs(drift) > 0.02 && Math.abs(drift) < 0.5) {
    newDisplayPhase -= drift * 0.1;
  }
}
```

**Concern:** Drift correction uses `realPhase.value / factor` which doesn't account for accumulated cycles. At very slow factors with many real cycles, this could cause phase jumps.

**Impact:** Low - Only affects very long-running sessions with high slowdown factors

**Status:** PASS with NOTE - Edge case documented

---

## 8. Destination Meter Sync Audit

### Files Examined
- `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`
- `/Users/brent/wtlfo/src/hooks/useModulatedValue.ts`

### Sync Mechanism

The destination meter receives `lfoOutput` SharedValue and calculates position in real-time.

**Implementation (DestinationMeter.tsx lines 108-115):**
```typescript
const meterFillHeight = useDerivedValue(() => {
  'worklet';
  const modulationAmount = lfoOutput.value * maxModulation;
  const currentVal = animatedCenterValue.value + modulationAmount;
  const clampedValue = Math.max(min, Math.min(max, currentVal));
  const normalized = (clampedValue - min) / range;
  return normalized * (height - 16);
}, [maxModulation, min, max, range, height]);
```

### Issue METER-1 (Significant - Missing Depth Scale in Meter)

**Location:** DestinationMeter.tsx lines 89-98, 108-115

**Description:** The DestinationMeter comment says `lfoOutput is already depth-scaled by the LFO engine`, but the code doesn't verify this assumption.

**Code:**
```typescript
// Line 89 comment:
// Note: lfoOutput is already depth-scaled by the LFO engine (range: -depth/63 to +depth/63)

// Line 110-111:
const modulationAmount = lfoOutput.value * maxModulation;
```

**Problem:** If `lfoOutput` is NOT depth-scaled by the engine:
- Meter shows full modulation range regardless of depth setting
- Meter position won't match actual parameter value

If `lfoOutput` IS depth-scaled:
- The `depth` prop passed to DestinationMeter is unused for position calculation
- Only used for bound visualization lines

**Evidence of Inconsistency:**
```typescript
// useModulatedValue.ts calculates its own depth scaling:
const depthScale = lfoDepth / 63;
const modulationAmount = lfoOutput.value * depthScale * maxModulation;

// But DestinationMeter assumes lfoOutput is pre-scaled:
const modulationAmount = lfoOutput.value * maxModulation;
```

**Impact:** HIGH - Meter may show incorrect modulated value position

**Recommendation:**
1. Verify `elektron-lfo` engine output characteristics
2. Ensure consistent depth application across all consumers of `lfoOutput`

---

### Unipolar Waveform Handling

**Implementation (DestinationMeter.tsx lines 46-70):**
```typescript
if (isUnipolar) {
  if (depth >= 0) {
    targetLowerBound = centerValue;
    targetUpperBound = Math.min(max, centerValue + swing);
  } else {
    targetLowerBound = Math.max(min, centerValue - swing);
    targetUpperBound = centerValue;
  }
} else {
  targetLowerBound = Math.max(min, centerValue - swing);
  targetUpperBound = Math.min(max, centerValue + swing);
}
```

**Verification:**
- EXP and RMP correctly identified as unipolar
- Positive depth modulates above center only - CORRECT
- Negative depth modulates below center only - CORRECT
- Bipolar waveforms modulate both directions - CORRECT

**Status:** PASS

---

## Test Coverage Analysis

### Existing Test Files

| File | Lines | Coverage |
|------|-------|----------|
| worklets.test.ts | 323 | Waveforms - GOOD |
| preset-context.test.tsx | 445 | Context - GOOD |
| modulation-context.test.tsx | 460 | Modulation - GOOD |
| destinations.test.ts | 223 | Destinations - GOOD |

### Missing Test Coverage

1. **Trigger Mode Behaviors** - No tests
2. **Slow-Motion Phase Hook** - No tests
3. **Fade Envelope Calculations** - No tests
4. **Destination Meter Sync** - No tests
5. **Negative Depth Edge Cases** - No tests
6. **Speed/Multiplier Combinations** - No tests

### Critical Missing Tests

```typescript
// Recommended test additions:

// 1. Depth scaling edge cases
describe('depth edge cases', () => {
  it('should handle depth = -64 without exceeding range', () => {
    const output = sampleWaveformWorklet('SIN', 0.25); // Returns 1
    const depthScale = -64 / 63; // Returns -1.0159
    const scaled = output * depthScale;
    // Should this be clamped to -1.0?
  });
});

// 2. Trigger mode behaviors
describe('trigger modes', () => {
  it('FRE mode should run continuously', () => {});
  it('TRG mode should require trigger', () => {});
  it('ONE mode should run single cycle', () => {});
  it('HLF mode should run half cycle', () => {});
  it('HLD mode should hold value', () => {});
});

// 3. Meter sync verification
describe('meter sync', () => {
  it('should match useModulatedValue output', () => {});
});
```

---

## Summary of Issues

### High Priority

| ID | Description | File | Severity |
|----|-------------|------|----------|
| DEPTH-1 | Depth scaling asymmetry (-64/63 != -1.0) | Multiple | Medium |
| DEPTH-2 | Potential double depth sign application | (destination)/index.tsx | Medium |
| METER-1 | Depth scaling inconsistency between meter and hook | DestinationMeter.tsx | High |

### Medium Priority

| ID | Description | File | Severity |
|----|-------------|------|----------|
| MODE-1 | No test coverage for trigger modes | N/A | Medium |

### Low Priority

| ID | Description | File | Severity |
|----|-------------|------|----------|
| RND-1 | Random range is 0.9 not 1.0 | worklets.ts | Low |
| RND-2 | Test comment inconsistency | worklets.test.ts | Low |
| STARTPHASE-1 | Dual meaning for RND waveform | Multiple | Low |
| SLOWMO-1 | Adaptive threshold edge case | useSlowMotionPhase.ts | Low |
| SLOWMO-2 | Drift correction accumulation | useSlowMotionPhase.ts | Low |

---

## Recommendations

### Immediate Actions

1. **Verify `elektron-lfo` Engine Output**
   - Determine if `lfoOutput` is pre-scaled by depth
   - Document the engine's output range and characteristics
   - Ensure consistent assumptions across all consumers

2. **Fix Depth Scaling Asymmetry**
   - Consider using `depth / 64` for symmetrical -1 to +1 scaling
   - OR clamp the result to [-1, 1] range
   - Update all files using depth scaling

3. **Add Trigger Mode Tests**
   - Create comprehensive tests for all 5 trigger modes
   - Verify auto-trigger behavior on config change
   - Test mode transitions

### Future Improvements

4. **Unify Depth Application**
   - Create single source of truth for depth scaling
   - Either apply in engine OR in consumers, not both

5. **Add Integration Tests**
   - Test LFO output -> Meter position correlation
   - Test waveform display -> Phase indicator alignment

6. **Document Edge Cases**
   - RND waveform startPhase = SLEW behavior
   - Unipolar waveform bounds with negative depth
   - Fade behavior in FRE mode (disabled)

---

## Appendix: File Reference

| Path | Purpose |
|------|---------|
| /Users/brent/wtlfo/src/components/lfo/worklets.ts | Waveform sampling functions |
| /Users/brent/wtlfo/src/components/lfo/hooks/useSlowMotionPhase.ts | Slow motion display logic |
| /Users/brent/wtlfo/src/context/preset-context.tsx | LFO state and timing management |
| /Users/brent/wtlfo/src/components/lfo/__tests__/worklets.test.ts | Waveform tests |
| /Users/brent/wtlfo/src/hooks/useModulatedValue.ts | Modulation calculation hook |
| /Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx | Meter visualization |
| /Users/brent/wtlfo/src/components/lfo/FadeEnvelope.tsx | Fade envelope rendering |
| /Users/brent/wtlfo/src/components/lfo/PhaseIndicator.tsx | Phase dot positioning |
| /Users/brent/wtlfo/src/components/lfo/hooks/useWaveformPath.ts | Waveform path generation |
| /Users/brent/wtlfo/src/data/presets.ts | Preset configurations |
| /Users/brent/wtlfo/src/data/destinations.ts | Destination definitions |
