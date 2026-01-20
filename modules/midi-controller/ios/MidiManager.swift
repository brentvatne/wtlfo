import CoreMIDI
import Foundation

enum MidiError: Error {
    case clientCreationFailed(OSStatus)
    case portCreationFailed(OSStatus)
    case connectionFailed(OSStatus)
}

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

    // BPM calculation state
    private var lastClockTime: CFTimeInterval = 0
    private var clockIntervals: [Double] = []
    private var lastReportedBpm: Double = 0

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
        ) { [weak self] eventList, _ in
            self?.handleMidiEvents(eventList)
        }
        guard status == noErr else {
            throw MidiError.portCreationFailed(status)
        }
    }

    func getAvailableDevices() -> [[String: Any]] {
        var devices: [[String: Any]] = []
        let sourceCount = MIDIGetNumberOfSources()

        for i in 0..<sourceCount {
            let source = MIDIGetSource(i)
            var name: Unmanaged<CFString>?
            MIDIObjectGetStringProperty(source, kMIDIPropertyDisplayName, &name)

            if let deviceName = name?.takeUnretainedValue() as String? {
                // Filter for Elektron devices (case-insensitive)
                let lowerName = deviceName.lowercased()
                if lowerName.contains("digitakt") || lowerName.contains("elektron") {
                    devices.append([
                        "name": deviceName,
                        "id": String(source)
                    ])
                }
            }
        }
        return devices
    }

    func connect(toDeviceNamed deviceName: String) -> Bool {
        let sourceCount = MIDIGetNumberOfSources()

        for i in 0..<sourceCount {
            let source = MIDIGetSource(i)
            var name: Unmanaged<CFString>?
            MIDIObjectGetStringProperty(source, kMIDIPropertyDisplayName, &name)

            if let sourceName = name?.takeUnretainedValue() as String?,
               sourceName == deviceName {
                // Disconnect existing connection
                if connectedSource != 0 {
                    MIDIPortDisconnectSource(inputPort, connectedSource)
                }

                let status = MIDIPortConnectSource(inputPort, source, nil)
                if status == noErr {
                    connectedSource = source
                    return true
                }
            }
        }
        return false
    }

    func disconnect() {
        if connectedSource != 0 {
            MIDIPortDisconnectSource(inputPort, connectedSource)
            connectedSource = 0
        }

        lock.lock()
        _isTransportRunning = false
        _clockTickCount = 0
        _bpm = 0
        clockIntervals.removeAll()
        lastClockTime = 0
        lastReportedBpm = 0
        lock.unlock()
    }

    private func handleMidiEvents(_ eventList: UnsafePointer<MIDIEventList>) {
        var transportChanged: Bool? = nil
        var bpmChanged: Double? = nil

        let list = eventList.pointee
        withUnsafePointer(to: list.packet) { firstPacket in
            var packetPtr = UnsafeMutablePointer(mutating: firstPacket)

            for _ in 0..<list.numPackets {
                let packet = packetPtr.pointee

                if packet.wordCount > 0 {
                    // Extract status from UMP (Universal MIDI Packet)
                    let word = packet.words.0
                    let messageType = (word >> 28) & 0xF

                    // System Real Time messages (type 0xF in UMP for system messages)
                    // For MIDI 1.0 protocol, real-time messages come as type 0x1
                    if messageType == 0x1 || messageType == 0xF {
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

                packetPtr = MIDIEventPacketNext(packetPtr)
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

    // Must be called with lock held
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

    // Must be called with lock held
    private func checkBpmChangeLocked() -> Double? {
        // Only report if BPM changed by > 0.5
        if abs(_bpm - lastReportedBpm) > 0.5 {
            lastReportedBpm = _bpm
            return _bpm
        }
        return nil
    }

    private func handleMidiNotification(_ notification: UnsafePointer<MIDINotification>) {
        switch notification.pointee.messageID {
        case .msgObjectRemoved:
            notification.withMemoryRebound(to: MIDIObjectAddRemoveNotification.self, capacity: 1) { removeNotification in
                if removeNotification.pointee.child == connectedSource {
                    lock.lock()
                    connectedSource = 0
                    _isTransportRunning = false
                    lock.unlock()
                    DispatchQueue.main.async { [weak self] in
                        self?.onDisconnect?()
                    }
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
