import ExpoModulesCore

public class MidiControllerModule: Module {
    private lazy var midiManager = MidiManager()
    private var isSetup = false

    private func ensureSetup() {
        guard !isSetup else { return }
        do {
            try midiManager.setup()
            isSetup = true

            // Set up event callbacks
            midiManager.onTransportChange = { [weak self] running, message in
                self?.sendEvent("onTransportChange", ["running": running, "message": message])
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
            midiManager.onCcReceived = { [weak self] channel, cc, value, timestamp in
                self?.sendEvent("onCcChange", [
                    "channel": channel,
                    "cc": cc,
                    "value": value,
                    "timestamp": timestamp
                ])
            }
        } catch {
            print("MIDI setup failed: \(error)")
        }
    }

    public func definition() -> ModuleDefinition {
        Name("MidiController")

        // Events - no clock ticks (too frequent), only state changes
        Events("onTransportChange", "onBpmUpdate", "onDevicesChanged", "onConnect", "onDisconnect", "onCcChange")

        OnStartObserving {
            self.ensureSetup()
        }

        OnDestroy {
            self.midiManager.onTransportChange = nil
            self.midiManager.onBpmUpdate = nil
            self.midiManager.onDevicesChanged = nil
            self.midiManager.onDisconnect = nil
            self.midiManager.onCcReceived = nil
            self.midiManager.disconnect()
        }

        Function("getDevices") { () -> [[String: Any]] in
            self.ensureSetup()  // Ensure MIDI client is ready to receive device notifications
            return self.midiManager.getAvailableDevices()
        }

        AsyncFunction("connect") { (deviceName: String) -> Bool in
            let success = self.midiManager.connect(toDeviceNamed: deviceName)
            if success {
                self.sendEvent("onConnect", [:])
            }
            return success
        }

        Function("disconnect") {
            self.midiManager.disconnect()
        }

        Function("isConnected") { () -> Bool in
            return self.midiManager.connectedSource != 0
        }

        Function("getTransportState") { () -> [String: Any] in
            return [
                "running": self.midiManager.isTransportRunning,
                "clockTick": self.midiManager.clockTickCount,
                "bpm": self.midiManager.bpm
            ]
        }

        Function("sendCC") { (channel: Int, cc: Int, value: Int) in
            self.midiManager.sendCC(
                channel: UInt8(channel & 0x0F),
                cc: UInt8(cc & 0x7F),
                value: UInt8(value & 0x7F)
            )
        }

        Function("sendNoteOn") { (channel: Int, note: Int, velocity: Int) in
            self.midiManager.sendNoteOn(
                channel: UInt8(channel & 0x0F),
                note: UInt8(note & 0x7F),
                velocity: UInt8(velocity & 0x7F)
            )
        }

        Function("sendNoteOff") { (channel: Int, note: Int) in
            self.midiManager.sendNoteOff(
                channel: UInt8(channel & 0x0F),
                note: UInt8(note & 0x7F)
            )
        }

        Function("getCurrentTimestamp") { () -> Double in
            return CACurrentMediaTime() * 1000.0  // Milliseconds since boot
        }
    }
}
