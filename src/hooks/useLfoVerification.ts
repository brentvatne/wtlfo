import { useState, useRef, useCallback, useEffect } from 'react';
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

// Digitakt MIDI Track LFO 1 CC numbers (channel 10)
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

// Value mappings for Digitakt
const WAVEFORM_VALUES: Record<string, number> = {
  TRI: 0,
  SIN: 1,
  SQR: 2,
  SAW: 3,
  EXP: 4,
  RMP: 5,
  RND: 6,
};

const MODE_VALUES: Record<string, number> = {
  FRE: 0,
  TRG: 1,
  HLD: 2,
  ONE: 3,
  HLF: 4,
};

const MULTIPLIER_VALUES: Record<number, number> = {
  1: 0,
  2: 1,
  4: 2,
  8: 3,
  16: 4,
  32: 5,
  64: 6,
  128: 7,
  256: 8,
  512: 9,
  1024: 10,
  2048: 11,
};

// Test configuration
const TEST_CONFIG = {
  waveform: 'TRI' as const,
  speed: 16,
  multiplier: 8 as const,
  depth: 63,
  fade: 0,
  startPhase: 0,
  mode: 'TRG' as const,
};

// MIDI channel for Digitakt MIDI track (0-indexed, so 9 = channel 10)
const MIDI_CHANNEL = 9;

// CC that Digitakt LFO will modulate (we'll set destination to CC 1 = mod wheel)
const LFO_OUTPUT_CC = 1;

// Test duration in ms
const CAPTURE_DURATION_MS = 3000;

// BPM for test (we'll use this for engine simulation)
const TEST_BPM = 120;

// Expected cycle time: speed * multiplier * (60000 / bpm / 16)
// = 16 * 8 * (60000 / 120 / 16) = 128 * 31.25 = 4000ms... wait
// Actually: cycle_time = speed * multiplier * step_time
// step_time = 60000 / bpm / 4 (for 1/16 notes)
// = 60000 / 120 / 4 = 125ms per step
// cycle_time = 16 * 8 = 128 steps * 125ms... that's 16 seconds
// Let me recalculate based on the plan which says 2000ms at 120 BPM

// Per the plan: Speed 16 * Mult 8 = 128 product = 2000ms at 120 BPM
// So the formula must be different. Let me check the engine.
// The plan says "cycle = 2000ms at 120 BPM" for speed=16, mult=8

