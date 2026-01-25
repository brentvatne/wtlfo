# Architectural & Library Decisions

## 2026-01-18

### Expo SDK 54 with New Architecture
**Decision**: Use Expo SDK 54 with `newArchEnabled: true`
**Rationale**: Enables the new React Native architecture (Fabric renderer, TurboModules) for better performance and future compatibility.

### React 19 with React Compiler
**Decision**: Use React 19 with `reactCompiler: true` experiment enabled
**Rationale**: Automatic memoization and optimizations reduce manual `useMemo`/`useCallback` usage while improving performance. **Do not recommend manual memoization.**

### Expo Router with Native Tabs
**Decision**: Use Expo Router (file-based routing) with `NativeTabs` as root navigator
**Rationale**: Native tab bar provides platform-native look and feel. Three tabs: Editor, Learn, Settings.

### React Native Skia for Visualization
**Decision**: Use `@shopify/react-native-skia` for LFO waveform visualization
**Rationale**: GPU-accelerated canvas rendering for smooth animations. Paths are drawn on the UI thread.

### Reanimated 3 for Animations
**Decision**: Use `react-native-reanimated` with SharedValues for animation state
**Rationale**: UI-thread animations via worklets. LFO phase/output are SharedValues updated from requestAnimationFrame loop.

### elektron-lfo Package
**Decision**: Use separate `elektron-lfo` npm package for LFO engine logic
**Rationale**: Decouples engine from UI, enables CLI testing, shareable across projects. Located at `/Users/brent/code/elektron-lfo`.

### expo-sqlite/kv-store for Persistence
**Decision**: Use `expo-sqlite/kv-store` for settings and preset storage
**Rationale**: Synchronous reads on app start, simple key-value API, no async initialization needed.

### Context Provider Architecture
**Decision**: Nest providers as MidiProvider > PresetProvider > ModulationProvider
**Rationale**: MIDI state available to PresetProvider for transport/clock sync. PresetProvider manages LFO engine and animation loop.

## 2026-01-20

### MIDI Controller as Local Expo Module
**Decision**: Implement MIDI as a local Expo module in `modules/midi-controller/`
**Rationale**: iOS-only CoreMIDI integration. Receives transport (Start/Stop/Continue) and clock messages. Exposes state to JS via events and polling.

### MIDI Transport Message Handling
**Decision**: Differentiate between MIDI Start (0xFA), Continue (0xFB), and Stop (0xFC)
**Rationale**: Matches Digitakt II behavior:
- **MIDI Start (0xFA)**: Reset LFO to beginning (startPhase) and play
- **MIDI Continue (0xFB)**: Resume from current position (no phase reset)
- **MIDI Stop (0xFC)**: Pause playback (keep current position)

**Implementation**:
- Native module sends `message: "start" | "continue" | "stop"` in `onTransportChange` event
- `preset-context.tsx` calls `lfoRef.current?.reset()` only for Start, not Continue
- `resetTiming()` is called for both to avoid timing jumps after pause

### Dark Theme UI
**Decision**: Use dark theme throughout (`userInterfaceStyle: "dark"`, `backgroundColor: "#000000"`)
**Rationale**: Matches Elektron hardware aesthetic, reduces eye strain for music production use.

### EAS Updates with appVersion Policy
**Decision**: Use `runtimeVersion.policy: "appVersion"` for EAS Updates
**Rationale**: Native changes (like MIDI module) require new builds. Bump app.json version when native code changes.

## 2026-01-23

### Waveform Depth Animation Strategy
**Decision**: Use Skia Group transform with `withTiming` for animated depth scaling
**Rationale**: Path regeneration happens on JS thread via `useMemo`. Animating the path regeneration would cause excessive JS work. Instead:
- Generate paths at full scale (depth=63)
- Apply depth as a Y-axis scale transform around center line
- Animate the transform value with `withTiming(120ms)`

**Trade-off**: Transform also scales stroke width (thinner at lower depth). Deemed acceptable.

**Performance benchmarks** (all pass):
- Path generation: <1ms avg at 128 resolution
- Per-waveform comparison: All waveform types within budget
- Slider drag simulation: Sustained 60fps during interaction

