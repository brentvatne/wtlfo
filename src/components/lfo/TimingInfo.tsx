import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import type { TimingInfoProps } from './types';

export function TimingInfo({ bpm, cycleTimeMs, noteValue, steps, theme }: TimingInfoProps) {
  const [isPulsing, setIsPulsing] = useState(false);
  const bpmOpacity = useSharedValue(1);

  // Format steps - show decimal only if not a whole number
  const formatSteps = (s: number): string => {
    if (Number.isInteger(s)) return String(s);
    return s.toFixed(1);
  };

  // Handle BPM tap to toggle pulsing
  const handleBpmPress = useCallback(() => {
    setIsPulsing(prev => !prev);
  }, []);

  // Start/stop pulsing animation based on state and BPM
  useEffect(() => {
    if (isPulsing && bpm) {
      // Calculate timing for one beat (ms per beat)
      const beatDuration = 60000 / bpm;
      // Fade down takes half a beat, fade up takes half a beat
      const halfBeat = beatDuration / 2;

      bpmOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: halfBeat, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: halfBeat, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // Repeat forever
        false // Don't reverse
      );
    } else {
      // Stop pulsing and reset to full opacity
      cancelAnimation(bpmOpacity);
      bpmOpacity.value = withTiming(1, { duration: 150 });
    }
  }, [isPulsing, bpm, bpmOpacity]);

  // Animated style for BPM text
  const bpmAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bpmOpacity.value,
  }));

  return (
    <View style={[styles.container, { borderTopColor: theme.gridLines + '20' }]}>
      {bpm !== undefined && (
        <Pressable onPress={handleBpmPress} style={styles.item}>
          <Animated.Text style={[styles.value, { color: theme.text }, bpmAnimatedStyle]}>
            {bpm}
          </Animated.Text>
          <Animated.Text style={[styles.label, { color: theme.textSecondary }, bpmAnimatedStyle]}>
            BPM
          </Animated.Text>
        </Pressable>
      )}

      {cycleTimeMs !== undefined && (
        <View style={styles.item}>
          <Text style={[styles.value, { color: theme.text }]}>
            {cycleTimeMs >= 1000
              ? `${(cycleTimeMs / 1000).toFixed(2)}s`
              : `${cycleTimeMs.toFixed(0)}ms`}
          </Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>CYCLE</Text>
        </View>
      )}

      {noteValue && (
        <View style={styles.item}>
          <Text style={[styles.value, { color: theme.text }]}>{noteValue}</Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>NOTE</Text>
        </View>
      )}

      {steps !== undefined && steps > 0 && (
        <View style={styles.item}>
          <Text style={[styles.value, { color: theme.text }]}>{formatSteps(steps)}</Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>STEPS</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  item: {
    alignItems: 'center',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
