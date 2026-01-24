# MIDI Transport/Clock Sync Module Plan

> **Reviewed by experts** - Critical fixes incorporated from iOS/CoreMIDI, Expo Modules, and MIDI protocol reviews.

## Overview

Build a minimal Expo native module (iOS only) that:
1. Connects to Digitakt 2 over USB MIDI
2. Receives MIDI transport messages (Start/Stop/Continue)
3. Receives MIDI clock (24 ppqn)
4. Exposes state to React Native for syncing LFO visualization

**Key Design Decisions (from expert review):**
- Do NOT send clock tick events to JS (too frequent - 48-80/sec would flood bridge)
- Use polling via `getTransportState()` instead
- Only send transport change and BPM update events
- Use `CACurrentMediaTime()` for timing (not `mach_absolute_time`)
- All state access must be thread-safe (MIDI callbacks on high-priority thread)

---

## 1. MIDI Message Reference

| Message | Hex | Decimal | Description |
|---------|-----|---------|-------------|
| Clock | 0xF8 | 248 | Timing tick (24 per quarter note) |
| Start | 0xFA | 250 | Start playback from beginning |
| Continue | 0xFB | 251 | Resume from current position |
| Stop | 0xFC | 252 | Stop playback |

---

## 2. Module Structure

```
modules/
└── midi-clock/
    ├── src/
    │   ├── index.ts              # TypeScript API exports
    │   └── MidiClock.types.ts    # TypeScript types
    ├── ios/
    │   ├── MidiClockModule.swift # Expo module definition
    │   └── MidiManager.swift     # CoreMIDI wrapper
    ├── expo-module.config.json
    └── package.json
```

---

## 3. Native iOS Implementation

### 3.1 CoreMIDI Approach

Using modern CoreMIDI APIs (iOS 15+). **Critical fixes from expert review incorporated.**

