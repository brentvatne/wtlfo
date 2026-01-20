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
  onDisconnect: () => void;
};

declare class MidiControllerModuleClass extends NativeModule<MidiControllerModuleEvents> {
  getDevices(): MidiDevice[];
  connect(deviceName: string): Promise<boolean>;
  disconnect(): void;
  isConnected(): boolean;
  getTransportState(): TransportState;
}

export default requireNativeModule<MidiControllerModuleClass>('MidiController');
