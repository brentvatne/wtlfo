/**
 * Lightweight startup timing marks, logged to EAS Observe as they happen.
 *
 * `Observe.logEvent` timestamps and persists each event on-device
 * immediately; recording does not depend on `Observe.configure`, which only
 * controls dispatch. That makes it safe to call during module evaluation,
 * before any component has mounted. The reference point (t0) is when this
 * module is first evaluated, which happens near the top of the root layout's
 * import graph, so `sinceStartMs` approximates "ms since the JS bundle
 * started executing".
 */
import { Observe } from 'expo-observe';

const t0 = performance.now();

type Attributes = Record<string, string | number | boolean>;

/** Log a named startup milestone. */
export function markStartup(name: string, attributes?: Attributes): void {
  Observe.logEvent(name, {
    attributes: { ...attributes, sinceStartMs: Math.round(performance.now() - t0) },
  });
}
