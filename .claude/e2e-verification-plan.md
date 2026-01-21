# End-to-End LFO Verification Plan

## Goal

Verify that our `elektron-lfo` engine matches real Digitakt II hardware behavior by comparing LFO output via MIDI CC.

## Approach

1. Configure Digitakt's MIDI Track LFO via MIDI CCs
2. Set LFO destination to output a MIDI CC (e.g., CC 1)
3. Capture incoming CC values from Digitakt
4. Run `elektron-lfo` engine with same parameters
5. Compare outputs and log results

## V1: Single Timing Test

Start with one comprehensive test before expanding.

**Configuration:**
```
Waveform: TRI
Speed: 16
Multiplier: 8
Product: 128 (cycle = 2000ms at 120 BPM)
Depth: 63
Fade: 0
StartPhase: 0
Mode: TRG (allows triggering to sync cycle start)
```

**Verification Points (at 120 BPM):**
- t=0ms: output ≈ 0
- t=500ms: output ≈ +1 (peak)
- t=1000ms: output ≈ 0
- t=1500ms: output ≈ -1 (trough)
- t=2000ms: output ≈ 0 (cycle complete)

**Pass Criteria:**
- CC values within ±2 of expected (7-bit quantization tolerance)
- Zero-crossings at ~0ms, ~1000ms, ~2000ms (±50ms for MIDI latency)

## V2+ Future Tests

Once timing passes:
1. **Depth scaling** - depth=32 vs 63, verify amplitude
2. **Negative speed** - SPD=-16, verify phase reversal
3. **Unipolar waveforms** - EXP with depth=-63
4. **Trigger modes** - HLD (hold), HLF (half-cycle)
5. **Fade envelope** - Must use TRG mode (fade doesn't work in FRE mode)

## Implementation Steps

### Step 1: Extend MIDI Module with CC Support

**MidiManager.swift additions:**
- Add output port (`MIDIOutputPortCreate`)
- Add CC receive parsing (status byte 0xB0-0xBF)
- Add `sendCC(channel: UInt8, cc: UInt8, value: UInt8)` method
- Add `onCcReceived` callback with (channel, cc, value)

**MidiControllerModule.swift additions:**
- Expose `sendCC()` to JavaScript
- Add `onCcChange` event emitter

### Step 2: Create Developer Screen

**File:** `app/(settings)/developer.tsx`

UI Structure:
- MIDI connection status
- Test configuration display
- "Run Test" button
- Scrollable log output area
- "Clear Log" button

### Step 3: Build Test Harness

**File:** `src/hooks/useLfoVerification.ts`

```typescript
function useLfoVerification() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const log = (message: string) => {
    console.log(`[LFO Test] ${message}`);  // Also appears in Metro terminal
    setLogs(prev => [...prev, { time: Date.now(), message }]);
  };

  const runTimingTest = async () => {
    // 1. Send CCs to configure Digitakt LFO
    // 2. Wait 100ms for config to apply
    // 3. Send trigger (note on)
    // 4. Capture incoming CCs for 3 seconds
    // 5. Run elektron-lfo engine at same timestamps
    // 6. Compare and log results
  };

  return { logs, runTimingTest, clearLogs };
}
```

### Step 4: Digitakt MIDI Track LFO 1 CC Numbers

```typescript
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

// Value mappings
const WAVEFORM_VALUES = { TRI: 0, SIN: 1, SQR: 2, SAW: 3, EXP: 4, RMP: 5, RND: 6 };
const MODE_VALUES = { FRE: 0, TRG: 1, HLD: 2, ONE: 3, HLF: 4 };
const MULTIPLIER_VALUES = { 1: 0, 2: 1, 4: 2, 8: 3, 16: 4, 32: 5, 64: 6, 128: 7, 256: 8, 512: 9, 1024: 10, 2048: 11 };
```

## Key Constraints

1. **Minimum cycle time:** Tests should use cycle time > 500ms due to MIDI CC latency (10-50ms round trip)
2. **7-bit resolution:** MIDI CC is 0-127, expect ±2 value tolerance
3. **TRG mode for sync:** Use TRG mode and send trigger to know exact cycle start
4. **RND is non-deterministic:** Can only verify statistical properties (step count, value range), not exact values
5. **Fade requires trigger modes:** Fade doesn't work in FRE mode per Digitakt behavior

## Developer Screen Location

Add link to Developer screen from Settings index, in the Experimental section alongside MIDI Sync.

Navigation: `router.push('./developer')` from settings index.

## Build Requirements

Native Swift changes require EAS rebuild. Bump app.json version when deploying.
