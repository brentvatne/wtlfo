import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { PresetProvider, usePreset } from '../preset-context';
import { Storage } from 'expo-sqlite/kv-store';
import { PRESETS } from '@/src/data/presets';

// Mock the LFO class from elektron-lfo
jest.mock('elektron-lfo', () => ({
  LFO: jest.fn().mockImplementation(() => ({
    trigger: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    isRunning: jest.fn(() => false),
    update: jest.fn(() => ({ phase: 0, output: 0 })),
    getTimingInfo: jest.fn(() => ({
      cycleTimeMs: 500,
      noteValue: '1/4',
    })),
  })),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  return setTimeout(() => cb(Date.now()), 16);
});
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

describe('preset-context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Storage mock
    (Storage.getItemSync as jest.Mock).mockReturnValue(null);
    (Storage.setItemSync as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PresetProvider>{children}</PresetProvider>
  );

  describe('usePreset hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePreset());
      }).toThrow('usePreset must be used within a PresetProvider');

      consoleSpy.mockRestore();
    });

    it('should provide initial context values', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      expect(result.current.activePreset).toBe(0);
      expect(result.current.preset).toEqual(PRESETS[0]);
      expect(result.current.presets).toEqual(PRESETS);
      expect(result.current.bpm).toBe(120);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.isEditing).toBe(false);
    });

    it('should load saved preset from storage', () => {
      (Storage.getItemSync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'activePreset') return '2';
        return null;
      });

      const { result } = renderHook(() => usePreset(), { wrapper });

      expect(result.current.activePreset).toBe(2);
      expect(result.current.preset).toEqual(PRESETS[2]);
    });

    it('should load saved BPM from storage', () => {
      (Storage.getItemSync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'bpm') return '140';
        return null;
      });

      const { result } = renderHook(() => usePreset(), { wrapper });

      expect(result.current.bpm).toBe(140);
    });

    it('should fall back to defaults for invalid saved values', () => {
      (Storage.getItemSync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'activePreset') return '999'; // Invalid index
        if (key === 'bpm') return '500'; // Out of range
        return null;
      });

      const { result } = renderHook(() => usePreset(), { wrapper });

      expect(result.current.activePreset).toBe(0);
      expect(result.current.bpm).toBe(120);
    });

    it('should fall back to defaults for NaN saved values', () => {
      (Storage.getItemSync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'activePreset') return 'not-a-number';
        if (key === 'bpm') return 'invalid';
        return null;
      });

      const { result } = renderHook(() => usePreset(), { wrapper });

      expect(result.current.activePreset).toBe(0);
      expect(result.current.bpm).toBe(120);
    });
  });

  describe('setActivePreset', () => {
    it('should update active preset', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      act(() => {
        result.current.setActivePreset(3);
      });

      expect(result.current.activePreset).toBe(3);
      expect(result.current.preset).toEqual(PRESETS[3]);
    });

    it('should persist preset to storage', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      act(() => {
        result.current.setActivePreset(2);
      });

      expect(Storage.setItemSync).toHaveBeenCalledWith('activePreset', '2');
    });

    it('should update currentConfig when preset changes', async () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      act(() => {
        result.current.setActivePreset(1);
      });

      await waitFor(() => {
        expect(result.current.currentConfig).toEqual(PRESETS[1].config);
      });
    });
  });

  describe('setBPM', () => {
    it('should update BPM', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      act(() => {
        result.current.setBPM(140);
      });

      expect(result.current.bpm).toBe(140);
    });

    it('should persist BPM to storage', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      act(() => {
        result.current.setBPM(90);
      });

      expect(Storage.setItemSync).toHaveBeenCalledWith('bpm', '90');
    });

    it('should clamp BPM to minimum of 20', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      act(() => {
        result.current.setBPM(10);
      });

      expect(result.current.bpm).toBe(20);
    });

    it('should clamp BPM to maximum of 300', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      act(() => {
        result.current.setBPM(400);
      });

      expect(result.current.bpm).toBe(300);
    });

    it('should round BPM to integer', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      act(() => {
        result.current.setBPM(120.7);
      });

      expect(result.current.bpm).toBe(121);
    });
  });

  describe('updateParameter', () => {
    it('should update a single parameter', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      act(() => {
        result.current.updateParameter('depth', 100);
      });

      expect(result.current.currentConfig.depth).toBe(100);
    });

    it('should update waveform parameter', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      act(() => {
        result.current.updateParameter('waveform', 'SQR');
      });

      expect(result.current.currentConfig.waveform).toBe('SQR');
    });

    it('should set isEditing to true during parameter change', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => usePreset(), { wrapper });

      act(() => {
        result.current.updateParameter('speed', 64);
      });

      // isEditing should be true immediately
      expect(result.current.isEditing).toBe(true);

      // After debounce period, isEditing should be false
      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.isEditing).toBe(false);
      });
    });

    it('should debounce config changes', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => usePreset(), { wrapper });

      const initialDebouncedConfig = { ...result.current.debouncedConfig };

      act(() => {
        result.current.updateParameter('depth', 50);
      });

      // Debounced config should not change immediately
      expect(result.current.debouncedConfig).toEqual(initialDebouncedConfig);
      expect(result.current.currentConfig.depth).toBe(50);

      // After debounce period
      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.debouncedConfig.depth).toBe(50);
      });
    });
  });

  describe('resetToPreset', () => {
    it('should reset currentConfig to original preset values', async () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      // Modify some parameters
      act(() => {
        result.current.updateParameter('depth', 100);
        result.current.updateParameter('speed', 0);
      });

      expect(result.current.currentConfig.depth).toBe(100);
      expect(result.current.currentConfig.speed).toBe(0);

      // Reset to preset
      act(() => {
        result.current.resetToPreset();
      });

      expect(result.current.currentConfig).toEqual(PRESETS[0].config);
    });

    it('should reset to the correct preset after changing presets', async () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      // Change to preset 2
      act(() => {
        result.current.setActivePreset(2);
      });

      await waitFor(() => {
        expect(result.current.currentConfig).toEqual(PRESETS[2].config);
      });

      // Modify parameters
      act(() => {
        result.current.updateParameter('depth', 127);
      });

      // Reset should go back to preset 2, not preset 0
      act(() => {
        result.current.resetToPreset();
      });

      expect(result.current.currentConfig).toEqual(PRESETS[2].config);
    });
  });

  describe('isPaused state', () => {
    it('should toggle pause state', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      expect(result.current.isPaused).toBe(false);

      act(() => {
        result.current.setIsPaused(true);
      });

      expect(result.current.isPaused).toBe(true);

      act(() => {
        result.current.setIsPaused(false);
      });

      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('LFO control methods', () => {
    it('should provide triggerLFO method', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      expect(typeof result.current.triggerLFO).toBe('function');

      act(() => {
        result.current.triggerLFO();
      });
      // Method should not throw
    });

    it('should provide startLFO method', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      expect(typeof result.current.startLFO).toBe('function');

      act(() => {
        result.current.startLFO();
      });
      // Method should not throw
    });

    it('should provide stopLFO method', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      expect(typeof result.current.stopLFO).toBe('function');

      act(() => {
        result.current.stopLFO();
      });
      // Method should not throw
    });

    it('should provide isLFORunning method', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      expect(typeof result.current.isLFORunning).toBe('function');

      const running = result.current.isLFORunning();
      expect(typeof running).toBe('boolean');
    });
  });

  describe('shared values', () => {
    it('should provide lfoPhase shared value', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      expect(result.current.lfoPhase).toBeDefined();
      expect(typeof result.current.lfoPhase.value).toBe('number');
    });

    it('should provide lfoOutput shared value', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      expect(result.current.lfoOutput).toBeDefined();
      expect(typeof result.current.lfoOutput.value).toBe('number');
    });

    it('should provide lfoRef', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      expect(result.current.lfoRef).toBeDefined();
      expect(result.current.lfoRef.current).toBeDefined();
    });
  });

  describe('timingInfo', () => {
    it('should provide timing information', () => {
      const { result } = renderHook(() => usePreset(), { wrapper });

      expect(result.current.timingInfo).toBeDefined();
      expect(typeof result.current.timingInfo.cycleTimeMs).toBe('number');
      expect(typeof result.current.timingInfo.noteValue).toBe('string');
    });
  });

  describe('storage error handling', () => {
    it('should handle storage read errors gracefully', () => {
      (Storage.getItemSync as jest.Mock).mockImplementation(() => {
        throw new Error('Storage read error');
      });

      // Should not throw, should use defaults
      const { result } = renderHook(() => usePreset(), { wrapper });

      expect(result.current.activePreset).toBe(0);
      expect(result.current.bpm).toBe(120);
    });

    it('should handle storage write errors gracefully', () => {
      (Storage.setItemSync as jest.Mock).mockImplementation(() => {
        throw new Error('Storage write error');
      });

      const { result } = renderHook(() => usePreset(), { wrapper });

      // Should not throw
      act(() => {
        result.current.setActivePreset(1);
        result.current.setBPM(100);
      });

      expect(result.current.activePreset).toBe(1);
      expect(result.current.bpm).toBe(100);
    });
  });
});
