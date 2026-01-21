import { NativeModule, requireNativeModule } from 'expo';

export interface MidiDevice {
  name: string;
  id: string;
}

export interface TransportState {
  running: boolean;
  clockTick: number;
  bpm: number;
}

export type MidiControllerModuleEvents = {
  onTransportChange: (event: { running: boolean }) => void;
  onBpmUpdate: (event: { bpm: number }) => void;
  onDevicesChanged: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onCcChange: (event: { channel: number; cc: number; value: number }) => void;
};

declare class MidiControllerModuleClass extends NativeModule<MidiControllerModuleEvents> {
  getDevices(): MidiDevice[];
  connect(deviceName: string): Promise<boolean>;
  disconnect(): void;
  isConnected(): boolean;
  getTransportState(): TransportState;
  sendCC(channel: number, cc: number, value: number): void;
  sendNoteOn(channel: number, note: number, velocity: number): void;
  sendNoteOff(channel: number, note: number): void;
}

export default requireNativeModule<MidiControllerModuleClass>('MidiController');
