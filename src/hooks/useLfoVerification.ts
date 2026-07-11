// LFO hardware verification hook.
//
// The bulk of this module lives in src/hooks/lfo-verification/ (mechanical
// split, no behavior change):
//   - test-definitions.ts  — the test-config arrays and ALL_TEST_SUITES
//   - expected-values.ts   — hardware-verified expected-value math
//   - runner.ts            — the single-test runner and MIDI plumbing
//   - types.ts             — shared types
// The public API is unchanged: `useLfoVerification`, `TestSuiteKey`, and
// `LogEntry` are still imported from '@/src/hooks/useLfoVerification'.

import { useState, useRef, useCallback } from 'react';
import { useEventListener } from 'expo';
import MidiControllerModule from '@/modules/midi-controller/src/MidiControllerModule';

import type { CapturedCC, LogEntry, TestConfig, TestResult } from './lfo-verification/types';
import {
  ALL_TEST_SUITES,
  TEST_SUITE,
  TIMING_TESTS,
  TRIGGER_TESTS,
} from './lfo-verification/test-definitions';
import {
  LFO_OUTPUT_CC,
  TEST_BPM,
  runSingleTest as runSingleTestImpl,
} from './lfo-verification/runner';

export type { LogEntry } from './lfo-verification/types';
// Export test suite type for UI components
export type { TestSuiteKey } from './lfo-verification/test-definitions';

export function useLfoVerification() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<number>(0);
  const [failedTestConfigs, setFailedTestConfigs] = useState<TestConfig[]>([]);
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

  // Run one hardware test. The implementation lives in
  // lfo-verification/runner.ts; it mutates the capture refs and reports
  // through `log`.
  const runSingleTest = useCallback(
    (config: TestConfig) =>
      runSingleTestImpl(config, {
        log,
        capturedCCsRef,
        triggerTimeRef,
        isCapturingRef,
        allCCsSeenRef,
      }),
    [log]
  );

  const runTestSuite = useCallback(async (suite: TestConfig[], suiteName: string, isRerun: boolean = false) => {
    setIsRunning(true);
    setCurrentTest(0);

    // Clear failed tests at start of new run (not re-run)
    if (!isRerun) {
      setFailedTestConfigs([]);
    }

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
    const newFailedConfigs: TestConfig[] = [];
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
        newFailedConfigs.push(config);
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

    // Update failed test configs
    if (isRerun) {
      // For re-runs: remove tests that passed, keep tests that still fail
      const testedNames = new Set(suite.map(c => c.name));
      setFailedTestConfigs(prev => {
        // Keep: tests not in this re-run + tests that still failed
        return [
          ...prev.filter(c => !testedNames.has(c.name)), // Tests not re-run
          ...newFailedConfigs, // Tests that still failed
        ];
      });
    } else if (newFailedConfigs.length > 0) {
      // For fresh runs with failures: replace failed list
      setFailedTestConfigs(newFailedConfigs);
    } else {
      // For fresh runs with all passing: clear failed list
      setFailedTestConfigs([]);
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

  // Re-run only the tests that failed in the last run
  const runFailedTests = useCallback(() => {
    if (failedTestConfigs.length === 0) {
      log('No failed tests to re-run', 'info');
      return;
    }
    return runTestSuite(failedTestConfigs, `RE-RUN FAILED TESTS (${failedTestConfigs.length})`, true);
  }, [runTestSuite, failedTestConfigs, log]);

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

  // Calculate total test count from all suites
  const totalTestCount = Object.values(ALL_TEST_SUITES).reduce(
    (sum, suite) => sum + suite.tests.length,
    0
  );

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
    totalTestCount,
    runSuiteByKey,
    runAllSuites,
    // Failed test re-run
    failedTestCount: failedTestConfigs.length,
    runFailedTests,
  };
}
