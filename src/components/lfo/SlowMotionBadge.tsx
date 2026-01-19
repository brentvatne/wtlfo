import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors } from '@/src/theme';

interface SlowMotionBadgeProps {
  /** Time-warp factor: >1 = slowdown (e.g., 4 = 1/4 speed), <1 = speedup (e.g., 0.5 = 2x speed) */
  factor: number;
  /** Whether badge should be visible */
  visible: boolean;
}

/**
 * Badge overlay showing that the visualization is in time-warped mode.
 * - For slowdown (factor > 1): displays "1/N SPEED" (e.g., "1/4 SPEED")
 * - For speedup (factor < 1): displays "Nx SPEED" (e.g., "2x SPEED")
 */
export function SlowMotionBadge({ factor, visible }: SlowMotionBadgeProps) {
  if (!visible) return null;

  // Format display based on whether we're speeding up or slowing down
  let speedDisplay: string;
  if (factor >= 1) {
    // Slowdown: factor of 4 means 1/4 speed
    speedDisplay = Number.isInteger(factor)
      ? `1/${factor}`
      : `1/${factor.toFixed(1)}`;
  } else {
    // Speedup: factor of 0.5 means 2x speed
    const multiplier = 1 / factor;
    speedDisplay = Number.isInteger(multiplier)
      ? `${multiplier}x`
      : `${multiplier.toFixed(1)}x`;
  }

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
