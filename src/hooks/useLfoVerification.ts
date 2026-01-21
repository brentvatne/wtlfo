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
// TRIGGER BEHAVIOR TESTS
// Goal: Understand how different modes respond to note triggers
// Using slow LFO (product=64, cycle=4000ms) so we can clearly see
// where in the cycle the capture starts after trigger
//
// Using depth=20 for cleaner MIDI CC mapping:
// - CC 74 sent → display value ~20
// - Engine depth 10 → ±10/63 scaling
// - Expected CC range: ~54-74 (±10 from center 64)
// ============================================
const TRIGGER_TESTS: TestConfig[] = [
  // TRG mode: Should reset phase to startPhase on note trigger
  {
    name: 'TRG phase=0',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,  // 16 × 4 = 64 → 4000ms cycle
    depth: 20,      // Easier to verify via MIDI - should show ~20 on device
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 5000,
  },
  // TRG mode with startPhase=64 (180°): Should start at center going DOWN
  {
    name: 'TRG phase=64',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 20,
    fade: 0,
    startPhase: 64,
    mode: 'TRG',
    durationMs: 5000,
  },
  // FRE mode: Should NOT reset on trigger, runs freely
  {
    name: 'FRE mode',
    waveform: 'TRI',
    speed: 16,
    multiplier: 4,
    depth: 20,
    fade: 0,
    startPhase: 0,
    mode: 'FRE',
    durationMs: 5000,
  },
];

// ============================================
// TIMING/WAVEFORM COMPARISON TESTS
// Goal: Verify engine timing and waveform accuracy
// ============================================
const TIMING_TESTS: TestConfig[] = [
  // 1 cycle per bar (2000ms at 120 BPM) - SPD×MULT = 128
  {
    name: '1 bar cycle',
    waveform: 'TRI',
    speed: 32,
    multiplier: 4,  // 32 × 4 = 128 = 1 whole note
    depth: 127,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 4000,
  },
  // 2 cycles per bar (1000ms at 120 BPM) - SPD×MULT = 256
  {
    name: '1/2 note cycle',
    waveform: 'TRI',
    speed: 32,
    multiplier: 8,  // 32 × 8 = 256 = 1/2 note
    depth: 127,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 3000,
  },
];

