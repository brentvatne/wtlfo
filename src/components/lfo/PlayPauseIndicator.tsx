import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

type PlayPauseAction = 'play' | 'pause' | null;

interface PlayPauseIndicatorProps {
  /** Current action to display - 'play', 'pause', or null */
  action: PlayPauseAction;
  /** Called when animation completes and action should be cleared */
  onAnimationComplete?: () => void;
  /** Size of the icon (default: 48) */
  size?: number;
}

/**
 * Subtle play/pause indicator that briefly appears centered in the visualizer
 * when the user manually pauses or resumes the LFO.
 *
 * Animation pattern (like video players):
 * 1. Quickly fade in with slight scale
 * 2. Hold visible briefly
 * 3. Fade out
 */
export function PlayPauseIndicator({
  action,
  onAnimationComplete,
  size = 48,
}: PlayPauseIndicatorProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (action) {
      // Animate in, hold, then out
      opacity.value = withSequence(
        // Fade in quickly
        withTiming(1, { duration: 100, easing: Easing.out(Easing.ease) }),
        // Hold visible
        withDelay(
          400,
          // Fade out
          withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) }, (finished) => {
            if (finished && onAnimationComplete) {
              runOnJS(onAnimationComplete)();
            }
          })
        )
      );

      scale.value = withSequence(
        // Scale up quickly
        withTiming(1, { duration: 100, easing: Easing.out(Easing.back(1.5)) }),
        // Hold
        withDelay(
          400,
          // Scale down slightly as it fades
          withTiming(0.9, { duration: 300, easing: Easing.in(Easing.ease) })
        )
      );
    } else {
      // Reset immediately when cleared
      opacity.value = 0;
      scale.value = 0.8;
    }
  }, [action, opacity, scale, onAnimationComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!action) return null;

  const symbolName = action === 'pause' ? 'pause.fill' : 'play.fill';

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.iconContainer, animatedStyle]}>
        <SymbolView
          name={symbolName}
          size={size}
          tintColor="rgba(255, 255, 255, 0.85)"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 40,
    padding: 16,
  },
});
