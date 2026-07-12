import { NativeModule, registerWebModule } from 'expo';

import type {
  MidiControllerModuleEvents,
  MidiDevice,
  TransportState,
} from './MidiControllerModule.types';

export type {
  MidiDevice,
  TransportState,
  TransportMessage,
  MidiControllerModuleEvents,
} from './MidiControllerModule.types';

/**
 * Inert web stub. There is no MIDI implementation on web (the native module
 * is iOS-only and MIDI features are behind MIDI_FEATURES_ENABLED anyway);
 * this exists so importing the module doesn't throw in the browser and
 * useEventListener keeps working against a real NativeModule instance.
 */
class MidiControllerModuleWeb extends NativeModule<MidiControllerModuleEvents> {
  getDevices(): MidiDevice[] {
    return [];
  }
  connect(_deviceName: string): Promise<boolean> {
    return Promise.resolve(false);
  }
  disconnect(): void {}
  isConnected(): boolean {
    return false;
  }
  getTransportState(): TransportState {
    return { running: false, clockTick: 0, bpm: 0 };
  }
  sendCC(_channel: number, _cc: number, _value: number): void {}
  sendNoteOn(_channel: number, _note: number, _velocity: number): void {}
  sendNoteOff(_channel: number, _note: number): void {}
  getCurrentTimestamp(): number {
    return performance.now();
  }
}

export default registerWebModule(MidiControllerModuleWeb, 'MidiController');