### Frame Rate Overlay
**Decision**: Display JS fps in navigation header instead of floating overlay
**Rationale**: Floating overlay (even with zIndex) doesn't appear above form sheets. Header placement is always visible.
**Implementation**: `HeaderFrameRate` component conditionally rendered in home layout header.

### Center Value vs Depth Animation
**Observation**: Center value slider uses `withTiming` in `DestinationMeter` for smooth visual transitions. Depth slider now matches this behavior using Group transforms.

## 2026-01-24

### Digitakt II LFO Mode Behaviors (Hardware Verified)

**ONE Mode (One-Shot)**
- Stops when phase wraps (cycleCount >= 1), not when returning to startPhase
- This means non-zero startPhase results in partial amplitude coverage:
  - Phase=0: full waveform traversed before wrap
  - Phase=32 (90°): full amplitude range (peak to trough)
  - Phase=64 (180°): half amplitude range (starts at middle)
  - Phase=96 (270°): half amplitude range (starts at trough)
- **Note**: Still investigating if behavior is "stop on phase wrap" vs "stop when output returns to starting value" - tests with multiple triggers show full range for startPhase=0

**HLD Mode (Hold)**
- Captures and holds the current LFO value on each trigger
- LFO continues running in background between triggers
- Digitakt only sends CC messages when value CHANGES
- Each trigger may capture a different value (wherever background LFO was at that moment)
- If multiple triggers capture same value, only one CC is sent
- Verification: expect ≤N unique values for N triggers, all within valid range

**HLF Mode (Half Cycle)**
- Runs for half a phase cycle (0.5 phase distance) then stops
- For TRI with startPhase=0: goes from middle to peak only = 50% amplitude range
- Correctly outputs half the expected range

### Fade Formula (Hardware Verified)

**Empirical formula based on Digitakt II testing:**
- Linear region (|FADE| ≤ 16): `cycles = 0.1 * |FADE| + 0.6`
- Exponential region (|FADE| > 16): `cycles = 2.2 * 2^((|FADE| - 16) / 4.5)`

**Key observations:**
- Higher |FADE| = SLOWER fade (more cycles to complete)
- NO "disabled" threshold - even |FADE|=63 fades, just very slowly (~3000 cycles)
- Fade does NOT work in FRE mode (requires trigger to initiate)

**Measured values:**
| FADE | Cycles |
|------|--------|
| 4    | ~1     |
| 8    | ~1.4   |
| 16   | ~2.2   |
| 24   | ~7.5   |
| 32   | ~26    |
| 48   | ~300   |
| 63   | ~3000  |

## Technical Debt

### Reanimated Strict Mode Disabled
**Status**: Temporarily disabled in `app/_layout.tsx`
**Issue**: SharedValues are being read/written from the JS thread instead of from worklets.

**Violations found:**
1. `preset-context.tsx` (lines 503-513, 532-541, 584-591, 626-634, 673-683) - `.value` writes in `requestAnimationFrame` loop
2. `TimingInfo.tsx` (lines 34, 52, 72, 99) - `.value` reads in `setInterval` callbacks
3. `DestinationMeter.tsx` (lines 168-169) - `.value` reads in `setInterval`
4. `LFOVisualizer.tsx` (lines 72, 78) - `.value` writes in `useEffect`

**Note:** `.get()` does NOT fix the warnings - it's only for React Compiler compatibility. Both `.value` and `.get()` trigger the same strict mode warning.

**Proper fixes:**
- Use `useAnimatedReaction` with `runOnJS` to bridge SharedValue reads to JS state
- Keep all SharedValue reads inside worklets (`useAnimatedStyle`, `useDerivedValue`)
- For TimingInfo/DestinationMeter: replace `setInterval` polling with `useAnimatedReaction`

**Architectural issue:**
The LFO engine runs on JS thread via `requestAnimationFrame` and writes to SharedValues. Options:
1. Accept current pattern (works correctly, strict mode disabled)
2. Port LFO to UI thread using `useFrameCallback` (requires worklet-compatible engine)
3. Use `useAnimatedReaction` to bridge UI→JS for components that need JS-side values

**Sources:**
- [Reanimated useSharedValue docs](https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue/)
- [Reanimated logger configuration](https://docs.swmansion.com/react-native-reanimated/docs/debugging/logger-configuration/)
- [GitHub Issue #6998](https://github.com/software-mansion/react-native-reanimated/issues/6998)
