import { useObserve } from 'expo-observe';
import { useEffect } from 'react';

/**
 * Marks the current route as interactive for EAS Observe per-route TTI.
 * Call once at the top of each screen component. Screens with async
 * blocking work should call useObserve() directly and mark interactive
 * when the work resolves instead.
 */
export function useMarkInteractive(): void {
  const { markInteractive } = useObserve();

  useEffect(() => {
    markInteractive();
  }, [markInteractive]);
}