// Default to trigger tests
const TEST_SUITE = TRIGGER_TESTS;

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

  const runSingleTest = useCallback(async (config: TestConfig): Promise<{ passed: number; failed: number }> => {
    capturedCCsRef.current = [];
    allCCsSeenRef.current.clear();

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

      // Expected cycle time from formula
      const product = config.speed * config.multiplier;
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

      // Calculate timing error
      const timingRatio = observedCycleMs / expectedCycleMs;
      const timingError = Math.abs(1 - timingRatio) * 100;
      const timingStatus = timingError < 15 ? 'OK' : timingError < 30 ? 'DRIFT' : 'WRONG';

      // Calculate range error (should be 0-127 for full depth)
      const rangeSize = maxVal - minVal;
      const expectedRange = 127; // Full depth should give 0-127
      const rangeError = Math.abs(expectedRange - rangeSize);
      const rangeStatus = rangeError < 20 ? 'OK' : 'LIMITED';

      // Trigger behavior check
      const triggerStatus = config.mode === 'TRG'
        ? (Math.abs(startValue - 64) < 20 ? 'RESET_OK' : 'NO_RESET')
        : 'N/A';

      // Output structured summary for LLM parsing
      console.log(`\n[LFO_RESULT] ============ ${config.name} ============`);
      console.log(`[LFO_RESULT] CONFIG: mode=${config.mode} speed=${config.speed} mult=${config.multiplier} depth=${config.depth} startPhase=${config.startPhase}`);
      console.log(`[LFO_RESULT] TIMING: expected=${expectedCycleMs.toFixed(0)}ms observed=${observedCycleMs.toFixed(0)}ms ratio=${timingRatio.toFixed(2)}x status=${timingStatus}`);
      console.log(`[LFO_RESULT] RANGE: min=${minVal} max=${maxVal} size=${rangeSize} expected=${expectedRange} status=${rangeStatus}`);
      console.log(`[LFO_RESULT] FREQUENCY: expected_cycles=${(duration / expectedCycleMs).toFixed(1)} observed_cycles=${observedCycles.toFixed(1)} dir_changes=${dirChanges}`);
      console.log(`[LFO_RESULT] START: value=${startValue} direction=${startDirection} trigger_status=${triggerStatus}`);
      console.log(`[LFO_RESULT] VERDICT: timing=${timingStatus} range=${rangeStatus} trigger=${triggerStatus}`);

      // Human-readable summary in UI
      log(`Timing: ${observedCycleMs.toFixed(0)}ms vs ${expectedCycleMs.toFixed(0)}ms expected (${timingStatus})`, timingStatus === 'OK' ? 'success' : 'error');
      log(`Range: ${minVal}-${maxVal} (${rangeStatus})`, rangeStatus === 'OK' ? 'success' : 'error');
      log(`Start: value=${startValue} going ${startDirection}`, 'data');
      if (config.mode === 'TRG') {
        log(`Trigger reset: ${triggerStatus}`, triggerStatus === 'RESET_OK' ? 'success' : 'error');
      }
    }

    if (capturedCCsRef.current.length === 0) {
      log('No data captured!', 'error');
      return { passed: 0, failed: 1 };
    }

    // Compare with engine - create LFO once and simulate time progression
    const sampleCount = 5;
    let passed = 0;
    let failed = 0;

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
    engineLfo.trigger();

    // NEW APPROACH: Compare at the actual captured timestamps, not at fixed intervals
    // This is more accurate because the Digitakt only sends CCs when values change
    //
    // Engine starts at t=1 (not t=0 to avoid sentinel bug in lfo.ts where lastUpdateTime===0
    // is treated as "first call" and returns deltaMs=0)
    const baseTime = 1;
    engineLfo.update(baseTime);

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

    for (const captured of sampledCCs) {
      // Get engine value at the exact timestamp when this CC was captured
      const engineTime = baseTime + captured.timestamp;
      const state = engineLfo.update(engineTime);

      // Debug first 3 samples
      if (sampledCCs.indexOf(captured) < 3) {
        console.log(`[LFO Debug] t=${captured.timestamp}ms: phase=${state.phase.toFixed(3)}, output=${state.output.toFixed(3)}`);
      }

      // CC formula: center (64) + scaled output * max modulation (63)
      // state.output is already depth-scaled, so multiply by 63 for full CC range
      // Clamp to 0-127 (same as Digitakt hardware behavior)
      const engineCcValue = Math.max(0, Math.min(127, Math.round(64 + state.output * 63)));

      const diff = Math.abs(captured.value - engineCcValue);
      const pass = diff <= 15; // Allow tolerance for phase alignment differences

      if (pass) {
        passed++;
        log(`  t=${captured.timestamp}ms: DT=${captured.value} ENG=${engineCcValue} ✓`, 'success');
      } else {
        failed++;
        log(`  t=${captured.timestamp}ms: DT=${captured.value} ENG=${engineCcValue} Δ${diff} ✗`, 'error');
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
    engineLfoViz.trigger();
    engineLfoViz.update(baseTime);

    const expectedPoints: { timestamp: number; value: number }[] = [];
    for (const captured of sortedCCs) {
      const engineTime = baseTime + captured.timestamp;
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

    return { passed, failed };
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

    for (let i = 0; i < suite.length; i++) {
      setCurrentTest(i + 1);
      const config = suite[i];
      const result = await runSingleTest(config);
      totalPassed += result.passed;
      totalFailed += result.failed;
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

    setIsRunning(false);
    setCurrentTest(0);
  }, [log, runSingleTest]);

  const runTriggerTests = useCallback(() => {
    return runTestSuite(TRIGGER_TESTS, 'TRIGGER BEHAVIOR TESTS');
  }, [runTestSuite]);

  const runTimingTests = useCallback(() => {
    return runTestSuite(TIMING_TESTS, 'TIMING VERIFICATION TESTS');
  }, [runTestSuite]);

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
    }

    setIsRunning(false);
    setCurrentTest(0);
  }, [log, clearLogs, runSingleTest]);

  return {
    logs,
    isRunning,
    currentTest,
    clearLogs,
    // Separate test runners
    runTriggerTests,
    runTimingTests,
    // For individual test running
    runTest,
    triggerTests: TRIGGER_TESTS,
    timingTests: TIMING_TESTS,
  };
}
