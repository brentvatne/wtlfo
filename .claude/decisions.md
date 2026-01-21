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

### Dark Theme UI
**Decision**: Use dark theme throughout (`userInterfaceStyle: "dark"`, `backgroundColor: "#000000"`)
**Rationale**: Matches Elektron hardware aesthetic, reduces eye strain for music production use.

### EAS Updates with appVersion Policy
**Decision**: Use `runtimeVersion.policy: "appVersion"` for EAS Updates
**Rationale**: Native changes (like MIDI module) require new builds. Bump app.json version when native code changes.
