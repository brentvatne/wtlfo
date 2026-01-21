import ExpoModulesCore

public class MidiControllerModule: Module {
    private lazy var midiManager = MidiManager()
    private var isSetup = false

    public func definition() -> ModuleDefinition {
        Name("MidiController")

        // Events - no clock ticks (too frequent), only state changes
        Events("onTransportChange", "onBpmUpdate", "onDevicesChanged", "onConnect", "onDisconnect", "onCcChange")

        OnStartObserving {
            guard !self.isSetup else { return }
            do {
                try self.midiManager.setup()
                self.isSetup = true
            } catch {
                print("MIDI setup failed: \(error)")
                return
            }

            self.midiManager.onTransportChange = { [weak self] running in
                self?.sendEvent("onTransportChange", ["running": running])
            }
            self.midiManager.onBpmUpdate = { [weak self] bpm in
                self?.sendEvent("onBpmUpdate", ["bpm": bpm])
            }
            self.midiManager.onDevicesChanged = { [weak self] in
                self?.sendEvent("onDevicesChanged", [:])
            }
            self.midiManager.onDisconnect = { [weak self] in
                self?.sendEvent("onDisconnect", [:])
            }
            self.midiManager.onCcReceived = { [weak self] channel, cc, value in
                self?.sendEvent("onCcChange", [
                    "channel": channel,
                    "cc": cc,
                    "value": value
                ])
            }
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
    }
}
