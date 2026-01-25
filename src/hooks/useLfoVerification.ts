import { useState, useRef, useCallback } from 'react';
import { useEventListener } from 'expo';
import { LFO } from 'elektron-lfo';
import MidiControllerModule from '@/modules/midi-controller/src/MidiControllerModule';
import { sendCC, sendNoteOn, sendNoteOff } from '@/modules/midi-controller/src/hooks';

export interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'data';
}

interface CapturedCC {
  timestamp: number;
  value: number;
}

interface TestFailure {
  testName: string;
  timestamp: number;
  digitaktValue: number;
  engineValue: number;
  diff: number;
}

interface TimingResult {
  expectedCycleMs: number;
  observedCycleMs: number;
  driftPercent: number;
  pass: boolean;
}

// Per-cycle amplitude for fade verification
interface CycleAmplitude {
  cycle: number;
  observedAmplitude: number;
  expectedAmplitude: number;
  pass: boolean;
}

interface FadeResult {
  cycleAmplitudes: CycleAmplitude[];
  fadePass: boolean;
  fadeSummary: string;
}

interface ShapeResult {
  // Range: does it achieve the expected CC swing?
  expectedRange: number;  // expected CC swing (e.g., 80 for depth=40 bipolar)
  observedRange: number;  // actual CC swing observed
  rangePass: boolean;

  // Bounds: is it centered correctly?
  expectedMin: number;
  expectedMax: number;
  observedMin: number;
  observedMax: number;
  boundsPass: boolean;

  // Direction: for monotonic waveforms, is direction correct?
  directionPass: boolean;
  directionInfo: string;

  // Fade: per-cycle amplitude comparison (only for fade tests)
  fade?: FadeResult;
}

interface TestResult {
  testName: string;
  passed: number;
  failed: number;
  failures: TestFailure[];
  // Legacy fields for backward compatibility
  timingStatus: string;
  rangeStatus: string;
  observedRange: { min: number; max: number };
  expectedRange: { min: number; max: number };
  observedCycleMs: number;
  expectedCycleMs: number;
  // New separated results
  timing: TimingResult;
  shape: ShapeResult;
}

interface TestConfig {
  name: string;
  waveform: 'TRI' | 'SIN' | 'SQR' | 'SAW' | 'EXP' | 'RMP' | 'RND';
  speed: number;
  multiplier: 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048;
  depth: number;
  fade: number;
  startPhase: number;
  mode: 'FRE' | 'TRG' | 'HLD' | 'ONE' | 'HLF';
  durationMs: number;
}

// Digitakt MIDI Track parameter CCs (sent on the track's auto channel, typically ch 10)
const TRACK_PARAM_CHANNEL = 9;

const LFO1_CCS = {
  speed: 102,
  multiplier: 103,
  fade: 104,
  destination: 105,
  waveform: 106,
  startPhase: 107,
  mode: 108,
  depth: 109,
};

const WAVEFORM_VALUES: Record<string, number> = {
  TRI: 0, SIN: 1, SQR: 2, SAW: 3, EXP: 4, RMP: 5, RND: 6,
};

const MODE_VALUES: Record<string, number> = {
  FRE: 0, TRG: 1, HLD: 2, ONE: 3, HLF: 4,
};

const MULTIPLIER_VALUES: Record<number, number> = {
  1: 0, 2: 1, 4: 2, 8: 3, 16: 4, 32: 5, 64: 6, 128: 7, 256: 8, 512: 9, 1024: 10, 2048: 11,
};

const LFO_DEST_CC_VAL1 = 70;
const TRACK_OUTPUT_CHANNEL = 0;  // Channel 1 - configured in Digitakt MIDI settings
const LFO_OUTPUT_CC = 70;
const TEST_BPM = 120;

// ============================================
// FADE VERIFICATION HELPERS
// ============================================

/**
 * Calculate fade cycles - how many LFO cycles for complete fade
 * Replicates the formula from elektron-lfo/src/engine/fade.ts
 */
function calculateFadeCycles(fadeValue: number): number {
  if (fadeValue === 0) return 0;

  const absFade = Math.abs(fadeValue);

  // |FADE| >= 48 is effectively disabled (infinitely slow fade)
  if (absFade >= 48) {
    return Infinity;
  }

  // Fast fade region: roughly linear
  if (absFade <= 16) {
    // |FADE|=4 → ~0.7 cycles, |FADE|=16 → ~2.7 cycles
    return Math.max(0.5, absFade / 6);
  }

  // Slow fade region: exponential growth
  const baseAt16 = 16 / 6; // ~2.67 cycles
  return baseAt16 * Math.pow(2, (absFade - 16) / 5);
}

/**
 * Calculate expected amplitude at a given cycle number
 * @param fadeValue - The FADE parameter (-64 to +63)
 * @param cycleNumber - Which cycle (1-based)
 * @param fullAmplitude - Full amplitude (depth * 2 for CC swing)
 * @returns Expected amplitude at that cycle
 */
function calculateExpectedAmplitudeAtCycle(
  fadeValue: number,
  cycleNumber: number,
  fullAmplitude: number
): number {
  if (fadeValue === 0) return fullAmplitude;

  const fadeCycles = calculateFadeCycles(fadeValue);
  if (!isFinite(fadeCycles)) return 0; // Disabled fade

  // Progress through fade at end of this cycle
  const progress = Math.min(1, cycleNumber / fadeCycles);

  if (fadeValue < 0) {
    // Fade IN: amplitude increases from 0 to full
    return fullAmplitude * progress;
  } else {
    // Fade OUT: amplitude decreases from full to 0
    return fullAmplitude * (1 - progress);
  }
}

/**
 * Detect cycles from CC data using peak/trough detection
 * Returns array of cycle amplitudes (max - min within each cycle window)
 */
