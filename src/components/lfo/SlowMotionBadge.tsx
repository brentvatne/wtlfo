import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors } from '@/src/theme';

interface SlowMotionBadgeProps {
  /** Slowdown factor (e.g., 2.5 for 2.5x slower) */
  factor: number;
  /** Displayed cycle time in milliseconds */
  displayCycleTimeMs: number;
  /** Whether badge should be visible */
  visible: boolean;
}

/**
 * Badge overlay showing that the visualization is in slow-motion preview mode.
 * Displays the slowdown factor and displayed cycle time.
 */
export function SlowMotionBadge({ factor, displayCycleTimeMs, visible }: SlowMotionBadgeProps) {
  if (!visible) return null;

  // Format factor for display (1 decimal for non-integers, none for integers)
  const factorDisplay = Number.isInteger(factor)
    ? `${factor}x`
    : `${factor.toFixed(1)}x`;

  // Format cycle time (whole ms for >= 100ms, otherwise 1 decimal)
  const cycleDisplay = displayCycleTimeMs >= 100
    ? `${Math.round(displayCycleTimeMs)}ms`
    : `${displayCycleTimeMs.toFixed(1)}ms`;

  return (
    <Animated.View
      style={styles.container}
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
    >
      <View style={styles.badge}>
        <View style={styles.topRow}>
          <Text style={styles.factorText}>{factorDisplay}</Text>
          <Text style={styles.previewText}>PREVIEW</Text>
        </View>
        <Text style={styles.cycleText}>{cycleDisplay}</Text>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  factorText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  previewText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cycleText: {
    color: colors.textMuted,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
});
