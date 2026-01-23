import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useFrameRate } from '@/src/context/frame-rate-context';

/**
 * Custom hook to measure JS thread frame rate.
 * Returns current fps value when enabled.
 */
function useJsFps(enabled: boolean) {
  const [jsFps, setJsFps] = useState(0);
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const measureFrame = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Keep last 30 frame times for averaging
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 30) {
        frameTimesRef.current.shift();
      }

      // Calculate average fps
      if (frameTimesRef.current.length > 0) {
        const avgDelta = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        const fps = Math.round(1000 / avgDelta);
        setJsFps(fps);
      }

      rafIdRef.current = requestAnimationFrame(measureFrame);
    };

    rafIdRef.current = requestAnimationFrame(measureFrame);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      frameTimesRef.current = [];
    };
  }, [enabled]);

  return jsFps;
}

function getFpsColor(fps: number) {
  if (fps >= 55) return '#4ade80'; // Green
  if (fps >= 45) return '#facc15'; // Yellow
  return '#f87171'; // Red
}

/**
 * Compact frame rate display for navigation header.
 * Tap to disable the overlay.
 */
export function HeaderFrameRate() {
  const { showOverlay, setShowOverlay } = useFrameRate();
  const jsFps = useJsFps(showOverlay);

  if (!showOverlay) {
    return null;
  }

  return (
    <Pressable style={styles.headerContainer} onPress={() => setShowOverlay(false)}>
      <Text style={styles.headerLabel}>JS</Text>
      <Text style={[styles.headerValue, { color: getFpsColor(jsFps) }]}>{jsFps}</Text>
    </Pressable>
  );
}

/**
 * Displays current JS thread frame rate in the bottom right corner.
 * Uses absolute positioning (won't appear above form sheets without native code).
 *
 * UI thread fps would require native module integration.
 * This JS-only implementation allows OTA updates.
 *
 * @deprecated Use HeaderFrameRate instead for better form sheet visibility
 */
export function FrameRateOverlay() {
  const { showOverlay, setShowOverlay } = useFrameRate();
  const jsFps = useJsFps(showOverlay);

  if (!showOverlay) {
    return null;
  }

  return (
    <Pressable style={styles.container} onPress={() => setShowOverlay(false)}>
      <View style={styles.row}>
        <Text style={styles.label}>JS</Text>
        <Text style={[styles.value, { color: getFpsColor(jsFps) }]}>{jsFps}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Header variant styles
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  headerLabel: {
    color: '#888899',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Menlo',
  },
  headerValue: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Menlo',
  },
  // Floating overlay styles (deprecated)
  container: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 8,
    paddingHorizontal: 12,
    minWidth: 60,
    zIndex: 9999,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    color: '#888899',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Menlo',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Menlo',
    minWidth: 28,
    textAlign: 'right',
  },
});
