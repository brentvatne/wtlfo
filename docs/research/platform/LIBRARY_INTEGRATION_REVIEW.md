# Library Integration Review

This document reviews how external libraries are integrated into this React Native/Expo application, identifying issues, best practices, and recommendations.

---

## 1. elektron-lfo Library Integration

### Current Usage

The `elektron-lfo` library (v1.0.1) is used as the core LFO engine. Key integration points:

**Files using elektron-lfo:**
- `/Users/brent/wtlfo/src/context/preset-context.tsx` - Main LFO engine management
- `/Users/brent/wtlfo/app/(learn)/presets.tsx` - Preset preview animations
- `/Users/brent/wtlfo/app/(learn)/waveforms.tsx` - Waveform preview animations
- `/Users/brent/wtlfo/src/data/presets.ts` - Type imports

### Findings

#### GOOD: Correct API Usage

1. **LFO Construction**: Properly passes config and BPM to constructor:
   ```typescript
   lfoRef.current = new LFO(debouncedConfig, bpm);
   ```

2. **Method Calls**: Correctly uses `trigger()`, `start()`, `stop()`, `isRunning()`, and `update(timestamp)`:
   ```typescript
   const state = lfoRef.current.update(timestamp);
   lfoPhase.value = state.phase;
   lfoOutput.value = state.output;
   ```

3. **Timing Info**: Properly retrieves timing information:
   ```typescript
   const info = lfoRef.current.getTimingInfo();
   ```

4. **Type Imports**: Types (`Waveform`, `TriggerMode`, `Multiplier`) are correctly imported and used.

#### ISSUE: Manual Waveform Re-implementation

**Severity: Medium**

The app re-implements waveform sampling in `/Users/brent/wtlfo/src/components/lfo/worklets.ts` instead of using the library's internal waveform generation. This creates **potential behavioral drift** between what the LFO engine produces and what the visualization displays.

```typescript
// worklets.ts - Manual reimplementation
export function sampleWaveformWorklet(waveform: WaveformType, phase: number): number {
  'worklet';
  switch (waveform) {
    case 'TRI':
      if (phase < 0.25) return phase * 4;
      // ... custom implementation
  }
}
```

**Why this exists:** The visualization needs to run waveform sampling inside Reanimated worklets (on the UI thread), and the elektron-lfo library likely doesn't export worklet-compatible sampling functions.

**Recommendation:**
1. If elektron-lfo is a first-party package, consider exporting worklet-compatible waveform functions
2. Add tests that verify the worklet implementation matches the library's output
3. Document the intentional duplication and ensure parity when updating the library

#### ISSUE: Unverified Depth Scaling Behavior

**Severity: Medium**

Multiple review documents mention uncertainty about whether elektron-lfo's `output` value is pre-scaled by depth or not. This is seen in:
- `/Users/brent/wtlfo/ANALYSIS_FINDINGS.md`
- `/Users/brent/wtlfo/BEHAVIORAL_AUDIT.md`

The code in `DestinationMeter.tsx` comments suggest it IS depth-scaled:
```typescript
// Note: lfoOutput is already depth-scaled by the LFO engine (range: -depth/63 to +depth/63)
```

**Recommendation:**
1. Verify this assumption with elektron-lfo documentation or source code
2. Add integration tests that verify the expected output range

#### GOOD: Trigger Mode Handling

The app correctly handles trigger modes that need explicit triggering:
```typescript
if (debouncedConfig.mode === 'TRG' || debouncedConfig.mode === 'ONE' || debouncedConfig.mode === 'HLF') {
  lfoRef.current.trigger();
}
```

---

## 2. React Native Reanimated Integration

### Version Analysis

**Current Version:** `~4.1.1`

**Status: CURRENT** - Reanimated 4.x is the latest major version as of 2025, supporting React Native's New Architecture.

### Findings

#### GOOD: Modern API Usage

1. **No deprecated APIs found**. The codebase uses current Reanimated 3/4 patterns:
   - `useSharedValue()` - correctly used
   - `useDerivedValue()` - correctly used with worklet functions
   - `useAnimatedReaction()` - correctly used for JS bridge callbacks
   - `withTiming()`, `withSpring()` - correctly used for animations

2. **Proper worklet declarations**: All worklet functions include the `'worklet';` directive:
   ```typescript
   const xPosition = useDerivedValue(() => {
     'worklet';
     const phaseVal = typeof phase === 'number' ? phase : phase.value;
     // ...
   }, [phase, padding, drawWidth, startPhaseNormalized]);
   ```

3. **Correct runOnJS usage**: When bridging from UI thread to JS thread:
   ```typescript
   useAnimatedReaction(
     () => output.value,
     (currentValue) => {
       runOnJS(updateDisplay)(currentValue);
     },
     [output]
   );
   ```

