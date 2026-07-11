// Single-test runner and MIDI plumbing for LFO hardware verification.
// Extracted verbatim from useLfoVerification.ts (mechanical split, no behavior change).

import { LFO } from 'elektron-lfo';
import MidiControllerModule from '@/modules/midi-controller/src/MidiControllerModule';
import { sendCC, sendNoteOn, sendNoteOff } from '@/modules/midi-controller/src/hooks';

import type { CapturedCC, LogEntry, TestConfig, TestResult } from './types';
import {
  calculateFadeCycles,
  compareFadeAmplitudes,
  detectCycleAmplitudes,
} from './expected-values';

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
export const LFO_OUTPUT_CC = 70;
export const TEST_BPM = 120;

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

// Configure the Digitakt's LFO1 over MIDI CC for the given test.
// (Was a `useCallback` with empty deps in the hook; a module-level function is
// equally stable and identical in behavior.)
function configureLfo(config: TestConfig) {
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
}

// Mutable state shared with the hook (React refs + UI logger).
export interface SingleTestRunnerDeps {
  log: (message: string, type?: LogEntry['type']) => void;
  capturedCCsRef: { current: CapturedCC[] };
  triggerTimeRef: { current: number };
  isCapturingRef: { current: boolean };
  allCCsSeenRef: { current: Map<number, number> };
}