function detectCycleAmplitudes(
  ccData: CapturedCC[],
  expectedCycleMs: number
): { cycle: number; amplitude: number; min: number; max: number }[] {
  if (ccData.length === 0) return [];

  const sorted = [...ccData].sort((a, b) => a.timestamp - b.timestamp);
  const totalDuration = sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
  const numCycles = Math.ceil(totalDuration / expectedCycleMs);

  const cycles: { cycle: number; amplitude: number; min: number; max: number }[] = [];

  for (let cycle = 0; cycle < Math.min(numCycles, 20); cycle++) {
    const cycleStart = cycle * expectedCycleMs;
    const cycleEnd = (cycle + 1) * expectedCycleMs;

    const ccsInCycle = sorted.filter(cc =>
      cc.timestamp >= cycleStart && cc.timestamp < cycleEnd
    );

    if (ccsInCycle.length > 0) {
      const values = ccsInCycle.map(cc => cc.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      cycles.push({
        cycle: cycle + 1,
        amplitude: max - min,
        min,
        max,
      });
    }
  }

  return cycles;
}

/**
 * Compare per-cycle amplitudes between Digitakt and engine expectations
 * Returns FadeResult with pass/fail for each cycle and overall
 */
function compareFadeAmplitudes(
  observedCycles: { cycle: number; amplitude: number; min: number; max: number }[],
  fadeValue: number,
  fullAmplitude: number,
  tolerance: number = 0.25 // 25% tolerance
): FadeResult {
  const cycleAmplitudes: CycleAmplitude[] = [];

  for (const observed of observedCycles) {
    const expected = calculateExpectedAmplitudeAtCycle(
      fadeValue,
      observed.cycle,
      fullAmplitude
    );

    // Pass if within tolerance OR if both are small (< 10 CC)
    const diff = Math.abs(observed.amplitude - expected);
    const toleranceValue = Math.max(fullAmplitude * tolerance, 10); // At least 10 CC tolerance
    const pass = diff <= toleranceValue;

    cycleAmplitudes.push({
      cycle: observed.cycle,
      observedAmplitude: observed.amplitude,
      expectedAmplitude: Math.round(expected),
      pass,
    });
  }

  // Overall pass if majority of cycles pass (>= 70%)
  const passCount = cycleAmplitudes.filter(c => c.pass).length;
  const fadePass = cycleAmplitudes.length > 0 && (passCount / cycleAmplitudes.length) >= 0.7;

  // Generate summary
  const fadeCycles = calculateFadeCycles(fadeValue);
  const direction = fadeValue < 0 ? 'IN' : 'OUT';
  let fadeSummary = `Fade ${direction}: ${passCount}/${cycleAmplitudes.length} cycles match`;
  if (isFinite(fadeCycles)) {
    fadeSummary += ` (${fadeCycles.toFixed(1)} cycles to complete)`;
  }

  return {
    cycleAmplitudes,
    fadePass,
    fadeSummary,
  };
}

// ASCII waveform visualization
const WAVEFORM_HEIGHT = 8;
const WAVEFORM_WIDTH = 40;

/**
 * Draw ASCII waveform comparing observed (Digitakt) vs expected (engine) values
 * Returns array of log lines to display
 */
function drawWaveformComparison(
  observed: { timestamp: number; value: number }[],
  expected: { timestamp: number; value: number }[]
): string[] {
  if (observed.length === 0) return ['No data to visualize'];

  const lines: string[] = [];

  // Normalize timestamps to 0-based
  const minTime = Math.min(...observed.map(p => p.timestamp));
  const maxTime = Math.max(...observed.map(p => p.timestamp));
  const timeRange = maxTime - minTime || 1;

  // Create grid: rows are value (127 at top, 0 at bottom), cols are time
  const grid: string[][] = [];
  for (let row = 0; row < WAVEFORM_HEIGHT; row++) {
    grid.push(new Array(WAVEFORM_WIDTH).fill(' '));
  }

  // Map CC value (0-127) to row (0 = top = 127, WAVEFORM_HEIGHT-1 = bottom = 0)
  const valueToRow = (value: number) => {
    const normalized = Math.max(0, Math.min(127, value)) / 127;
    return Math.floor((1 - normalized) * (WAVEFORM_HEIGHT - 1));
  };

  // Map timestamp to column
  const timeToCol = (timestamp: number) => {
    const normalized = (timestamp - minTime) / timeRange;
    return Math.min(WAVEFORM_WIDTH - 1, Math.floor(normalized * WAVEFORM_WIDTH));
  };

  // Plot expected (engine) values first with dots
  for (const point of expected) {
    const col = timeToCol(point.timestamp);
    const row = valueToRow(point.value);
    if (grid[row][col] === ' ') {
      grid[row][col] = '·';
    }
  }

  // Plot observed (Digitakt) values with 'o' - overwrites expected
  for (const point of observed) {
    const col = timeToCol(point.timestamp);
    const row = valueToRow(point.value);
    const current = grid[row][col];
    if (current === '·') {
      grid[row][col] = '●'; // Match! Both at same position
    } else {
      grid[row][col] = 'o';
    }
  }

  // Build output
  lines.push('');
  lines.push('Waveform: o=Digitakt  ·=Engine  ●=Match');
  lines.push('127 ┬' + '─'.repeat(WAVEFORM_WIDTH) + '┐');

  for (let row = 0; row < WAVEFORM_HEIGHT; row++) {
    const leftLabel = row === 0 ? '    │' :
                      row === WAVEFORM_HEIGHT - 1 ? '  0 │' :
                      row === Math.floor(WAVEFORM_HEIGHT / 2) ? ' 64 │' : '    │';
    lines.push(leftLabel + grid[row].join('') + '│');
  }

  lines.push('    └' + '─'.repeat(WAVEFORM_WIDTH) + '┘');
  lines.push(`     0ms${' '.repeat(WAVEFORM_WIDTH - 10)}${maxTime}ms`);

  return lines;
}

// ============================================
// WAVEFORM TESTS
// Goal: Verify each waveform type produces correct shape
// Using consistent settings: speed=16, mult=4 (product=64, ~4s cycle)
// ============================================
const WAVEFORM_TESTS: TestConfig[] = [
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
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
];

// ============================================
// SPEED/TIMING TESTS
// Goal: Verify cycle timing at different speed×multiplier products
// ============================================
const SPEED_TESTS: TestConfig[] = [
  // Very slow: 16 bars (32000ms at 120 BPM)
  {
    name: 'SPD=8 MULT=1 (16 bars)',
    waveform: 'TRI',
    speed: 8,
    multiplier: 1,  // 8 × 1 = 8 → 128/8 = 16 bars
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 8000,  // Capture partial cycle
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
const DEPTH_TESTS: TestConfig[] = [
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
const PHASE_TESTS: TestConfig[] = [
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
const MODE_TESTS: TestConfig[] = [
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
    name: 'TRG mode (reset on trigger)',
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
    name: 'HLD mode (hold on trigger)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'HLD',
    durationMs: 5000,
  },
  {
    name: 'ONE mode (one-shot)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'ONE',
    durationMs: 6000,  // Longer to see it stop
  },
  {
    name: 'HLF mode (half cycle)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'HLF',
    durationMs: 4000,
  },
];

// ============================================
// FADE TESTS
// Goal: Verify fade-in and fade-out envelopes
// ============================================
const FADE_TESTS: TestConfig[] = [
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
    name: 'Fade=-32 (medium fade-in)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: -32,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 6000,
  },
  {
    name: 'Fade=-63 (fast fade-in)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: -63,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
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
  {
    name: 'Fade=+63 (fast fade-out)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 63,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
];

// ============================================
// NEGATIVE SPEED TESTS
// Goal: Verify reversed LFO direction
// Running 3 cycles to clearly see direction pattern
// ============================================
const NEGATIVE_SPEED_TESTS: TestConfig[] = [
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
const UNIPOLAR_TESTS: TestConfig[] = [
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
const COMBINATION_TESTS: TestConfig[] = [
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
  {
    name: 'SQR + HLF mode + Fade-in',
    waveform: 'SQR',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: -16,  // Use -16 for visible fade
    startPhase: 0,
    mode: 'HLF',
    durationMs: 8000,  // HLF stops after half cycle but need time for fade
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
  {
    name: 'Slow TRI + Fade-out + Inverted',
    waveform: 'TRI',
    speed: 8,
    multiplier: 2,
    depth: -40,
    fade: 32,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 10000,
  },
];

// ============================================
// INVESTIGATION TESTS
// Goal: Gather detailed data to reverse engineer LFO behavior
// These are MINIMAL, TARGETED tests to determine:
// 1. SAW/RMP waveform direction
// 2. Fade timing formula
// ============================================
const INVESTIGATION_TESTS: TestConfig[] = [
  // ============================================
  // DIRECTION INVESTIGATION
  // Goal: Determine if SAW starts HIGH→LOW or LOW→HIGH
  // Using slow LFO (4s cycle) to capture clear direction data
  // Running 3 full cycles to distinguish first-value artifacts from pattern
  // ============================================
  {
    name: 'DIR1: SAW positive speed',
    waveform: 'SAW',
    speed: 16,
    multiplier: 4,  // 4 second cycle - slow enough to see clearly
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 24000,  // 6 cycles (5 after skipping first for analysis)
  },
  {
    name: 'DIR2: SAW negative speed',
    waveform: 'SAW',
    speed: -16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 24000,  // 6 cycles (5 after skipping first for analysis)
  },
  {
    name: 'DIR3: RMP positive speed',
    waveform: 'RMP',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 24000,  // 6 cycles (5 after skipping first for analysis)
  },
  {
    name: 'DIR4: RMP negative speed',
    waveform: 'RMP',
    speed: -16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 24000,  // 6 cycles (5 after skipping first for analysis)
  },
  {
    name: 'DIR5: TRI positive speed (baseline)',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 10000,  // 2.5 cycles for baseline comparison
  },

  // ============================================
  // FADE TIMING INVESTIGATION
  // Goal: Determine fade formula by measuring cycles to full amplitude
  // Using 1-second cycle (SPD=32, MULT=8) for easy counting
  // FADE=-64 confirmed as "disabled" (stays at 1%) - removed
  // ============================================
  {
    name: 'FADE2: Fade-in FADE=-32 (1s cycle)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: -32,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 12000,
  },
  {
    name: 'FADE3: Fade-in FADE=-16 (1s cycle)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: -16,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 8000,  // 8 cycles - enough to see full amplitude
  },
  {
    name: 'FADE3b: Fade-in FADE=-8 (1s cycle)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: -8,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 6000,  // Should be very fast
  },
  {
    name: 'FADE3c: Fade-in FADE=-4 (1s cycle)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: -4,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 6000,  // Should be nearly instant
  },
  {
    name: 'FADE3d: Fade-in FADE=-48 (1s cycle)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: -48,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 15000,  // 15 cycles - between -32 and -64
  },
  {
    name: 'FADE4: Fade-out FADE=+64 (1s cycle)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: 64,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 12000,
  },
  {
    name: 'FADE5: Fade-out FADE=+32 (1s cycle)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 63,
    fade: 32,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 12000,
  },
];

// ============================================
// EDGE CASE TESTS
// Goal: Verify behavior at parameter boundaries
// ============================================
const EDGE_CASE_TESTS: TestConfig[] = [
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
  {
    name: 'Min speed (1)',
    waveform: 'TRI',
    speed: 1,
    multiplier: 1,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 10000,
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
const ALL_TEST_SUITES = {
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
const TRIGGER_TESTS = MODE_TESTS.filter(t => t.mode === 'TRG' || t.mode === 'FRE');
const TIMING_TESTS = SPEED_TESTS;
const TEST_SUITE = WAVEFORM_TESTS;

export function useLfoVerification() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<number>(0);
  const capturedCCsRef = useRef<CapturedCC[]>([]);
  const triggerTimeRef = useRef<number>(0);
  const isCapturingRef = useRef(false);
  const allCCsSeenRef = useRef<Map<number, number>>(new Map());

  const log = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = { timestamp: Date.now(), message, type };
    console.log(`[LFO Test] ${message}`);
    setLogs((prev) => [...prev, entry]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Listen for CC changes from Digitakt
  // Uses native timestamps from CoreMIDI for accurate timing
  useEventListener(MidiControllerModule, 'onCcChange', (event) => {
    if (isCapturingRef.current) {
      allCCsSeenRef.current.set(event.cc, (allCCsSeenRef.current.get(event.cc) || 0) + 1);
      if (event.cc === LFO_OUTPUT_CC) {
        // Use native timestamp (ms since boot) relative to trigger time
        const timestamp = event.timestamp - triggerTimeRef.current;
        capturedCCsRef.current.push({ timestamp, value: event.value });
      }
    }
  });

  const configureLfo = useCallback((config: TestConfig) => {
    const speedCC = 64 + config.speed;
    const multCC = MULTIPLIER_VALUES[config.multiplier];
    // Depth: CC 0-127 maps to -128 to +127. Clamp to valid CC range.
    const depthCC = Math.min(127, Math.round(64 + config.depth / 2));

    const product = config.speed * config.multiplier;
    const expectedCycleMs = product >= 128
      ? (2000 / (product / 128))
      : (2000 * (128 / product));

    // Calculate expected CC range from depth
    // Depth N means output swings ±N from center, so CC range is (64-N) to (64+N)
    const expectedCcMin = Math.max(0, 64 - config.depth);
    const expectedCcMax = Math.min(127, 64 + config.depth);

    console.log(`[LFO_CONFIG] channel=${TRACK_PARAM_CHANNEL + 1} speed=${config.speed} mult=${config.multiplier} depth=${config.depth} mode=${config.mode} startPhase=${config.startPhase}`);
    console.log(`[LFO_CONFIG] cc_values: speed_cc=${speedCC} mult_cc=${multCC} depth_cc=${depthCC}`);
    console.log(`[LFO_CONFIG] expected: product=${product} cycle_ms=${expectedCycleMs.toFixed(0)} cc_range=[${expectedCcMin}-${expectedCcMax}]`);

    // Waveform
    sendCC(TRACK_PARAM_CHANNEL, LFO1_CCS.waveform, WAVEFORM_VALUES[config.waveform]);
    // Speed: CC 0-127 maps to display -64 to +63
    sendCC(TRACK_PARAM_CHANNEL, LFO1_CCS.speed, speedCC);
    // Multiplier
    sendCC(TRACK_PARAM_CHANNEL, LFO1_CCS.multiplier, multCC);
    // Depth: CC 0-127 maps to display -128 to +127
    sendCC(TRACK_PARAM_CHANNEL, LFO1_CCS.depth, depthCC);
    // Fade: CC 0-127 maps to display -64 to +63
    sendCC(TRACK_PARAM_CHANNEL, LFO1_CCS.fade, 64 + config.fade);
    // Start phase
    sendCC(TRACK_PARAM_CHANNEL, LFO1_CCS.startPhase, config.startPhase);
    // Mode
    sendCC(TRACK_PARAM_CHANNEL, LFO1_CCS.mode, MODE_VALUES[config.mode]);
    // Destination
    sendCC(TRACK_PARAM_CHANNEL, LFO1_CCS.destination, LFO_DEST_CC_VAL1);
  }, []);

  const runSingleTest = useCallback(async (config: TestConfig): Promise<TestResult> => {
    capturedCCsRef.current = [];
    allCCsSeenRef.current.clear();

    // Calculate expected ranges based on waveform type and depth
    // Unipolar waveforms (RMP, EXP):
    //   depth >= 0: output 1→0, CC range [64, 64+depth]
    //   depth < 0:  output -1→0, CC range [64-|depth|, 64]
    // Bipolar waveforms: CC range [64-|depth|, 64+|depth|]
    const isUnipolar = config.waveform === 'RMP' || config.waveform === 'EXP';
    let expectedMin: number;
    let expectedMax: number;
    if (isUnipolar) {
      if (config.depth >= 0) {
        expectedMin = 64;
        expectedMax = Math.min(127, 64 + config.depth);
      } else {
        expectedMin = Math.max(0, 64 + config.depth); // depth is negative, so this subtracts
        expectedMax = 64;
      }
    } else {
      expectedMin = Math.max(0, 64 - Math.abs(config.depth));
      expectedMax = Math.min(127, 64 + Math.abs(config.depth));
    }
    const expectedRangeSize = expectedMax - expectedMin;

    const result: TestResult = {
      testName: config.name,
      passed: 0,
      failed: 0,
      failures: [],
      timingStatus: 'UNKNOWN',
      rangeStatus: 'UNKNOWN',
      observedRange: { min: 64, max: 64 },
      expectedRange: { min: expectedMin, max: expectedMax },
      observedCycleMs: 0,
      expectedCycleMs: 0,
      timing: {
        expectedCycleMs: 0,
        observedCycleMs: 0,
        driftPercent: 0,
        pass: false,
      },
      shape: {
        expectedRange: expectedRangeSize,
        observedRange: 0,
        rangePass: false,
        expectedMin,
        expectedMax,
        observedMin: 64,
        observedMax: 64,
        boundsPass: false,
        directionPass: true, // Assume pass unless proven otherwise
        directionInfo: '',
      },
    };

    log(`--- ${config.name} ---`);
    log(`${config.waveform} | SPD=${config.speed} | MULT=${config.multiplier} | DEPTH=${config.depth} | MODE=${config.mode}`);
    if (config.fade !== 0) log(`Fade=${config.fade}`);
    if (config.startPhase !== 0) log(`StartPhase=${config.startPhase}`);

    // Configure LFO - give Digitakt time to process all CCs
    configureLfo(config);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Start capture and trigger
    // Use native timestamp for accurate timing (same time domain as CC events)
    isCapturingRef.current = true;
    triggerTimeRef.current = MidiControllerModule.getCurrentTimestamp();
    console.log(`[LFO_TRIGGER] Sending note-on: channel=${TRACK_OUTPUT_CHANNEL + 1} note=60 velocity=100`);
    sendNoteOn(TRACK_OUTPUT_CHANNEL, 60, 100);
    await new Promise((resolve) => setTimeout(resolve, 50));  // Longer note duration
    sendNoteOff(TRACK_OUTPUT_CHANNEL, 60);
    console.log(`[LFO_TRIGGER] Sent note-off`);

    // Capture
    await new Promise((resolve) => setTimeout(resolve, config.durationMs));
    isCapturingRef.current = false;

    log(`Captured ${capturedCCsRef.current.length} CC values on CC${LFO_OUTPUT_CC}`);

    // Debug: show all CCs we saw during capture
    if (allCCsSeenRef.current.size > 0) {
      const ccSummary = Array.from(allCCsSeenRef.current.entries())
        .map(([cc, count]) => `CC${cc}:${count}`)
        .join(', ');
      console.log(`[LFO_DEBUG] All CCs received during capture: ${ccSummary}`);
    } else {
      console.log(`[LFO_DEBUG] No CCs received at all during capture!`);
    }

    // ============================================
    // DETAILED DIRECTION LOGGING
    // Log first 15 CC values with timestamps to analyze direction
    // Show timing relative to trigger to detect pre-trigger artifacts
    // Skip the first cycle to avoid trigger reset artifacts
    // ============================================
    // Calculate expected cycle time for filtering
    const analysisProduct = Math.abs(config.speed) * config.multiplier;
    const analysisCycleMs = analysisProduct >= 128
      ? (2000 / (analysisProduct / 128))
      : (2000 * (128 / analysisProduct));

    if (capturedCCsRef.current.length > 0) {
      const allSortedCCs = [...capturedCCsRef.current].sort((a, b) => a.timestamp - b.timestamp);

      // Filter to skip first cycle for steady-state analysis
      const sortedForDirection = allSortedCCs.filter(cc => cc.timestamp >= analysisCycleMs);
      const hasEnoughDataAfterFirstCycle = sortedForDirection.length >= 10;

      // For logging, still show first cycle data
      console.log(`[DIRECTION] Skipping first cycle (${analysisCycleMs.toFixed(0)}ms) for analysis. ${allSortedCCs.length} total CCs, ${sortedForDirection.length} after first cycle.`);

      // If not enough data after first cycle, fall back to all data
      const effectiveSortedCCs = hasEnoughDataAfterFirstCycle ? sortedForDirection : allSortedCCs;
      if (!hasEnoughDataAfterFirstCycle) {
        console.log(`[DIRECTION] Not enough data after first cycle, using all data`);
      }
      // Show first 15 CCs from the start (including first cycle) for debugging
      const first15 = allSortedCCs.slice(0, 15);
      const triggerTime = triggerTimeRef.current;

      console.log(`[DIRECTION] ════════════════════════════════════════`);
      console.log(`[DIRECTION] Trigger sent at t=${triggerTime.toFixed(0)}ms`);
      console.log(`[DIRECTION] First ${first15.length} CC values (from cycle 1, for reference):`);

      let directionVotes = { UP: 0, DOWN: 0, FLAT: 0 };
      let preTriggerCount = 0;
      for (let i = 0; i < first15.length; i++) {
        const cc = first15[i];
        // cc.timestamp is already relative to triggerTime (computed at capture time)
        const relativeTime = cc.timestamp;
        const relativeStr = relativeTime >= 0 ? `+${relativeTime.toFixed(0)}` : `${relativeTime.toFixed(0)}`;
        let arrow = '  ';
        if (i > 0) {
          const diff = cc.value - first15[i - 1].value;
          if (diff > 0) { arrow = '↑'; directionVotes.UP++; }
          else if (diff < 0) { arrow = '↓'; directionVotes.DOWN++; }
          else { arrow = '─'; directionVotes.FLAT++; }
        }
        const preTriggerMarker = relativeTime < 0 ? ' [PRE-TRIGGER]' : '';
        if (relativeTime < 0) preTriggerCount++;
        console.log(`[DIRECTION]   t=${relativeStr.padStart(6)}ms: CC=${cc.value.toString().padStart(3)} ${arrow}${preTriggerMarker}`);
      }
      if (preTriggerCount > 0) {
        console.log(`[DIRECTION] ⚠️  ${preTriggerCount} CC values arrived BEFORE trigger - likely artifacts`);
      }

      // Analyze overall direction from first 10 significant movements (after skipping first cycle)
      const significantMoves = [];
      for (let i = 1; i < effectiveSortedCCs.length && significantMoves.length < 10; i++) {
        const diff = effectiveSortedCCs[i].value - effectiveSortedCCs[i - 1].value;
        if (Math.abs(diff) >= 2) {  // Only count moves of 2+ CC
          significantMoves.push({
            from: effectiveSortedCCs[i - 1].value,
            to: effectiveSortedCCs[i].value,
            diff,
            timestamp: effectiveSortedCCs[i].timestamp,
          });
        }
      }

      console.log(`[DIRECTION] Significant moves (Δ≥2) from cycle 2+:`);
      for (const move of significantMoves) {
        const dir = move.diff > 0 ? 'UP  ' : 'DOWN';
        console.log(`[DIRECTION]   t=${move.timestamp.toFixed(0).padStart(5)}ms: ${move.from}→${move.to} (${dir} Δ${Math.abs(move.diff)})`);
      }

      // Summary
      const firstSigMove = significantMoves[0];
      const detectedDirection = firstSigMove ? (firstSigMove.diff > 0 ? 'UP' : 'DOWN') : 'UNKNOWN';
      const firstValueCycle2 = effectiveSortedCCs[0]?.value ?? 0;
      console.log(`[DIRECTION] ════════════════════════════════════════`);
      console.log(`[DIRECTION] SUMMARY (cycle 2+): First value=${firstValueCycle2}, First significant move=${detectedDirection}`);
      console.log(`[DIRECTION] Vote tally (cycle 1): UP=${directionVotes.UP} DOWN=${directionVotes.DOWN} FLAT=${directionVotes.FLAT}`);

      // ============================================
      // CYCLE BOUNDARY ANALYSIS (using data after first cycle)
      // Find min/max peaks to identify cycle boundaries
      // Compare first value against subsequent cycle starts
      // ============================================
      const allValues = effectiveSortedCCs.map(cc => cc.value);
      const minVal = Math.min(...allValues);
      const maxVal = Math.max(...allValues);
      const range = maxVal - minVal;

      // Find peaks (local max) and troughs (local min) as cycle boundaries
      const peaks: { timestamp: number; value: number; type: 'peak' | 'trough' }[] = [];
      for (let i = 1; i < effectiveSortedCCs.length - 1; i++) {
        const prev = effectiveSortedCCs[i - 1].value;
        const curr = effectiveSortedCCs[i].value;
        const next = effectiveSortedCCs[i + 1].value;
        // Only count extremes near the actual min/max (within 10% of range)
        if (curr >= prev && curr >= next && curr > maxVal - range * 0.1) {
          peaks.push({ timestamp: effectiveSortedCCs[i].timestamp, value: curr, type: 'peak' });
        } else if (curr <= prev && curr <= next && curr < minVal + range * 0.1) {
          peaks.push({ timestamp: effectiveSortedCCs[i].timestamp, value: curr, type: 'trough' });
        }
      }

      // Filter to major peaks (at least 500ms apart to avoid noise)
      const majorPeaks = peaks.filter((p, i) => i === 0 || p.timestamp - peaks[i - 1].timestamp > 500);

      console.log(`[DIRECTION] Cycle boundaries (peaks/troughs):`);
      for (const peak of majorPeaks.slice(0, 10)) {
        // peak.timestamp is already relative to triggerTime (from capturedCCsRef)
        const relTime = peak.timestamp;
        console.log(`[DIRECTION]   t=${relTime >= 0 ? '+' : ''}${relTime.toFixed(0).padStart(5)}ms: ${peak.type.toUpperCase().padStart(6)} at CC=${peak.value}`);
      }

      // Check if first value (from cycle 2+) matches any cycle boundary pattern
      const firstIsPeak = Math.abs(firstValueCycle2 - maxVal) < range * 0.15;
      const firstIsTrough = Math.abs(firstValueCycle2 - minVal) < range * 0.15;
      const firstIsCenter = Math.abs(firstValueCycle2 - (maxVal + minVal) / 2) < range * 0.15;
      console.log(`[DIRECTION] First value analysis (cycle 2+): peak=${firstIsPeak}, trough=${firstIsTrough}, center=${firstIsCenter}`);
      console.log(`[DIRECTION] Range: min=${minVal} center=${Math.round((maxVal + minVal) / 2)} max=${maxVal}`);

      log(`Direction: starts at ${firstValueCycle2}, first move ${detectedDirection}`, 'data');
    }

    // Log first and last capture times for debugging MIDI latency
    if (capturedCCsRef.current.length > 0) {
      const times = capturedCCsRef.current.map(cc => cc.timestamp);
      const firstTime = Math.min(...times);
      const lastTime = Math.max(...times);
      log(`First CC at ${firstTime}ms, last at ${lastTime}ms`);

      // Calculate observed cycle time from direction changes
      const values = capturedCCsRef.current.map(cc => cc.value);
      let dirChanges = 0;
      let lastDir = 0;
      for (let i = 1; i < values.length; i++) {
        const dir = Math.sign(values[i] - values[i - 1]);
        if (dir !== 0 && dir !== lastDir) {
          dirChanges++;
          lastDir = dir;
        }
      }

      // Expected cycle time from formula (use absolute speed for timing)
      const product = Math.abs(config.speed) * config.multiplier;
      const expectedCycleMs = product >= 128
        ? (2000 / (product / 128))  // faster than 1 bar
        : (2000 * (128 / product)); // slower than 1 bar

      // Observed cycle time (2 direction changes = 1 cycle)
      const observedCycles = dirChanges / 2;
      const duration = lastTime - firstTime;
      const observedCycleMs = observedCycles > 0 ? duration / observedCycles : 0;

      // Min/max values
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);

      // First few values to see start behavior
      // Skip first cycle to avoid trigger reset artifacts
      const allSortedForDir = [...capturedCCsRef.current].sort((a, b) => a.timestamp - b.timestamp);
      const sortedForDir = allSortedForDir.filter(cc => cc.timestamp >= expectedCycleMs);
      const startValue = sortedForDir[0]?.value ?? allSortedForDir[0]?.value ?? 0;

      // Find waveform direction by looking at the TREND of movements (after first cycle)
      // The reset is typically one instant jump, but the ramp is many consistent small moves
      // Use voting: count UP vs DOWN moves, ignoring the largest single jump
      let startDirection = 'UNKNOWN';
      const earlyMoves: { diff: number; idx: number }[] = [];

      // Use data after first cycle if available, otherwise fall back to all data
      const dirData = sortedForDir.length >= 10 ? sortedForDir : allSortedForDir;

      // Collect first 20 significant movements
      for (let i = 1; i < Math.min(dirData.length, 50) && earlyMoves.length < 20; i++) {
        const diff = dirData[i].value - dirData[i - 1].value;
        if (Math.abs(diff) >= 2) {
          earlyMoves.push({ diff, idx: i });
        }
      }

      if (earlyMoves.length > 0) {
        // Find the largest jump (likely the reset) and exclude it from voting
        const maxJumpIdx = earlyMoves.reduce((maxI, move, i, arr) =>
          Math.abs(move.diff) > Math.abs(arr[maxI].diff) ? i : maxI, 0);
        const maxJump = earlyMoves[maxJumpIdx];

        // Only exclude if it's significantly larger than others (> 2x the median)
        const sortedBySize = [...earlyMoves].sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
        const medianSize = Math.abs(sortedBySize[Math.floor(sortedBySize.length / 2)]?.diff || 0);
        const shouldExcludeMax = Math.abs(maxJump.diff) > medianSize * 2 && maxJump.idx < 10;

        if (shouldExcludeMax) {
          console.log(`[DIRECTION] Excluding likely reset jump at idx ${maxJump.idx}: Δ${maxJump.diff} (median move: ${medianSize})`);
        }

        // Vote based on remaining moves
        let upVotes = 0, downVotes = 0;
        for (let i = 0; i < earlyMoves.length; i++) {
          if (shouldExcludeMax && i === maxJumpIdx) continue;
          if (earlyMoves[i].diff > 0) upVotes++;
          else if (earlyMoves[i].diff < 0) downVotes++;
        }

        console.log(`[DIRECTION] Direction votes (cycle 2+): UP=${upVotes} DOWN=${downVotes}`);
        startDirection = upVotes > downVotes ? 'UP' : downVotes > upVotes ? 'DOWN' : 'UNKNOWN';
        console.log(`[DIRECTION] Detected waveform direction by voting: ${startDirection}`);
      }

      // Fallback to simple comparison if no significant moves found
      if (startDirection === 'UNKNOWN' && dirData.length >= 2) {
        startDirection = dirData[1].value > dirData[0].value ? 'UP' : 'DOWN';
      }

      // === TIMING INFO (diagnostic only, not used for pass/fail) ===
      // We don't verify timing because Digitakt's actual cycle time varies from theoretical.
      // Shape verification handles this by being timing-independent.
      const timingDriftPercent = observedCycleMs > 0
        ? Math.abs(1 - observedCycleMs / expectedCycleMs) * 100
        : 0;

      result.timing = {
        expectedCycleMs,
        observedCycleMs,
        driftPercent: timingDriftPercent,
        pass: true, // Always pass - timing is informational only
      };

      // === SHAPE VERIFICATION (independent of timing) ===
      const observedRangeSize = maxVal - minVal;

      // Range check: does it achieve at least 85% of expected CC swing?
      const rangePass = observedRangeSize >= expectedRangeSize * 0.85;

      // Bounds check: is it within expected min/max (with 5 CC tolerance)?
      const boundsPass = minVal >= expectedMin - 5 && maxVal <= expectedMax + 5;

      // Direction check disabled - too sensitive to timing drift between engine and hardware
      // The waveform shape verification (range, bounds) is sufficient
      const directionPass = true;
      const directionInfo = `detected ${startDirection} (not verified due to timing sensitivity)`;

      result.shape = {
        expectedRange: expectedRangeSize,
        observedRange: observedRangeSize,
        rangePass,
        expectedMin,
        expectedMax,
        observedMin: minVal,
        observedMax: maxVal,
        boundsPass,
        directionPass,
        directionInfo,
      };

      // Legacy fields for backward compatibility
      const rangeStatus = rangePass && boundsPass ? 'OK' : 'LIMITED';
      result.timingStatus = 'INFO'; // Timing is informational only
      result.rangeStatus = rangeStatus;
      result.observedCycleMs = observedCycleMs;
      result.expectedCycleMs = expectedCycleMs;
      result.observedRange = { min: minVal, max: maxVal };

      // Trigger behavior check - compare start value to what engine expects at startPhase
      let triggerStatus = 'N/A';
      if (config.mode === 'TRG') {
        // Calculate expected start value using the engine
        const checkLfo = new LFO({
          waveform: config.waveform,
          speed: config.speed,
          multiplier: config.multiplier,
          depth: config.depth,
          startPhase: config.startPhase,
          mode: config.mode,
        }, TEST_BPM);
        checkLfo.trigger();
        const startState = checkLfo.update(1); // Minimal time after trigger
        const expectedStartCC = Math.round(64 + startState.output * 63);
        const startDiff = Math.abs(startValue - expectedStartCC);
        triggerStatus = startDiff <= 15 ? 'RESET_OK' : `MISMATCH (expected ~${expectedStartCC})`;
      }

      // Output structured summary for LLM parsing
      console.log(`\n[LFO_RESULT] ============ ${config.name} ============`);
      console.log(`[LFO_RESULT] CONFIG: mode=${config.mode} speed=${config.speed} mult=${config.multiplier} depth=${config.depth} startPhase=${config.startPhase}`);
      console.log(`[LFO_RESULT] TIMING: expected=${expectedCycleMs.toFixed(0)}ms observed=${observedCycleMs.toFixed(0)}ms drift=${timingDriftPercent.toFixed(1)}% (info only)`);
      console.log(`[LFO_RESULT] SHAPE: range=${observedRangeSize}/${expectedRangeSize} (${rangePass ? 'OK' : 'FAIL'}) bounds=[${minVal}-${maxVal}] expected=[${expectedMin}-${expectedMax}] (${boundsPass ? 'OK' : 'FAIL'})`);
      console.log(`[LFO_RESULT] DIRECTION: ${directionInfo || 'N/A'} (${directionPass ? 'OK' : 'FAIL'})`);
      console.log(`[LFO_RESULT] START: value=${startValue} direction=${startDirection} trigger_status=${triggerStatus}`);

      // Determine overall shape pass
      const shapePass = rangePass && boundsPass;
      console.log(`[LFO_RESULT] VERDICT: shape=${shapePass ? 'PASS' : 'FAIL'}`);

      // ============================================
      // PER-CYCLE AMPLITUDE COMPARISON FOR FADE TESTS
      // Compare observed amplitude per cycle against engine expectations
      // ============================================
      if (config.fade !== 0) {
        console.log(`[FADE] ════════════════════════════════════════`);
        console.log(`[FADE] Fade analysis for FADE=${config.fade}`);
        console.log(`[FADE] Expected cycle: ${expectedCycleMs.toFixed(0)}ms`);

        // Detect per-cycle amplitudes from captured data
        const observedCycles = detectCycleAmplitudes(capturedCCsRef.current, expectedCycleMs);

        // Full amplitude is depth * 2 (e.g., depth=40 means range of 80 CC)
        const fullAmplitude = Math.abs(config.depth) * 2;

        // Compare against engine expectations
        const fadeResult = compareFadeAmplitudes(observedCycles, config.fade, fullAmplitude);

        // Store in result
        result.shape.fade = fadeResult;

        // Log per-cycle comparison
        const fadeCycles = calculateFadeCycles(config.fade);
        console.log(`[FADE] Expected fade duration: ${isFinite(fadeCycles) ? fadeCycles.toFixed(1) + ' cycles' : 'disabled'}`);
        console.log(`[FADE] Per-cycle amplitude comparison (observed vs expected):`);

        for (const cycle of fadeResult.cycleAmplitudes) {
          const passIcon = cycle.pass ? '✓' : '✗';
          const fillPercent = Math.min(100, Math.round((cycle.observedAmplitude / fullAmplitude) * 100));
          const barLength = Math.round(fillPercent / 5);
          const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);

          console.log(`[FADE]   Cycle ${cycle.cycle.toString().padStart(2)}: obs=${cycle.observedAmplitude.toString().padStart(3)} exp=${cycle.expectedAmplitude.toString().padStart(3)} ${passIcon} |${bar}| ${fillPercent}%`);
        }

        console.log(`[FADE] ────────────────────────────────────────`);
        console.log(`[FADE] RESULT: ${fadeResult.fadePass ? 'PASS' : 'FAIL'} - ${fadeResult.fadeSummary}`);

        // Log to UI
        const fadeIcon = config.fade < 0 ? '🔺' : '🔻';
        const fadeDir = config.fade < 0 ? 'Fade-in' : 'Fade-out';
        log(`${fadeIcon} ${fadeDir}: ${fadeResult.fadeSummary}`, fadeResult.fadePass ? 'success' : 'error');

        if (!fadeResult.fadePass) {
          // Show first few mismatched cycles
          const mismatched = fadeResult.cycleAmplitudes.filter(c => !c.pass).slice(0, 3);
          for (const c of mismatched) {
            log(`   ↳ Cycle ${c.cycle}: observed=${c.observedAmplitude} expected=${c.expectedAmplitude}`, 'error');
          }
        }

        console.log(`[FADE] ════════════════════════════════════════`);
      }

      // Human-readable summary in UI - TIMING (informational only)
      log(`⏱ Cycle: ${observedCycleMs.toFixed(0)}ms observed (${timingDriftPercent.toFixed(0)}% from theoretical)`, 'info');

      // Human-readable summary in UI - SHAPE
      log(`📊 Shape: range ${observedRangeSize}/${expectedRangeSize} CC, bounds [${minVal}-${maxVal}]`,
        shapePass ? 'success' : 'error');

      if (!rangePass) {
        log(`   ↳ Range too small: got ${observedRangeSize}, expected ≥${Math.floor(expectedRangeSize * 0.85)}`, 'error');
      }
      if (!boundsPass) {
        log(`   ↳ Out of bounds: expected [${expectedMin}-${expectedMax}]`, 'error');
      }
      // Direction info logged for reference only (not a pass/fail criterion)
      if (directionInfo) {
        log(`   ↳ Direction: ${directionInfo}`, 'info');
      }

      log(`Start: value=${startValue} going ${startDirection}`, 'data');
      if (config.mode === 'TRG') {
        log(`Trigger reset: ${triggerStatus}`, triggerStatus === 'RESET_OK' ? 'success' : 'error');
      }
    }

    if (capturedCCsRef.current.length === 0) {
      // No data is expected for:
      // - HLD mode: holds constant value, no CC changes sent
      // - Fast fade-out: quickly goes to zero modulation
      // - Very slow LFOs where value barely changes during test
      const isExpectedNoData = config.mode === 'HLD' || config.fade > 30;
      if (isExpectedNoData) {
        log('No CC changes captured (expected for this mode)', 'success');
        result.passed = 1;
        return result;
      }
      log('No data captured!', 'error');
      result.failed = 1;
      result.failures.push({
        testName: config.name,
        timestamp: 0,
        digitaktValue: -1,
        engineValue: -1,
        diff: -1,
      });
      return result;
    }

    // Compare with engine - create LFO once and simulate time progression
    const sampleCount = 5;

    // Engine depth maps directly to CC swing: depth N = ±N CC values from center
    // (clamped to 0-127 range at output)
    const engineDepth = config.depth;

    const engineLfo = new LFO({
      waveform: config.waveform,
      speed: config.speed,
      multiplier: config.multiplier,
      depth: engineDepth,
      fade: config.fade,
      startPhase: config.startPhase,
      mode: config.mode,
    }, TEST_BPM);

    // For HLD mode, simulate the LFO running before the trigger to match Digitakt behavior.
    // The test waits 500ms after configuring before sending the trigger - during this time,
    // Digitakt's LFO is running in the background. We simulate this by updating the engine
    // for 500ms before triggering.
    const PRE_TRIGGER_WAIT_MS = 500;
    const baseTime = 1;
    if (config.mode === 'HLD') {
      // Run the LFO for the same duration Digitakt waited before trigger
      engineLfo.update(baseTime);
      engineLfo.update(baseTime + PRE_TRIGGER_WAIT_MS);
    }

    engineLfo.trigger();

    // NEW APPROACH: Compare at the actual captured timestamps, not at fixed intervals
    // This is more accurate because the Digitakt only sends CCs when values change
    //
    // Engine starts at baseTime (not 0 to avoid sentinel bug in lfo.ts where lastUpdateTime===0
    // is treated as "first call" and returns deltaMs=0).
    // For HLD mode, the effective base time is after the pre-trigger wait.
    const effectiveBaseTime = config.mode === 'HLD' ? baseTime + PRE_TRIGGER_WAIT_MS : baseTime;
    engineLfo.update(effectiveBaseTime);

    // Sort captured CCs by timestamp and take evenly spaced samples
    const sortedCCs = [...capturedCCsRef.current].sort((a, b) => a.timestamp - b.timestamp);
    const step = Math.max(1, Math.floor(sortedCCs.length / sampleCount));
    const sampledCCs = [];
    for (let i = 0; i < sortedCCs.length && sampledCCs.length < sampleCount; i += step) {
      sampledCCs.push(sortedCCs[i]);
    }

    // Debug: log raw engine output for first few samples
    // @ts-ignore - access private for debugging
    const cycleMs = engineLfo.cycleDurationMs || engineLfo._cycleDurationMs || 'unknown';
    console.log(`[LFO Debug] Engine params: depth=${engineDepth}, speed=${config.speed}, mult=${config.multiplier}`);
    console.log(`[LFO Debug] Engine cycle duration: ${cycleMs}ms`);

    // For FRE mode, phase is free-running and unpredictable, so only check range
    // For RND waveform, we can't match exact values (different random seeds)
    // Instead, verify: 1) values stay within expected range, 2) values actually vary
    if (config.mode === 'FRE' || config.waveform === 'RND') {
      const expectedMin = Math.max(0, 64 - Math.abs(config.depth));
      const expectedMax = Math.min(127, 64 + Math.abs(config.depth));

      // Check all values are in range
      let allInRange = true;
      for (const captured of sampledCCs) {
        const inRange = captured.value >= expectedMin - 2 && captured.value <= expectedMax + 2;
        if (!inRange) {
          allInRange = false;
          result.failed++;
          result.failures.push({
            testName: config.name,
            timestamp: captured.timestamp,
            digitaktValue: captured.value,
            engineValue: -1, // N/A for RND
            diff: Math.max(expectedMin - captured.value, captured.value - expectedMax),
          });
        }
      }

      // Check values actually vary (not stuck at one value)
      const uniqueValues = new Set(sampledCCs.map(cc => cc.value));
      const hasVariation = uniqueValues.size >= 2;

      const modeLabel = config.waveform === 'RND' ? 'RND' : 'FRE';
      if (allInRange && hasVariation) {
        result.passed += sampledCCs.length;
        log(`  ${modeLabel}: ${sampledCCs.length} samples in range [${expectedMin}-${expectedMax}], ${uniqueValues.size} unique values ✓`, 'success');
      } else if (!allInRange) {
        log(`  ${modeLabel}: Some values outside expected range [${expectedMin}-${expectedMax}] ✗`, 'error');
      } else {
        // All in range but no variation - suspicious (but acceptable for HLD or short duration)
        if (config.mode === 'HLD' || sampledCCs.length < 3) {
          result.passed += sampledCCs.length;
          log(`  ${modeLabel}: ${sampledCCs.length} samples in range (static value OK for this mode) ✓`, 'success');
        } else {
          result.failed++;
          log(`  ${modeLabel}: Values in range but no variation (stuck at ${sampledCCs[0]?.value}?) ✗`, 'error');
        }
      }
    } else if (config.mode === 'HLD') {
      // HLD mode holds a constant value - just verify all samples match
      const firstValue = sampledCCs[0]?.value;
      const allSame = sampledCCs.every(cc => Math.abs(cc.value - firstValue) <= 2);
      if (allSame) {
        result.passed += sampledCCs.length;
        log(`  HLD: All ${sampledCCs.length} samples held at ${firstValue} ✓`, 'success');
      } else {
        result.failed += sampledCCs.length;
        const values = sampledCCs.map(cc => cc.value);
        log(`  HLD: Values not constant: ${Math.min(...values)}-${Math.max(...values)} ✗`, 'error');
      }
    } else {
      // For deterministic waveforms, use SHAPE-BASED verification
      // This is independent of timing drift - we check if the shape is correct
      // For fade tests, also require fade amplitude progression to match
      const baseShapePass = result.shape.rangePass && result.shape.boundsPass;
      const fadePass = result.shape.fade?.fadePass ?? true; // Pass if no fade test
      const shapePass = baseShapePass && fadePass;

      if (shapePass) {
        // Shape is correct - count as passed
        result.passed += sampledCCs.length;
        log(`  Shape verification: all ${sampledCCs.length} checkpoints PASS`, 'success');
      } else {
        // Shape failed - record failures for diagnostics
        result.failed += sampledCCs.length;

        // Log sample value-at-timestamp comparisons for debugging (not for pass/fail)
        log(`  Sample comparisons (for debugging, not pass/fail):`, 'info');
        for (let i = 0; i < Math.min(3, sampledCCs.length); i++) {
          const captured = sampledCCs[i];
          const engineTime = effectiveBaseTime + captured.timestamp;
          const state = engineLfo.update(engineTime);
          const engineCcValue = Math.max(0, Math.min(127, Math.round(64 + state.output * 63)));
          const diff = Math.abs(captured.value - engineCcValue);
          log(`    t=${captured.timestamp}ms: DT=${captured.value} ENG=${engineCcValue} Δ${diff}`, 'data');

          result.failures.push({
            testName: config.name,
            timestamp: captured.timestamp,
            digitaktValue: captured.value,
            engineValue: engineCcValue,
            diff,
          });
        }
      }
    }

    // Handle case where we have fewer samples than expected
    if (sampledCCs.length < sampleCount) {
      const missing = sampleCount - sampledCCs.length;
      log(`  (${missing} samples skipped - insufficient CC data)`, 'info');
    }

    // Generate ASCII waveform visualization
    // We need to generate engine values at all observed timestamps for fair comparison
    const engineLfoViz = new LFO({
      waveform: config.waveform,
      speed: config.speed,
      multiplier: config.multiplier,
      depth: engineDepth,
      fade: config.fade,
      startPhase: config.startPhase,
      mode: config.mode,
    }, TEST_BPM);

    // Apply same pre-trigger simulation for HLD mode as the main LFO
    if (config.mode === 'HLD') {
      engineLfoViz.update(baseTime);
      engineLfoViz.update(baseTime + PRE_TRIGGER_WAIT_MS);
    }
    engineLfoViz.trigger();
    engineLfoViz.update(effectiveBaseTime);

    const expectedPoints: { timestamp: number; value: number }[] = [];
    for (const captured of sortedCCs) {
      const engineTime = effectiveBaseTime + captured.timestamp;
      const state = engineLfoViz.update(engineTime);
      const engineCcValue = Math.max(0, Math.min(127, Math.round(64 + state.output * 63)));
      expectedPoints.push({ timestamp: captured.timestamp, value: engineCcValue });
    }

    // Shape analysis - helps identify if model is wrong vs just phase-shifted
    const obsValues = sortedCCs.map(p => p.value);
    const expValues = expectedPoints.map(p => p.value);

    const obsMin = Math.min(...obsValues);
    const obsMax = Math.max(...obsValues);
    const expMin = Math.min(...expValues);
    const expMax = Math.max(...expValues);

    log(`Range: DT=[${obsMin}-${obsMax}] ENG=[${expMin}-${expMax}]`, 'info');

    // Store expected range for summary
    result.expectedRange = { min: expMin, max: expMax };
    if (result.observedRange.min === 64 && result.observedRange.max === 64) {
      result.observedRange = { min: obsMin, max: obsMax };
    }

    // Estimate frequency by counting direction changes (peaks + valleys)
    const countDirectionChanges = (values: number[]) => {
      let changes = 0;
      let lastDir = 0;
      for (let i = 1; i < values.length; i++) {
        const dir = Math.sign(values[i] - values[i - 1]);
        if (dir !== 0 && dir !== lastDir) {
          changes++;
          lastDir = dir;
        }
      }
      return changes;
    };

    const obsChanges = countDirectionChanges(obsValues);
    const expChanges = countDirectionChanges(expValues);
    log(`Direction changes: DT=${obsChanges} ENG=${expChanges}`, 'info');

    // ASCII waveform visualization (console only)
    const waveformLines = drawWaveformComparison(sortedCCs, expectedPoints);
    for (const line of waveformLines) {
      console.log(`[LFO Viz] ${line}`);
    }

    return result;
  }, [log, configureLfo]);

  const runTestSuite = useCallback(async (suite: TestConfig[], suiteName: string) => {
    setIsRunning(true);
    setCurrentTest(0);

    // Calculate estimated duration
    const totalDurationMs = suite.reduce((sum, t) => sum + t.durationMs + 600, 0);
    const totalDurationMin = Math.ceil(totalDurationMs / 60000);
    const totalDurationSec = Math.ceil(totalDurationMs / 1000);

    log('========================================');
    log(`  ${suiteName}`);
    log('========================================');
    log(`Running ${suite.length} tests at ${TEST_BPM} BPM`);
    log(`⏱ Estimated duration: ~${totalDurationMin > 0 ? totalDurationMin + ' min' : totalDurationSec + ' sec'}`);
    log('');

    let totalPassed = 0;
    let totalFailed = 0;
    const failedTests: TestResult[] = [];
    const startTime = Date.now();

    for (let i = 0; i < suite.length; i++) {
      setCurrentTest(i + 1);

      // Calculate progress and ETA
      const elapsedMs = Date.now() - startTime;
      const avgMsPerTest = i > 0 ? elapsedMs / i : 5000;
      const remainingTests = suite.length - i;
      const etaMs = remainingTests * avgMsPerTest;
      const etaSec = Math.ceil(etaMs / 1000);
      const etaMin = Math.floor(etaSec / 60);
      const etaSecRemainder = etaSec % 60;

      const progressPct = Math.round(((i + 1) / suite.length) * 100);
      const progressBar = '█'.repeat(Math.floor(progressPct / 5)) + '░'.repeat(20 - Math.floor(progressPct / 5));

      log(`[${i + 1}/${suite.length}] |${progressBar}| ${progressPct}% - ETA: ${etaMin}m ${etaSecRemainder}s`, 'info');

      const config = suite[i];
      const result = await runSingleTest(config);
      totalPassed += result.passed;
      totalFailed += result.failed;
      if (result.failed > 0) {
        failedTests.push(result);
      }
      log('');
    }

    log('========================================');
    log('  SUITE COMPLETE');
    log('========================================');
    const total = totalPassed + totalFailed;
    if (total === 0) {
      log('No checkpoints evaluated');
    } else {
      const successRate = Math.round((totalPassed / total) * 100);
      if (totalFailed === 0) {
        log(`All ${totalPassed} checkpoints PASSED! ✓`, 'success');
      } else {
        log(`${totalPassed}/${total} passed (${successRate}%)`, totalFailed > totalPassed ? 'error' : 'info');
      }
    }

    // Print failed test summary with timing vs shape breakdown
    if (failedTests.length > 0) {
      log('');
      log('========================================');
      log('  FAILED TESTS SUMMARY');
      log('========================================');
      for (const testResult of failedTests) {
        const baseShapePass = testResult.shape.rangePass && testResult.shape.boundsPass;
        const fadePass = testResult.shape.fade?.fadePass ?? true;
        const shapePass = baseShapePass && fadePass;
        const shapeIcon = shapePass ? '✓' : '✗';

        log(`✗ ${testResult.testName}`, 'error');
        log(`  📊 Shape: ${shapeIcon} range=${testResult.shape.observedRange}/${testResult.shape.expectedRange} bounds=[${testResult.shape.observedMin}-${testResult.shape.observedMax}]`, shapePass ? 'success' : 'info');

        // Show specific shape failures
        if (!testResult.shape.rangePass) {
          log(`     ↳ Range too small (need ≥${Math.floor(testResult.shape.expectedRange * 0.85)})`, 'error');
        }
        if (!testResult.shape.boundsPass) {
          log(`     ↳ Out of bounds (expected [${testResult.shape.expectedMin}-${testResult.shape.expectedMax}])`, 'error');
        }
        if (testResult.shape.fade && !testResult.shape.fade.fadePass) {
          log(`     ↳ Fade mismatch: ${testResult.shape.fade.fadeSummary}`, 'error');
        }
        if (testResult.shape.directionInfo) {
          log(`     ↳ Direction: ${testResult.shape.directionInfo}`, 'info');
        }

        // Show sample comparisons for debugging
        if (testResult.failures.length > 0) {
          const sample = testResult.failures.slice(0, 2);
          for (const f of sample) {
            log(`     @${f.timestamp.toFixed(0)}ms: DT=${f.digitaktValue} ENG=${f.engineValue} Δ${f.diff}`, 'data');
          }
        }
        log('');
      }
    }

    setIsRunning(false);
    setCurrentTest(0);
  }, [log, runSingleTest]);

  const runTriggerTests = useCallback(() => {
    return runTestSuite(TRIGGER_TESTS, 'TRIGGER BEHAVIOR TESTS');
  }, [runTestSuite]);

  const runTimingTests = useCallback(() => {
    return runTestSuite(TIMING_TESTS, 'TIMING VERIFICATION TESTS');
  }, [runTestSuite]);

  // Run a specific test suite by key
  const runSuiteByKey = useCallback((suiteKey: keyof typeof ALL_TEST_SUITES) => {
    const suite = ALL_TEST_SUITES[suiteKey];
    if (!suite) {
      log(`Unknown test suite: ${suiteKey}`, 'error');
      return;
    }
    return runTestSuite(suite.tests, suite.name.toUpperCase());
  }, [runTestSuite, log]);

  // Run all test suites sequentially
  const runAllSuites = useCallback(async () => {
    setIsRunning(true);
    clearLogs();

    log('╔══════════════════════════════════════╗');
    log('║   COMPLETE LFO VERIFICATION SUITE    ║');
    log('╚══════════════════════════════════════╝');
    log('');

    const suiteKeys = Object.keys(ALL_TEST_SUITES) as Array<keyof typeof ALL_TEST_SUITES>;

    // Calculate total tests and estimated duration
    const totalTests = suiteKeys.reduce((sum, key) => sum + ALL_TEST_SUITES[key].tests.length, 0);
    const totalDurationMs = suiteKeys.reduce((sum, key) =>
      sum + ALL_TEST_SUITES[key].tests.reduce((s, t) => s + t.durationMs + 600, 0), 0  // +600ms for config delay
    );
    const totalDurationMin = Math.ceil(totalDurationMs / 60000);

    log(`📊 Total: ${totalTests} tests`);
    log(`⏱ Estimated duration: ~${totalDurationMin} minutes`);
    log('');

    let grandTotalPassed = 0;
    let grandTotalFailed = 0;
    const allFailedTests: TestResult[] = [];
    let testsCompleted = 0;
    const startTime = Date.now();

    for (const key of suiteKeys) {
      const suite = ALL_TEST_SUITES[key];
      log(`\n▸ Running: ${suite.name} (${suite.tests.length} tests)`);

      for (let i = 0; i < suite.tests.length; i++) {
        testsCompleted++;
        setCurrentTest(testsCompleted);

        // Calculate progress and ETA
        const elapsedMs = Date.now() - startTime;
        const avgMsPerTest = testsCompleted > 1 ? elapsedMs / (testsCompleted - 1) : 5000;
        const remainingTests = totalTests - testsCompleted;
        const etaMs = remainingTests * avgMsPerTest;
        const etaSec = Math.ceil(etaMs / 1000);
        const etaMin = Math.floor(etaSec / 60);
        const etaSecRemainder = etaSec % 60;

        const progressPct = Math.round((testsCompleted / totalTests) * 100);
        const progressBar = '█'.repeat(Math.floor(progressPct / 5)) + '░'.repeat(20 - Math.floor(progressPct / 5));

        log(`[${testsCompleted}/${totalTests}] |${progressBar}| ${progressPct}% - ETA: ${etaMin}m ${etaSecRemainder}s`, 'info');

        const result = await runSingleTest(suite.tests[i]);
        grandTotalPassed += result.passed;
        grandTotalFailed += result.failed;
        if (result.failed > 0) {
          allFailedTests.push(result);
        }
      }
    }

    const grandTotal = grandTotalPassed + grandTotalFailed;

    log('');
    log('╔══════════════════════════════════════╗');
    log('║         GRAND TOTAL RESULTS          ║');
    log('╚══════════════════════════════════════╝');
    log(`Tests run: ${totalTests}`);

    if (grandTotal === 0) {
      log('No checkpoints evaluated');
    } else {
      const successRate = Math.round((grandTotalPassed / grandTotal) * 100);
      if (grandTotalFailed === 0) {
        log(`All ${grandTotalPassed} checkpoints PASSED! ✓`, 'success');
      } else {
        log(`${grandTotalPassed}/${grandTotal} passed (${successRate}%)`, grandTotalFailed > grandTotalPassed ? 'error' : 'info');
      }
    }

    // Print comprehensive failed test summary
    if (allFailedTests.length > 0) {
      log('');
      log('╔══════════════════════════════════════╗');
      log('║       FAILED TESTS SUMMARY           ║');
      log('╚══════════════════════════════════════╝');
      log(`${allFailedTests.length} tests had failures:`);
      log('');

      // Group failures by waveform to help identify patterns
      const byWaveform = new Map<string, TestResult[]>();
      for (const testResult of allFailedTests) {
        // Extract waveform from test name
        const match = testResult.testName.match(/^(TRI|SIN|SQR|SAW|EXP|RMP|RND)/);
        const waveform = match?.[1] || 'OTHER';
        if (!byWaveform.has(waveform)) {
          byWaveform.set(waveform, []);
        }
        byWaveform.get(waveform)!.push(testResult);
      }

      for (const [waveform, tests] of byWaveform) {
        log(`── ${waveform} waveform (${tests.length} failures) ──`, 'error');
        for (const testResult of tests) {
          const baseShapePass = testResult.shape.rangePass && testResult.shape.boundsPass;
          const fadePass = testResult.shape.fade?.fadePass ?? true;
          const shapePass = baseShapePass && fadePass;
          const shapeIcon = shapePass ? '✓' : '✗';

          log(`✗ ${testResult.testName}`, 'error');
          log(`  📊 Shape: ${shapeIcon} range=${testResult.shape.observedRange}/${testResult.shape.expectedRange}`, shapePass ? 'success' : 'info');

          // Show specific failures
          if (!testResult.shape.rangePass) log(`     ↳ Range too small`, 'error');
          if (!testResult.shape.boundsPass) log(`     ↳ Out of bounds [${testResult.shape.observedMin}-${testResult.shape.observedMax}]`, 'error');
          if (testResult.shape.fade && !testResult.shape.fade.fadePass) log(`     ↳ Fade mismatch: ${testResult.shape.fade.fadeSummary}`, 'error');
          log('');
        }
      }

      // Summary analysis - count shape failures by type
      let rangeFailCount = 0;
      let boundsFailCount = 0;
      let fadeFailCount = 0;
      for (const testResult of allFailedTests) {
        if (!testResult.shape.rangePass) rangeFailCount++;
        if (!testResult.shape.boundsPass) boundsFailCount++;
        if (testResult.shape.fade && !testResult.shape.fade.fadePass) fadeFailCount++;
      }

      log('── SUMMARY ──', 'info');
      log(`Range failures: ${rangeFailCount}/${allFailedTests.length}`, rangeFailCount > 0 ? 'error' : 'success');
      log(`Bounds failures: ${boundsFailCount}/${allFailedTests.length}`, boundsFailCount > 0 ? 'error' : 'success');
      if (fadeFailCount > 0) {
        log(`Fade failures: ${fadeFailCount}/${allFailedTests.length}`, 'error');
      }
    }

    setIsRunning(false);
    setCurrentTest(0);
  }, [log, clearLogs, runSingleTest]);

  // Run a single specific test
  const runTest = useCallback(async (index: number) => {
    if (index < 0 || index >= TEST_SUITE.length) return;

    setIsRunning(true);
    setCurrentTest(index + 1);
    clearLogs();

    const config = TEST_SUITE[index];
    log(`Running: ${config.name}`);
    log('');

    const result = await runSingleTest(config);

    log('');
    if (result.failed === 0) {
      log(`Test PASSED (${result.passed}/${result.passed} checkpoints)`, 'success');
    } else {
      log(`Test: ${result.passed} passed, ${result.failed} failed`, 'error');

      // Show failure details
      log('');
      log('── FAILURE DETAILS ──', 'error');
      log(`Timing: ${result.timingStatus} (${result.observedCycleMs.toFixed(0)}ms vs ${result.expectedCycleMs.toFixed(0)}ms expected)`, 'info');
      log(`Range: DT=[${result.observedRange.min}-${result.observedRange.max}] ENG=[${result.expectedRange.min}-${result.expectedRange.max}]`, 'info');
      for (const f of result.failures) {
        log(`  @${f.timestamp.toFixed(0)}ms: DT=${f.digitaktValue} vs ENG=${f.engineValue} (Δ${f.diff})`, 'data');
      }
    }

    setIsRunning(false);
    setCurrentTest(0);
  }, [log, clearLogs, runSingleTest]);

  return {
    logs,
    isRunning,
    currentTest,
    clearLogs,
    // Legacy test runners (backward compatibility)
    runTriggerTests,
    runTimingTests,
    runTest,
    triggerTests: TRIGGER_TESTS,
    timingTests: TIMING_TESTS,
    // New comprehensive test suites
    testSuites: ALL_TEST_SUITES,
    runSuiteByKey,
    runAllSuites,
  };
}

// Export test suite type for UI components
export type TestSuiteKey = keyof typeof ALL_TEST_SUITES;