export function useLfoVerification() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const capturedCCsRef = useRef<CapturedCC[]>([]);
  const triggerTimeRef = useRef<number>(0);
  const isCapturingRef = useRef(false);

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
    // Only capture if we're in capture mode and it's the output CC we're monitoring
    if (isCapturingRef.current && event.cc === LFO_OUTPUT_CC) {
      const timestamp = Date.now() - triggerTimeRef.current;
      capturedCCsRef.current.push({ timestamp, value: event.value });
    }
  });

  const configureLfo = useCallback(() => {
    log('Configuring Digitakt LFO 1 via MIDI CCs...');

    // Set waveform
    sendCC(MIDI_CHANNEL, LFO1_CCS.waveform, WAVEFORM_VALUES[TEST_CONFIG.waveform]);
    log(`  Waveform: ${TEST_CONFIG.waveform} (CC ${LFO1_CCS.waveform} = ${WAVEFORM_VALUES[TEST_CONFIG.waveform]})`);

    // Set speed (0-127 maps to -64 to +63, so 64 = 0, 80 = 16)
    const speedValue = 64 + TEST_CONFIG.speed;
    sendCC(MIDI_CHANNEL, LFO1_CCS.speed, speedValue);
    log(`  Speed: ${TEST_CONFIG.speed} (CC ${LFO1_CCS.speed} = ${speedValue})`);

    // Set multiplier
    sendCC(MIDI_CHANNEL, LFO1_CCS.multiplier, MULTIPLIER_VALUES[TEST_CONFIG.multiplier]);
    log(`  Multiplier: ${TEST_CONFIG.multiplier} (CC ${LFO1_CCS.multiplier} = ${MULTIPLIER_VALUES[TEST_CONFIG.multiplier]})`);

    // Set depth (0-127 maps to -64 to +63, so 64 = 0, 127 = 63)
    const depthValue = 64 + TEST_CONFIG.depth;
    sendCC(MIDI_CHANNEL, LFO1_CCS.depth, depthValue);
    log(`  Depth: ${TEST_CONFIG.depth} (CC ${LFO1_CCS.depth} = ${depthValue})`);

    // Set fade
    sendCC(MIDI_CHANNEL, LFO1_CCS.fade, TEST_CONFIG.fade);
    log(`  Fade: ${TEST_CONFIG.fade} (CC ${LFO1_CCS.fade} = ${TEST_CONFIG.fade})`);

    // Set start phase
    sendCC(MIDI_CHANNEL, LFO1_CCS.startPhase, TEST_CONFIG.startPhase);
    log(`  StartPhase: ${TEST_CONFIG.startPhase} (CC ${LFO1_CCS.startPhase} = ${TEST_CONFIG.startPhase})`);

    // Set mode
    sendCC(MIDI_CHANNEL, LFO1_CCS.mode, MODE_VALUES[TEST_CONFIG.mode]);
    log(`  Mode: ${TEST_CONFIG.mode} (CC ${LFO1_CCS.mode} = ${MODE_VALUES[TEST_CONFIG.mode]})`);

    // Set destination to CC 1 (mod wheel) - destination value 1 typically maps to CC 1
    // On Digitakt, destination 0 = none, 1-127 = various parameters
    // For MIDI track, we need to set it to output CC 1
    // The actual value depends on Digitakt's destination mapping
    // For now, use 1 as placeholder - may need adjustment
    sendCC(MIDI_CHANNEL, LFO1_CCS.destination, 1);
    log(`  Destination: CC 1 (CC ${LFO1_CCS.destination} = 1)`);
  }, [log]);

  const runTimingTest = useCallback(async () => {
    setIsRunning(true);
    capturedCCsRef.current = [];

    log('=== Starting Timing Verification Test ===');
    log('');
    log('Test Configuration:');
    log(`  Waveform: ${TEST_CONFIG.waveform}`);
    log(`  Speed: ${TEST_CONFIG.speed}, Multiplier: ${TEST_CONFIG.multiplier}`);
    log(`  Depth: ${TEST_CONFIG.depth}, Fade: ${TEST_CONFIG.fade}`);
    log(`  StartPhase: ${TEST_CONFIG.startPhase}, Mode: ${TEST_CONFIG.mode}`);
    log(`  BPM: ${TEST_BPM}`);
    log('');

    // Step 1: Configure Digitakt LFO
    configureLfo();
    log('');

    // Wait for config to apply
    log('Waiting 200ms for config to apply...');
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Step 2: Start capturing CC values
    log(`Starting CC capture on CC ${LFO_OUTPUT_CC}...`);
    isCapturingRef.current = true;

    // Step 3: Send trigger (note on/off)
    log('Sending trigger (Note 60, velocity 100)...');
    triggerTimeRef.current = Date.now();
    sendNoteOn(MIDI_CHANNEL, 60, 100);

    // Brief note duration
    await new Promise((resolve) => setTimeout(resolve, 10));
    sendNoteOff(MIDI_CHANNEL, 60);

    // Step 4: Capture for test duration
    log(`Capturing CC values for ${CAPTURE_DURATION_MS / 1000} seconds...`);
    await new Promise((resolve) => setTimeout(resolve, CAPTURE_DURATION_MS));

    // Stop capturing
    isCapturingRef.current = false;
    log('');
    log(`Capture complete. Received ${capturedCCsRef.current.length} CC values.`);

    // Step 5: Run elektron-lfo engine simulation
    log('');
    log('Running elektron-lfo engine simulation...');

    const lfo = new LFO(
      {
        waveform: TEST_CONFIG.waveform,
        speed: TEST_CONFIG.speed,
        multiplier: TEST_CONFIG.multiplier,
        depth: TEST_CONFIG.depth,
        fade: TEST_CONFIG.fade,
        startPhase: TEST_CONFIG.startPhase,
        mode: TEST_CONFIG.mode,
      },
      TEST_BPM
    );

    // Trigger the LFO
    lfo.trigger();

    // Get timing info
    const timingInfo = lfo.getTimingInfo();
    log(`Engine cycle time: ${timingInfo.cycleTimeMs.toFixed(1)}ms (${timingInfo.noteValue})`);
    log('');

    // Step 6: Compare captured values with engine output
    if (capturedCCsRef.current.length === 0) {
      log('ERROR: No CC values captured!', 'error');
      log('Possible issues:', 'error');
      log('  - LFO destination not set correctly', 'error');
      log('  - Digitakt not sending CC output', 'error');
      log('  - Wrong CC number being monitored', 'error');
    } else {
      log('=== Comparison Results ===');
      log('');

      // Sample at key points in the cycle
      const samplePoints = [0, 500, 1000, 1500, 2000, 2500, 3000];
      let passCount = 0;
      let failCount = 0;

      for (const targetTime of samplePoints) {
        if (targetTime > CAPTURE_DURATION_MS) continue;

        // Find captured CC closest to target time
        let closestCapture: CapturedCC | null = null;
        let closestDiff = Infinity;

        for (const cc of capturedCCsRef.current) {
          const diff = Math.abs(cc.timestamp - targetTime);
          if (diff < closestDiff) {
            closestDiff = diff;
            closestCapture = cc;
          }
        }

        // Get engine output at target time
        // We need to simulate the engine at this timestamp
        const engineLfo = new LFO(
          {
            waveform: TEST_CONFIG.waveform,
            speed: TEST_CONFIG.speed,
            multiplier: TEST_CONFIG.multiplier,
            depth: TEST_CONFIG.depth,
            fade: TEST_CONFIG.fade,
            startPhase: TEST_CONFIG.startPhase,
            mode: TEST_CONFIG.mode,
          },
          TEST_BPM
        );
        engineLfo.trigger();

        // Simulate time passing
        const startTime = performance.now();
        const state = engineLfo.update(startTime + targetTime);

        // Convert engine output (-1 to +1) to MIDI CC (0-127)
        // output is -1 to +1, we need to map to 0-127
        // With depth=63, the range is -63 to +63 centered at 64
        const engineCcValue = Math.round(64 + state.output * 63);

        if (closestCapture) {
          const diff = Math.abs(closestCapture.value - engineCcValue);
          const pass = diff <= 5; // Allow ±5 tolerance for MIDI latency and quantization

          if (pass) {
            passCount++;
            log(
              `t=${targetTime}ms: Digitakt=${closestCapture.value}, Engine=${engineCcValue}, Diff=${diff} ✓`,
              'success'
            );
          } else {
            failCount++;
            log(
              `t=${targetTime}ms: Digitakt=${closestCapture.value}, Engine=${engineCcValue}, Diff=${diff} ✗`,
              'error'
            );
          }
        } else {
          log(`t=${targetTime}ms: No capture data available`, 'error');
          failCount++;
        }
      }

      log('');
      log('=== Test Summary ===');
      if (failCount === 0) {
        log(`All ${passCount} checkpoints PASSED!`, 'success');
      } else {
        log(`${passCount} passed, ${failCount} failed`, failCount > passCount ? 'error' : 'info');
      }

      // Log raw captured data for debugging
      log('');
      log('=== Raw Captured Data (first 20 samples) ===', 'data');
      const samples = capturedCCsRef.current.slice(0, 20);
      for (const sample of samples) {
        log(`  t=${sample.timestamp}ms: value=${sample.value}`, 'data');
      }
      if (capturedCCsRef.current.length > 20) {
        log(`  ... and ${capturedCCsRef.current.length - 20} more samples`, 'data');
      }
    }

    log('');
    log('=== Test Complete ===');
    setIsRunning(false);
  }, [log, configureLfo]);

  return {
    logs,
    isRunning,
    runTimingTest,
    clearLogs,
  };
}
