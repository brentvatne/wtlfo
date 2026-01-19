import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { getDestination } from '@/src/data/destinations';
import type { DestinationId } from '@/src/types/destination';

interface UseModulatedValueProps {
  lfoOutput: SharedValue<number>;  // -1 to +1
  lfoDepth: number;                // -64 to +63
  destinationId: DestinationId;
  centerValue: number;
}

/**
 * Returns a SharedValue<number> with the final modulated destination value.
 * All calculations happen on UI thread in worklet.
 * Returns a single number (not an object) to avoid GC pressure.
 */
export function useModulatedValue({
  lfoOutput,
  lfoDepth,
  destinationId,
  centerValue,
}: UseModulatedValueProps): SharedValue<number> {
  // Extract primitives OUTSIDE the worklet to avoid object access in worklet
  const destination = getDestination(destinationId);
  const min = destination.min;
  const max = destination.max;
  const range = max - min;
  const maxModulation = range / 2;
  const depthScale = lfoDepth / 63; // -1 to +1

  // Return a single number, NOT an object
  return useDerivedValue(() => {
    'worklet';
    const modulationAmount = lfoOutput.value * depthScale * maxModulation;
    const raw = centerValue + modulationAmount;
    return Math.max(min, Math.min(max, raw));
  }, [lfoOutput]);
}

/**
 * Hook that returns modulation metadata (for display purposes).
 * Call this separately from the animation loop.
 */
export function useModulationInfo(
  destinationId: DestinationId,
  centerValue: number,
  lfoDepth: number
) {
  const destination = getDestination(destinationId);
  const range = destination.max - destination.min;
  const maxModulation = range / 2;
  const depthScale = Math.abs(lfoDepth / 63);
  const swing = maxModulation * depthScale;

  return {
    minValue: Math.max(destination.min, centerValue - swing),
    maxValue: Math.min(destination.max, centerValue + swing),
    destination,
  };
}
