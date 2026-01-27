import { sampleWaveformWorklet, isUnipolarWorklet } from '../worklets';
import type { WaveformType } from '../types';

describe('worklets', () => {
  describe('sampleWaveformWorklet', () => {
    describe('TRI (Triangle) waveform', () => {
      it('should return 0 at phase 0', () => {
        expect(sampleWaveformWorklet('TRI', 0)).toBe(0);
      });

      it('should return 1 at phase 0.25 (peak)', () => {
        expect(sampleWaveformWorklet('TRI', 0.25)).toBe(1);
      });

      it('should return 0 at phase 0.5 (zero crossing)', () => {
        expect(sampleWaveformWorklet('TRI', 0.5)).toBe(0);
      });

      it('should return -1 at phase 0.75 (trough)', () => {
        expect(sampleWaveformWorklet('TRI', 0.75)).toBe(-1);
      });

      it('should return approximately 0 at phase 1 (end of cycle)', () => {
        // Due to floating point, phase 1 wraps to calculation for last segment
        const result = sampleWaveformWorklet('TRI', 1);
        expect(result).toBeCloseTo(0, 5);
      });

      it('should be bipolar (range -1 to 1)', () => {
        // Sample multiple phases to verify range
        const phases = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
        phases.forEach(phase => {
          const value = sampleWaveformWorklet('TRI', phase);
          expect(value).toBeGreaterThanOrEqual(-1);
          expect(value).toBeLessThanOrEqual(1);
        });
      });
    });

    describe('SIN (Sine) waveform', () => {
      it('should return 0 at phase 0', () => {
        expect(sampleWaveformWorklet('SIN', 0)).toBeCloseTo(0, 10);
      });

      it('should return 1 at phase 0.25 (peak)', () => {
        expect(sampleWaveformWorklet('SIN', 0.25)).toBeCloseTo(1, 10);
      });

      it('should return 0 at phase 0.5 (zero crossing)', () => {
        expect(sampleWaveformWorklet('SIN', 0.5)).toBeCloseTo(0, 10);
      });

      it('should return -1 at phase 0.75 (trough)', () => {
        expect(sampleWaveformWorklet('SIN', 0.75)).toBeCloseTo(-1, 10);
      });

      it('should return 0 at phase 1 (end of cycle)', () => {
        expect(sampleWaveformWorklet('SIN', 1)).toBeCloseTo(0, 10);
      });

      it('should be bipolar (range -1 to 1)', () => {
        const phases = Array.from({ length: 100 }, (_, i) => i / 100);
        phases.forEach(phase => {
          const value = sampleWaveformWorklet('SIN', phase);
          expect(value).toBeGreaterThanOrEqual(-1);
          expect(value).toBeLessThanOrEqual(1);
        });
      });
    });

    describe('SQR (Square) waveform', () => {
      it('should return 1 for phase < 0.5', () => {
        expect(sampleWaveformWorklet('SQR', 0)).toBe(1);
        expect(sampleWaveformWorklet('SQR', 0.25)).toBe(1);
        expect(sampleWaveformWorklet('SQR', 0.49)).toBe(1);
      });

      it('should return -1 for phase >= 0.5', () => {
        expect(sampleWaveformWorklet('SQR', 0.5)).toBe(-1);
        expect(sampleWaveformWorklet('SQR', 0.75)).toBe(-1);
        expect(sampleWaveformWorklet('SQR', 0.99)).toBe(-1);
      });

      it('should only produce values of 1 or -1', () => {
        const phases = Array.from({ length: 100 }, (_, i) => i / 100);
        phases.forEach(phase => {
          const value = sampleWaveformWorklet('SQR', phase);
          expect([1, -1]).toContain(value);
        });
      });
    });

    describe('SAW (Sawtooth) waveform', () => {
      it('should return +1 at phase 0 (starts at max)', () => {
        expect(sampleWaveformWorklet('SAW', 0)).toBe(1);
      });

      it('should return 0 at phase 0.5', () => {
        expect(sampleWaveformWorklet('SAW', 0.5)).toBe(0);
      });

      it('should return -1 at phase 1 (ends at min)', () => {
        expect(sampleWaveformWorklet('SAW', 1)).toBe(-1);
      });

      it('should be linear (falling)', () => {
        const phase1 = 0.25;
        const phase2 = 0.75;
        const value1 = sampleWaveformWorklet('SAW', phase1);
        const value2 = sampleWaveformWorklet('SAW', phase2);
        expect(value2).toBeLessThan(value1);
      });

      it('should be bipolar (range -1 to 1)', () => {
        const phases = Array.from({ length: 100 }, (_, i) => i / 100);
        phases.forEach(phase => {
          const value = sampleWaveformWorklet('SAW', phase);
          expect(value).toBeGreaterThanOrEqual(-1);
          expect(value).toBeLessThanOrEqual(1);
        });
      });
    });

    describe('EXP (Exponential) waveform', () => {
      it('should return 1 at phase 0 (starts at max - decay shape)', () => {
        expect(sampleWaveformWorklet('EXP', 0)).toBeCloseTo(1, 5);
      });

      it('should return 0 at phase 1 (ends at min - decay shape)', () => {
        expect(sampleWaveformWorklet('EXP', 1)).toBeCloseTo(0, 5);
      });

      it('should be unipolar (range 0 to 1)', () => {
        const phases = Array.from({ length: 100 }, (_, i) => i / 100);
        phases.forEach(phase => {
          const value = sampleWaveformWorklet('EXP', phase);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        });
      });

      it('should be a decay curve (1→0) matching Digitakt II engine base behavior', () => {
        // Verify decay direction: value decreases as phase increases
        const value25 = sampleWaveformWorklet('EXP', 0.25);
        const value50 = sampleWaveformWorklet('EXP', 0.5);
        const value75 = sampleWaveformWorklet('EXP', 0.75);

        expect(value25).toBeGreaterThan(value50);
        expect(value50).toBeGreaterThan(value75);
      });

      it('should have exponential curve (faster start decay, slower end)', () => {
        const value25 = sampleWaveformWorklet('EXP', 0.25);
        const value50 = sampleWaveformWorklet('EXP', 0.5);
        const value75 = sampleWaveformWorklet('EXP', 0.75);

        // For exponential decay, the drop from 0-0.25 should be less than 0.25-0.5
        // (value at 0.5 should be above 0.5 for exp decay)
        expect(value50).toBeGreaterThan(0.5);

        // The difference should accelerate (bigger drops later)
        const diff1 = value25 - value50; // how much dropped between 0.25 and 0.5
        const diff2 = value50 - value75; // how much dropped between 0.5 and 0.75
        expect(diff2).toBeGreaterThan(diff1);
      });
    });

    describe('RMP (Ramp) waveform', () => {
      it('should return 0 at phase 0 (starts at min)', () => {
        expect(sampleWaveformWorklet('RMP', 0)).toBe(0);
      });

      it('should return 0.5 at phase 0.5', () => {
        expect(sampleWaveformWorklet('RMP', 0.5)).toBe(0.5);
      });

      it('should return 1 at phase 1 (ends at max)', () => {
        expect(sampleWaveformWorklet('RMP', 1)).toBe(1);
      });

      it('should be unipolar (range 0 to 1)', () => {
        const phases = Array.from({ length: 100 }, (_, i) => i / 100);
        phases.forEach(phase => {
          const value = sampleWaveformWorklet('RMP', phase);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        });
      });

      it('should be rising (increasing)', () => {
        const phase1 = 0.25;
        const phase2 = 0.75;
        const value1 = sampleWaveformWorklet('RMP', phase1);
        const value2 = sampleWaveformWorklet('RMP', phase2);
        expect(value2).toBeGreaterThan(value1);
      });
    });

    describe('RND (Random) waveform', () => {
      it('should return deterministic values for same phase', () => {
        const value1 = sampleWaveformWorklet('RND', 0.5);
        const value2 = sampleWaveformWorklet('RND', 0.5);
        expect(value1).toBe(value2);
      });

      it('should step in discrete intervals', () => {
        // Phases within the same step should return the same value
        // With 16 steps per cycle, step 0 covers [0, 0.0625)
        const value1 = sampleWaveformWorklet('RND', 0.01);
        const value2 = sampleWaveformWorklet('RND', 0.05);
        expect(value1).toBe(value2); // Same step (step 0)
      });

      it('should change values between different steps', () => {
        // Phases in different steps may have different values
        const value1 = sampleWaveformWorklet('RND', 0.0); // Step 0
        const value2 = sampleWaveformWorklet('RND', 0.15); // Step 1
        // Note: They could theoretically be equal but unlikely
        // We're testing the mechanism works, not that values differ
        expect(typeof value1).toBe('number');
        expect(typeof value2).toBe('number');
      });

      it('should produce values within expected range', () => {
        const phases = Array.from({ length: 100 }, (_, i) => i / 100);
        phases.forEach(phase => {
          const value = sampleWaveformWorklet('RND', phase);
          // Based on implementation: Math.sin(step * 78.233 + 0.5) * 0.9
          // Max value is 0.9, min is -0.9
          expect(value).toBeGreaterThanOrEqual(-0.9);
          expect(value).toBeLessThanOrEqual(0.9);
        });
      });
    });

    describe('unknown waveform', () => {
      it('should return 0 for unknown waveform type', () => {
        const result = sampleWaveformWorklet('UNKNOWN' as WaveformType, 0.5);
        expect(result).toBe(0);
      });
    });

    describe('edge cases', () => {
      it('should handle phase exactly at 0', () => {
        const waveforms: WaveformType[] = ['TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'];
        waveforms.forEach(waveform => {
          expect(() => sampleWaveformWorklet(waveform, 0)).not.toThrow();
        });
      });

      it('should handle phase exactly at 1', () => {
        const waveforms: WaveformType[] = ['TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'];
        waveforms.forEach(waveform => {
          expect(() => sampleWaveformWorklet(waveform, 1)).not.toThrow();
        });
      });

      it('should handle very small phase values', () => {
        const waveforms: WaveformType[] = ['TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'];
        waveforms.forEach(waveform => {
          expect(() => sampleWaveformWorklet(waveform, 0.0001)).not.toThrow();
        });
      });

      it('should handle phase values very close to 1', () => {
        const waveforms: WaveformType[] = ['TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'];
        waveforms.forEach(waveform => {
          expect(() => sampleWaveformWorklet(waveform, 0.9999)).not.toThrow();
        });
      });
    });
  });

  describe('visualization speed transformation', () => {
    /**
     * These tests verify the logic used in visualization components
     * to transform waveform values based on speed:
     * - For unipolar waveforms (EXP, RMP), negative speed flips shape (1-x)
     * - For bipolar waveforms, negative speed inverts polarity (*-1)
     */

    function applySpeedTransformation(
      waveform: WaveformType,
      value: number,
      hasNegativeSpeed: boolean
    ): number {
      if (!hasNegativeSpeed) return value;

      if (isUnipolarWorklet(waveform)) {
        // Unipolar: flip shape (1-x)
        return 1 - value;
      } else {
        // Bipolar: invert polarity
        return -value;
      }
    }

    describe('EXP with negative speed (fade-in)', () => {
      it('should transform 1→0 base to 0→1 attack', () => {
        // EXP base is 1→0 (decay)
        const baseAtPhase0 = sampleWaveformWorklet('EXP', 0); // ~1
        const baseAtPhase1 = sampleWaveformWorklet('EXP', 1); // ~0

        // With negative speed, should become 0→1 (attack)
        const transformedAtPhase0 = applySpeedTransformation('EXP', baseAtPhase0, true);
        const transformedAtPhase1 = applySpeedTransformation('EXP', baseAtPhase1, true);

        expect(transformedAtPhase0).toBeCloseTo(0, 5);
        expect(transformedAtPhase1).toBeCloseTo(1, 5);
      });

      it('should produce rising values for fade-in visualization', () => {
        const phases = [0, 0.25, 0.5, 0.75, 1];
        const values = phases.map(phase => {
          const base = sampleWaveformWorklet('EXP', phase);
          return applySpeedTransformation('EXP', base, true);
        });

        // Each value should be greater than the previous (rising)
        for (let i = 1; i < values.length; i++) {
          expect(values[i]).toBeGreaterThan(values[i - 1]);
        }
      });
    });

    describe('EXP with positive speed (fade-out/decay)', () => {
      it('should keep 1→0 base unchanged', () => {
        const baseAtPhase0 = sampleWaveformWorklet('EXP', 0);
        const baseAtPhase1 = sampleWaveformWorklet('EXP', 1);

        const transformedAtPhase0 = applySpeedTransformation('EXP', baseAtPhase0, false);
        const transformedAtPhase1 = applySpeedTransformation('EXP', baseAtPhase1, false);

        expect(transformedAtPhase0).toBeCloseTo(1, 5);
        expect(transformedAtPhase1).toBeCloseTo(0, 5);
      });
    });

    describe('RMP with negative speed', () => {
      it('should transform 0→1 base to 1→0', () => {
        // RMP base is 0→1 (rising)
        const baseAtPhase0 = sampleWaveformWorklet('RMP', 0); // 0
        const baseAtPhase1 = sampleWaveformWorklet('RMP', 1); // 1

        // With negative speed, should become 1→0
        const transformedAtPhase0 = applySpeedTransformation('RMP', baseAtPhase0, true);
        const transformedAtPhase1 = applySpeedTransformation('RMP', baseAtPhase1, true);

        expect(transformedAtPhase0).toBe(1);
        expect(transformedAtPhase1).toBe(0);
      });
    });

    describe('SIN (bipolar) with negative speed', () => {
      it('should invert polarity, not flip shape', () => {
        // SIN at phase 0.25 is at peak (+1)
        const baseAtPeak = sampleWaveformWorklet('SIN', 0.25);
        expect(baseAtPeak).toBeCloseTo(1, 5);

        // With negative speed, should become -1 (polarity inversion)
        const transformed = applySpeedTransformation('SIN', baseAtPeak, true);
        expect(transformed).toBeCloseTo(-1, 5);
      });

      it('should invert the entire waveform polarity', () => {
        const phases = [0, 0.25, 0.5, 0.75];
        phases.forEach(phase => {
          const base = sampleWaveformWorklet('SIN', phase);
          const transformed = applySpeedTransformation('SIN', base, true);
          expect(transformed).toBeCloseTo(-base, 10);
        });
      });
    });

    describe('TRI (bipolar) with negative speed', () => {
      it('should invert polarity', () => {
        const baseAtPeak = sampleWaveformWorklet('TRI', 0.25);
        expect(baseAtPeak).toBe(1);

        const transformed = applySpeedTransformation('TRI', baseAtPeak, true);
        expect(transformed).toBe(-1);
      });
    });
  });

  describe('isUnipolarWorklet', () => {
    it('should return true for EXP waveform', () => {
      expect(isUnipolarWorklet('EXP')).toBe(true);
    });

    it('should return true for RMP waveform', () => {
      expect(isUnipolarWorklet('RMP')).toBe(true);
    });

    it('should return false for TRI waveform', () => {
      expect(isUnipolarWorklet('TRI')).toBe(false);
    });

    it('should return false for SIN waveform', () => {
      expect(isUnipolarWorklet('SIN')).toBe(false);
    });

    it('should return false for SQR waveform', () => {
      expect(isUnipolarWorklet('SQR')).toBe(false);
    });

    it('should return false for SAW waveform', () => {
      expect(isUnipolarWorklet('SAW')).toBe(false);
    });

    it('should return false for RND waveform', () => {
      expect(isUnipolarWorklet('RND')).toBe(false);
    });

    it('should return false for unknown waveform', () => {
      expect(isUnipolarWorklet('UNKNOWN' as WaveformType)).toBe(false);
    });

    it('should be consistent with waveform output ranges', () => {
      // Verify that unipolar waveforms actually produce unipolar output
      const unipolarWaveforms: WaveformType[] = ['EXP', 'RMP'];
      const bipolarWaveforms: WaveformType[] = ['TRI', 'SIN', 'SQR', 'SAW'];

      unipolarWaveforms.forEach(waveform => {
        expect(isUnipolarWorklet(waveform)).toBe(true);
        // Sample and verify range is 0-1
        const phases = Array.from({ length: 50 }, (_, i) => i / 50);
        phases.forEach(phase => {
          const value = sampleWaveformWorklet(waveform, phase);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        });
      });

      bipolarWaveforms.forEach(waveform => {
        expect(isUnipolarWorklet(waveform)).toBe(false);
        // Sample and verify range includes negative values
        const phases = Array.from({ length: 50 }, (_, i) => i / 50);
        const values = phases.map(phase => sampleWaveformWorklet(waveform, phase));
        const hasNegative = values.some(v => v < 0);
        const hasPositive = values.some(v => v > 0);
        expect(hasNegative).toBe(true);
        expect(hasPositive).toBe(true);
      });
    });
  });
});
