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
  // Track frames to detect discontinuities on first frame after changes
  const frameCount = useSharedValue(0);

  // Reset tracking when factor changes significantly
  useEffect(() => {
    const oldFactor = factorValue.value;
    factorValue.value = slowdownFactor;

    // If transitioning to/from slow motion, sync phases to prevent stale values
    if ((oldFactor === 1 && slowdownFactor > 1) || (oldFactor > 1 && slowdownFactor === 1)) {
      displayPhase.value = realPhase.value;
      lastRealPhase.value = realPhase.value;
      frameCount.value = 0;
    }
  }, [slowdownFactor, factorValue, displayPhase, realPhase, lastRealPhase, frameCount]);

  // Track phase changes and accumulate slowed delta
  useAnimatedReaction(
    () => realPhase.value,
    (currentPhase) => {
      'worklet';
      const previousPhase = lastRealPhase.value;
      frameCount.value++;

      // Calculate raw phase delta
      let phaseDelta = currentPhase - previousPhase;

      // Detect discontinuities: first frame after changes or unreasonably large delta
      // indicates a retrigger/reset rather than normal phase progression
      const isDiscontinuity = frameCount.value <= 1 || Math.abs(phaseDelta) > 0.9;

      if (isDiscontinuity) {
        // Reset to real phase on discontinuity
        displayPhase.value = currentPhase;
        lastRealPhase.value = currentPhase;
        return;
      }

      // Detect phase resets (LFO retriggered or preset changed)
      // A normal frame delta should be small (< 0.1 for most LFO speeds at 60fps)
      // If the absolute delta is large but not near ±1 (wrap-around), it's a reset
      const absRawDelta = Math.abs(phaseDelta);
      const isLikelyReset = absRawDelta > 0.3 && absRawDelta < 0.7;

      if (isLikelyReset) {
        // Phase was reset - sync display phase immediately
        displayPhase.value = currentPhase;
        lastRealPhase.value = currentPhase;
        return;
      }

      // Handle wrap-around: if delta is large negative, phase wrapped forward
      // (e.g., 0.95 -> 0.05 = actual delta of 0.1, not -0.9)
      if (phaseDelta < -0.5) {
        phaseDelta += 1;
      }
      // If delta is large positive, phase wrapped backward (unusual, but handle it)
      else if (phaseDelta > 0.5) {
        phaseDelta -= 1;
      }

      // Secondary sanity check: if delta is still too large after adjustment,
      // treat as discontinuity (e.g., multiple cycles skipped due to frame drops)
      if (Math.abs(phaseDelta) > 0.5) {
        displayPhase.value = currentPhase;
        lastRealPhase.value = currentPhase;
        return;
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
