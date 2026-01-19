import {
  DESTINATIONS,
  getDestination,
  getDestinationsByCategory,
  DEFAULT_DESTINATION,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
} from '../destinations';
import type { DestinationId, DestinationCategory } from '@/src/types/destination';

describe('destinations', () => {
  describe('DESTINATIONS array', () => {
    it('should contain all expected destination IDs', () => {
      const expectedIds: DestinationId[] = [
        'filter_cutoff',
        'filter_resonance',
        'filter_drive',
        'filter_env_depth',
        'volume',
        'pan',
        'amp_attack',
        'amp_decay',
        'amp_sustain',
        'amp_release',
        'pitch',
        'pitch_fine',
        'sample_start',
        'sample_length',
        'delay_send',
        'reverb_send',
        'overdrive',
        'bit_reduction',
      ];

      const actualIds = DESTINATIONS.map(d => d.id);
      expect(actualIds).toEqual(expect.arrayContaining(expectedIds));
      expect(actualIds.length).toBe(expectedIds.length);
    });

    it('should have valid min/max ranges for all destinations', () => {
      DESTINATIONS.forEach(dest => {
        expect(dest.min).toBeLessThan(dest.max);
        expect(dest.defaultValue).toBeGreaterThanOrEqual(dest.min);
        expect(dest.defaultValue).toBeLessThanOrEqual(dest.max);
      });
    });

    it('should have valid category assignments', () => {
      const validCategories: DestinationCategory[] = ['filter', 'amp', 'pitch', 'sample', 'fx'];
      DESTINATIONS.forEach(dest => {
        expect(validCategories).toContain(dest.category);
      });
    });

    it('should have consistent bipolar flag for negative min values', () => {
      // All destinations with negative min values should be marked as bipolar
      DESTINATIONS.forEach(dest => {
        if (dest.min < 0) {
          expect(dest.bipolar).toBe(true);
        }
      });
    });

    it('should have required fields for all destinations', () => {
      DESTINATIONS.forEach(dest => {
        expect(dest.id).toBeDefined();
        expect(dest.name).toBeDefined();
        expect(dest.displayName).toBeDefined();
        expect(typeof dest.min).toBe('number');
        expect(typeof dest.max).toBe('number');
        expect(typeof dest.defaultValue).toBe('number');
        expect(dest.category).toBeDefined();
        expect(typeof dest.bipolar).toBe('boolean');
      });
    });
  });

  describe('getDestination', () => {
    it('should return null for none destination', () => {
      const dest = getDestination('none');
      expect(dest).toBeNull();
    });

    it('should return the correct destination for filter_cutoff', () => {
      const dest = getDestination('filter_cutoff');
      expect(dest).not.toBeNull();
      expect(dest!.id).toBe('filter_cutoff');
      expect(dest!.name).toBe('Filter Cutoff');
      expect(dest!.displayName).toBe('CUTOFF');
      expect(dest!.min).toBe(0);
      expect(dest!.max).toBe(127);
      expect(dest!.defaultValue).toBe(64);
      expect(dest!.category).toBe('filter');
      expect(dest!.bipolar).toBe(false);
    });

    it('should return the correct destination for pan (bipolar)', () => {
      const dest = getDestination('pan');
      expect(dest).not.toBeNull();
      expect(dest!.id).toBe('pan');
      expect(dest!.min).toBe(-64);
      expect(dest!.max).toBe(63);
      expect(dest!.defaultValue).toBe(0);
      expect(dest!.bipolar).toBe(true);
      expect(dest!.unit).toBe('L/R');
    });

    it('should return the correct destination for pitch (bipolar with unit)', () => {
      const dest = getDestination('pitch');
      expect(dest).not.toBeNull();
      expect(dest!.id).toBe('pitch');
      expect(dest!.min).toBe(-24);
      expect(dest!.max).toBe(24);
      expect(dest!.unit).toBe('st');
      expect(dest!.bipolar).toBe(true);
    });

    it('should throw an error for unknown destination ID', () => {
      expect(() => {
        getDestination('unknown_destination' as DestinationId);
      }).toThrow('Unknown destination: unknown_destination');
    });

    it('should return all destinations when called with valid IDs', () => {
      DESTINATIONS.forEach(expectedDest => {
        const dest = getDestination(expectedDest.id);
        expect(dest).toEqual(expectedDest);
      });
    });
  });

  describe('getDestinationsByCategory', () => {
    it('should return all filter destinations', () => {
      const filterDests = getDestinationsByCategory('filter');
      expect(filterDests.length).toBe(4);
      expect(filterDests.map(d => d.id)).toEqual([
        'filter_cutoff',
        'filter_resonance',
        'filter_drive',
        'filter_env_depth',
      ]);
    });

    it('should return all amp destinations', () => {
      const ampDests = getDestinationsByCategory('amp');
      expect(ampDests.length).toBe(6);
      expect(ampDests.map(d => d.id)).toContain('volume');
      expect(ampDests.map(d => d.id)).toContain('pan');
      expect(ampDests.map(d => d.id)).toContain('amp_attack');
    });

    it('should return all pitch destinations', () => {
      const pitchDests = getDestinationsByCategory('pitch');
      expect(pitchDests.length).toBe(2);
      expect(pitchDests.map(d => d.id)).toEqual(['pitch', 'pitch_fine']);
    });

    it('should return all sample destinations', () => {
      const sampleDests = getDestinationsByCategory('sample');
      expect(sampleDests.length).toBe(2);
      expect(sampleDests.map(d => d.id)).toEqual(['sample_start', 'sample_length']);
    });

    it('should return all fx destinations', () => {
      const fxDests = getDestinationsByCategory('fx');
      expect(fxDests.length).toBe(4);
      expect(fxDests.map(d => d.id)).toEqual([
        'delay_send',
        'reverb_send',
        'overdrive',
        'bit_reduction',
      ]);
    });

    it('should return empty array for non-existent category', () => {
      const dests = getDestinationsByCategory('nonexistent' as DestinationCategory);
      expect(dests).toEqual([]);
    });

    it('should return all destinations when combined across categories', () => {
      const allCategories: DestinationCategory[] = ['filter', 'amp', 'pitch', 'sample', 'fx'];
      const allFromCategories = allCategories.flatMap(cat => getDestinationsByCategory(cat));
      expect(allFromCategories.length).toBe(DESTINATIONS.length);
    });
  });

  describe('DEFAULT_DESTINATION', () => {
    it('should be none', () => {
      expect(DEFAULT_DESTINATION).toBe('none');
    });

    it('should return null when used with getDestination', () => {
      expect(getDestination(DEFAULT_DESTINATION)).toBeNull();
    });
  });

  describe('CATEGORY_ORDER', () => {
    it('should contain all categories in the expected order', () => {
      expect(CATEGORY_ORDER).toEqual(['filter', 'amp', 'pitch', 'sample', 'fx']);
    });

    it('should contain exactly 5 categories', () => {
      expect(CATEGORY_ORDER.length).toBe(5);
    });
  });

  describe('CATEGORY_LABELS', () => {
    it('should have labels for all categories', () => {
      expect(CATEGORY_LABELS.filter).toBe('FILTER');
      expect(CATEGORY_LABELS.amp).toBe('AMP');
      expect(CATEGORY_LABELS.pitch).toBe('PITCH');
      expect(CATEGORY_LABELS.sample).toBe('SAMPLE');
      expect(CATEGORY_LABELS.fx).toBe('FX');
    });

    it('should have a label for each category in CATEGORY_ORDER', () => {
      CATEGORY_ORDER.forEach(category => {
        expect(CATEGORY_LABELS[category]).toBeDefined();
        expect(typeof CATEGORY_LABELS[category]).toBe('string');
      });
    });
  });
});
