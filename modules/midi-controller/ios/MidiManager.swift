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

    // BPM calculation state - uses packet timestamps for accuracy
    // We measure full beat durations (24 ticks) instead of individual tick intervals
    // to average out per-tick jitter
    private var lastBeatTimestamp: UInt64 = 0  // Host ticks (from packet.timeStamp)
    private var beatDurations: [Double] = []   // Beat durations in ms
    private var ticksInCurrentBeat: UInt64 = 0
    private var lastReportedBpm: Double = 0

    // For converting host ticks to milliseconds
    private var timebaseInfo: mach_timebase_info_data_t = {
        var info = mach_timebase_info_data_t()
        mach_timebase_info(&info)
        return info
    }()

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
        beatDurations.removeAll()
        lastBeatTimestamp = 0
        ticksInCurrentBeat = 0
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
                            // Use packet timestamp for accurate timing
                            calculateBpm(packetTimestamp: packet.timeStamp)
                            if let newBpm = checkBpmChange() {
                                bpmChanged = newBpm
                            }
                        case 0xFA: // Start
                            clockTickCount = 0
                            beatDurations.removeAll()
                            lastBeatTimestamp = 0
                            ticksInCurrentBeat = 0
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

    /// Calculate BPM using packet timestamps and full-beat measurement
    /// This approach:
    /// 1. Uses packet.timeStamp (host ticks) instead of CACurrentMediaTime for accuracy
    /// 2. Measures full beat durations (24 ticks) to average out per-tick jitter
    /// 3. Snaps to common BPM values to avoid display flicker
    private func calculateBpm(packetTimestamp: MIDITimeStamp) {
        ticksInCurrentBeat += 1

        // Every 24 ticks = 1 beat
        if ticksInCurrentBeat >= 24 {
            if lastBeatTimestamp > 0 {
                // Calculate beat duration in milliseconds using packet timestamps
                let tickDelta = packetTimestamp - lastBeatTimestamp
                let nanos = tickDelta * UInt64(timebaseInfo.numer) / UInt64(timebaseInfo.denom)
                let beatDurationMs = Double(nanos) / 1_000_000.0

                // Outlier rejection: skip if duration is wildly off (< 100ms or > 3000ms = 20-600 BPM)
                if beatDurationMs >= 100 && beatDurationMs <= 3000 {
                    beatDurations.append(beatDurationMs)

                    // Keep last 8 beats for averaging (covers ~4 bars at typical tempos)
                    if beatDurations.count > 8 {
                        beatDurations.removeFirst()
                    }

                    // Need at least 2 beats for stable calculation
                    if beatDurations.count >= 2 {
                        // Use median for jitter resistance
                        let sorted = beatDurations.sorted()
                        let mid = sorted.count / 2
                        let medianBeatMs: Double
                        if sorted.count % 2 == 0 {
                            medianBeatMs = (sorted[mid - 1] + sorted[mid]) / 2.0
                        } else {
                            medianBeatMs = sorted[mid]
                        }

                        // BPM = 60000ms / beatDurationMs
                        let rawBpm = 60000.0 / medianBeatMs

                        // Snap to nearest integer BPM if within 0.5
                        let roundedBpm = rawBpm.rounded()
                        let snappedBpm = abs(rawBpm - roundedBpm) < 0.5 ? roundedBpm : rawBpm

                        bpm = max(20, min(300, snappedBpm))
                    }
                }
            }

            lastBeatTimestamp = packetTimestamp
            ticksInCurrentBeat = 0
        }
    }

    private func checkBpmChange() -> Double? {
        // Hysteresis: only report if BPM changed by >= 1.5 to avoid jitter-induced flicker
        // Also report on first valid BPM (when lastReportedBpm is 0)
        if lastReportedBpm == 0 || abs(bpm - lastReportedBpm) >= 1.5 {
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
        let packet = MIDIPacketListInit(&packetList)
        let midiData: [UInt8] = [status, cc & 0x7F, value & 0x7F]
        _ = MIDIPacketListAdd(&packetList, 1024, packet, 0, 3, midiData)

        MIDISend(outputPort, connectedDestination, &packetList)
    }

    func sendNoteOn(channel: UInt8, note: UInt8, velocity: UInt8) {
        guard connectedDestination != 0 else { return }

        let status: UInt8 = 0x90 | (channel & 0x0F)
        var packetList = MIDIPacketList()
        let packet = MIDIPacketListInit(&packetList)
        let midiData: [UInt8] = [status, note & 0x7F, velocity & 0x7F]
        _ = MIDIPacketListAdd(&packetList, 1024, packet, 0, 3, midiData)

        MIDISend(outputPort, connectedDestination, &packetList)
    }

    func sendNoteOff(channel: UInt8, note: UInt8) {
        guard connectedDestination != 0 else { return }

        let status: UInt8 = 0x80 | (channel & 0x0F)
        var packetList = MIDIPacketList()
        let packet = MIDIPacketListInit(&packetList)
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
