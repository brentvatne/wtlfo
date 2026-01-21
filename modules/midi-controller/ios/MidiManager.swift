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
    private var outputPort: MIDIPortRef = 0
    private(set) var connectedSource: MIDIEndpointRef = 0
    private(set) var connectedDestination: MIDIEndpointRef = 0

    private(set) var isTransportRunning = false
    private(set) var clockTickCount: UInt64 = 0
    private(set) var bpm: Double = 0

    // Callbacks (called on main thread)
    var onTransportChange: ((Bool, String) -> Void)?  // (running, message: "start"|"continue"|"stop")
    var onBpmUpdate: ((Double) -> Void)?
    var onDevicesChanged: (() -> Void)?
    var onDisconnect: (() -> Void)?
    var onCcReceived: ((UInt8, UInt8, UInt8, Double) -> Void)?  // (channel, cc, value, timestampMs)

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

        status = MIDIOutputPortCreate(midiClient, "Output" as CFString, &outputPort)
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
        // Connect to source (for receiving MIDI)
        let sourceCount = MIDIGetNumberOfSources()
        var sourceConnected = false

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
                    sourceConnected = true
                    break
                }
            }
        }

        // Connect to destination (for sending MIDI)
        let destCount = MIDIGetNumberOfDestinations()
        for i in 0..<destCount {
            let dest = MIDIGetDestination(i)
            var name: Unmanaged<CFString>?
            MIDIObjectGetStringProperty(dest, kMIDIPropertyDisplayName, &name)

            if let destName = name?.takeUnretainedValue() as String?,
               destName == deviceName {
                connectedDestination = dest
                break
            }
        }

        return sourceConnected
    }

    func disconnect() {
        if connectedSource != 0 {
            MIDIPortDisconnectSource(inputPort, connectedSource)
            connectedSource = 0
        }
        connectedDestination = 0
        isTransportRunning = false
        clockTickCount = 0
        bpm = 0
        clockIntervals.removeAll()
        lastClockTime = 0
        lastReportedBpm = 0
    }

    private func handleMidiEvents(_ eventList: UnsafePointer<MIDIEventList>) {
        var transportMessage: String? = nil  // "start", "continue", or "stop"
        var bpmChanged: Double? = nil
        var ccEvents: [(UInt8, UInt8, UInt8, Double)] = []  // (channel, cc, value, timestampMs)

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

                        switch status {
                        case 0xF8: // Clock
                            clockTickCount += 1
                            calculateBpm()
                            if let newBpm = checkBpmChange() {
                                bpmChanged = newBpm
                            }
                        case 0xFA: // Start
                            clockTickCount = 0
                            clockIntervals.removeAll()
                            lastClockTime = 0
                            isTransportRunning = true
                            transportMessage = "start"
                        case 0xFB: // Continue
                            isTransportRunning = true
                            transportMessage = "continue"
                        case 0xFC: // Stop
                            isTransportRunning = false
                            transportMessage = "stop"
                        default:
                            break
                        }
                    }

                    // MIDI 1.0 Channel Voice Messages (type 0x2 in UMP)
                    if messageType == 0x2 {
                        let status = UInt8((word >> 16) & 0xFF)
                        let data1 = UInt8((word >> 8) & 0x7F)
                        let data2 = UInt8(word & 0x7F)

                        // Control Change: status 0xB0-0xBF
                        if status >= 0xB0 && status <= 0xBF {
                            let channel = status & 0x0F
                            let ccNumber = data1
                            let ccValue = data2
                            let timestamp = CACurrentMediaTime() * 1000.0  // Convert to milliseconds
                            ccEvents.append((channel, ccNumber, ccValue, timestamp))
                        }
                    }
                }

                packetPtr = MIDIEventPacketNext(packetPtr)
            }
        }

        // Dispatch callbacks to main thread
        if let message = transportMessage {
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                self.onTransportChange?(self.isTransportRunning, message)
            }
        }
        if let newBpm = bpmChanged {
            DispatchQueue.main.async { [weak self] in
                self?.onBpmUpdate?(newBpm)
            }
        }
        for (channel, cc, value, timestamp) in ccEvents {
            DispatchQueue.main.async { [weak self] in
                self?.onCcReceived?(channel, cc, value, timestamp)
            }
        }
    }

    private func calculateBpm() {
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
                // Use proper median for jitter resistance
                // For even-sized arrays, average the two middle elements
                let sorted = clockIntervals.sorted()
                let mid = sorted.count / 2
                let medianInterval: Double
                if sorted.count % 2 == 0 {
                    medianInterval = (sorted[mid - 1] + sorted[mid]) / 2.0
                } else {
                    medianInterval = sorted[mid]
                }
                let ticksPerMinute = 60000.0 / medianInterval
                let rawBpm = ticksPerMinute / 24.0
                // Snap to nearest integer if within ±0.3 BPM, otherwise round to 0.5 increments
                let nearestInt = rawBpm.rounded()
                let snappedBpm = abs(rawBpm - nearestInt) < 0.3 ? nearestInt : (rawBpm * 2.0).rounded() / 2.0
                bpm = max(20, min(300, snappedBpm))
            }
        }
        lastClockTime = now
    }

    private func checkBpmChange() -> Double? {
        // Only report if BPM changed by > 0.5
        if abs(bpm - lastReportedBpm) > 0.5 {
            lastReportedBpm = bpm
            return bpm
        }
        return nil
    }

    func sendCC(channel: UInt8, cc: UInt8, value: UInt8) {
        guard connectedDestination != 0 else { return }

        // Build MIDI 1.0 Control Change message
        let status: UInt8 = 0xB0 | (channel & 0x0F)

        // Create a simple MIDI packet list (legacy API works with output ports)
        var packetList = MIDIPacketList()
        var packet = MIDIPacketListInit(&packetList)
        let midiData: [UInt8] = [status, cc & 0x7F, value & 0x7F]
        _ = MIDIPacketListAdd(&packetList, 1024, packet, 0, 3, midiData)

        MIDISend(outputPort, connectedDestination, &packetList)
    }

    func sendNoteOn(channel: UInt8, note: UInt8, velocity: UInt8) {
        guard connectedDestination != 0 else { return }

        let status: UInt8 = 0x90 | (channel & 0x0F)
        var packetList = MIDIPacketList()
        var packet = MIDIPacketListInit(&packetList)
        let midiData: [UInt8] = [status, note & 0x7F, velocity & 0x7F]
        _ = MIDIPacketListAdd(&packetList, 1024, packet, 0, 3, midiData)

        MIDISend(outputPort, connectedDestination, &packetList)
    }

    func sendNoteOff(channel: UInt8, note: UInt8) {
        guard connectedDestination != 0 else { return }

        let status: UInt8 = 0x80 | (channel & 0x0F)
        var packetList = MIDIPacketList()
        var packet = MIDIPacketListInit(&packetList)
        let midiData: [UInt8] = [status, note & 0x7F, 0]
        _ = MIDIPacketListAdd(&packetList, 1024, packet, 0, 3, midiData)

        MIDISend(outputPort, connectedDestination, &packetList)
    }

    private func handleMidiNotification(_ notification: UnsafePointer<MIDINotification>) {
        switch notification.pointee.messageID {
        case .msgObjectRemoved:
            notification.withMemoryRebound(to: MIDIObjectAddRemoveNotification.self, capacity: 1) { removeNotification in
                let removedChild = removeNotification.pointee.child
                if removedChild == connectedSource {
                    connectedSource = 0
                    isTransportRunning = false
                    DispatchQueue.main.async { [weak self] in
                        self?.onDisconnect?()
                    }
                }
                if removedChild == connectedDestination {
                    connectedDestination = 0
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
        if outputPort != 0 { MIDIPortDispose(outputPort) }
        if midiClient != 0 { MIDIClientDispose(midiClient) }
    }
}
