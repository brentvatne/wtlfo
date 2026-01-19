import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors } from '@/src/theme';

interface SlowMotionBadgeProps {
  /** Slowdown factor (e.g., 4 means 1/4 speed) */
  factor: number;
  /** Whether badge should be visible */
  visible: boolean;
}

/**
 * Badge overlay showing that the visualization is in slow-motion preview mode.
 * Displays the speed as a fraction (e.g., "1/4 SPEED") to clearly indicate slowing.
 */
export function SlowMotionBadge({ factor, visible }: SlowMotionBadgeProps) {
  if (!visible) return null;

  // Format as fraction: factor of 4 means 1/4 speed
  // For clean fractions (2, 4, 5, 8, 10), show as "1/N"
  // For others, show decimal like "1/2.5"
  const speedDisplay = Number.isInteger(factor)
    ? `1/${factor}`
    : `1/${factor.toFixed(1)}`;

  return (
    <Animated.View
      style={styles.container}
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
    >
      <View style={styles.badge}>
        <Text style={styles.speedText}>{speedDisplay} SPEED</Text>
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
    paddingVertical: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  speedText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
});