#### GOOD: Dependency Arrays

Derived values properly list their dependencies:
```typescript
const meterFillHeight = useDerivedValue(() => {
  'worklet';
  // ...
}, [maxModulation, min, max, range, height]);
```

#### POTENTIAL ISSUE: SharedValue Type Handling

**Severity: Low**

In several places, the code handles both static numbers and SharedValues:
```typescript
const phaseVal = typeof phase === 'number' ? phase : phase.value;
```

This is a valid pattern but creates runtime type checking overhead in worklets. Consider using consistent types throughout.

**In `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx`:**
```typescript
// Internal shared values created for prop flexibility
const internalPhase = useSharedValue(typeof phase === 'number' ? phase : 0);
const internalOutput = useSharedValue(typeof output === 'number' ? output : 0);
```

This is correctly handled - hooks are called unconditionally to satisfy Rules of Hooks.

#### CONFIGURATION NOTE: Babel Plugin

The project uses Expo SDK 54 which includes Reanimated babel configuration automatically. No manual `babel.config.js` is needed (file doesn't exist, which is correct for Expo SDK 54+).

#### GOOD: No Deprecated Patterns

- No `useAnimatedGestureHandler` (deprecated in Reanimated 3)
- No `withDecay`, `withRepeat` misuse
- No v1/v2 API patterns (`Animated.Value`, etc.)

---

## 3. React Native Skia Integration

### Version Analysis

**Current Version:** `2.2.12`

**Status: CURRENT** - This is a recent stable version of @shopify/react-native-skia.

### Findings

#### GOOD: Correct Declarative API Usage

The app correctly uses Skia's React components:

```typescript
import { Canvas, Group, Line, Circle, Path, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
```

1. **Canvas wrapping**: All Skia elements are properly wrapped in `<Canvas>`:
   ```typescript
   <Canvas style={{ width, height: canvasHeight }} pointerEvents="none">
     <Group>
       <GridLines ... />
       <WaveformDisplay ... />
     </Group>
   </Canvas>
   ```

2. **Path generation**: Using `Skia.Path.Make()` correctly with `useMemo`:
   ```typescript
   const path = useMemo(() => {
     const p = Skia.Path.Make();
     // ... path operations
     return p;
   }, [dependencies]);
   ```

3. **Animated values integration**: Correctly using Reanimated's `useDerivedValue` with Skia's animated props:
   ```typescript
   const p1 = useDerivedValue(() => {
     'worklet';
     return vec(xPosition.value, padding);
   }, [xPosition]);

   <Line p1={p1} p2={p2} ... />
   ```

#### GOOD: Performance Patterns

1. **Memoized paths**: Complex paths are memoized to avoid recreation:
   ```typescript
   // useWaveformPath.ts
   return useMemo(() => {
     const path = Skia.Path.Make();
     // ... complex path generation
     return path;
   }, [waveform, width, height, resolution, padding, depth, startPhase, closePath]);
   ```

2. **Static elements properly separated**: Grid lines, backgrounds, and other static elements are separate from animated elements.

3. **pointerEvents="none"**: Canvas correctly disabled for pointer events when not needed:
   ```typescript
   <Canvas style={{ width, height: canvasHeight }} pointerEvents="none">
   ```

#### POTENTIAL ISSUE: Path Recreation on Every Render for RandomWaveform

**Severity: Low**

In `RandomWaveform.tsx`, the path is created in `useMemo` with `samples` as a dependency. If samples change frequently, this could cause performance issues.

**Current code is acceptable** because:
- Random samples don't change frame-by-frame
- `useMemo` prevents unnecessary recalculation

#### GOOD: Correct Skia-Reanimated Integration

The PhaseIndicator and DestinationMeter components correctly combine Skia with Reanimated:
- `useDerivedValue` creates animated values
- Skia components receive these animated values as props
- The rendering is smooth and hardware-accelerated

---

## 4. Expo Modules Integration

### Version Analysis

**Expo SDK:** `~54.0.31`
**React Native:** `0.81.5`
**New Architecture:** Enabled (`"newArchEnabled": true`)

### Findings

#### GOOD: Proper Configuration

1. **app.json configuration** is correct:
   ```json
   {
     "expo": {
       "newArchEnabled": true,
       "experiments": {
         "typedRoutes": true,
         "reactCompiler": true
       }
     }
   }
   ```

2. **React Compiler enabled**: Using experimental React Compiler for better performance.

#### GOOD: Expo Module Usage

**expo-sqlite/kv-store:**
```typescript
import { Storage } from 'expo-sqlite/kv-store';

// Synchronous storage - correct for initial state
const saved = Storage.getItemSync(STORAGE_KEY);
Storage.setItemSync(STORAGE_KEY, String(index));
```
This is the recommended pattern for synchronous key-value storage.

**expo-haptics:**
Listed in dependencies - appropriate for tactile feedback.

**expo-router:**
Properly configured as the main entry point:
```json
"main": "expo-router/entry"
```

#### NOTE: Plugin Configuration

```json
"plugins": [
  "expo-router",
  ["expo-splash-screen", { ... }],
  "expo-sqlite"
]
```

All necessary plugins are configured.

#### RECOMMENDATION: Consider expo-constants for Build Info

If the app needs build version or other constants, consider using expo-constants (already installed).

---

## 5. Other Dependencies Review

### react-native-gesture-handler (~2.28.0)

**Status: OK**

Not heavily used in the reviewed files, but version is compatible with RN 0.81 and New Architecture.

### react-native-worklets (0.5.1)

**Status: UNUSED / POTENTIAL ISSUE**

This package is listed in dependencies but no imports are found in the source code. It may be:
1. A transitive dependency requirement for Reanimated
2. Accidentally left in from experimentation

**Recommendation:** Verify if this is actually needed. If not, remove to reduce bundle size.

### @react-native-community/slider (~5.1.2)

**Status: OK**

Properly excluded from Expo's install management:
```json
"expo": {
  "install": {
    "exclude": ["@react-native-community/slider"]
  }
}
```

This is correct when using a specific version that differs from Expo's recommended.

### @shopify/react-native-skia (2.2.12)

**See Section 3 above** - properly integrated.

### react-native-screens (~4.16.0) / react-native-safe-area-context (~5.6.0)

**Status: OK**

Standard navigation dependencies, versions compatible with expo-router.

---

## 6. Version Compatibility Analysis

### Compatibility Matrix

| Library | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| expo | ~54.0.31 | RN 0.81.x | OK |
| react-native | 0.81.5 | Expo 54 | OK |
| react | 19.1.0 | RN 0.81+ | OK - React 19 support |
| react-native-reanimated | ~4.1.1 | Expo 54, RN 0.81 | OK |
| @shopify/react-native-skia | 2.2.12 | RN 0.81, Reanimated 4 | OK |
| elektron-lfo | 1.0.1 | N/A | First-party package |

### React 19 Usage

**GOOD:** The codebase correctly uses React 19 features:

1. **`React.use()` for context:**
   ```typescript
   const context = React.use(PresetContext);
   ```
   This is the React 19 replacement for `useContext()`.

2. **Context Provider value prop:**
   ```typescript
   <PresetContext value={value}>
   ```
   React 19 changed from `<Context.Provider value={}>` to `<Context value={}>`.

### Potential Compatibility Issues

#### NONE IDENTIFIED

All library versions are compatible with each other and with the React Native New Architecture.

---

## 7. Summary of Recommendations

### High Priority

1. **Verify elektron-lfo depth scaling behavior** - Confirm whether output is pre-scaled by depth to ensure correct visualization

2. **Add parity tests for waveform worklets** - Ensure `worklets.ts` implementations match elektron-lfo's actual output

### Medium Priority

3. **Consider removing react-native-worklets** if unused - Verify necessity and remove if it's not required

4. **Document waveform duplication** - Add clear documentation explaining why waveform sampling is reimplemented for worklets

### Low Priority

5. **Consistent SharedValue typing** - Consider enforcing SharedValue-only props in visualizer components for cleaner code

6. **Review test mocks** - The elektron-lfo mock in tests should be verified against actual library behavior

---

## 8. Testing Recommendations

### Integration Tests Needed

1. **elektron-lfo output verification:**
   ```typescript
   it('should produce expected output range with depth scaling', () => {
     const lfo = new LFO({ waveform: 'SIN', depth: 32, ... }, 120);
     // Verify output stays within -0.5 to +0.5 (depth/63 scaling)
   });
   ```

2. **Worklet parity tests:**
   ```typescript
   it('worklet output should match LFO engine output', () => {
     const lfoOutput = lfo.getWaveformValue(phase);
     const workletOutput = sampleWaveformWorklet('SIN', phase);
     expect(workletOutput).toBeCloseTo(lfoOutput);
   });
   ```

### Current Test Coverage

The existing tests in `/Users/brent/wtlfo/src/context/__tests__/preset-context.test.tsx` mock elektron-lfo but don't verify integration behavior. Consider adding real integration tests.

---

## Conclusion

The library integrations in this project are **generally well-implemented** with modern patterns and appropriate version choices. The main areas for improvement are:

1. Verifying elektron-lfo behavior assumptions
2. Ensuring visualization worklets stay in sync with the library
3. Cleaning up potentially unused dependencies

The React 19, Expo 54, and New Architecture setup is correctly configured and uses current best practices.
