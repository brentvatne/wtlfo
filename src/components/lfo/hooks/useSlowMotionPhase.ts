import { useEffect, useRef } from 'react';
import { useSharedValue, useAnimatedReaction } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

/**
 * Hook to create a slowed-down display phase from the real LFO phase.
 *
 * Instead of dividing phase (which limits range to 0-1/factor), this hook
 * tracks phase deltas and accumulates them at a slower rate. This ensures
 * the display phase still completes full 0-1 cycles, just slower.
 *
 * Fixed issues:
 * 1. Reset on ANY factor change (not just 1↔>1 transitions)
 * 2. Adaptive discontinuity thresholds based on slowdown factor
 * 3. Periodic drift correction to prevent accumulated floating-point errors
 * 4. Extended frame detection window for post-change stability
 * 5. Improved wrap-around detection with expected delta estimation
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
  // Track frames to detect discontinuities after changes
  const frameCount = useSharedValue(0);
  // Track accumulated real phase for drift correction
  const realCycleCount = useSharedValue(0);
  const displayCycleCount = useSharedValue(0);
  // Track previous factor to detect changes
  const prevFactorRef = useRef(slowdownFactor);

  // Reset tracking when factor changes (ANY change, not just threshold crossings)
  useEffect(() => {
    const oldFactor = prevFactorRef.current;
    const factorChanged = Math.abs(oldFactor - slowdownFactor) > 0.01;

    factorValue.value = slowdownFactor;
    prevFactorRef.current = slowdownFactor;

    // Reset on any significant factor change to prevent phase jumps
    if (factorChanged) {
      displayPhase.value = realPhase.value;
      lastRealPhase.value = realPhase.value;
      frameCount.value = 0;
      realCycleCount.value = 0;
      displayCycleCount.value = 0;
    }
  }, [slowdownFactor, factorValue, displayPhase, realPhase, lastRealPhase, frameCount, realCycleCount, displayCycleCount]);

  // Track phase changes and accumulate slowed delta
  useAnimatedReaction(
    () => realPhase.value,
    (currentPhase) => {
      'worklet';
      const previousPhase = lastRealPhase.value;
      const factor = factorValue.value;
      frameCount.value++;

      // Calculate raw phase delta
      let phaseDelta = currentPhase - previousPhase;

      // Adaptive threshold based on slowdown factor
      // At high factors, expected deltas are smaller, so threshold should be tighter
      // Base threshold: 0.15 at factor 1, scaling down to 0.05 at factor 10+
      const adaptiveThreshold = Math.max(0.05, 0.15 / Math.sqrt(factor));

      // Extended frame detection window (10 frames after changes for stability)
      const isEarlyFrame = frameCount.value <= 10;

      // EARLY SANITY CHECK: Detect unreasonable deltas BEFORE wrap-around logic
      // This prevents wrap-around correction from misinterpreting timing glitches
      const absRawDelta = Math.abs(phaseDelta);

      // Detect obvious discontinuities (resets, retriggering)
      // Large delta that's not near 0 or 1 indicates a phase jump
      const isDiscontinuity =
        frameCount.value <= 1 ||
        (absRawDelta > 0.2 && absRawDelta < 0.8);

      if (isDiscontinuity) {
        // Reset to real phase on discontinuity
        displayPhase.value = currentPhase;
        lastRealPhase.value = currentPhase;
        realCycleCount.value = 0;
        displayCycleCount.value = 0;
        return;
      }

      // Handle wrap-around detection with better logic
      // Only consider wrap-around if delta is close to ±1 (within 0.2)
      let wrappedForward = false;
      let wrappedBackward = false;

      if (phaseDelta < -0.8) {
        // Very likely wrapped forward (0.95 -> 0.05)
        phaseDelta += 1;
        wrappedForward = true;
      } else if (phaseDelta > 0.8) {
        // Very likely wrapped backward (0.05 -> 0.95)
        phaseDelta -= 1;
        wrappedBackward = true;
      } else if (absRawDelta > adaptiveThreshold * 2 && isEarlyFrame) {
        // Ambiguous delta during early frames - sync to real phase
        displayPhase.value = currentPhase;
        lastRealPhase.value = currentPhase;
        return;
      }

      // Final sanity check: delta should now be small
      if (Math.abs(phaseDelta) > 0.3) {
        // Something went wrong - sync to real phase
        displayPhase.value = currentPhase;
        lastRealPhase.value = currentPhase;
        realCycleCount.value = 0;
        displayCycleCount.value = 0;
        return;
      }

      // Track real cycles for drift correction
      if (wrappedForward) {
        realCycleCount.value++;
      } else if (wrappedBackward) {
        realCycleCount.value--;
      }

      // Accumulate slowed delta
      const slowedDelta = phaseDelta / factor;
      let newDisplayPhase = displayPhase.value + slowedDelta;

      // Track display cycles
      if (newDisplayPhase >= 1) {
        displayCycleCount.value++;
        newDisplayPhase -= 1;
      } else if (newDisplayPhase < 0) {
        displayCycleCount.value--;
        newDisplayPhase += 1;
      }

      // Periodic drift correction every ~60 frames (1 second at 60fps)
      // Ensures accumulated floating-point errors don't compound
      if (frameCount.value % 60 === 0 && factor > 1) {
        // Calculate expected display phase based on real cycles
        // display_cycles = real_cycles / factor
        const expectedDisplayCycles = realCycleCount.value / factor;
        const expectedDisplayPhase = (realPhase.value / factor) % 1;

        // If drift is significant (> 0.02), apply small correction
        const drift = newDisplayPhase - expectedDisplayPhase;
        if (Math.abs(drift) > 0.02 && Math.abs(drift) < 0.5) {
          // Gradual correction: move 10% toward expected
          newDisplayPhase -= drift * 0.1;
        }
      }

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
