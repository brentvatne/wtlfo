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
// ============================================
const NEGATIVE_SPEED_TESTS: TestConfig[] = [
  {
    name: 'Speed=-16 (reversed TRI)',
    waveform: 'TRI',
    speed: -16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
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
    durationMs: 5000,
  },
  {
    name: 'Speed=-32 (reversed RMP)',
    waveform: 'RMP',
    speed: -32,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
];

// ============================================
// UNIPOLAR WAVEFORM TESTS
// Goal: Verify EXP and RMP only modulate one direction
// ============================================
const UNIPOLAR_TESTS: TestConfig[] = [
  {
    name: 'EXP positive depth',
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
    name: 'EXP negative depth',
    waveform: 'EXP',
    speed: 16,
    multiplier: 4,
    depth: -40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
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
    durationMs: 5000,
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
    durationMs: 5000,
  },
];

// ============================================
// COMBINATION TESTS
// Goal: Verify features work together correctly
// ============================================
const COMBINATION_TESTS: TestConfig[] = [
  {
    name: 'SIN + Fade-in + Phase=32',
    waveform: 'SIN',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: -32,
    startPhase: 32,
    mode: 'TRG',
    durationMs: 6000,
  },
  {
    name: 'SAW + Fade-out + Negative speed',
    waveform: 'SAW',
    speed: -16,
    multiplier: 4,
    depth: 40,
    fade: 32,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 6000,
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
    durationMs: 6000,
  },
  {
    name: 'SQR + HLF mode + Fade-in',
    waveform: 'SQR',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: -32,
    startPhase: 0,
    mode: 'HLF',
    durationMs: 5000,
  },
  {
    name: 'Fast SIN + Full depth',
    waveform: 'SIN',
    speed: 32,
    multiplier: 16,
    depth: 127,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 3000,
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
// These tests are designed to help determine correct formulas for:
// - SAW waveform direction
// - Negative speed behavior
// - Fade timing formula
// - RMP/EXP bipolar vs unipolar behavior
// ============================================
const INVESTIGATION_TESTS: TestConfig[] = [
  // --- Experiment 0: Bipolar vs Unipolar Diagnosis ---
  // Goal: Determine if RMP is truly unipolar or if Digitakt applies it as bipolar
  // With depth=1, if unipolar: CC should be 64-65 (only goes up)
  // With depth=1, if bipolar: CC should be 63-65 (goes both directions)
  {
    name: 'INV0a: RMP depth=1 (bipolar test)',
    waveform: 'RMP',
    speed: 16,
    multiplier: 4,
    depth: 1,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'INV0b: EXP depth=1 (bipolar test)',
    waveform: 'EXP',
    speed: 16,
    multiplier: 4,
    depth: 1,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'INV0c: SAW depth=1 (bipolar baseline)',
    waveform: 'SAW',
    speed: 16,
    multiplier: 4,
    depth: 1,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },

  // --- Experiment 1: SAW Waveform Direction (Baseline) ---
  // Goal: Verify our SAW definition matches Digitakt's
  // Our model: SAW = 1 - phase*2, so phase 0 → +1 (CC 103), phase 1 → -1 (CC 24)
  // Observe: First CC value after trigger and direction of change
  {
    name: 'INV1: SAW baseline (+16 speed)',
    waveform: 'SAW',
    speed: 16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },

  // --- Experiment 2: Negative Speed on SAW ---
  // Goal: Determine what negative speed does
  // If start is LOW, rises to HIGH → Digitakt inverts output (like our model)
  // If start is HIGH, falls to LOW → Digitakt reverses phase direction
  {
    name: 'INV2: SAW negative speed (-16)',
    waveform: 'SAW',
    speed: -16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },

  // --- Experiment 3: Negative Speed on TRI ---
  // Goal: Confirm negative speed behavior on symmetric waveform
  // TRI starts at center (64), positive goes UP first
  // If negative inverts: start at 64, go DOWN first
  // If negative reverses phase: start at 64, go DOWN first (same result for TRI)
  {
    name: 'INV3a: TRI positive speed (+16)',
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
    name: 'INV3b: TRI negative speed (-16)',
    waveform: 'TRI',
    speed: -16,
    multiplier: 4,
    depth: 40,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },

  // --- Experiment 4: Fade Timing Measurement ---
  // Goal: Measure actual cycles to complete fade-in
  // Using fast LFO (1000ms cycle) to see multiple cycles during fade
  // Our formula: 128/|FADE| cycles. Alternative: |FADE|/8 or |FADE|/16 cycles
  {
    name: 'INV4a: Fade-in FADE=-64 (expect ~2 cycles)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,  // 32×8=256 → 1000ms cycle
    depth: 40,
    fade: -64,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 8000,
  },
  {
    name: 'INV4b: Fade-in FADE=-32 (expect ~4 cycles)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 40,
    fade: -32,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 8000,
  },
  {
    name: 'INV4c: Fade-in FADE=-16 (expect ~8 cycles)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 40,
    fade: -16,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 10000,
  },
  {
    name: 'INV4d: Fade-in FADE=-8 (expect ~16 cycles)',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 40,
    fade: -8,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 20000,
  },

  // --- Experiment 5: Fade-Out Measurement ---
  // Goal: Verify fade-out follows same formula as fade-in
  {
    name: 'INV5a: Fade-out FADE=+64',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 40,
    fade: 64,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 8000,
  },
  {
    name: 'INV5b: Fade-out FADE=+32',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,
    depth: 40,
    fade: 32,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 8000,
  },

  // --- Experiment 6: RMP Depth Range Measurement ---
  // Goal: Determine actual CC range for RMP at various depths
  // Currently: depth 40 gives [64-84] (20 CC range) - HALF expected
  // Expected if 1x: [64-104] (40 CC range)
  // Expected if 2x: [64-127] clamped (63 CC range)
  {
    name: 'INV6a: RMP depth=20',
    waveform: 'RMP',
    speed: 16,
    multiplier: 4,
    depth: 20,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'INV6b: RMP depth=40',
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
    name: 'INV6c: RMP depth=63',
    waveform: 'RMP',
    speed: 16,
    multiplier: 4,
    depth: 63,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },

  // --- Experiment 7: EXP Depth Range Measurement ---
  // Goal: Verify EXP (also unipolar) follows same depth formula as RMP
  {
    name: 'INV7a: EXP depth=20',
    waveform: 'EXP',
    speed: 16,
    multiplier: 4,
    depth: 20,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  {
    name: 'INV7b: EXP depth=40',
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
    name: 'INV7c: EXP depth=63',
    waveform: 'EXP',
    speed: 16,
    multiplier: 4,
    depth: 63,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },

  // --- Experiment 8: Bipolar vs Unipolar Comparison ---
  // Goal: Compare SAW (bipolar) vs RMP (unipolar) to understand depth handling
  // SAW output [-1,1] → CC [24-104] with depth 40 (80 CC swing)
  // RMP output [0,1] with 1x depth → [64-104] (40 CC swing)
  // RMP output [0,1] with 2x depth → [64-127] (63 CC swing)
  {
    name: 'INV8a: SAW depth=40 (bipolar baseline)',
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
    name: 'INV8b: RMP depth=40 (unipolar comparison)',
    waveform: 'RMP',
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
    const isUnipolar = config.waveform === 'RMP' || config.waveform === 'EXP';
    const expectedMin = isUnipolar ? 64 : Math.max(0, 64 - Math.abs(config.depth));
    const expectedMax = Math.min(127, 64 + Math.abs(config.depth));
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
      const first5 = capturedCCsRef.current.slice(0, 5);
      const startValue = first5[0]?.value ?? 0;
      const startDirection = first5.length >= 2
        ? (first5[1].value > first5[0].value ? 'UP' : 'DOWN')
        : 'UNKNOWN';

      // === TIMING VERIFICATION (separate from shape) ===
      const timingRatio = observedCycleMs > 0 ? observedCycleMs / expectedCycleMs : 0;
      const timingDriftPercent = Math.abs(1 - timingRatio) * 100;
      const timingPass = timingDriftPercent < 20; // 20% tolerance
      const timingStatus = timingDriftPercent < 15 ? 'OK' : timingDriftPercent < 30 ? 'DRIFT' : 'WRONG';

      result.timing = {
        expectedCycleMs,
        observedCycleMs,
        driftPercent: timingDriftPercent,
        pass: timingPass,
      };

      // === SHAPE VERIFICATION (independent of timing) ===
      const observedRangeSize = maxVal - minVal;

      // Range check: does it achieve at least 85% of expected CC swing?
      const rangePass = observedRangeSize >= expectedRangeSize * 0.85;

      // Bounds check: is it within expected min/max (with 5 CC tolerance)?
      const boundsPass = minVal >= expectedMin - 5 && maxVal <= expectedMax + 5;

      // Direction check for monotonic waveforms (SAW, RMP)
      let directionPass = true;
      let directionInfo = '';
      if (config.waveform === 'SAW' || config.waveform === 'RMP') {
        // Check if first movement is in expected direction
        // SAW should start high and fall, RMP should start low and rise
        const expectedStartDir = config.waveform === 'SAW' ? 'DOWN' : 'UP';
        // Account for negative speed inverting direction
        const effectiveExpectedDir = config.speed < 0
          ? (expectedStartDir === 'UP' ? 'DOWN' : 'UP')
          : expectedStartDir;
        directionPass = startDirection === effectiveExpectedDir || startDirection === 'UNKNOWN';
        directionInfo = `expected ${effectiveExpectedDir}, got ${startDirection}`;
      }

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
      result.timingStatus = timingStatus;
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
      console.log(`[LFO_RESULT] TIMING: expected=${expectedCycleMs.toFixed(0)}ms observed=${observedCycleMs.toFixed(0)}ms drift=${timingDriftPercent.toFixed(1)}% pass=${timingPass}`);
      console.log(`[LFO_RESULT] SHAPE: range=${observedRangeSize}/${expectedRangeSize} (${rangePass ? 'OK' : 'FAIL'}) bounds=[${minVal}-${maxVal}] expected=[${expectedMin}-${expectedMax}] (${boundsPass ? 'OK' : 'FAIL'})`);
      console.log(`[LFO_RESULT] DIRECTION: ${directionInfo || 'N/A'} (${directionPass ? 'OK' : 'FAIL'})`);
      console.log(`[LFO_RESULT] START: value=${startValue} direction=${startDirection} trigger_status=${triggerStatus}`);

      // Determine overall shape pass
      const shapePass = rangePass && boundsPass && directionPass;
      console.log(`[LFO_RESULT] VERDICT: timing=${timingPass ? 'PASS' : 'FAIL'} shape=${shapePass ? 'PASS' : 'FAIL'}`);

      // Human-readable summary in UI - TIMING
      log(`⏱ Timing: ${observedCycleMs.toFixed(0)}ms vs ${expectedCycleMs.toFixed(0)}ms (${timingDriftPercent.toFixed(0)}% drift)`,
        timingPass ? 'success' : 'error');

      // Human-readable summary in UI - SHAPE
      log(`📊 Shape: range ${observedRangeSize}/${expectedRangeSize} CC, bounds [${minVal}-${maxVal}]`,
        shapePass ? 'success' : 'error');

      if (!rangePass) {
        log(`   ↳ Range too small: got ${observedRangeSize}, expected ≥${Math.floor(expectedRangeSize * 0.85)}`, 'error');
      }
      if (!boundsPass) {
        log(`   ↳ Out of bounds: expected [${expectedMin}-${expectedMax}]`, 'error');
      }
      if (!directionPass) {
        log(`   ↳ Direction wrong: ${directionInfo}`, 'error');
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
      const shapePass = result.shape.rangePass && result.shape.boundsPass && result.shape.directionPass;

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

    log('========================================');
    log(`  ${suiteName}`);
    log('========================================');
    log(`Running ${suite.length} tests at ${TEST_BPM} BPM`);
    log('');

    let totalPassed = 0;
    let totalFailed = 0;
    const failedTests: TestResult[] = [];

    for (let i = 0; i < suite.length; i++) {
      setCurrentTest(i + 1);
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
        const timingIcon = testResult.timing.pass ? '✓' : '✗';
        const shapeIcon = (testResult.shape.rangePass && testResult.shape.boundsPass && testResult.shape.directionPass) ? '✓' : '✗';

        log(`✗ ${testResult.testName}`, 'error');
        log(`  ⏱ Timing: ${timingIcon} ${testResult.timing.driftPercent.toFixed(0)}% drift (${testResult.observedCycleMs.toFixed(0)}ms vs ${testResult.expectedCycleMs.toFixed(0)}ms)`, testResult.timing.pass ? 'success' : 'info');
        log(`  📊 Shape: ${shapeIcon} range=${testResult.shape.observedRange}/${testResult.shape.expectedRange} bounds=[${testResult.shape.observedMin}-${testResult.shape.observedMax}]`, (testResult.shape.rangePass && testResult.shape.boundsPass) ? 'success' : 'info');

        // Show specific shape failures
        if (!testResult.shape.rangePass) {
          log(`     ↳ Range too small (need ≥${Math.floor(testResult.shape.expectedRange * 0.85)})`, 'error');
        }
        if (!testResult.shape.boundsPass) {
          log(`     ↳ Out of bounds (expected [${testResult.shape.expectedMin}-${testResult.shape.expectedMax}])`, 'error');
        }
        if (!testResult.shape.directionPass) {
          log(`     ↳ Direction: ${testResult.shape.directionInfo}`, 'error');
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
    let grandTotalPassed = 0;
    let grandTotalFailed = 0;
    const allFailedTests: TestResult[] = [];

    for (const key of suiteKeys) {
      const suite = ALL_TEST_SUITES[key];
      log(`\n▸ Running: ${suite.name} (${suite.tests.length} tests)`);

      for (let i = 0; i < suite.tests.length; i++) {
        setCurrentTest(i + 1);
        const result = await runSingleTest(suite.tests[i]);
        grandTotalPassed += result.passed;
        grandTotalFailed += result.failed;
        if (result.failed > 0) {
          allFailedTests.push(result);
        }
      }
    }

    const grandTotal = grandTotalPassed + grandTotalFailed;
    const totalTests = suiteKeys.reduce((sum, key) => sum + ALL_TEST_SUITES[key].tests.length, 0);

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
          const timingIcon = testResult.timing.pass ? '✓' : '✗';
          const shapePass = testResult.shape.rangePass && testResult.shape.boundsPass && testResult.shape.directionPass;
          const shapeIcon = shapePass ? '✓' : '✗';

          log(`✗ ${testResult.testName}`, 'error');
          log(`  ⏱ Timing: ${timingIcon} ${testResult.timing.driftPercent.toFixed(0)}% drift`, testResult.timing.pass ? 'success' : 'info');
          log(`  📊 Shape: ${shapeIcon} range=${testResult.shape.observedRange}/${testResult.shape.expectedRange}`, shapePass ? 'success' : 'info');

          // Show specific failures
          if (!testResult.shape.rangePass) log(`     ↳ Range too small`, 'error');
          if (!testResult.shape.boundsPass) log(`     ↳ Out of bounds [${testResult.shape.observedMin}-${testResult.shape.observedMax}]`, 'error');
          if (!testResult.shape.directionPass) log(`     ↳ Direction: ${testResult.shape.directionInfo}`, 'error');
          log('');
        }
      }

      // Summary analysis - count timing vs shape failures
      let timingFailCount = 0;
      let shapeFailCount = 0;
      for (const testResult of allFailedTests) {
        if (!testResult.timing.pass) timingFailCount++;
        const shapePass = testResult.shape.rangePass && testResult.shape.boundsPass && testResult.shape.directionPass;
        if (!shapePass) shapeFailCount++;
      }

      log('── SUMMARY ──', 'info');
      log(`Timing failures: ${timingFailCount}/${allFailedTests.length}`, timingFailCount > 0 ? 'error' : 'success');
      log(`Shape failures: ${shapeFailCount}/${allFailedTests.length}`, shapeFailCount > 0 ? 'error' : 'success');
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
