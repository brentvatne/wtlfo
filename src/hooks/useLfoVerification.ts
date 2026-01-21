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
const TRACK_OUTPUT_CHANNEL = 0;
const LFO_OUTPUT_CC = 70;
const TEST_BPM = 120;

// ============================================
// TEST SUITE - Different configurations to verify parameter modeling
// ============================================
const TEST_SUITE: TestConfig[] = [
  // 1. Baseline TRI test (fast cycle for quick verification)
  {
    name: 'TRI Fast',
    waveform: 'TRI',
    speed: 32,
    multiplier: 4,
    depth: 63,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 2000,
  },
  // 2. SIN waveform verification
  {
    name: 'SIN Wave',
    waveform: 'SIN',
    speed: 32,
    multiplier: 4,
    depth: 63,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 2000,
  },
  // 3. SQR waveform verification
  {
    name: 'SQR Wave',
    waveform: 'SQR',
    speed: 32,
    multiplier: 4,
    depth: 63,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 2000,
  },
  // 4. SAW waveform verification
  {
    name: 'SAW Wave',
    waveform: 'SAW',
    speed: 32,
    multiplier: 4,
    depth: 63,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 2000,
  },
  // 5. Different multiplier (slower cycle)
  {
    name: 'Slow Mult',
    waveform: 'TRI',
    speed: 16,
    multiplier: 16,
    depth: 63,
    fade: 0,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 3000,
  },
  // 6. Start phase offset (90 degrees = 32)
  {
    name: 'Phase 90°',
    waveform: 'TRI',
    speed: 32,
    multiplier: 4,
    depth: 63,
    fade: 0,
    startPhase: 32,
    mode: 'TRG',
    durationMs: 2000,
  },
  // 7. Fade in test
  {
    name: 'Fade In',
    waveform: 'TRI',
    speed: 32,
    multiplier: 4,
    depth: 63,
    fade: 32,
    startPhase: 0,
    mode: 'TRG',
    durationMs: 3000,
  },
  // 8. ONE mode (single shot)
  {
    name: 'ONE Shot',
    waveform: 'TRI',
    speed: 32,
    multiplier: 4,
    depth: 63,
    fade: 0,
    startPhase: 0,
    mode: 'ONE',
    durationMs: 2000,
  },
];

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
  useEventListener(MidiControllerModule, 'onCcChange', (event) => {
    if (isCapturingRef.current) {
      allCCsSeenRef.current.set(event.cc, (allCCsSeenRef.current.get(event.cc) || 0) + 1);
      if (event.cc === LFO_OUTPUT_CC) {
        const timestamp = Date.now() - triggerTimeRef.current;
        capturedCCsRef.current.push({ timestamp, value: event.value });
      }
    }
  });

  const configureLfo = useCallback((config: TestConfig) => {
    // Waveform
    sendCC(TRACK_PARAM_CHANNEL, LFO1_CCS.waveform, WAVEFORM_VALUES[config.waveform]);
    // Speed (0-127 maps to -64 to +63)
    sendCC(TRACK_PARAM_CHANNEL, LFO1_CCS.speed, 64 + config.speed);
    // Multiplier
    sendCC(TRACK_PARAM_CHANNEL, LFO1_CCS.multiplier, MULTIPLIER_VALUES[config.multiplier]);
    // Depth (0-127 maps to -64 to +63)
    sendCC(TRACK_PARAM_CHANNEL, LFO1_CCS.depth, 64 + config.depth);
    // Fade (0-127 maps to -64 to +63)
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
    log(`${config.waveform} | SPD=${config.speed} | MULT=${config.multiplier} | MODE=${config.mode}`);
    if (config.fade !== 0) log(`Fade=${config.fade}`);
    if (config.startPhase !== 0) log(`StartPhase=${config.startPhase}`);

    // Configure LFO
    configureLfo(config);
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Start capture and trigger
    isCapturingRef.current = true;
    triggerTimeRef.current = Date.now();
    sendNoteOn(TRACK_OUTPUT_CHANNEL, 60, 100);
    await new Promise((resolve) => setTimeout(resolve, 10));
    sendNoteOff(TRACK_OUTPUT_CHANNEL, 60);

    // Capture
    await new Promise((resolve) => setTimeout(resolve, config.durationMs));
    isCapturingRef.current = false;

    log(`Captured ${capturedCCsRef.current.length} CC values`);

    if (capturedCCsRef.current.length === 0) {
      log('No data captured!', 'error');
      return { passed: 0, failed: 1 };
    }

    // Compare with engine
    const sampleCount = 5;
    const interval = config.durationMs / sampleCount;
    let passed = 0;
    let failed = 0;

    for (let i = 0; i < sampleCount; i++) {
      const targetTime = Math.round(i * interval);

      // Find closest captured value
      let closest: CapturedCC | null = null;
      let closestDiff = Infinity;
      for (const cc of capturedCCsRef.current) {
        const diff = Math.abs(cc.timestamp - targetTime);
        if (diff < closestDiff) {
          closestDiff = diff;
          closest = cc;
        }
      }

      // Get engine value
      const engineLfo = new LFO({
        waveform: config.waveform,
        speed: config.speed,
        multiplier: config.multiplier,
        depth: config.depth,
        fade: config.fade,
        startPhase: config.startPhase,
        mode: config.mode,
      }, TEST_BPM);
      engineLfo.trigger();
      const startTime = performance.now();
      const state = engineLfo.update(startTime + targetTime);
      const engineCcValue = Math.round(64 + state.output * config.depth);

      if (closest) {
        const diff = Math.abs(closest.value - engineCcValue);
        const pass = diff <= 8; // Allow some tolerance

        if (pass) {
          passed++;
          log(`  t=${targetTime}ms: DT=${closest.value} ENG=${engineCcValue} ✓`, 'success');
        } else {
          failed++;
          log(`  t=${targetTime}ms: DT=${closest.value} ENG=${engineCcValue} Δ${diff} ✗`, 'error');
        }
      } else {
        failed++;
        log(`  t=${targetTime}ms: No data`, 'error');
      }
    }

    return { passed, failed };
  }, [log, configureLfo]);

  const runTimingTest = useCallback(async () => {
    setIsRunning(true);
    setCurrentTest(0);

    log('========================================');
    log('  LFO PARAMETER VERIFICATION SUITE');
    log('========================================');
    log(`Running ${TEST_SUITE.length} tests at ${TEST_BPM} BPM`);
    log('');

    let totalPassed = 0;
    let totalFailed = 0;

    for (let i = 0; i < TEST_SUITE.length; i++) {
      setCurrentTest(i + 1);
      const config = TEST_SUITE[i];
      const result = await runSingleTest(config);
      totalPassed += result.passed;
      totalFailed += result.failed;
      log('');
    }

    log('========================================');
    log('  SUITE COMPLETE');
    log('========================================');
    const successRate = Math.round((totalPassed / (totalPassed + totalFailed)) * 100);
    if (totalFailed === 0) {
      log(`All ${totalPassed} checkpoints PASSED! ✓`, 'success');
    } else {
      log(`${totalPassed}/${totalPassed + totalFailed} passed (${successRate}%)`, totalFailed > totalPassed ? 'error' : 'info');
    }

    setIsRunning(false);
    setCurrentTest(0);
  }, [log, runSingleTest]);

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
    testCount: TEST_SUITE.length,
    testNames: TEST_SUITE.map(t => t.name),
    runTimingTest,  // Run all tests
    runTest,        // Run single test by index
    clearLogs,
  };
}
