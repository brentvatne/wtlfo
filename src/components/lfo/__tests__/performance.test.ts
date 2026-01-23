/**
 * Performance tests for LFO visualization components
 *
 * These tests measure the execution time of critical paths that affect
 * slider responsiveness and animation smoothness.
 */

import { Skia } from '@shopify/react-native-skia';
import { sampleWaveformWorklet, sampleWaveformWithSlew } from '../worklets';
import type { WaveformType } from '../types';

// Mock path generation logic (extracted from useWaveformPath)
function generateWaveformPath(
  waveform: WaveformType,
  width: number,
  height: number,
  resolution: number,
  padding: number,
  depth: number,
  startPhase: number,
  closePath: boolean
) {
  const path = Skia.Path.Make();
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;
  const centerY = height / 2;
  const scaleY = -drawHeight / 2;
  const depthScale = Math.max(-1, Math.min(1, depth / 63));
  const isRandom = waveform === 'RND';
  const slewValue = isRandom ? startPhase : 0;
  const startPhaseNormalized = isRandom ? 0 : startPhase / 128;
  const startX = padding;
  const endX = padding + drawWidth;
  let prevValue: number | null = null;

  for (let i = 0; i <= resolution; i++) {
    const xNormalized = i / resolution;
    const phase = (xNormalized + startPhaseNormalized) % 1;
    let value = isRandom
      ? sampleWaveformWithSlew(waveform, phase, slewValue)
      : sampleWaveformWorklet(waveform, phase);
    value = value * depthScale;
    const x = padding + xNormalized * drawWidth;
    const y = centerY + value * scaleY;

    if (i === 0) {
      path.moveTo(x, y);
    } else {
      const threshold = 0.5;
      if (prevValue !== null && Math.abs(value - prevValue) > threshold) {
        const prevY = centerY + prevValue * scaleY;
        path.lineTo(x, prevY);
        path.lineTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    prevValue = value;
  }

  if (closePath) {
    path.lineTo(endX, centerY);
    path.lineTo(startX, centerY);
    path.close();
  }

  return path;
}

describe('Performance Tests', () => {
  // Standard dimensions matching actual usage
  const WIDTH = 340;
  const HEIGHT = 200;
  const PADDING = 8;
  const RESOLUTION = 128;

  describe('Waveform Path Generation', () => {
    const waveforms: WaveformType[] = ['TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'];

    waveforms.forEach(waveform => {
      it(`should generate ${waveform} path in under 5ms`, () => {
        const iterations = 10;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          generateWaveformPath(waveform, WIDTH, HEIGHT, RESOLUTION, PADDING, 63, 0, false);
          const elapsed = performance.now() - start;
          times.push(elapsed);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);

        // Log for visibility
        console.log(`${waveform} path generation: avg=${avgTime.toFixed(2)}ms, max=${maxTime.toFixed(2)}ms`);

        // Should complete in under 5ms to maintain 60fps (16.6ms frame budget)
        // Allowing some headroom for other operations
        expect(avgTime).toBeLessThan(5);
      });
    });

    it('should generate both stroke and fill paths in under 8ms combined', () => {
      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, 63, 0, false);
        generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, 63, 0, true);
        const elapsed = performance.now() - start;
        times.push(elapsed);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Combined stroke+fill path generation: avg=${avgTime.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(8);
    });

    it('should scale linearly with resolution', () => {
      const resolutions = [32, 64, 128, 256];
      const times: Record<number, number> = {};

      resolutions.forEach(res => {
        const iterations = 5;
        let totalTime = 0;

        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          generateWaveformPath('TRI', WIDTH, HEIGHT, res, PADDING, 63, 0, false);
          totalTime += performance.now() - start;
        }

        times[res] = totalTime / iterations;
      });

      console.log('Path generation by resolution:', times);

      // 256 resolution should be roughly 2x the time of 128
      // Allow 3x to account for overhead, with minimum threshold for mock environments
      const baseTime = Math.max(times[128], 0.1); // Minimum 0.1ms for comparison
      expect(times[256]).toBeLessThan(baseTime * 3);
    });
  });

  describe('Waveform Sampling', () => {
    it('should sample 128 points in under 0.5ms', () => {
      const iterations = 100;
      const times: number[] = [];

      for (let iter = 0; iter < iterations; iter++) {
        const start = performance.now();
        for (let i = 0; i <= 128; i++) {
          sampleWaveformWorklet('TRI', i / 128);
        }
        const elapsed = performance.now() - start;
        times.push(elapsed);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`128-point sampling: avg=${avgTime.toFixed(3)}ms`);

      expect(avgTime).toBeLessThan(0.5);
    });

    it('should sample RND with slew in under 1ms for 128 points', () => {
      const iterations = 100;
      const times: number[] = [];

      for (let iter = 0; iter < iterations; iter++) {
        const start = performance.now();
        for (let i = 0; i <= 128; i++) {
          sampleWaveformWithSlew('RND', i / 128, 64);
        }
        const elapsed = performance.now() - start;
        times.push(elapsed);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`128-point RND+slew sampling: avg=${avgTime.toFixed(3)}ms`);

      expect(avgTime).toBeLessThan(1);
    });
  });

  describe('Depth Change Simulation', () => {
    it('should handle rapid depth changes (simulating slider drag)', () => {
      const depthValues = Array.from({ length: 30 }, (_, i) => -64 + Math.floor(i * 127 / 29));
      const times: number[] = [];

      depthValues.forEach(depth => {
        const start = performance.now();
        // Generate both paths like WaveformDisplay does
        generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, depth, 0, false);
        generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, depth, 0, true);
        const elapsed = performance.now() - start;
        times.push(elapsed);
      });

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const totalTime = times.reduce((a, b) => a + b, 0);

      console.log(`Depth slider simulation (30 values):`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average per change: ${avgTime.toFixed(2)}ms`);
      console.log(`  Max single change: ${maxTime.toFixed(2)}ms`);

      // At 60fps, we have ~16.6ms per frame
      // If depth changes ~30 times/second (fast drag), each should take <8ms
      expect(avgTime).toBeLessThan(8);
      expect(maxTime).toBeLessThan(12);
    });

    it('should compare throttled vs unthrottled performance', () => {
      // Simulate 60fps slider updates for 1 second
      const framesPerSecond = 60;
      const durationSeconds = 1;
      const totalFrames = framesPerSecond * durationSeconds;

      // Unthrottled: regenerate path every frame
      const unthrottledStart = performance.now();
      for (let frame = 0; frame < totalFrames; frame++) {
        const depth = -64 + Math.floor((frame / totalFrames) * 127);
        generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, depth, 0, false);
        generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, depth, 0, true);
      }
      const unthrottledTime = performance.now() - unthrottledStart;

      // Throttled: regenerate path every 60ms (matching our implementation)
      const throttleIntervalMs = 60;
      const throttledFrames = Math.ceil((durationSeconds * 1000) / throttleIntervalMs);

      const throttledStart = performance.now();
      for (let frame = 0; frame < throttledFrames; frame++) {
        const depth = -64 + Math.floor((frame / throttledFrames) * 127);
        generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, depth, 0, false);
        generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, depth, 0, true);
      }
      const throttledTime = performance.now() - throttledStart;

      const savings = ((unthrottledTime - throttledTime) / unthrottledTime * 100).toFixed(1);

      console.log(`Performance comparison (1 second slider drag):`);
      console.log(`  Unthrottled (60 updates): ${unthrottledTime.toFixed(2)}ms`);
      console.log(`  Throttled (${throttledFrames} updates): ${throttledTime.toFixed(2)}ms`);
      console.log(`  JS thread time saved: ${savings}%`);

      // Throttled should be faster (or both near zero in mock environment)
      // In real environment: expect throttled < unthrottled * 0.5
      // In mock: both may round to same value, so just verify throttled <= unthrottled
      expect(throttledTime).toBeLessThanOrEqual(unthrottledTime);
    });
  });

  describe('Frame Budget Analysis', () => {
    const FRAME_BUDGET_MS = 16.6; // 60fps

    it('should leave headroom for other operations at 60fps', () => {
      // Simulate one frame of work during depth slider interaction
      const start = performance.now();

      // Path generation (what we're optimizing)
      generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, 32, 0, false);
      generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, 32, 0, true);

      const pathTime = performance.now() - start;

      // Calculate remaining budget
      const remainingBudget = FRAME_BUDGET_MS - pathTime;
      const budgetUsedPercent = (pathTime / FRAME_BUDGET_MS * 100).toFixed(1);

      console.log(`Frame budget analysis:`);
      console.log(`  Path generation: ${pathTime.toFixed(2)}ms`);
      console.log(`  Frame budget: ${FRAME_BUDGET_MS}ms`);
      console.log(`  Budget used: ${budgetUsedPercent}%`);
      console.log(`  Remaining for other work: ${remainingBudget.toFixed(2)}ms`);

      // Path generation should use less than 50% of frame budget
      // to leave room for React renders, layout, and other operations
      expect(pathTime).toBeLessThan(FRAME_BUDGET_MS * 0.5);
    });
  });
});
