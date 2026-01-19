import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors } from '@/src/theme';

interface SlowMotionBadgeProps {
  /** LFO frequency in Hz */
  frequencyHz: number;
  /** Whether badge should be visible */
  visible: boolean;
}

/**
 * Badge overlay showing that the visualization is in slow-motion preview mode.
 * Displays the actual LFO frequency to help users understand what's happening.
 */
export function SlowMotionBadge({ frequencyHz, visible }: SlowMotionBadgeProps) {
  if (!visible) return null;

  // Format frequency for display
  const freqDisplay =
    frequencyHz >= 100
      ? `${Math.round(frequencyHz)} Hz`
      : frequencyHz >= 10
        ? `${frequencyHz.toFixed(1)} Hz`
        : `${frequencyHz.toFixed(2)} Hz`;

  return (
    <Animated.View
      style={styles.container}
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
    >
      <View style={styles.badge}>
        <Text style={styles.frequencyText}>{freqDisplay}</Text>
        <Text style={styles.previewText}>PREVIEW</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  badge: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  frequencyText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  previewText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 1,
  },
});
