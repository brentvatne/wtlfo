// Test-suite definitions for LFO hardware verification.
// Extracted verbatim from useLfoVerification.ts (mechanical split, no behavior change).

import type { TestConfig } from './types';

// ============================================
// WAVEFORM TESTS
// Goal: Verify each waveform type produces correct shape
// Using consistent settings: speed=16, mult=4 (product=64, ~4s cycle)
// ============================================
export const WAVEFORM_TESTS: TestConfig[] = [
  {
    name: 'TRI waveform',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'SIN waveform',
    waveform: 'SIN',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'SQR waveform',
    waveform: 'SQR',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'SAW waveform',
    waveform: 'SAW',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'EXP waveform',
    waveform: 'EXP',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'RMP waveform',
    waveform: 'RMP',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'RND waveform',
    waveform: 'RND',
    speed: 16,
    multiplier: 4,   // 4 second cycle
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 16000,  // 4 cycles for better random coverage
  },
];

// ============================================
// SPEED/TIMING TESTS
// Goal: Verify cycle timing at different speed×multiplier products
// ============================================
export const SPEED_TESTS: TestConfig[] = [
  // Very slow: 16 bars (32000ms at 120 BPM)
  // NOTE: 16 bars = 32 seconds at 120 BPM - test captures partial cycle
  {
    name: 'SPD=8 MULT=1 (16 bars, partial cycle)',
    waveform: 'TRI',
    speed: 8,
    multiplier: 1,  // 8 × 1 = 8 → 128/8 = 16 bars = 32s cycle
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 35000,  // 35s to capture > 1 full cycle
  },
  // Slow: 4 bars (8000ms)
  {
    name: 'SPD=16 MULT=2 (4 bars)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 2,  // 16 × 2 = 32 → 128/32 = 4 bars
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 10000,
  },
  // Medium: 1 bar (2000ms)
  {
    name: 'SPD=32 MULT=4 (1 bar)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 4,  // 32 × 4 = 128 → 1 bar
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  // Fast: 1/2 note (1000ms)
  {
    name: 'SPD=32 MULT=8 (1/2 note)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,  // 32 × 8 = 256 → 1/2 note
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 4000,
  },
  // Faster: 1/4 note (500ms)
  {
    name: 'SPD=32 MULT=16 (1/4 note)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 16,  // 32 × 16 = 512 → 1/4 note
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 3000,
  },
  // Very fast: 1/8 note (250ms)
  {
    name: 'SPD=32 MULT=32 (1/8 note)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 32,  // 32 × 32 = 1024 → 1/8 note
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 2000,
  },
  // Fastest: 1/16 note (125ms)
  {
    name: 'SPD=64 MULT=32 (1/16 note)',
    waveform: 'TRI',
    speed: 63,       // Max positive speed
    multiplier: 32,  // 63 × 32 = 2016 ≈ 1/16 note
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 2000,
  },
];

// ============================================
// DEPTH TESTS
// Goal: Verify depth scaling produces correct CC range
// ============================================
export const DEPTH_TESTS: TestConfig[] = [
  {
    name: 'Depth=10 (±10 CC)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 10,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'Depth=32 (±32 CC)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 32,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'Depth=64 (±64 CC)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 64,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'Depth=127 (full range)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 127,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  // Negative depth (inverted)
  {
    name: 'Depth=-32 (inverted)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: -32,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'Depth=-127 (full inverted)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: -127,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
];

// ============================================
// START PHASE TESTS
// Goal: Verify phase offset works correctly
// ============================================
export const PHASE_TESTS: TestConfig[] = [
  {
    name: 'Phase=0 (0°)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'Phase=32 (90°)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 32,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'Phase=64 (180°)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 64,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'Phase=96 (270°)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 96,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'Phase=127 (358°)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 127,
    mode: 'TRG',
    durationMs: 5000,
  },
  // SIN waveform phase tests (different start values than TRI)
  {
    name: 'SIN Phase=0 (start at 0)',
    waveform: 'SIN',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'SIN Phase=32 (start at peak)',
    waveform: 'SIN',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 32,
    mode: 'TRG',
    durationMs: 5000,
  },
];

// ============================================
// MODE TESTS
// Goal: Verify each trigger mode behaves correctly
// ============================================
export const MODE_TESTS: TestConfig[] = [
  {
    name: 'FRE mode (free running)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'FRE',
    durationMs: 5000,
  },
  {
    name: 'TRG mode (reset on trigger, 3 triggers)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
    retriggerCount: 3,
    retriggerDelayMs: 5000,
  },
  {
    name: 'HLD mode (hold on trigger, 3 triggers)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'HLD',
    durationMs: 5000,
    retriggerCount: 3,
    retriggerDelayMs: 5000,
  },
  {
    name: 'ONE mode (one-shot, 3 triggers)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'ONE',
    durationMs: 6000,
    retriggerCount: 3,
    retriggerDelayMs: 6000,
  },
  // NOTE: HLF mode runs for HALF a cycle then holds - range will be ~50% of full
  // This is expected behavior, not a test failure
  {
    name: 'HLF mode (half cycle, 3 triggers)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,           // Full range would be 80, but HLF only goes halfway
    fade: 0,
    startPhase: 0,
    mode: 'HLF',
    durationMs: 4000,
    retriggerCount: 3,
    retriggerDelayMs: 5000,
  },
];

// ============================================
// FADE TESTS
// Goal: Verify fade-in and fade-out envelopes
// ============================================
export const FADE_TESTS: TestConfig[] = [
  // Fade-in (negative values)
  {
    name: 'Fade=-16 (slow fade-in)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: -16,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 6000,
  },
  {
    name: 'Fade=-32 (slow fade-in, ~26 cycles)',
    waveform: 'TRI',
    speed: 32,          // Faster cycle (1s) so we can see more fade progress
    multiplier: 8,
    depth: 40,
    fade: -32,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 15000,  // 15 cycles - should see ~60% fade progress
  },
  // NOTE: Fade=-63 is EXTREMELY slow (~3000 cycles) - not practical to test fully
  // Moved to investigation tests for long-duration verification
  // Fade-out (positive values)
  {
    name: 'Fade=+16 (slow fade-out)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 16,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 6000,
  },
  {
    name: 'Fade=+32 (medium fade-out)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 32,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 6000,
  },
  // NOTE: Fade=+63 takes ~3000 cycles to complete - not practical for testing
  // Use Fade=+16 (~2.2 cycles) for a visible fade-out effect
  {
    name: 'Fade=+8 (fast fade-out, ~1.4 cycles)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 8,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 6000,  // ~1.5 cycles at 4s/cycle = 6s
  },
];

// ============================================
// NEGATIVE SPEED TESTS
// Goal: Verify reversed LFO direction
// Running 3 cycles to clearly see direction pattern
// ============================================
export const NEGATIVE_SPEED_TESTS: TestConfig[] = [
  {
    name: 'Speed=-16 (reversed TRI)',
    waveform: 'TRI',
    speed: -16,
    multiplier: 4,  // 4s cycle
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 12000,  // 3 cycles
  },
  {
    name: 'Speed=-16 (reversed SAW)',
    waveform: 'SAW',
    speed: -16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 12000,  // 3 cycles
  },
  {
    name: 'Speed=-32 (reversed RMP)',
    waveform: 'RMP',
    speed: -32,
    multiplier: 4,  // 2s cycle (faster)
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 8000,  // 4 cycles
  },
];

// ============================================
// UNIPOLAR WAVEFORM TESTS
// Goal: Verify EXP and RMP only modulate one direction
// Running 3 cycles to see full waveform shape
// ============================================
export const UNIPOLAR_TESTS: TestConfig[] = [
  {
    name: 'EXP positive depth',
    waveform: 'EXP',
    speed: 16,
    multiplier: 4,  // 4s cycle
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 12000,  // 3 cycles
  },
  {
    name: 'EXP negative depth',
    waveform: 'EXP',
    speed: 16,
    multiplier: 4,
    depth: -40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 12000,  // 3 cycles
  },
  {
    name: 'RMP positive depth',
    waveform: 'RMP',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 12000,  // 3 cycles
  },
  {
    name: 'RMP negative depth',
    waveform: 'RMP',
    speed: 16,
    multiplier: 4,
    depth: -40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 12000,  // 3 cycles
  },
];

// ============================================
// COMBINATION TESTS
// Goal: Verify features work together correctly
// Running multiple cycles to see combined behavior
// ============================================
export const COMBINATION_TESTS: TestConfig[] = [
  {
    name: 'SIN + Fade-in + Phase=32',
    waveform: 'SIN',
    speed: 16,
    multiplier: 4,  // 4s cycle
    depth: 40,
    fade: -16,  // Use -16 (fast) instead of -32 (very slow with new formula)
    startPhase: 32,
    mode: 'TRG',
    durationMs: 12000,  // 3 cycles
  },
  {
    name: 'SAW + Fade-out + Negative speed',
    waveform: 'SAW',
    speed: -16,
    multiplier: 4,
    depth: 40,
    fade: 16,  // Use +16 for visible fade-out (not +32 which is slow)
    startPhase: 0,
    mode: 'TRG',
    durationMs: 12000,  // 3 cycles
  },
  // ONE mode with Phase=64 - observed 40/80 range (exactly half)
  // Need to investigate: is this ONE mode behavior or phase interaction?
  {
    name: 'TRI + ONE mode + Phase=64',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 64,
    mode: 'ONE',
    durationMs: 6000,  // ONE mode stops after 1 cycle anyway
  },
  // SIN + HLF mode + Fade-in
  // SIN with HLF sees half the waveform cycle (0° to 180°)
  // Expected range is ~50% of full since it only goes up, not back down
  {
    name: 'SIN + HLF mode + Fade-in (expect ~50% range)',
    waveform: 'SIN',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: -16,  // Use -16 for visible fade (~2.2 cycles)
    startPhase: 0,
    mode: 'HLF',
    durationMs: 6000,  // HLF stops after half cycle
  },
  {
    name: 'Fast SIN + Full depth',
    waveform: 'SIN',
    speed: 32,
    multiplier: 16,  // 500ms cycle
    depth: 127,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,  // 10 cycles
  },
  // Slow TRI with inverted depth and fade-out
  // Use faster cycle (1s) so fade is observable: fade=16 takes ~2.2 cycles = ~2.2s
  {
    name: 'TRI + Fade-out + Inverted depth',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,       // 32×8 = 256 → 1s cycle at 120BPM
    depth: -40,
    fade: 16,            // ~2.2 cycles = ~2.2s to complete
    startPhase: 0,
    mode: 'TRG',
    durationMs: 6000,    // 6 cycles - fade should complete
  },
];

// ============================================
// INVESTIGATION TESTS
// Goal: Gather detailed data to reverse engineer LFO behavior
// These are MINIMAL, TARGETED tests to determine:
// 1. SAW/RMP waveform direction
// 2. Fade timing formula
// 3. ONE mode behavior with different start phases
// ============================================
export const INVESTIGATION_TESTS: TestConfig[] = [
  // ============================================
  // ONE MODE INVESTIGATION
  // Goal: Understand ONE mode behavior with different start phases
  // Observed: Phase=64 shows 40/80 range (exactly half)
  // Question: Is this ONE mode behavior or phase interaction?
  //
  // Using retrigger feature: trigger 5x within one test, 5s between triggers
  // Cycle time is 4s (SPD=16, MULT=4), so 5s delay ensures cycle completes
  // ============================================

  // Baseline: ONE mode with startPhase=0 (trigger 5x)
  {
    name: 'ONE_INV: TRI Phase=0 (5 triggers)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,  // 4 second cycle
    depth: 40,      // Expected full range: 80
    fade: 0,
    startPhase: 0,
    mode: 'ONE',
    durationMs: 5000,       // Capture window after each trigger
    retriggerCount: 5,      // Trigger 5 times
    retriggerDelayMs: 5000, // 5s between triggers (> 4s cycle)
  },

  // Phase=64 (180°): Observed 40/80 - verify with 5 triggers
  {
    name: 'ONE_INV: TRI Phase=64 (5 triggers)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 64,
    mode: 'ONE',
    durationMs: 5000,
    retriggerCount: 5,
    retriggerDelayMs: 5000,
  },

  // Additional phases to map the behavior
  {
    name: 'ONE_INV: TRI Phase=32 (5 triggers)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 32,
    mode: 'ONE',
    durationMs: 5000,
    retriggerCount: 5,
    retriggerDelayMs: 5000,
  },
  {
    name: 'ONE_INV: TRI Phase=96 (5 triggers)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 96,
    mode: 'ONE',
    durationMs: 5000,
    retriggerCount: 5,
    retriggerDelayMs: 5000,
  },

  // Compare with TRG mode (should always show full range regardless of phase)
  {
    name: 'ONE_INV: TRG Phase=0 (control, 5 triggers)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
    retriggerCount: 5,
    retriggerDelayMs: 5000,
  },
  {
    name: 'ONE_INV: TRG Phase=64 (control, 5 triggers)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 64,
    mode: 'TRG',
    durationMs: 5000,
    retriggerCount: 5,
    retriggerDelayMs: 5000,
  },

  // ============================================
  // FADE TIMING INVESTIGATION
  // Goal: Measure actual fade cycles to determine correct formula
  //
  // Setup: TRI waveform, 1-second cycle (SPD=32, MULT=8), depth=63
  // This gives clear peaks/troughs and easy cycle counting.
  //
  // For each test, look at the [FADE] per-cycle amplitude output:
  //   Cycle  1: obs= 20 exp= 30 ✓ |████░░░░░░░░░░░░░░░░| 16%
  //   Cycle  2: obs= 50 exp= 60 ✓ |██████████░░░░░░░░░░| 40%
  //   ...
  // Find which cycle first reaches ~90% amplitude (full amplitude = 126 CC)
  // ============================================

  // FADE=-4: Expected to be very fast (~0.5-1 cycles)
  {
    name: 'FADE_INV: -4 (expect ~1 cycle)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,  // 1 second cycle
    depth: 63,      // Full range = 126 CC
    fade: -4,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,  // 5 cycles
  },

  // FADE=-8: Expected to be fast (~1-2 cycles)
  {
    name: 'FADE_INV: -8 (expect ~1-2 cycles)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: -8,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 6000,  // 6 cycles
  },

  // FADE=-16: Current formula says 2.7 cycles, test suggests ~1.5
  {
    name: 'FADE_INV: -16 (expect ~2-3 cycles)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: -16,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 8000,  // 8 cycles
  },

  // FADE=-24: Intermediate value to map the curve
  {
    name: 'FADE_INV: -24 (intermediate)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: -24,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 15000,  // 15 cycles
  },

  // FADE=-32: Current formula says 24.5 cycles, test suggests ~9
  {
    name: 'FADE_INV: -32 (expect ~10-25 cycles)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: -32,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 30000,  // 30 cycles
  },

  // FADE=-40: Another intermediate to see the curve shape
  {
    name: 'FADE_INV: -40 (intermediate)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: -40,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 45000,  // 45 cycles
  },

  // FADE=-48: Current formula says "disabled", but Digitakt shows some output
  {
    name: 'FADE_INV: -48 (currently "disabled")',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: -48,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 60000,  // 60 cycles - see if it ever reaches full
  },

  // FADE=-56: High value to test if there's really a "disabled" threshold
  {
    name: 'FADE_INV: -56 (near max)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: -56,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 60000,  // 60 cycles
  },

  // FADE=-63: Maximum negative value
  {
    name: 'FADE_INV: -63 (max negative)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: -63,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 60000,  // 60 cycles
  },

  // ============================================
  // SLOW-SPEED FADE INVESTIGATION
  // Goal: Verify fade timing is cycle-relative at different LFO speeds
  //
  // If fade is truly cycle-relative:
  //   - FADE=-16 should take ~2.2 cycles regardless of cycle duration
  //   - A 4-second cycle with FADE=-16 should reach full at same cycle count
  //     as a 1-second cycle with FADE=-16
  //
  // These tests use slower cycle times to verify this relationship
  // and include multiple triggers to observe fade reset behavior.
  // ============================================

  // SLOW FADE: 4-second cycle (SPD=16, MULT=4) vs 1-second cycle
  // Expected: Same cycle count to reach full amplitude
  {
    name: 'FADE_SLOW: -8 @ 4s cycle (expect ~1.4 cycles)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,   // 16 × 4 = 64 → 4 second cycle
    depth: 63,
    fade: -8,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 12000,  // 3 cycles at 4s each
  },
  {
    name: 'FADE_SLOW: -16 @ 4s cycle (expect ~2.2 cycles)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 63,
    fade: -16,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 16000,  // 4 cycles at 4s each
  },
  {
    name: 'FADE_SLOW: -24 @ 4s cycle (expect ~7.5 cycles)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 63,
    fade: -24,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 40000,  // 10 cycles at 4s each
  },

  // VERY SLOW: 8-second cycle (SPD=8, MULT=2)
  // Tests extreme slow speeds to ensure formula holds
  {
    name: 'FADE_VSLOW: -8 @ 8s cycle (expect ~1.4 cycles)',
    waveform: 'TRI',
    speed: 8,
    multiplier: 2,   // 8 × 2 = 16 → 8 second cycle
    depth: 63,
    fade: -8,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 20000,  // 2.5 cycles at 8s each
  },
  {
    name: 'FADE_VSLOW: -16 @ 8s cycle (expect ~2.2 cycles)',
    waveform: 'TRI',
    speed: 8,
    multiplier: 2,
    depth: 63,
    fade: -16,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 24000,  // 3 cycles at 8s each
  },

  // ============================================
  // FADE RESET WITH RETRIGGERS
  // Goal: Verify fade resets to 0 on each trigger in TRG mode
  //
  // Setup: Moderate fade with multiple triggers before fade completes
  // If fade resets correctly, each trigger should show the same
  // progressive amplitude pattern from the beginning.
  // ============================================

  // Retrigger before fade completes - should see amplitude reset each time
  {
    name: 'FADE_RETRIG: -16 with 3 triggers @ 3s intervals',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,   // 1 second cycle
    depth: 63,
    fade: -16,       // ~2.2 cycles to complete
    startPhase: 0,
    mode: 'TRG',
    durationMs: 2500,       // ~2.5 cycles per trigger window
    retriggerCount: 3,
    retriggerDelayMs: 3000, // Retrigger every 3s
  },

  // Retrigger during fade-out - should restart at full amplitude
  {
    name: 'FADE_RETRIG: +16 with 3 triggers @ 3s intervals',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: 16,        // Fade OUT: ~2.2 cycles to silence
    startPhase: 0,
    mode: 'TRG',
    durationMs: 2500,
    retriggerCount: 3,
    retriggerDelayMs: 3000,
  },

  // Slower cycle with retriggers - verify reset at different speeds
  {
    name: 'FADE_RETRIG_SLOW: -16 @ 4s cycle, 3 triggers',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,   // 4 second cycle
    depth: 63,
    fade: -16,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 10000,      // 2.5 cycles per trigger window
    retriggerCount: 3,
    retriggerDelayMs: 12000, // Retrigger every 12s (~3 cycles)
  },

  // ============================================
  // FADE + FRE MODE (Should NOT fade - requires trigger)
  // Goal: Verify fade has no effect in FRE mode
  // ============================================
  {
    name: 'FADE_FRE: -32 in FRE mode (no fade expected)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: -32,
    startPhase: 0,
    mode: 'FRE',
    durationMs: 10000,  // 10 cycles
  },
  {
    name: 'FADE_FRE: +32 in FRE mode (no fade expected)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: 32,
    startPhase: 0,
    mode: 'FRE',
    durationMs: 10000,
  },
];

// ============================================
// EDGE CASE TESTS
// Goal: Verify behavior at parameter boundaries
// ============================================
export const EDGE_CASE_TESTS: TestConfig[] = [
  {
    name: 'Max speed (63)',
    waveform: 'TRI',
    speed: 63,
    multiplier: 1,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  // NOTE: Speed=1, Mult=1 = 256 second cycle - too slow for practical testing
  // Use higher multiplier to get reasonable cycle time while still testing min speed
  {
    name: 'Min speed (1) with mult=128',
    waveform: 'TRI',
    speed: 1,
    multiplier: 128,   // 1 × 128 = 128 → 2 second cycle
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,  // ~2.5 cycles
  },
  {
    name: 'Max multiplier (2048)',
    waveform: 'TRI',
    speed: 1,
    multiplier: 2048,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 2000,
  },
  {
    name: 'Depth=1 (minimal)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 1,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'Phase=1 (minimal offset)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 1,
    mode: 'TRG',
    durationMs: 5000,
  },
];

// Collect all test suites
export const ALL_TEST_SUITES = {
  waveform: { name: 'Waveform Tests', tests: WAVEFORM_TESTS },
  speed: { name: 'Speed/Timing Tests', tests: SPEED_TESTS },
  depth: { name: 'Depth Tests', tests: DEPTH_TESTS },
  phase: { name: 'Start Phase Tests', tests: PHASE_TESTS },
  mode: { name: 'Mode Tests', tests: MODE_TESTS },
  fade: { name: 'Fade Tests', tests: FADE_TESTS },
  negativeSpeed: { name: 'Negative Speed Tests', tests: NEGATIVE_SPEED_TESTS },
  unipolar: { name: 'Unipolar Waveform Tests', tests: UNIPOLAR_TESTS },
  combination: { name: 'Combination Tests', tests: COMBINATION_TESTS },
  edgeCase: { name: 'Edge Case Tests', tests: EDGE_CASE_TESTS },
  investigation: { name: 'Investigation Tests', tests: INVESTIGATION_TESTS },
};

// Legacy exports for backward compatibility
export const TRIGGER_TESTS = MODE_TESTS.filter(t => t.mode === 'TRG' || t.mode === 'FRE');
export const TIMING_TESTS = SPEED_TESTS;
export const TEST_SUITE = WAVEFORM_TESTS;

// Export test suite type for UI components
export type TestSuiteKey = keyof typeof ALL_TEST_SUITES;
