import { useEffect, useState, useCallback } from 'react';
import { useEventListener } from 'expo';
import MidiControllerModule, { MidiDevice, TransportState } from './MidiControllerModule';

export function useMidiDevices(): { devices: MidiDevice[]; refresh: () => void } {
  const [devices, setDevices] = useState<MidiDevice[]>([]);

  const refresh = useCallback(() => {
    try {
      setDevices(MidiControllerModule.getDevices());
    } catch {
      // Module not available (e.g., on simulator)
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEventListener(MidiControllerModule, 'onDevicesChanged', refresh);

  return { devices, refresh };
}

export function useTransportState(): TransportState & { connected: boolean } {
  const [state, setState] = useState<TransportState>(() => {
    try {
      return MidiControllerModule.getTransportState();
    } catch {
      return { running: false, clockTick: 0, bpm: 0 };
    }
  });
  const [connected, setConnected] = useState(() => {
    try {
      return MidiControllerModule.isConnected();
    } catch {
      return false;
    }
  });

  useEventListener(MidiControllerModule, 'onTransportChange', (event) => {
    setState((prev) => ({ ...prev, running: event.running }));
  });

  useEventListener(MidiControllerModule, 'onBpmUpdate', (event) => {
    setState((prev) => ({ ...prev, bpm: event.bpm }));
  });

  useEventListener(MidiControllerModule, 'onDisconnect', () => {
    setConnected(false);
    setState({ running: false, clockTick: 0, bpm: 0 });
  });

  return { ...state, connected };
}

export async function connectToDevice(deviceName: string): Promise<boolean> {
  try {
    return await MidiControllerModule.connect(deviceName);
  } catch {
    return false;
  }
}

export function disconnectDevice(): void {
  try {
    MidiControllerModule.disconnect();
  } catch {
    // Ignore errors
  }
}

export function isDeviceConnected(): boolean {
  try {
    return MidiControllerModule.isConnected();
  } catch {
    return false;
  }
}
