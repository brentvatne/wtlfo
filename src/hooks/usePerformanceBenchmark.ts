/**
 * Hook for running on-device performance benchmarks
 *
 * These tests are designed to run on actual devices to measure
 * real-world performance characteristics that can't be captured in unit tests.
 */

import { useState, useCallback, useRef } from 'react';
import { Skia } from '@shopify/react-native-skia';
import { sampleWaveformWorklet, sampleWaveformWithSlew } from '@/src/components/lfo/worklets';
import type { WaveformType } from '@/src/components/lfo/types';

export interface BenchmarkResult {
  name: string;
  avgMs: number;
  maxMs: number;
  minMs: number;
  iterations: number;
  passed: boolean;
  threshold: number;
  details?: string;
}

export interface BenchmarkLog {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'data';
}

// Path generation logic (matching useWaveformPath)
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

export function usePerformanceBenchmark() {
  const [logs, setLogs] = useState<BenchmarkLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const frameDropsRef = useRef<number[]>([]);
  const animationRef = useRef<number>(0);

  const log = useCallback((message: string, type: BenchmarkLog['type'] = 'info') => {
    setLogs(prev => [...prev, { timestamp: Date.now(), message, type }]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setResults([]);
  }, []);

  // Benchmark: Path generation timing
  const benchmarkPathGeneration = useCallback(async (): Promise<BenchmarkResult> => {
    const WIDTH = 340;
    const HEIGHT = 200;
    const PADDING = 8;
    const RESOLUTION = 128;
    const ITERATIONS = 20;
    const times: number[] = [];

    log('Running path generation benchmark...');

    for (let i = 0; i < ITERATIONS; i++) {
      const depth = -64 + Math.floor(Math.random() * 128);
      const start = performance.now();
      generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, depth, 0, false);
      generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, depth, 0, true);
      times.push(performance.now() - start);
    }

    const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
    const maxMs = Math.max(...times);
    const minMs = Math.min(...times);
    const threshold = 8; // ms

    return {
      name: 'Path Generation (stroke + fill)',
      avgMs,
      maxMs,
      minMs,
      iterations: ITERATIONS,
      passed: avgMs < threshold,
      threshold,
      details: `Resolution: ${RESOLUTION} points`,
    };
  }, [log]);

  // Benchmark: Per-waveform path generation
  const benchmarkAllWaveforms = useCallback(async (): Promise<BenchmarkResult[]> => {
    const WIDTH = 340;
    const HEIGHT = 200;
    const PADDING = 8;
    const RESOLUTION = 128;
    const ITERATIONS = 10;
    const waveforms: WaveformType[] = ['TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'];
    const results: BenchmarkResult[] = [];

    log('Running per-waveform benchmarks...');

    for (const waveform of waveforms) {
      const times: number[] = [];

      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        generateWaveformPath(waveform, WIDTH, HEIGHT, RESOLUTION, PADDING, 63, 0, false);
        generateWaveformPath(waveform, WIDTH, HEIGHT, RESOLUTION, PADDING, 63, 0, true);
        times.push(performance.now() - start);
      }

      const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
      const threshold = waveform === 'RND' ? 10 : 8; // RND is more expensive

      results.push({
        name: `${waveform} Waveform`,
        avgMs,
        maxMs: Math.max(...times),
        minMs: Math.min(...times),
        iterations: ITERATIONS,
        passed: avgMs < threshold,
        threshold,
      });
    }

    return results;
  }, [log]);

  // Benchmark: Frame drop detection during simulated slider drag
  const benchmarkSliderDrag = useCallback(async (): Promise<BenchmarkResult> => {
    const WIDTH = 340;
    const HEIGHT = 200;
    const PADDING = 8;
    const RESOLUTION = 128;
    const DURATION_MS = 2000;
    const frameDrops: number[] = [];
    let lastFrameTime = performance.now();
    let frameCount = 0;

    log('Running slider drag simulation (2 seconds)...');

    return new Promise((resolve) => {
      const startTime = performance.now();

      const animate = () => {
        const now = performance.now();
        const elapsed = now - startTime;

        if (elapsed >= DURATION_MS) {
          const avgFrameTime = DURATION_MS / frameCount;
          const fps = 1000 / avgFrameTime;
          const droppedFrames = frameDrops.length;

          resolve({
            name: 'Slider Drag Simulation',
            avgMs: avgFrameTime,
            maxMs: Math.max(...frameDrops, avgFrameTime),
            minMs: Math.min(...frameDrops.filter(t => t > 0), avgFrameTime),
            iterations: frameCount,
            passed: droppedFrames < 10,
            threshold: 10, // max dropped frames
            details: `${frameCount} frames, ${droppedFrames} drops, ~${fps.toFixed(1)}fps`,
          });
          return;
        }

        // Check for frame drop (>20ms since last frame = dropped)
        const frameDelta = now - lastFrameTime;
        if (frameDelta > 20) {
          frameDrops.push(frameDelta);
        }
        lastFrameTime = now;
        frameCount++;

        // Simulate path generation during drag
        const depth = -64 + Math.floor((elapsed / DURATION_MS) * 128);
        generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, depth, 0, false);
        generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, depth, 0, true);

        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    });
  }, [log]);

  // Benchmark: Compare throttled vs unthrottled
  const benchmarkThrottleComparison = useCallback(async (): Promise<BenchmarkResult> => {
    const WIDTH = 340;
    const HEIGHT = 200;
    const PADDING = 8;
    const RESOLUTION = 128;
    const FRAME_COUNT = 60; // 1 second at 60fps

    log('Comparing throttled vs unthrottled performance...');

    // Unthrottled: every frame
    const unthrottledStart = performance.now();
    for (let i = 0; i < FRAME_COUNT; i++) {
      const depth = -64 + Math.floor((i / FRAME_COUNT) * 128);
      generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, depth, 0, false);
      generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, depth, 0, true);
    }
    const unthrottledTime = performance.now() - unthrottledStart;

    // Throttled: every 4th frame (60ms intervals at 60fps)
    const throttledFrames = Math.ceil(FRAME_COUNT / 4);
    const throttledStart = performance.now();
    for (let i = 0; i < throttledFrames; i++) {
      const depth = -64 + Math.floor((i / throttledFrames) * 128);
      generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, depth, 0, false);
      generateWaveformPath('TRI', WIDTH, HEIGHT, RESOLUTION, PADDING, depth, 0, true);
    }
    const throttledTime = performance.now() - throttledStart;

    const savings = ((unthrottledTime - throttledTime) / unthrottledTime * 100);

    return {
      name: 'Throttle Comparison',
      avgMs: throttledTime,
      maxMs: unthrottledTime,
      minMs: throttledTime,
      iterations: FRAME_COUNT,
      passed: savings > 50,
      threshold: 50, // % savings
      details: `Unthrottled: ${unthrottledTime.toFixed(1)}ms, Throttled: ${throttledTime.toFixed(1)}ms (${savings.toFixed(0)}% saved)`,
    };
  }, [log]);

  // Run all benchmarks
  const runAllBenchmarks = useCallback(async () => {
    setIsRunning(true);
    setResults([]);
    log('Starting performance benchmarks...', 'info');

    try {
      // Path generation
      const pathResult = await benchmarkPathGeneration();
      setResults(prev => [...prev, pathResult]);
      log(`Path Generation: ${pathResult.avgMs.toFixed(2)}ms avg (${pathResult.passed ? 'PASS' : 'FAIL'})`,
        pathResult.passed ? 'success' : 'error');

      // Per-waveform
      const waveformResults = await benchmarkAllWaveforms();
      setResults(prev => [...prev, ...waveformResults]);
      waveformResults.forEach(r => {
        log(`  ${r.name}: ${r.avgMs.toFixed(2)}ms (${r.passed ? 'PASS' : 'FAIL'})`,
          r.passed ? 'success' : 'error');
      });

      // Throttle comparison
      const throttleResult = await benchmarkThrottleComparison();
      setResults(prev => [...prev, throttleResult]);
      log(`Throttle Savings: ${throttleResult.details}`,
        throttleResult.passed ? 'success' : 'error');

      // Slider drag simulation (runs async with animation frames)
      const sliderResult = await benchmarkSliderDrag();
      setResults(prev => [...prev, sliderResult]);
      log(`Slider Drag: ${sliderResult.details} (${sliderResult.passed ? 'PASS' : 'FAIL'})`,
        sliderResult.passed ? 'success' : 'error');

      // Summary
      const allResults = [...waveformResults, pathResult, throttleResult, sliderResult];
      const passCount = allResults.filter(r => r.passed).length;
      const totalCount = allResults.length;

      log(`\nBenchmark complete: ${passCount}/${totalCount} passed`, passCount === totalCount ? 'success' : 'error');
    } catch (error) {
      log(`Benchmark error: ${error}`, 'error');
    } finally {
      setIsRunning(false);
    }
  }, [log, benchmarkPathGeneration, benchmarkAllWaveforms, benchmarkThrottleComparison, benchmarkSliderDrag]);

  return {
    logs,
    isRunning,
    results,
    runAllBenchmarks,
    clearLogs,
  };
}
