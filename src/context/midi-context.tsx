import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Storage } from 'expo-sqlite/kv-store';
import {
  useMidiDevices,
  useTransportState,
  connectToDevice,
  disconnectDevice,
  isDeviceConnected,
  type MidiDevice,
} from '@/modules/midi-controller';

const RECEIVE_TRANSPORT_KEY = 'midi_receive_transport';
const RECEIVE_CLOCK_KEY = 'midi_receive_clock';
const LAST_DEVICE_KEY = 'midi_last_device';

interface MidiContextType {
  // Devices
  devices: MidiDevice[];
  refreshDevices: () => void;

  // Connection
  connected: boolean;
  connectedDeviceName: string | null;
  connecting: boolean;
  connect: (deviceName: string) => Promise<boolean>;
  disconnect: () => void;

  // Transport state (from native module)
  transportRunning: boolean;
  externalBpm: number;

  // Settings (persisted)
  receiveTransport: boolean;
  setReceiveTransport: (value: boolean) => void;
  receiveClock: boolean;
  setReceiveClock: (value: boolean) => void;
}

const MidiContext = createContext<MidiContextType | null>(null);

export function MidiProvider({ children }: { children: ReactNode }) {
  const { devices, refresh: refreshDevices } = useMidiDevices();
  const { running: transportRunning, bpm: externalBpm, connected: nativeConnected } = useTransportState();

  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Sync with native disconnect events
  useEffect(() => {
    if (!nativeConnected && connectedDeviceName !== null) {
      setConnectedDeviceName(null);
    }
  }, [nativeConnected, connectedDeviceName]);
  const [receiveTransport, setReceiveTransportState] = useState(() => {
    const saved = Storage.getItemSync(RECEIVE_TRANSPORT_KEY);
    return saved !== 'false';
  });
  const [receiveClock, setReceiveClockState] = useState(() => {
    const saved = Storage.getItemSync(RECEIVE_CLOCK_KEY);
    return saved !== 'false';
  });

  const connect = useCallback(async (deviceName: string): Promise<boolean> => {
    setConnecting(true);
    try {
      const success = await connectToDevice(deviceName);
      if (success) {
        setConnectedDeviceName(deviceName);
        Storage.setItemSync(LAST_DEVICE_KEY, deviceName);
      }
      return success;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectDevice();
    setConnectedDeviceName(null);
  }, []);

  const setReceiveTransport = useCallback((value: boolean) => {
    setReceiveTransportState(value);
    Storage.setItemSync(RECEIVE_TRANSPORT_KEY, String(value));
  }, []);

  const setReceiveClock = useCallback((value: boolean) => {
    setReceiveClockState(value);
    Storage.setItemSync(RECEIVE_CLOCK_KEY, String(value));
  }, []);

  const value: MidiContextType = {
    devices,
    refreshDevices,
    connected: connectedDeviceName !== null,
    connectedDeviceName,
    connecting,
    connect,
    disconnect,
    transportRunning: receiveTransport ? transportRunning : false,
    externalBpm: receiveClock ? externalBpm : 0,
    receiveTransport,
    setReceiveTransport,
    receiveClock,
    setReceiveClock,
  };

  return (
    <MidiContext.Provider value={value}>
      {children}
    </MidiContext.Provider>
  );
}

export function useMidi() {
  const context = useContext(MidiContext);
  if (!context) {
    throw new Error('useMidi must be used within a MidiProvider');
  }
  return context;
}
