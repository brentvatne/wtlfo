# Hardware Verification Testing

## Overview
Pattern for end-to-end testing software against real hardware, learned from verifying an LFO engine against Elektron Digitakt II output via MIDI CC.

## Architecture

### 1. Capture Reference Timestamp at Trigger
```typescript
// Use native timestamp (same time domain as incoming events)
const triggerTime = MidiControllerModule.getCurrentTimestamp();

// Send trigger to hardware
sendNoteOn(channel, note, velocity);
```

### 2. Capture Hardware Output Events
```typescript
const capturedEvents: { timestamp: number; value: number }[] = [];

useEventListener(MidiControllerModule, 'onCcChange', (event) => {
  if (isCapturing) {
    // Calculate relative time from trigger
    const relativeTime = event.timestamp - triggerTime;
    capturedEvents.push({ timestamp: relativeTime, value: event.value });
  }
});
```

### 3. Generate Expected Values at Captured Timestamps
```typescript
// Don't compare at fixed intervals - compare at actual event times
const expectedValues = capturedEvents.map(captured => {
  const engineState = engine.update(captured.timestamp);
  return {
    timestamp: captured.timestamp,
    value: engineToOutputValue(engineState),
  };
});
```

### 4. Tolerance-Based Comparison
```typescript
const TOLERANCE = 15; // Allow for timing jitter, quantization

for (let i = 0; i < samples.length; i++) {
  const diff = Math.abs(captured[i].value - expected[i].value);
  const pass = diff <= TOLERANCE;

  if (pass) passed++;
  else failed++;
}
```

## Test Organization

### Organize by Feature
```typescript
const ALL_TEST_SUITES = {
  waveform: { name: 'Waveform Tests', tests: WAVEFORM_TESTS },
  timing: { name: 'Timing Tests', tests: TIMING_TESTS },
  depth: { name: 'Depth Tests', tests: DEPTH_TESTS },
  // ...
};
```

### Test Configuration Pattern
```typescript
interface TestConfig {
  name: string;
  // Hardware parameters to configure
  waveform: 'TRI' | 'SIN' | 'SQR';
  speed: number;
  depth: number;
  // Test parameters
  durationMs: number;
}
```

### Configure Hardware Before Each Test
```typescript
async function runTest(config: TestConfig) {
  // 1. Configure hardware via MIDI CC
  sendCC(channel, PARAM_CC.waveform, config.waveform);
  sendCC(channel, PARAM_CC.speed, config.speed);

  // 2. Wait for hardware to process
  await delay(500);

  // 3. Trigger and capture
  startCapture();
  sendTrigger();
  await delay(config.durationMs);
  stopCapture();

  // 4. Compare
  return compareWithEngine(capturedEvents, config);
}
```

## Debugging Visualization

### ASCII Waveform Comparison
```typescript
function drawWaveformComparison(observed: Point[], expected: Point[]): string[] {
  const grid: string[][] = createGrid(WIDTH, HEIGHT);

  // Plot expected with dots
  for (const point of expected) {
    grid[valueToRow(point.value)][timeToCol(point.timestamp)] = '·';
  }

  // Plot observed - show matches
  for (const point of observed) {
    const row = valueToRow(point.value);
    const col = timeToCol(point.timestamp);
    grid[row][col] = grid[row][col] === '·' ? '●' : 'o';
  }

  return formatGrid(grid);
}

// Output:
// Waveform: o=Hardware  ·=Engine  ●=Match
// 127 ┬────────────────────────────────────────┐
//     │    ●●●●●                    ●●●●●      │
//  64 │●●●      ●●●●●          ●●●●      ●●●●●│
//     │              ●●●●●●●●●●                │
//   0 └────────────────────────────────────────┘
```

### Shape Analysis (Independent of Phase)
```typescript
// Count direction changes to verify frequency matches
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

// If direction changes match, frequency is correct even if phase differs
log(`Direction changes: Hardware=${obsChanges} Engine=${expChanges}`);
```

## Common Issues and Solutions

### 1. Phase Alignment
Hardware may have startup latency or different phase offset.
**Solution**: Compare shape/frequency, not absolute phase. Use direction change count.

### 2. Timing Drift
Small timing differences accumulate over long tests.
**Solution**: Compare at actual event timestamps, not fixed intervals.

### 3. Value Quantization
Hardware output may be quantized differently than engine.
**Solution**: Use tolerance (±10-15 for 0-127 CC range is reasonable).

### 4. Configuration Latency
Hardware needs time to process parameter changes.
**Solution**: Add delay (300-500ms) after configuration before triggering.

## Checkpoint Reporting

```typescript
// Structured output for easy parsing
console.log(`[TEST_RESULT] CONFIG: speed=${config.speed} depth=${config.depth}`);
console.log(`[TEST_RESULT] TIMING: expected=${expectedMs}ms observed=${observedMs}ms`);
console.log(`[TEST_RESULT] RANGE: hardware=[${min}-${max}] engine=[${expMin}-${expMax}]`);
console.log(`[TEST_RESULT] VERDICT: ${passed}/${total} checkpoints passed`);
```

## When to Use This Pattern

- Verifying audio/music software against hardware synthesizers
- Testing MIDI implementations against reference devices
- Validating timing-critical systems against known-good hardware
- Any scenario where software must match hardware behavior
