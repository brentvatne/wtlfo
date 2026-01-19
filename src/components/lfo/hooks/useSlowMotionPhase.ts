import { useEffect } from 'react';
import { useSharedValue, useAnimatedReaction } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

/**
 * Hook to create a slowed-down display phase from the real LFO phase.
 *
 * Instead of dividing phase (which limits range to 0-1/factor), this hook
 * tracks phase deltas and accumulates them at a slower rate. This ensures
 * the display phase still completes full 0-1 cycles, just slower.
 *
 * @param realPhase - The actual LFO phase (0-1) SharedValue
 * @param slowdownFactor - Factor to slow down (1 = normal, 2 = half speed, etc.)
 * @returns A SharedValue containing the slowed display phase (0-1)
 */
export function useSlowMotionPhase(
  realPhase: SharedValue<number>,
  slowdownFactor: number
): SharedValue<number> {
  const displayPhase = useSharedValue(realPhase.value);
  const lastRealPhase = useSharedValue(realPhase.value);
  const factorValue = useSharedValue(slowdownFactor);

  // Update factor when it changes
  useEffect(() => {
    factorValue.value = slowdownFactor;
  }, [slowdownFactor, factorValue]);

  // Track phase changes and accumulate slowed delta
  useAnimatedReaction(
    () => realPhase.value,
    (currentPhase) => {
      'worklet';
      const previousPhase = lastRealPhase.value;

      // Calculate phase delta, handling wrap-around
      let phaseDelta = currentPhase - previousPhase;

      // Handle wrap-around: if delta is large negative, phase wrapped forward
      // (e.g., 0.95 -> 0.05 = actual delta of 0.1, not -0.9)
      if (phaseDelta < -0.5) {
        phaseDelta += 1;
      }
      // If delta is large positive, phase wrapped backward (unusual, but handle it)
      else if (phaseDelta > 0.5) {
        phaseDelta -= 1;
      }

      // Accumulate slowed delta
      const slowedDelta = phaseDelta / factorValue.value;
      let newDisplayPhase = displayPhase.value + slowedDelta;

      // Keep in 0-1 range
      newDisplayPhase = ((newDisplayPhase % 1) + 1) % 1;

      displayPhase.value = newDisplayPhase;
      lastRealPhase.value = currentPhase;
    },
    [realPhase]
  );

  return displayPhase;
}

/**
 * Reset the display phase to sync with real phase.
 * Useful when LFO is retriggered or mode changes.
 */
export function useSyncDisplayPhase(
  displayPhase: SharedValue<number>,
  realPhase: SharedValue<number>,
  shouldSync: boolean
): void {
  useEffect(() => {
    if (shouldSync) {
      displayPhase.value = realPhase.value;
    }
  }, [shouldSync, displayPhase, realPhase]);
}
