/**
 * Feature flags.
 */

/**
 * MIDI sync features (device connection, external clock/transport sync).
 *
 * While false: all user-facing MIDI UI is hidden (home header button,
 * Settings > MIDI Sync row, MIDI clock tempo badge) and the runtime never
 * auto-connects or applies external clock/transport. The MIDI plumbing
 * stays alive in dev builds so the hardware verification tools under
 * Settings > Developer Tools keep working.
 */
export const MIDI_FEATURES_ENABLED = false;
