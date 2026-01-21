import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Storage } from 'expo-sqlite/kv-store';
import {
  useMidiDevices,
  useTransportState,
  connectToDevice,
  disconnectDevice,
  type MidiDevice,
  type TransportMessage,
} from '@/modules/midi-controller';

const RECEIVE_TRANSPORT_KEY = 'midi_receive_transport';
const RECEIVE_CLOCK_KEY = 'midi_receive_clock';
const AUTO_CONNECT_KEY = 'midi_auto_connect';

// We only care about Elektron Digitakt II
const DIGITAKT_PATTERN = /digitakt|elektron/i;

interface MidiContextType {
  // Device status
  digitaktAvailable: boolean;
  connected: boolean;
  connectedDeviceName: string | null;
  connecting: boolean;

  // Transport state (from native module)
  transportRunning: boolean;
  lastTransportMessage: TransportMessage | null;  // "start", "continue", or "stop"
  externalBpm: number;

  // Settings (persisted)
  autoConnect: boolean;
  setAutoConnect: (value: boolean) => void;
  receiveTransport: boolean;
  setReceiveTransport: (value: boolean) => void;
  receiveClock: boolean;
  setReceiveClock: (value: boolean) => void;
}

const MidiContext = createContext<MidiContextType | null>(null);

export function MidiProvider({ children }: { children: ReactNode }) {
  const { devices, refresh: refreshDevices } = useMidiDevices();
  const { running: transportRunning, bpm: externalBpm, connected: nativeConnected, lastMessage } = useTransportState();

  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Find Elektron Digitakt II in available devices
  const digitakt = devices.find(d => DIGITAKT_PATTERN.test(d.name));
  const digitaktAvailable = digitakt !== undefined;

  // Settings state
  const [autoConnect, setAutoConnectState] = useState(() => {
    const saved = Storage.getItemSync(AUTO_CONNECT_KEY);
    return saved === 'true';
  });
  const [receiveTransport, setReceiveTransportState] = useState(() => {
    const saved = Storage.getItemSync(RECEIVE_TRANSPORT_KEY);
    return saved !== 'false';
  });
  const [receiveClock, setReceiveClockState] = useState(() => {
    const saved = Storage.getItemSync(RECEIVE_CLOCK_KEY);
    return saved !== 'false';
  });

  // Track if we're in the middle of an auto-connect attempt
  const autoConnectingRef = useRef(false);

  // Sync with native disconnect events
  useEffect(() => {
    if (!nativeConnected && connectedDeviceName !== null) {
      setConnectedDeviceName(null);
    }
  }, [nativeConnected, connectedDeviceName]);

  // Auto-connect when enabled and Digitakt becomes available
  useEffect(() => {
    // Skip if auto-connect disabled, already connected, or currently connecting
    if (!autoConnect || connectedDeviceName !== null || connecting || autoConnectingRef.current) {
      return;
    }

    // Connect to Digitakt when it appears
    if (digitakt) {
      console.log('[MIDI] Auto-connecting to:', digitakt.name);
      autoConnectingRef.current = true;
      setConnecting(true);
      connectToDevice(digitakt.name).then(success => {
        if (success) {
          setConnectedDeviceName(digitakt.name);
          console.log('[MIDI] Auto-connect successful');
        } else {
          console.log('[MIDI] Auto-connect failed');
        }
        setConnecting(false);
        autoConnectingRef.current = false;
      });
    }
  }, [autoConnect, digitakt, connectedDeviceName, connecting]);

  // Poll for devices when waiting to auto-connect (fallback if native events miss)
  useEffect(() => {
    if (!autoConnect || connectedDeviceName !== null || digitaktAvailable) {
      return;
    }

    // Poll every 2 seconds while waiting for device
    const interval = setInterval(() => {
      refreshDevices();
    }, 2000);

    return () => clearInterval(interval);
  }, [autoConnect, connectedDeviceName, digitaktAvailable, refreshDevices]);

  // Disconnect when auto-connect is disabled
  useEffect(() => {
    if (!autoConnect && connectedDeviceName !== null) {
      console.log('[MIDI] Auto-connect disabled, disconnecting');
      disconnectDevice();
      setConnectedDeviceName(null);
    }
  }, [autoConnect, connectedDeviceName]);

  const setAutoConnect = useCallback((value: boolean) => {
    setAutoConnectState(value);
    Storage.setItemSync(AUTO_CONNECT_KEY, String(value));
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
    digitaktAvailable,
    connected: connectedDeviceName !== null,
    connectedDeviceName,
    connecting,
    transportRunning: receiveTransport ? transportRunning : false,
    lastTransportMessage: receiveTransport ? lastMessage : null,
    externalBpm: receiveClock ? externalBpm : 0,
    autoConnect,
    setAutoConnect,
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
