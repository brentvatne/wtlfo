// Types for the LFO hardware verification harness.
// Extracted verbatim from useLfoVerification.ts (mechanical split, no behavior change).

export interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'data';
}

export interface CapturedCC {
  timestamp: number;
  value: number;
}

export interface TestFailure {
  testName: string;
  timestamp: number;
  digitaktValue: number;
  engineValue: number;
  diff: number;
}

export interface TimingResult {
  expectedCycleMs: number;
  observedCycleMs: number;
  driftPercent: number;
  pass: boolean;
}

// Per-cycle amplitude for fade verification
export interface CycleAmplitude {
  cycle: number;
  observedAmplitude: number;
  expectedAmplitude: number;
  pass: boolean;
}

export interface FadeResult {
  cycleAmplitudes: CycleAmplitude[];
  fadePass: boolean;
  fadeSummary: string;
}

export interface ShapeResult {
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

export interface TestResult {
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

export interface TestConfig {
  name: string;
  waveform: 'TRI' | 'SIN' | 'SQR' | 'SAW' | 'EXP' | 'RMP' | 'RND';
  speed: number;
  multiplier: 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048;
  depth: number;
  fade: number;
  startPhase: number;
  mode: 'FRE' | 'TRG' | 'HLD' | 'ONE' | 'HLF';
  durationMs: number;
  // Optional: trigger multiple times within the test (for ONE mode investigation)
  retriggerCount?: number;      // Number of triggers (default 1)
  retriggerDelayMs?: number;    // Delay between triggers (should be > cycle time for ONE mode)
}
