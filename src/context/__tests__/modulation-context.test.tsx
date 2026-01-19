import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { ModulationProvider, useModulation } from '../modulation-context';
import { Storage } from 'expo-sqlite/kv-store';
import { DESTINATIONS, DEFAULT_DESTINATION } from '@/src/data/destinations';
import type { DestinationId } from '@/src/types/destination';

describe('modulation-context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Storage mock to return null (no saved state)
    (Storage.getItemSync as jest.Mock).mockReturnValue(null);
    (Storage.setItemSync as jest.Mock).mockImplementation(() => {});
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModulationProvider>{children}</ModulationProvider>
  );

  describe('useModulation hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useModulation());
      }).toThrow('useModulation must be used within a ModulationProvider');

      consoleSpy.mockRestore();
    });

    it('should provide initial context values', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      expect(result.current.centerValues).toEqual({});
      expect(result.current.routings).toEqual([
        { lfoId: 'lfo1', destinationId: DEFAULT_DESTINATION, amount: 100 },
      ]);
      expect(result.current.activeDestinationId).toBe(DEFAULT_DESTINATION);
    });

    it('should load saved center values from storage', () => {
      const savedCenterValues = { filter_cutoff: 80, pan: -32 };
      (Storage.getItemSync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'centerValues') return JSON.stringify(savedCenterValues);
        return null;
      });

      const { result } = renderHook(() => useModulation(), { wrapper });

      expect(result.current.centerValues).toEqual(savedCenterValues);
    });

    it('should load saved routings from storage', () => {
      const savedRoutings = [
        { lfoId: 'lfo1', destinationId: 'pan', amount: 75 },
      ];
      (Storage.getItemSync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'routings') return JSON.stringify(savedRoutings);
        return null;
      });

      const { result } = renderHook(() => useModulation(), { wrapper });

      expect(result.current.routings).toEqual(savedRoutings);
      expect(result.current.activeDestinationId).toBe('pan');
    });

    it('should use default values when storage parsing fails', () => {
      (Storage.getItemSync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'centerValues') return 'invalid json{';
        if (key === 'routings') return 'not valid json';
        return null;
      });

      const { result } = renderHook(() => useModulation(), { wrapper });

      expect(result.current.centerValues).toEqual({});
      expect(result.current.routings).toEqual([
        { lfoId: 'lfo1', destinationId: DEFAULT_DESTINATION, amount: 100 },
      ]);
    });
  });

  describe('setCenterValue', () => {
    it('should set center value for a destination', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setCenterValue('filter_cutoff', 80);
      });

      expect(result.current.centerValues.filter_cutoff).toBe(80);
    });

    it('should persist center values to storage', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setCenterValue('filter_cutoff', 80);
      });

      expect(Storage.setItemSync).toHaveBeenCalledWith(
        'centerValues',
        expect.any(String)
      );

      const savedValue = (Storage.setItemSync as jest.Mock).mock.calls.find(
        (call) => call[0] === 'centerValues'
      )?.[1];
      expect(JSON.parse(savedValue)).toEqual({ filter_cutoff: 80 });
    });

    it('should update existing center value', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setCenterValue('filter_cutoff', 80);
      });

      act(() => {
        result.current.setCenterValue('filter_cutoff', 100);
      });

      expect(result.current.centerValues.filter_cutoff).toBe(100);
    });

    it('should preserve other center values when setting a new one', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setCenterValue('filter_cutoff', 80);
        result.current.setCenterValue('pan', -20);
      });

      expect(result.current.centerValues.filter_cutoff).toBe(80);
      expect(result.current.centerValues.pan).toBe(-20);
    });
  });

  describe('getCenterValue', () => {
    it('should return stored center value if exists', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setCenterValue('filter_cutoff', 80);
      });

      expect(result.current.getCenterValue('filter_cutoff')).toBe(80);
    });

    it('should return default value from destination definition if not stored', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      // filter_cutoff default is 64
      const filterCutoffDef = DESTINATIONS.find(d => d.id === 'filter_cutoff');
      expect(result.current.getCenterValue('filter_cutoff')).toBe(filterCutoffDef?.defaultValue);

      // volume default is 100
      const volumeDef = DESTINATIONS.find(d => d.id === 'volume');
      expect(result.current.getCenterValue('volume')).toBe(volumeDef?.defaultValue);

      // pan default is 0
      const panDef = DESTINATIONS.find(d => d.id === 'pan');
      expect(result.current.getCenterValue('pan')).toBe(panDef?.defaultValue);
    });

    it('should return 64 as fallback for unknown destination', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      // Unknown destination should fall back to 64
      const value = result.current.getCenterValue('unknown_dest' as DestinationId);
      expect(value).toBe(64);
    });

    it('should handle zero as a valid stored center value', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setCenterValue('pan', 0);
      });

      // Should return 0, not the default value
      expect(result.current.getCenterValue('pan')).toBe(0);
    });
  });

  describe('setRouting', () => {
    it('should update existing routing destination', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setRouting('lfo1', 'pan');
      });

      expect(result.current.routings).toEqual([
        { lfoId: 'lfo1', destinationId: 'pan', amount: 100 },
      ]);
    });

    it('should add new routing if lfoId does not exist', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setRouting('lfo2', 'volume');
      });

      expect(result.current.routings).toHaveLength(2);
      expect(result.current.routings).toContainEqual({
        lfoId: 'lfo2',
        destinationId: 'volume',
        amount: 100,
      });
    });

    it('should preserve amount when updating destination', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      // First set a custom amount
      act(() => {
        result.current.setRoutingAmount('lfo1', 50);
      });

      // Then change destination
      act(() => {
        result.current.setRouting('lfo1', 'pan');
      });

      // Amount should be preserved
      const routing = result.current.routings.find(r => r.lfoId === 'lfo1');
      expect(routing?.destinationId).toBe('pan');
      expect(routing?.amount).toBe(50);
    });

    it('should persist routings to storage', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setRouting('lfo1', 'pan');
      });

      expect(Storage.setItemSync).toHaveBeenCalledWith(
        'routings',
        expect.any(String)
      );
    });
  });

  describe('getRouting', () => {
    it('should return routing for existing lfoId', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      const routing = result.current.getRouting('lfo1');

      expect(routing).toEqual({
        lfoId: 'lfo1',
        destinationId: DEFAULT_DESTINATION,
        amount: 100,
      });
    });

    it('should return undefined for non-existent lfoId', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      const routing = result.current.getRouting('lfo99');

      expect(routing).toBeUndefined();
    });

    it('should return updated routing after setRouting', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setRouting('lfo1', 'volume');
      });

      const routing = result.current.getRouting('lfo1');
      expect(routing?.destinationId).toBe('volume');
    });
  });

  describe('setRoutingAmount', () => {
    it('should update amount for existing routing', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setRoutingAmount('lfo1', 50);
      });

      const routing = result.current.routings.find(r => r.lfoId === 'lfo1');
      expect(routing?.amount).toBe(50);
    });

    it('should not modify routing if lfoId does not exist', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      const initialRoutings = [...result.current.routings];

      act(() => {
        result.current.setRoutingAmount('lfo99', 50);
      });

      // Routings should be unchanged
      expect(result.current.routings).toEqual(initialRoutings);
    });

    it('should handle amount of 0', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setRoutingAmount('lfo1', 0);
      });

      const routing = result.current.routings.find(r => r.lfoId === 'lfo1');
      expect(routing?.amount).toBe(0);
    });

    it('should persist amount changes to storage', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setRoutingAmount('lfo1', 75);
      });

      expect(Storage.setItemSync).toHaveBeenCalledWith(
        'routings',
        expect.any(String)
      );
    });
  });

  describe('activeDestinationId (convenience property)', () => {
    it('should return destination for lfo1', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      expect(result.current.activeDestinationId).toBe(DEFAULT_DESTINATION);
    });

    it('should update when lfo1 routing changes', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setRouting('lfo1', 'volume');
      });

      expect(result.current.activeDestinationId).toBe('volume');
    });

    it('should return DEFAULT_DESTINATION if lfo1 routing is missing', () => {
      // Start with saved routings that don't include lfo1
      (Storage.getItemSync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'routings') return JSON.stringify([
          { lfoId: 'lfo2', destinationId: 'pan', amount: 100 },
        ]);
        return null;
      });

      const { result } = renderHook(() => useModulation(), { wrapper });

      expect(result.current.activeDestinationId).toBe(DEFAULT_DESTINATION);
    });
  });

  describe('setActiveDestinationId (convenience method)', () => {
    it('should update lfo1 destination', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setActiveDestinationId('pan');
      });

      expect(result.current.activeDestinationId).toBe('pan');
      expect(result.current.getRouting('lfo1')?.destinationId).toBe('pan');
    });

    it('should be equivalent to setRouting with lfo1', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setActiveDestinationId('volume');
      });

      const routing = result.current.getRouting('lfo1');
      expect(routing).toEqual({
        lfoId: 'lfo1',
        destinationId: 'volume',
        amount: 100,
      });
    });
  });

  describe('storage error handling', () => {
    it('should handle storage read errors gracefully', () => {
      (Storage.getItemSync as jest.Mock).mockImplementation(() => {
        throw new Error('Storage read error');
      });

      // Should not throw and use defaults
      const { result } = renderHook(() => useModulation(), { wrapper });

      expect(result.current.centerValues).toEqual({});
      expect(result.current.routings).toEqual([
        { lfoId: 'lfo1', destinationId: DEFAULT_DESTINATION, amount: 100 },
      ]);
    });

    it('should handle storage write errors gracefully', () => {
      (Storage.setItemSync as jest.Mock).mockImplementation(() => {
        throw new Error('Storage write error');
      });

      const { result } = renderHook(() => useModulation(), { wrapper });

      // Should not throw
      act(() => {
        result.current.setCenterValue('filter_cutoff', 80);
        result.current.setRouting('lfo1', 'pan');
      });

      // State should still be updated in memory
      expect(result.current.centerValues.filter_cutoff).toBe(80);
      expect(result.current.activeDestinationId).toBe('pan');
    });
  });

  describe('multiple routings', () => {
    it('should support multiple LFO routings', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setRouting('lfo1', 'filter_cutoff');
        result.current.setRouting('lfo2', 'pan');
        result.current.setRouting('lfo3', 'volume');
      });

      expect(result.current.routings).toHaveLength(3);
      expect(result.current.getRouting('lfo1')?.destinationId).toBe('filter_cutoff');
      expect(result.current.getRouting('lfo2')?.destinationId).toBe('pan');
      expect(result.current.getRouting('lfo3')?.destinationId).toBe('volume');
    });

    it('should update specific routing without affecting others', () => {
      const { result } = renderHook(() => useModulation(), { wrapper });

      act(() => {
        result.current.setRouting('lfo1', 'filter_cutoff');
        result.current.setRouting('lfo2', 'pan');
      });

      act(() => {
        result.current.setRoutingAmount('lfo1', 50);
      });

      // lfo2 should be unchanged
      expect(result.current.getRouting('lfo2')?.amount).toBe(100);
      // lfo1 should be updated
      expect(result.current.getRouting('lfo1')?.amount).toBe(50);
    });
  });
});
