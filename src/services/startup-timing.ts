/**
 * Lightweight startup timing marks, flushed to EAS Observe once the home
 * screen is interactive.
 *
 * Marks are cheap synchronous records (no I/O), so they are safe to take
 * during module evaluation — before Observe is configured or any component
 * has mounted. The reference point (t0) is when this module is first
 * evaluated, which happens near the top of the root layout's import graph,
 * so `sinceStartMs` approximates "ms since the JS bundle started executing".
 */
import { Observe } from 'expo-observe';

const t0 = performance.now();

type Attributes = Record<string, string | number | boolean>;

const marks: { name: string; sinceStartMs: number; attributes?: Attributes }[] = [];
let flushed = false;

/** Record a named startup milestone. No-op once marks have been flushed. */
export function markStartup(name: string, attributes?: Attributes): void {
  if (flushed) return;
  marks.push({ name, sinceStartMs: Math.round(performance.now() - t0), attributes });
}

/**
 * Dispatch all recorded marks as Observe events. Call once the app is
 * interactive; later calls are no-ops.
 */
export function flushStartupMarks(): void {
  if (flushed) return;
  flushed = true;
  for (const { name, sinceStartMs, attributes } of marks) {
    Observe.logEvent(name, { attributes: { ...attributes, sinceStartMs } });
  }
  marks.length = 0;
}
