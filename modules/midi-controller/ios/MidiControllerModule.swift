import ExpoModulesCore

public class MidiControllerModule: Module {
    private lazy var midiManager = MidiManager()
    private var isSetup = false

    public func definition() -> ModuleDefinition {
        Name("MidiController")

        // Events - no clock ticks (too frequent), only state changes
        Events("onTransportChange", "onBpmUpdate", "onDevicesChanged", "onDisconnect")

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
        }

        OnDestroy {
            self.midiManager.onTransportChange = nil
            self.midiManager.onBpmUpdate = nil
            self.midiManager.onDevicesChanged = nil
            self.midiManager.onDisconnect = nil
            self.midiManager.disconnect()
        }

        Function("getDevices") { () -> [[String: Any]] in
            return self.midiManager.getAvailableDevices()
        }

        AsyncFunction("connect") { (deviceName: String) -> Bool in
            return self.midiManager.connect(toDeviceNamed: deviceName)
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
    }
}
