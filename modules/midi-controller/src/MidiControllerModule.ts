import { NativeModule, requireNativeModule } from 'expo';

import type { MidiControllerModuleEvents, MidiDevice, TransportState } from './MidiControllerModule.types';

export type {
  MidiDevice,
  TransportState,
  TransportMessage,
  MidiControllerModuleEvents,
} from './MidiControllerModule.types';

declare class MidiControllerModuleClass extends NativeModule<MidiControllerModuleEvents> {
  getDevices(): MidiDevice[];
  connect(deviceName: string): Promise<boolean>;
  disconnect(): void;
  isConnected(): boolean;
  getTransportState(): TransportState;
  sendCC(channel: number, cc: number, value: number): void;
  sendNoteOn(channel: number, note: number, velocity: number): void;
  sendNoteOff(channel: number, note: number): void;
  getCurrentTimestamp(): number;
}

export default requireNativeModule<MidiControllerModuleClass>('MidiController');