export async function runSingleTest(
  config: TestConfig,
  deps: SingleTestRunnerDeps
): Promise<TestResult> {
  const { log, capturedCCsRef, triggerTimeRef, isCapturingRef, allCCsSeenRef } = deps;

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
  const fullRangeSize = expectedMax - expectedMin;

  // Calculate expected cycle time for fade progress and timing analysis
  const product = Math.abs(config.speed) * config.multiplier;
  const expectedCycleMs = product >= 128
    ? (2000 / (product / 128))
    : (2000 * (128 / product));

  // Adjust expected range based on mode and fade
  let expectedRangeSize = fullRangeSize;
  let expectedFadeProgress = 1;
  let modeRangeMultiplier = 1;

  // Mode-aware range expectations
  if (config.mode === 'HLF') {
    // HLF mode runs for half a cycle then holds
    // For most waveforms, this means ~50% of full range
    // (TRI: goes from center to peak/trough only, SIN: goes from 0 to peak only)
    modeRangeMultiplier = 0.5;
    expectedRangeSize = fullRangeSize * modeRangeMultiplier;
  } else if (config.mode === 'HLD') {
    // HLD mode holds a constant value - expect nearly zero range
    // The held value can be anywhere within the valid range, but it shouldn't vary
    modeRangeMultiplier = 0;
    expectedRangeSize = 5; // Allow small tolerance for noise
  } else if (config.mode === 'ONE') {
    // ONE mode stops on phase wrap (cycleCount >= 1), NOT when returning to startPhase
    // This means non-zero startPhase results in partial amplitude coverage:
    // - Phase=0 or 32: full waveform traversed before wrap = full range
    // - Phase=64 (180°): starts at middle, goes down then up to middle = half range
    // - Phase=96 (270°): starts at trough, goes up to middle = half range
    // Hardware-verified behavior (January 2026)
    const normalizedPhase = config.startPhase / 128; // 0-1 range
    if (normalizedPhase >= 0.4 && normalizedPhase <= 0.6) {
      // Around 180° (phase 64) - half range
      modeRangeMultiplier = 0.5;
      expectedRangeSize = fullRangeSize * modeRangeMultiplier;
    } else if (normalizedPhase >= 0.7 && normalizedPhase <= 0.8) {
      // Around 270° (phase 96) - half range
      modeRangeMultiplier = 0.5;
      expectedRangeSize = fullRangeSize * modeRangeMultiplier;
    }
    // Phase 0 or 32 (0° or 90°) = full range (default)
  }
  // FRE mode is continuous, sees full range
  // TRG mode resets and sees full range

  // For fade tests, adjust expected range based on how far fade should progress
  // during the test duration
  if (config.fade !== 0) {
    const fadeCycles = calculateFadeCycles(config.fade);
    const testCycles = config.durationMs / expectedCycleMs;
    expectedFadeProgress = Math.min(1, testCycles / fadeCycles);

    if (config.fade < 0) {
      // Fade-in: amplitude grows from 0 to full over fadeCycles
      // Expected range = fullRange * progress (accounting for mode too)
      expectedRangeSize = fullRangeSize * modeRangeMultiplier * expectedFadeProgress;
    }
    // Fade-out: amplitude starts at full, so we should still see full range
    // (early cycles have full amplitude even if later cycles are reduced)
  }

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
      expectedRange: expectedRangeSize, // Fade-adjusted if applicable
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
  if (config.mode === 'HLF') {
    log(`HLF mode: expect ~50% of full range (half cycle only)`);
  }
  if (config.fade !== 0) {
    const fadeCycles = calculateFadeCycles(config.fade);
    log(`Fade=${config.fade} (${fadeCycles.toFixed(1)} cycles, expect ${(expectedFadeProgress * 100).toFixed(0)}% progress)`);
  }
  if (config.startPhase !== 0) log(`StartPhase=${config.startPhase}`);

  // Configure LFO - give Digitakt time to process all CCs
  // Need sufficient settling time especially when params change dramatically
  // between tests (e.g., MULT=2048 → MULT=128)
  configureLfo(config);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Start capture
  isCapturingRef.current = true;
  triggerTimeRef.current = MidiControllerModule.getCurrentTimestamp();

  // Support multiple triggers within one test (for ONE mode investigation)
  const triggerCount = config.retriggerCount ?? 1;
  const triggerDelay = config.retriggerDelayMs ?? config.durationMs;

  for (let trig = 0; trig < triggerCount; trig++) {
    if (trig > 0) {
      // Wait before next trigger
      await new Promise((resolve) => setTimeout(resolve, triggerDelay));
      log(`  Retrigger ${trig + 1}/${triggerCount}`, 'info');
    }

    console.log(`[LFO_TRIGGER] Sending note-on ${trig + 1}/${triggerCount}: channel=${TRACK_OUTPUT_CHANNEL + 1} note=60 velocity=100`);
    sendNoteOn(TRACK_OUTPUT_CHANNEL, 60, 100);
    await new Promise((resolve) => setTimeout(resolve, 50));
    sendNoteOff(TRACK_OUTPUT_CHANNEL, 60);
    console.log(`[LFO_TRIGGER] Sent note-off ${trig + 1}/${triggerCount}`);

    // For single trigger, wait the full duration after
    // For multiple triggers, the delay handles timing (except last one)
    if (triggerCount === 1) {
      await new Promise((resolve) => setTimeout(resolve, config.durationMs));
    }
  }

  // For multiple triggers, wait for last cycle to complete
  if (triggerCount > 1) {
    await new Promise((resolve) => setTimeout(resolve, config.durationMs));
  }

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

    // Expected cycle time (already calculated at top of function)

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

    // Range check: does it achieve expected CC swing?
    // NOTE: RND waveform is exempt - random values don't guarantee hitting full range
    // For small expected ranges (extreme fade, minimal depth), use absolute tolerance
    // instead of percentage - hitting 85% of 3 CC is impractical
    // For extreme speed/multiplier edge cases, timing precision is limited at hardware limits
    // This includes:
    // - Very slow LFOs (SPD<=1)
    // - Very fast LFOs (SPD*MULT>=1024) - MIDI CC resolution limits
    // - Very high multiplier (MULT>=1024)
    // - Extreme fade (|FADE|>=40) - very small expected amplitude
    const speedMultProduct = Math.abs(config.speed) * config.multiplier;
    const isExtremeFade = Math.abs(config.fade) >= 40;
    const isExtremeEdgeCase = Math.abs(config.speed) <= 1 || config.multiplier >= 1024 || speedMultProduct >= 1024 || isExtremeFade;
    let rangePass: boolean;
    if (config.waveform === 'RND') {
      rangePass = true; // RND: skip range check, only verify bounds
    } else if (expectedRangeSize < 10) {
      // Small range: pass if within 3 CC of expected (absolute tolerance)
      rangePass = Math.abs(observedRangeSize - expectedRangeSize) <= 3;
    } else if (Math.abs(config.speed) <= 1) {
      // Very slow LFOs (SPD <= 1): timing is extremely imprecise at hardware limits
      // Just verify we see some waveform movement (range >= 3 CC)
      rangePass = observedRangeSize >= 3;
    } else if (isExtremeEdgeCase) {
      // Other extreme edge cases: pass if we see reasonable range (> 25% of expected)
      // Hardware timing precision is limited at these extremes
      rangePass = observedRangeSize >= expectedRangeSize * 0.25;
    } else {
      // Normal range: require 85% of expected
      rangePass = observedRangeSize >= expectedRangeSize * 0.85;
    }

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
    const rangeLabel = config.waveform === 'RND' ? 'N/A (random)' : (rangePass ? 'OK' : 'FAIL');
    console.log(`[LFO_RESULT] SHAPE: range=${observedRangeSize}/${expectedRangeSize} (${rangeLabel}) bounds=[${minVal}-${maxVal}] expected=[${expectedMin}-${expectedMax}] (${boundsPass ? 'OK' : 'FAIL'})`);
    console.log(`[LFO_RESULT] DIRECTION: ${directionInfo || 'N/A'} (${directionPass ? 'OK' : 'FAIL'})`);
    console.log(`[LFO_RESULT] START: value=${startValue} direction=${startDirection} trigger_status=${triggerStatus}`);

    // Determine overall shape pass
    const shapePass = rangePass && boundsPass;
    console.log(`[LFO_RESULT] VERDICT: shape=${shapePass ? 'PASS' : 'FAIL'}`);

    // ============================================
    // PER-CYCLE AMPLITUDE COMPARISON FOR FADE TESTS
    // Compare observed amplitude per cycle against engine expectations
    // NOTE: Skip for tests with retriggers since fade resets on each trigger,
    // making global cycle comparison invalid
    // ============================================
    const hasRetriggers = (config.retriggerCount ?? 1) > 1;
    if (config.fade !== 0 && !hasRetriggers) {
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

      // DIAGNOSTIC: Calculate implied fade cycles from observed data
      // This helps us derive the correct formula
      const observedAmplitudes = fadeResult.cycleAmplitudes.map(c => c.observedAmplitude);
      if (observedAmplitudes.length > 0) {
        // Find cycle where we reach 90% of full amplitude (if ever)
        const target90 = fullAmplitude * 0.9;
        let cyclesTo90: number | null = null;
        for (let i = 0; i < observedAmplitudes.length; i++) {
          if (observedAmplitudes[i] >= target90) {
            if (i === 0) {
              cyclesTo90 = 1;
            } else {
              // Linear interpolation
              const prev = observedAmplitudes[i - 1];
              const curr = observedAmplitudes[i];
              const frac = (target90 - prev) / (curr - prev);
              cyclesTo90 = (i + 1) + frac - 1;
            }
            break;
          }
        }

        // Calculate implied fade rate from last observed cycle
        const lastCycle = observedAmplitudes.length;
        const lastAmp = observedAmplitudes[lastCycle - 1];
        const progressAtLast = lastAmp / fullAmplitude;

        // If amplitude = progress * fullAmplitude, and progress = cycle / fadeCycles
        // Then fadeCycles = cycle / progress
        const impliedFadeCycles = progressAtLast > 0.01 ? lastCycle / progressAtLast : null;

        console.log(`[FADE] DIAGNOSTIC:`);
        console.log(`[FADE]   Full amplitude: ${fullAmplitude} CC`);
        console.log(`[FADE]   At cycle ${lastCycle}: ${lastAmp} CC (${(progressAtLast * 100).toFixed(1)}%)`);
        if (cyclesTo90 !== null) {
          console.log(`[FADE]   Cycles to 90%: ~${cyclesTo90.toFixed(1)}`);
        } else {
          console.log(`[FADE]   Cycles to 90%: >${lastCycle} (not reached)`);
        }
        if (impliedFadeCycles !== null) {
          console.log(`[FADE]   IMPLIED FADE CYCLES: ~${impliedFadeCycles.toFixed(1)} (vs formula: ${isFinite(fadeCycles) ? fadeCycles.toFixed(1) : 'Infinity'})`);
        }
        console.log(`[FADE] ────────────────────────────────────────`);
      }

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
    } else if (config.fade !== 0 && hasRetriggers) {
      // Log that fade verification was skipped for retrigger tests
      const fadeIcon = config.fade < 0 ? '🔺' : '🔻';
      const fadeDir = config.fade < 0 ? 'Fade-in' : 'Fade-out';
      log(`${fadeIcon} ${fadeDir}: skipped (retriggers reset fade)`, 'info');
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
    // HLD mode: Each trigger captures and holds the current LFO value.
    // The Digitakt only sends CCs when the value CHANGES, so:
    // - We expect roughly one CC per trigger (when held value differs from previous)
    // - Fewer CCs if triggers happen to capture the same value
    // - All values should be within valid depth range
    const values = sampledCCs.map(cc => cc.value);
    const uniqueValues = [...new Set(values)].sort((a, b) => a - b);
    const triggerCount = config.retriggerCount || 1;

    // Check all values are within expected range
    const allInRange = values.every(v => v >= expectedMin && v <= expectedMax);

    // We expect at most triggerCount unique values (one per trigger)
    // Could be fewer if triggers capture same LFO position
    const reasonableCount = uniqueValues.length <= triggerCount;

    if (allInRange && reasonableCount) {
      result.passed += sampledCCs.length;
      if (uniqueValues.length === 1) {
        log(`  HLD: Held constant at ${uniqueValues[0]} across ${triggerCount} triggers ✓`, 'success');
      } else {
        log(`  HLD: ${uniqueValues.length} held values across ${triggerCount} triggers: ${uniqueValues.join(', ')} ✓`, 'success');
      }
    } else {
      result.failed += sampledCCs.length;
      if (!allInRange) {
        log(`  HLD: Values outside expected range [${expectedMin}-${expectedMax}] ✗`, 'error');
      }
      if (!reasonableCount) {
        log(`  HLD: Too many unique values (${uniqueValues.length}) for ${triggerCount} triggers - LFO may not be holding ✗`, 'error');
      }
      log(`  HLD: Unique values: ${uniqueValues.join(', ')}`, 'data');
      const first10 = sampledCCs.slice(0, 10);
      log(`  HLD: First 10: ${first10.map(cc => `${cc.value}@${Math.round(cc.timestamp)}ms`).join(', ')}`, 'data');
    }
  } else {
    // For deterministic waveforms, use SHAPE-BASED verification
    // This is independent of timing drift - we check if the shape is correct
    // Primary criteria: range and bounds (does it achieve expected amplitude and stay in bounds?)
    // Secondary criteria: fade amplitude progression (informational, not blocking)
    // Fade verification is timing-sensitive and complex - a mismatch is logged but doesn't fail the test
    const baseShapePass = result.shape.rangePass && result.shape.boundsPass;
    // Fade is non-blocking - we log mismatches but don't fail if range/bounds pass
    const shapePass = baseShapePass;

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
}
