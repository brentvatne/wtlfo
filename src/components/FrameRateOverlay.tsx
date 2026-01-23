import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { useFrameRate } from '@/src/context/frame-rate-context';

/**
 * Displays current JS thread frame rate in the bottom right corner.
 * Uses a transparent Modal to ensure it appears above form sheets.
 *
 * UI thread fps would require native module integration.
 * This JS-only implementation allows OTA updates.
 */
export function FrameRateOverlay() {
  const { showOverlay, setShowOverlay } = useFrameRate();
  const [jsFps, setJsFps] = useState(0);
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number>(0);

  useEffect(() => {
    if (!showOverlay) {
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
  }, [showOverlay]);

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return '#4ade80'; // Green
    if (fps >= 45) return '#facc15'; // Yellow
    return '#f87171'; // Red
  };

  return (
    <Modal
      visible={showOverlay}
      transparent
      animationType="none"
      statusBarTranslucent
      pointerEvents="box-none"
    >
      <View style={styles.modalContainer} pointerEvents="box-none">
        <Pressable style={styles.container} onPress={() => setShowOverlay(false)}>
          <View style={styles.row}>
            <Text style={styles.label}>JS</Text>
            <Text style={[styles.value, { color: getFpsColor(jsFps) }]}>{jsFps}</Text>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingBottom: 100,
    paddingRight: 16,
  },
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 8,
    paddingHorizontal: 12,
    minWidth: 60,
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
