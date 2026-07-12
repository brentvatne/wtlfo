export interface MidiDevice {
  name: string;
  id: string;
}

export interface TransportState {
  running: boolean;
  clockTick: number;
  bpm: number;
}

export type TransportMessage = 'start' | 'continue' | 'stop';

export type MidiControllerModuleEvents = {
  onTransportChange: (event: { running: boolean; message: TransportMessage }) => void;
  onBpmUpdate: (event: { bpm: number }) => void;
  onDevicesChanged: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onCcChange: (event: { channel: number; cc: number; value: number; timestamp: number }) => void;
};