```swift
// MidiManager.swift
import CoreMIDI
import os

class MidiManager {
    private var midiClient: MIDIClientRef = 0
    private var inputPort: MIDIPortRef = 0
    private(set) var connectedSource: MIDIEndpointRef = 0

    // Thread-safe state access
    private let lock = NSLock()
    private var _isTransportRunning = false
    private var _clockTickCount: UInt64 = 0
    private var _bpm: Double = 0

    var isTransportRunning: Bool {
        lock.lock()
        defer { lock.unlock() }
        return _isTransportRunning
    }

    var clockTickCount: UInt64 {
        lock.lock()
        defer { lock.unlock() }
        return _clockTickCount
    }

    var bpm: Double {
        lock.lock()
        defer { lock.unlock() }
        return _bpm
    }

    // Callbacks (called on main thread)
    var onTransportChange: ((Bool) -> Void)?
    var onBpmUpdate: ((Double) -> Void)?
    var onDevicesChanged: (() -> Void)?
    var onDisconnect: (() -> Void)?

    func setup() throws {
        var status = MIDIClientCreateWithBlock("wtlfo" as CFString, &midiClient) { [weak self] notification in
            self?.handleMidiNotification(notification)
        }
        guard status == noErr else {
            throw MidiError.clientCreationFailed(status)
        }

        status = MIDIInputPortCreateWithProtocol(
            midiClient,
            "Input" as CFString,
            ._1_0,
            &inputPort
        ) { [weak self] eventList, srcConnRefCon in
            self?.handleMidiEvents(eventList)
        }
        guard status == noErr else {
            throw MidiError.portCreationFailed(status)
        }
    }

    func handleMidiEvents(_ eventList: UnsafePointer<MIDIEventList>) {
        // Parse events on MIDI thread, then dispatch state changes
        var transportChanged: Bool? = nil
        var bpmChanged: Double? = nil

        eventList.pointee.unsafeSequence().forEach { event in
            // Extract status from UMP (Universal MIDI Packet)
            let word = event.pointee.words.0
            let messageType = (word >> 28) & 0xF

            // System Real Time messages (type 0x1 in UMP)
            if messageType == 0x1 {
                let status = UInt8((word >> 16) & 0xFF)

                lock.lock()
                switch status {
                case 0xF8: // Clock
                    _clockTickCount += 1
                    calculateBpmLocked()
                    if let newBpm = checkBpmChangeLocked() {
                        bpmChanged = newBpm
                    }
                case 0xFA: // Start
                    _clockTickCount = 0
                    clockIntervals.removeAll()
                    lastClockTime = 0
                    _isTransportRunning = true
                    transportChanged = true
                case 0xFB: // Continue
                    _isTransportRunning = true
                    transportChanged = true
                case 0xFC: // Stop
                    _isTransportRunning = false
                    transportChanged = false
                default:
                    break
                }
                lock.unlock()
            }
        }

        // Dispatch callbacks to main thread
        if let running = transportChanged {
            DispatchQueue.main.async { [weak self] in
                self?.onTransportChange?(running)
            }
        }
        if let newBpm = bpmChanged {
            DispatchQueue.main.async { [weak self] in
                self?.onBpmUpdate?(newBpm)
            }
        }
    }

    // BPM calculation - must be called with lock held
    private var lastClockTime: CFTimeInterval = 0
    private var clockIntervals: [Double] = []
    private var lastReportedBpm: Double = 0

    private func calculateBpmLocked() {
        let now = CACurrentMediaTime()
        if lastClockTime > 0 {
            let intervalMs = (now - lastClockTime) * 1000.0

            // Outlier rejection: skip if interval is wildly off
            if clockIntervals.count > 0 {
                let avgInterval = clockIntervals.reduce(0, +) / Double(clockIntervals.count)
                if intervalMs < avgInterval * 0.5 || intervalMs > avgInterval * 2.0 {
                    lastClockTime = now
                    return // Skip this tick
                }
            }

            clockIntervals.append(intervalMs)
            if clockIntervals.count > 24 {
                clockIntervals.removeFirst()
            }
            if clockIntervals.count >= 6 {
                // Use median for jitter resistance
                let sorted = clockIntervals.sorted()
                let medianInterval = sorted[sorted.count / 2]
                let ticksPerMinute = 60000.0 / medianInterval
                _bpm = max(20, min(300, ticksPerMinute / 24.0)) // Clamp to sane range
            }
        }
        lastClockTime = now
    }

    private func checkBpmChangeLocked() -> Double? {
        // Only report if BPM changed by > 0.5
        if abs(_bpm - lastReportedBpm) > 0.5 {
            lastReportedBpm = _bpm
            return _bpm
        }
        return nil
    }

    func handleMidiNotification(_ notification: UnsafePointer<MIDINotification>) {
        switch notification.pointee.messageID {
        case .msgObjectRemoved:
            let removeNotification = UnsafeRawPointer(notification)
                .assumingMemoryBound(to: MIDIObjectAddRemoveNotification.self)
            if removeNotification.pointee.child == connectedSource {
                lock.lock()
                connectedSource = 0
                _isTransportRunning = false
                lock.unlock()
                DispatchQueue.main.async { [weak self] in
                    self?.onDisconnect?()
                }
            }
        case .msgSetupChanged, .msgObjectAdded:
            DispatchQueue.main.async { [weak self] in
                self?.onDevicesChanged?()
            }
        default:
            break
        }
    }

    deinit {
        disconnect()
        if inputPort != 0 { MIDIPortDispose(inputPort) }
        if midiClient != 0 { MIDIClientDispose(midiClient) }
    }
}

enum MidiError: Error {
    case clientCreationFailed(OSStatus)
    case portCreationFailed(OSStatus)
    case connectionFailed(OSStatus)
}
```
```

### 3.2 Expo Module Definition

**Key design decision:** No `onClockTick` event - polling via `getTransportState()` is more efficient than updating React state 48-80 times per second.

```swift
// MidiClockModule.swift
import ExpoModulesCore

public class MidiClockModule: Module {
    private lazy var midiManager = MidiManager()
    private var isSetup = false

