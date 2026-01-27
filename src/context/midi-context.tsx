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
  /** True once initial device check is complete (for auto-connect startup) */
  initialCheckComplete: boolean;

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

  // Actions
  refreshDevices: () => void;
}

const MidiContext = createContext<MidiContextType | null>(null);

export function MidiProvider({ children }: { children: ReactNode }) {
  const { devices, refresh: refreshDevices } = useMidiDevices();
  const { running: transportRunning, bpm: externalBpm, connected: nativeConnected, lastMessage } = useTransportState();

  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  // Track whether initial device check is complete (for auto-connect startup flow)
  // Initialize to true if auto-connect is disabled (no need to wait)
  const [initialCheckComplete, setInitialCheckComplete] = useState(() => {
    const autoConnectSaved = Storage.getItemSync(AUTO_CONNECT_KEY);
    return autoConnectSaved !== 'true'; // If auto-connect disabled, start as true
  });

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
  // Track if we've done the initial device check
  const hasCheckedDevicesRef = useRef(false);

  // Mark initial device check complete after first devices update
  // This happens once useMidiDevices returns (even if empty array)
  useEffect(() => {
    // useMidiDevices returns devices array on mount - this effect runs after that
    // If auto-connect is disabled, mark as complete immediately
    if (!autoConnect) {
      setInitialCheckComplete(true);
      hasCheckedDevicesRef.current = true;
      return;
    }

    // For auto-connect, we want to wait a bit to give devices time to enumerate
    // But if we already found a Digitakt, we're done
    if (digitaktAvailable && !hasCheckedDevicesRef.current) {
      setInitialCheckComplete(true);
      hasCheckedDevicesRef.current = true;
      return;
    }

    // If no Digitakt found yet, wait a short time then mark complete
    // This gives USB devices time to enumerate on app launch
    if (!hasCheckedDevicesRef.current) {
      const timeout = setTimeout(() => {
        if (!hasCheckedDevicesRef.current) {
          setInitialCheckComplete(true);
          hasCheckedDevicesRef.current = true;
        }
      }, 1000); // Wait 1 second for devices to enumerate

      return () => clearTimeout(timeout);
    }
  }, [autoConnect, digitaktAvailable]);

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
      autoConnectingRef.current = true;
      setConnecting(true);
      connectToDevice(digitakt.name).then(success => {
        if (success) {
          setConnectedDeviceName(digitakt.name);
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
      disconnectDevice();
      setConnectedDeviceName(null);
    }
  }, [autoConnect, connectedDeviceName]);

  const setAutoConnect = useCallback((value: boolean) => {
    setAutoConnectState(value);
    Storage.setItemSync(AUTO_CONNECT_KEY, String(value));
    // Immediately refresh device list when enabling auto-connect
    if (value) {
      refreshDevices();
    }
  }, [refreshDevices]);

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
    initialCheckComplete,
    transportRunning: receiveTransport ? transportRunning : false,
    lastTransportMessage: receiveTransport ? lastMessage : null,
    externalBpm: receiveClock ? externalBpm : 0,
    autoConnect,
    setAutoConnect,
    receiveTransport,
    setReceiveTransport,
    receiveClock,
    setReceiveClock,
    refreshDevices,
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
