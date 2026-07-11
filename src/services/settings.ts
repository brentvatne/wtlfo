/**
 * Centralized settings service with batched reads and deferred writes.
 *
 * - All settings are read once at module initialization
 * - Sync access to cached values (no async needed after init)
 * - Writes are deferred to requestIdleCallback to avoid blocking
 */
import { AppState } from 'react-native';
import { Storage } from 'expo-sqlite/kv-store';
import { markStartup } from './startup-timing';

// Storage keys
const KEYS = {
  activePreset: 'activePreset',
  currentConfig: 'currentConfig',
  bpm: 'bpm',
  showFillsWhenEditing: 'showFillsWhenEditing',
  fadeInOnOpen: 'fadeInOnOpen',
  resetLFOOnChange: 'resetLFOOnChange',
  fadeInDuration: 'fadeInDuration',
  editFadeOutDuration: 'editFadeOutDuration',
  editFadeInDuration: 'editFadeInDuration',
  showFadeEnvelope: 'showFadeEnvelope',
  depthAnimationDuration: 'depthAnimationDuration',
  presetSwitchDuration: 'presetSwitchDuration',
  smoothPhaseAnimation: 'smoothPhaseAnimation',
  phaseAnimationDuration: 'phaseAnimationDuration',
  tabSwitchFadeOpacity: 'tabSwitchFadeOpacity',
  // MIDI settings
  midiReceiveTransport: 'midi_receive_transport',
  midiReceiveClock: 'midi_receive_clock',
  midiAutoConnect: 'midi_auto_connect',
  // Modulation settings
  centerValues: 'centerValues',
  routings: 'routings',
} as const;

type SettingsKey = keyof typeof KEYS;

// Default values
export const DEFAULTS = {
  activePreset: 0,
  currentConfig: null as unknown, // Will use preset config
  bpm: 120,
  showFillsWhenEditing: true,
  fadeInOnOpen: true,
  resetLFOOnChange: true,
  fadeInDuration: 675,
  editFadeOutDuration: 0,
  editFadeInDuration: 150,
  showFadeEnvelope: true,
  depthAnimationDuration: 58,
  presetSwitchDuration: 600,
  smoothPhaseAnimation: true,
  phaseAnimationDuration: 16,
  tabSwitchFadeOpacity: 0.7,
  // MIDI
  midiReceiveTransport: true,
  midiReceiveClock: false,
  midiAutoConnect: true,
  // Modulation
  centerValues: {} as Record<string, number>,
  routings: [] as Array<{ lfoId: string; destinationId: string; amount: number }>,
} as const;

// In-memory cache of all settings
const cache: Map<string, string | null> = new Map();

// Pending writes (batched for idle callback)
const pendingWrites: Map<string, string> = new Map();
let writeScheduled = false;

/**
 * Initialize settings cache by reading all keys at once.
 * Called at module load time.
 */
function initCache(): void {
  const keys = Object.values(KEYS);
  for (const key of keys) {
    try {
      cache.set(key, Storage.getItemSync(key));
    } catch {
      cache.set(key, null);
    }
  }
}

/**
 * Schedule pending writes to be flushed during idle time.
 */
function scheduleFlush(): void {
  if (writeScheduled) return;
  writeScheduled = true;

  requestIdleCallback(() => {
    writeScheduled = false;
    const writes = Array.from(pendingWrites.entries());
    pendingWrites.clear();

    for (const [key, value] of writes) {
      try {
        Storage.setItemSync(key, value);
      } catch (e) {
        console.warn(`Failed to persist setting ${key}:`, e);
      }
    }
  });
}

/**
 * Get a string setting.
 */
export function getString(key: SettingsKey): string | null {
  return cache.get(KEYS[key]) ?? null;
}

/**
 * Get a number setting with default.
 */
export function getNumber(key: SettingsKey, defaultValue: number): number {
  const raw = cache.get(KEYS[key]);
  if (raw === null || raw === undefined) return defaultValue;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get a float setting with default.
 */
export function getFloat(key: SettingsKey, defaultValue: number): number {
  const raw = cache.get(KEYS[key]);
  if (raw === null || raw === undefined) return defaultValue;
  const parsed = parseFloat(raw);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get a boolean setting with default.
 */
export function getBoolean(key: SettingsKey, defaultValue: boolean): boolean {
  const raw = cache.get(KEYS[key]);
  if (raw === null || raw === undefined) return defaultValue;
  return raw === 'true';
}

/**
 * Get a JSON setting with default.
 */
export function getJSON<T>(key: SettingsKey, defaultValue: T): T {
  const raw = cache.get(KEYS[key]);
  if (raw === null || raw === undefined) return defaultValue;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Set a string setting. Updates cache immediately, persists in idle time.
 */
export function setString(key: SettingsKey, value: string): void {
  const storageKey = KEYS[key];
  cache.set(storageKey, value);
  pendingWrites.set(storageKey, value);
  scheduleFlush();
}

/**
 * Set a number setting.
 */
export function setNumber(key: SettingsKey, value: number): void {
  setString(key, String(value));
}

/**
 * Set a boolean setting.
 */
export function setBoolean(key: SettingsKey, value: boolean): void {
  setString(key, String(value));
}

/**
 * Set a JSON setting.
 */
export function setJSON(key: SettingsKey, value: unknown): void {
  setString(key, JSON.stringify(value));
}

/**
 * Flush all pending writes immediately (for app shutdown).
 */
export function flushSync(): void {
  const writes = Array.from(pendingWrites.entries());
  pendingWrites.clear();
  writeScheduled = false;

  for (const [key, value] of writes) {
    try {
      Storage.setItemSync(key, value);
    } catch (e) {
      console.warn(`Failed to persist setting ${key}:`, e);
    }
  }
}

// Initialize cache at module load, recording duration for startup diagnostics
const initCacheStart = performance.now();
initCache();
markStartup('startup.settings_cache_init', {
  durationMs: Math.round(performance.now() - initCacheStart),
});

// Flush pending writes when the app leaves the foreground, so idle-deferred
// writes aren't lost if the OS suspends the app before the idle callback runs.
// 'inactive' fires on iOS before 'background'; flushing there too is safe
// (flushSync is a no-op when there are no pending writes).
AppState.addEventListener('change', (state) => {
  if (state === 'background' || state === 'inactive') {
    flushSync();
  }
});