    public func definition() -> ModuleDefinition {
        Name("MidiClock")

        // Only transport/BPM events - no clock ticks (too frequent)
        Events("onTransportChange", "onBpmUpdate", "onDevicesChanged", "onDisconnect")

        OnStartObserving {
            guard !isSetup else { return }
            do {
                try midiManager.setup()
                isSetup = true
            } catch {
                print("MIDI setup failed: \(error)")
            }

            midiManager.onTransportChange = { [weak self] running in
                self?.sendEvent("onTransportChange", ["running": running])
            }
            midiManager.onBpmUpdate = { [weak self] bpm in
                self?.sendEvent("onBpmUpdate", ["bpm": bpm])
            }
            midiManager.onDevicesChanged = { [weak self] in
                self?.sendEvent("onDevicesChanged", [:])
            }
            midiManager.onDisconnect = { [weak self] in
                self?.sendEvent("onDisconnect", [:])
            }
        }

        OnDestroy {
            midiManager.onTransportChange = nil
            midiManager.onBpmUpdate = nil
            midiManager.onDevicesChanged = nil
            midiManager.onDisconnect = nil
        }

        Function("getDevices") {
            return midiManager.getAvailableDevices()
        }

        AsyncFunction("connect") { (deviceName: String) -> Bool in
            return midiManager.connect(toDeviceNamed: deviceName)
        }

        Function("disconnect") {
            midiManager.disconnect()
        }

        Function("isConnected") -> Bool {
            return midiManager.connectedSource != 0
        }

        // Poll this for current state (more efficient than events for clock)
        Function("getTransportState") -> [String: Any] {
            return [
                "running": midiManager.isTransportRunning,
                "clockTick": midiManager.clockTickCount,
                "bpm": midiManager.bpm
            ]
        }
    }
}
```
```

---

## 4. TypeScript API

Using modern Expo patterns (no legacy bridge/EventEmitter):

```typescript
// src/MidiClockModule.ts
import { NativeModule, requireNativeModule } from 'expo';

export interface MidiDevice {
  name: string;
  id: string;
}

export interface TransportState {
  running: boolean;
  clockTick: number;
  bpm: number;
}

export type MidiClockModuleEvents = {
  onTransportChange: { running: boolean };
  onBpmUpdate: { bpm: number };
  onDevicesChanged: {};
  onDisconnect: {};
};

declare class MidiClockModuleClass extends NativeModule<MidiClockModuleEvents> {
  getDevices(): MidiDevice[];
  connect(deviceName: string): Promise<boolean>;
  disconnect(): void;
  isConnected(): boolean;
  getTransportState(): TransportState;
}

export default requireNativeModule<MidiClockModuleClass>('MidiClock');
```

```typescript
// src/hooks.ts
import { useEffect, useState, useCallback } from 'react';
import { useEventListener } from 'expo';
import MidiClockModule, { MidiDevice, TransportState } from './MidiClockModule';

export function useMidiDevices(): { devices: MidiDevice[]; refresh: () => void } {
  const [devices, setDevices] = useState<MidiDevice[]>([]);

  const refresh = useCallback(() => {
    setDevices(MidiClockModule.getDevices());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEventListener(MidiClockModule, 'onDevicesChanged', refresh);

  return { devices, refresh };
}

export function useTransportState(): TransportState & { connected: boolean } {
  const [state, setState] = useState<TransportState>(() =>
    MidiClockModule.getTransportState()
  );
  const [connected, setConnected] = useState(() => MidiClockModule.isConnected());

  useEventListener(MidiClockModule, 'onTransportChange', (event) => {
    setState((prev) => ({ ...prev, running: event.running }));
  });

  useEventListener(MidiClockModule, 'onBpmUpdate', (event) => {
    setState((prev) => ({ ...prev, bpm: event.bpm }));
  });

  useEventListener(MidiClockModule, 'onDisconnect', () => {
    setConnected(false);
    setState({ running: false, clockTick: 0, bpm: 0 });
  });

  return { ...state, connected };
}

export async function connectToDevice(deviceName: string): Promise<boolean> {
  return MidiClockModule.connect(deviceName);
}

export function disconnectDevice(): void {
  MidiClockModule.disconnect();
}
```

```typescript
// src/index.ts
export { default } from './MidiClockModule';
export * from './MidiClockModule';
export * from './hooks';
```

---

## 5. Device Discovery

### 5.1 Known Device Name

The Digitakt 2 appears in CoreMIDI as: **"Elektron Digitakt II"**

