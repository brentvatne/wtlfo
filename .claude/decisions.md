# Architectural & Library Decisions

## 2026-01-18

### Expo SDK 54 with New Architecture
**Decision**: Use Expo SDK 54 with `newArchEnabled: true`
**Rationale**: Enables the new React Native architecture (Fabric renderer, TurboModules) for better performance and future compatibility.

### React 19 with React Compiler
**Decision**: Use React 19 with `reactCompiler: true` experiment enabled
**Rationale**: Automatic memoization and optimizations reduce manual `useMemo`/`useCallback` usage while improving performance.

### Expo Router for Navigation
**Decision**: Use Expo Router (file-based routing) instead of plain React Navigation
**Rationale**: Simpler mental model, automatic deep linking, typed routes enabled, and aligns with modern web conventions.

### Stack Navigator as Root
**Decision**: Use Stack navigator at root layout
**Rationale**: Provides flexibility to add screens incrementally. Can be changed to tabs or other navigators as app requirements become clear.
