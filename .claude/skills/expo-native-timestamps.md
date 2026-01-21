# High-Precision Native Timestamps in Expo Modules

## Overview
Pattern for capturing accurate timestamps in native iOS code (Swift) and passing them to JavaScript, useful for timing-sensitive applications like MIDI event processing.

## The Problem
JavaScript `Date.now()` captures timestamps when events arrive in JS, not when they actually occur natively. This introduces latency from:
1. The native-to-JS bridge overhead
2. JS event loop processing time

For MIDI events, this can add 15-30ms of jitter, making precise timing verification impossible.

## Solution: Native Timestamp Capture

### 1. Swift: Use CACurrentMediaTime()

```swift
// In MidiManager.swift - capture when CC actually arrives
var onCcReceived: ((UInt8, UInt8, UInt8, Double) -> Void)?  // (channel, cc, value, timestampMs)

private func handleMidiEvents(_ eventList: UnsafePointer<MIDIEventList>) {
    let timestamp = CACurrentMediaTime() * 1000.0  // Convert seconds to ms

    // Process MIDI packet...
    onCcReceived?(channel, cc, value, timestamp)
}
```

### 2. Expo Module: Pass timestamp in event

```swift
// In MidiControllerModule.swift
self.midiManager.onCcReceived = { [weak self] channel, cc, value, timestamp in
    self?.sendEvent("onCcChange", [
        "channel": channel,
        "cc": cc,
        "value": value,
        "timestamp": timestamp  // Native timestamp in ms
    ])
}

// Also expose current timestamp for sync points
Function("getCurrentTimestamp") { () -> Double in
    return CACurrentMediaTime() * 1000.0
}
```

### 3. TypeScript: Update types

```typescript
// In MidiControllerModule.ts
export type MidiControllerModuleEvents = {
  onCcChange: (event: {
    channel: number;
    cc: number;
    value: number;
    timestamp: number  // Native timestamp in ms
  }) => void;
};

declare class MidiControllerModuleClass extends NativeModule<MidiControllerModuleEvents> {
  getCurrentTimestamp(): number;  // Get native time reference
}
```

### 4. JavaScript: Use native timestamps for relative timing

```typescript
// Capture native timestamp when triggering
const triggerTime = MidiControllerModule.getCurrentTimestamp();

// In event listener, calculate relative time
useEventListener(MidiControllerModule, 'onCcChange', (event) => {
  const relativeTime = event.timestamp - triggerTime;
  // Now relativeTime accurately reflects when event occurred
  // relative to trigger, without JS bridge latency
});
```

## Key Points

1. **Same time domain**: Both trigger time and event times use `CACurrentMediaTime()`, so relative calculations are accurate

2. **Milliseconds convention**: Convert to ms (`* 1000.0`) for consistency with JS timing

3. **Sub-millisecond precision**: `CACurrentMediaTime()` has nanosecond precision, far better than Date.now()

4. **Monotonic clock**: Unlike wall-clock time, this can't jump backwards

## Results
- Before: First MIDI CC arrived ~25ms after trigger (measured in JS)
- After: First MIDI CC arrives ~1.4ms after trigger (native timing)

This 20x improvement in timing accuracy is essential for verifying real-time systems against hardware.

## When to Use This Pattern
- MIDI event timing
- Audio processing synchronization
- Hardware I/O verification
- Any timing-critical native-to-JS communication