(Based on Elektron's naming convention - original Digitakt shows as "Elektron Digitakt")

### 5.2 Device Filtering

```swift
func getAvailableDevices() -> [[String: Any]] {
    var devices: [[String: Any]] = []
    let sourceCount = MIDIGetNumberOfSources()

    for i in 0..<sourceCount {
        let source = MIDIGetSource(i)
        var name: Unmanaged<CFString>?
        MIDIObjectGetStringProperty(source, kMIDIPropertyDisplayName, &name)

        if let deviceName = name?.takeRetainedValue() as String? {
            // Filter for Elektron devices
            if deviceName.lowercased().contains("digitakt") ||
               deviceName.lowercased().contains("elektron") {
                devices.append([
                    "name": deviceName,
                    "id": String(source)
                ])
            }
        }
    }
    return devices
}
```

---

## 6. Settings UI Integration

### 6.1 New Settings Section

Add "Experimental" section to Settings screen (`app/(settings)/index.tsx`):

```typescript
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Experimental</Text>
  <Pressable style={styles.navRow} onPress={() => router.push('/(settings)/midi')}>
    <View style={styles.navRowContent}>
      <Text style={styles.settingLabel}>MIDI Sync</Text>
      <Text style={styles.settingDescription}>
        Sync tempo with external MIDI devices
      </Text>
    </View>
    <View style={styles.navRowRight}>
      {isConnected && <View style={styles.connectionDot} />}
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </View>
  </Pressable>
</View>
```

### 6.2 MIDI Modal (`app/(settings)/midi.tsx`)

**Approach:** Sheet modal (not full screen) - focused task that maintains context.

**Layout:**
```
┌─────────────────────────────────────┐
│  MIDI Sync                     [X]  │  <- Header
├─────────────────────────────────────┤
│  AVAILABLE DEVICES                  │
│  ┌─────────────────────────────────┐│
│  │ Elektron Digitakt II   [Discon]││  <- Device row
│  │ ● Connected                     ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  SYNC OPTIONS                       │
│  ┌─────────────────────────────────┐│
│  │ Receive Transport     [Toggle]  ││
│  │ Start, stop, continue           ││
│  ├─────────────────────────────────┤│
│  │ Receive Clock         [Toggle]  ││
│  │ Use external tempo              ││
│  ├─────────────────────────────────┤│
│  │ EXTERNAL BPM                    ││
│  │       120.0                     ││  <- Large, accent color
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

**Features:**
- Auto-scan on open (500ms minimum to prevent flash)
- Pull-to-refresh for device list
- Device rows show connection state (disconnected/connecting/connected)
- Sync Options section only enabled when connected
- BPM display shows when receiving clock (large, tabular-nums)

**Empty States:**
- Scanning: "Looking for MIDI devices..."
- No devices: "No Devices Found - Make sure your MIDI device is powered on and connected."

**Colors:**
- Connected badge: `#00cc66` (green)
- Connecting: `#ffaa00` (amber)
- BPM value: `#ff6600` (accent)

---

## 7. App Integration

### 7.1 MIDI Context

```typescript
// src/context/midi-context.tsx
interface MidiState {
  connected: boolean;
  deviceName: string | null;
  transportRunning: boolean;
  clockEnabled: boolean;
  transportEnabled: boolean;
  bpm: number;
  clockTick: number;
}

// Provides MIDI state to the app
// Manages connection lifecycle
// Persists settings (device name, enabled flags)
```

### 7.2 LFO Sync Integration

When transport receive is enabled:
- Start message → Reset LFO phase to startPhase
- Stop message → Pause LFO animation
- Continue message → Resume LFO animation

When clock receive is enabled:
- Use received BPM instead of manual BPM setting
- Sync LFO phase to MIDI clock ticks

---

## 8. Implementation Steps

1. **Create module scaffold**
   ```bash
   cd /Users/brent/wtlfo
   bun create expo-module --local midi-clock
   ```

2. **Implement iOS native code**
   - MidiManager.swift (CoreMIDI wrapper)
   - MidiClockModule.swift (Expo module)

3. **Implement TypeScript API**
   - Types and module exports
   - Event listeners

4. **Add Settings UI**
   - MIDI section in settings
   - Connection modal

5. **Create MIDI context**
   - State management
   - Persistence

6. **Integrate with LFO**
   - Transport sync
   - Clock sync

---

## 9. Limitations & Future Work

### Current Scope (MVP)
- iOS only
- Receive only (no send)
- Transport and clock only
- Manual device selection

### Future Enhancements
- Android support
- Auto-connect to last device
- Send transport commands to Digitakt
- Song position pointer (SPP) support
- MIDI CC sending for LFO parameters
- Multiple device support

---

## 10. Testing Strategy

### 10.1 Unit Tests (TypeScript - Jest)

```typescript
// __tests__/hooks.test.ts
describe('useMidiDevices', () => {
  it('should return empty array initially', () => {});
  it('should refresh devices when onDevicesChanged fires', () => {});
});

describe('useTransportState', () => {
  it('should return initial state from getTransportState', () => {});
  it('should update running when onTransportChange fires', () => {});
  it('should update bpm when onBpmUpdate fires', () => {});
  it('should reset state on disconnect', () => {});
});
```

### 10.2 Unit Tests (Swift - XCTest)

```swift
// MidiManagerTests.swift
class MidiManagerTests: XCTestCase {

    // BPM Calculation Tests
    func testBpmCalculation_at120BPM() {
        // Simulate 24 ticks at 20.83ms intervals (120 BPM)
        // Expected: bpm ≈ 120
    }

    func testBpmCalculation_at60BPM() {
        // Simulate 24 ticks at 41.67ms intervals (60 BPM)
        // Expected: bpm ≈ 60
    }

    func testBpmCalculation_withJitter() {
        // Simulate ticks with ±2ms variance
        // Expected: median filter smooths result
    }

    func testBpmCalculation_outlierRejection() {
        // Simulate 23 normal ticks, then 1 tick at 2x interval
        // Expected: outlier is rejected, BPM stable
    }

    func testBpmCalculation_clampsToRange() {
        // Simulate extremely fast ticks (would be 400 BPM)
        // Expected: clamped to 300 BPM max
    }

    // Transport State Tests
    func testTransportState_startResetsTickCount() {
        // Receive Start (0xFA)
        // Expected: clockTickCount = 0, isTransportRunning = true
    }

    func testTransportState_continuePreservesTickCount() {
        // Set tickCount to 100, receive Continue (0xFB)
        // Expected: clockTickCount = 100, isTransportRunning = true
    }

    func testTransportState_stopPreservesTickCount() {
        // Set tickCount to 100, receive Stop (0xFC)
        // Expected: clockTickCount = 100, isTransportRunning = false
    }

    func testTransportState_startClearsBpmBuffer() {
        // Calculate BPM, then receive Start
        // Expected: clockIntervals is empty
    }

    // Thread Safety Tests
    func testThreadSafety_concurrentAccess() {
        // Access state from multiple threads while processing MIDI
        // Expected: no crashes, consistent state
    }

    // Device Lifecycle Tests
    func testDeviceDisconnect_clearsConnection() {
        // Simulate device removal notification
        // Expected: connectedSource = 0, isTransportRunning = false
    }
}
```

### 10.3 Integration Tests

**Manual tests requiring real hardware:**

| Test | Steps | Expected |
|------|-------|----------|
| Device Discovery | Connect DT2, call getDevices() | "Elektron Digitakt II" in list |
| Connect | Call connect("Elektron Digitakt II") | Returns true, isConnected() = true |
| Transport Start | Press Play on DT2 | onTransportChange(true) fires |
| Transport Stop | Press Stop on DT2 | onTransportChange(false) fires |
| BPM Detection | Set DT2 to 100 BPM, play | bpm ≈ 100 within 1 second |
| BPM Change | Change DT2 tempo while playing | bpm updates within 0.5 seconds |
| Disconnect | Unplug USB cable | onDisconnect fires, state resets |
| Reconnect | Plug USB back in | onDevicesChanged fires |

### 10.4 Hardware Testing Notes

- **Simulator**: No USB MIDI support - must test on real device
- **Required hardware**:
  - iPhone/iPad with USB-C or Lightning
  - USB cable to Digitakt 2
  - Camera Connection Kit (if Lightning)
- **Digitakt settings**: Ensure USB MIDI is enabled in Settings > USB CFG
