# Test Coverage Gaps Analysis

## Executive Summary

This document analyzes the test coverage for the WTLFO React Native application. The app is an LFO (Low Frequency Oscillator) visualizer and modulation tool for music production workflows.

**Current State:**
- 5 test files with approximately 430 test cases
- Coverage concentrated on contexts, data utilities, and waveform worklets
- Significant gaps in component testing, hooks, and integration tests

**Estimated Coverage:** ~25-30% of source code (based on test file analysis)

---

## 1. Current Test Coverage

### 1.1 Files/Functions That Have Tests

| Test File | Source File | Coverage Description |
|-----------|-------------|---------------------|
| `src/components/lfo/__tests__/worklets.test.ts` | `src/components/lfo/worklets.ts` | Comprehensive waveform sampling (TRI, SIN, SQR, SAW, EXP, RMP, RND), unipolar detection |
| `src/context/__tests__/preset-context.test.tsx` | `src/context/preset-context.tsx` | Provider setup, hooks, state management, storage, BPM handling |
| `src/context/__tests__/modulation-context.test.tsx` | `src/context/modulation-context.tsx` | Routing, center values, storage persistence |
| `src/data/__tests__/destinations.test.ts` | `src/data/destinations.ts` | Destination definitions, category filtering, validation |
| `src/components/lfo/utils/__tests__/getSlowdownInfo.test.ts` | `src/components/lfo/utils/getSlowdownInfo.ts` | Slowdown calculations, hysteresis logic |

### 1.2 Critical Paths That ARE Tested

1. **Waveform Generation** - All 7 waveform types thoroughly tested
2. **State Management** - Preset and modulation contexts well covered
3. **Data Integrity** - Destination definitions validated
4. **Storage Persistence** - Load/save operations with error handling
5. **BPM Clamping** - Boundary conditions (20-300 BPM)
6. **Parameter Updates** - Basic parameter change flows

---

## 2. Missing Unit Tests

### 2.1 Utility Functions Without Tests

| File | Functions | Priority |
|------|-----------|----------|
| `src/components/lfo/worklets.ts` | `getRandomStepValue()`, `sampleRandomWithSlew()`, `sampleWaveformWithSlew()` | **HIGH** |
| `src/components/lfo/hooks/useWaveformPath.ts` | `useWaveformPath()` hook, `sampleWaveform`, `isUnipolar` | **HIGH** |
| `src/hooks/useModulatedValue.ts` | `useModulatedValue()`, `useModulationInfo()` | **HIGH** |
| `src/data/presets.ts` | Preset data validation | MEDIUM |
| `src/theme/colors.ts` | Theme constant integrity | LOW |

### 2.2 Hooks Needing Tests

| Hook | Location | Missing Tests |
|------|----------|---------------|
| `useWaveformPath` | `src/components/lfo/hooks/` | Path generation, memoization, depth/phase application |
| `useSlowMotionPhase` | `src/components/lfo/hooks/` | Phase tracking, factor changes, discontinuity handling |
| `useSyncDisplayPhase` | `src/components/lfo/hooks/` | Sync trigger logic |
| `useModulatedValue` | `src/hooks/` | Modulation calculation, clamping, bipolar handling |
| `useModulationInfo` | `src/hooks/` | Info calculation, boundary computation |

### 2.3 Calculations Requiring Verification

| Calculation | Location | Missing Tests |
|-------------|----------|---------------|
| Slew smoothing interpolation | `worklets.ts` | smoothstep transitions, step boundary handling |
| Phase delta accumulation | `useSlowMotionPhase.ts` | Wrap-around detection, drift correction |
| Modulation amount | `useModulatedValue.ts` | Depth scaling, bipolar vs unipolar handling |
| Display cycle time | `getSlowdownInfo.ts` | Complex hysteresis edge cases |
| Timing calculations | `preset-context.tsx` | Steps per cycle, note value mapping |

---

## 3. Missing Integration Tests

### 3.1 Untested Component Interactions

| Interaction | Components Involved | Priority |
|-------------|---------------------|----------|
| LFO output -> Destination meter | `PresetProvider` + `DestinationMeter` | **HIGH** |
| Parameter change -> Visualizer update | `ParameterSlider` + `LFOVisualizer` | **HIGH** |
| Waveform selection -> Path redraw | `SegmentedControl` + `WaveformDisplay` | **HIGH** |
| Destination change -> Center value recall | `DestinationPicker` + `ModulationContext` | MEDIUM |
| BPM change -> Timing info update | BPM control + `TimingInfo` | MEDIUM |
| Preset switch -> Full state sync | Preset selector + all contexts | MEDIUM |

### 3.2 Untested User Flows

| Flow | Description | Components |
|------|-------------|------------|
| **Parameter Editing** | Slide parameter -> see waveform update -> see value in meter | `ParameterSlider`, `LFOVisualizer`, `DestinationMeter` |
| **Destination Routing** | Open picker -> select destination -> adjust center value -> see modulation | `DestinationPicker`, `CenterValueSlider`, `DestinationMeter` |
| **Preset Management** | Select preset -> verify config loaded -> modify -> reset to original | `PresetContext`, all parameter controls |
| **LFO Control** | Start/stop/trigger LFO -> verify phase reset/animation pause | `PresetProvider`, `PhaseIndicator` |
| **App Lifecycle** | Background -> foreground -> verify state restoration | `PresetProvider`, all contexts |

### 3.3 Untested Context Combinations

| Combination | Missing Coverage |
|-------------|------------------|
| `PresetProvider` + `ModulationProvider` together | Combined state scenarios |
| Multiple routing updates in sequence | Race condition potential |
| Storage failures during save | Graceful degradation |
| Concurrent parameter updates | Debounce interaction |

---

## 4. Missing Edge Case Tests

### 4.1 Untested Boundary Conditions

| Boundary | Location | Missing Tests |
|----------|----------|---------------|
| Phase at exactly 0.0 and 1.0 | All waveform sampling | Boundary precision |
| Depth at -64 and +63 | Modulation calculations | Max/min modulation |
| Center value at destination min/max | `DestinationMeter` | Clamping behavior |
| BPM at 20 and 300 | Timing calculations | Extreme cycle times |
| Slowdown factor near threshold | `getSlowdownInfo` | Hysteresis edge cases |
| Empty/null destination | `getDestination('none')` | Null handling flow |
| Phase wrap-around at high speed | `useSlowMotionPhase` | Wrap detection accuracy |

### 4.2 Untested Error Scenarios

| Scenario | Location | Expected Behavior |
|----------|----------|-------------------|
| Invalid waveform type | `sampleWaveformWorklet` | Returns 0 (tested) |
| Unknown destination ID | `getDestination()` | Throws error (tested) |
| Storage completely unavailable | Both contexts | **UNTESTED** - should use defaults |
| LFO engine initialization failure | `PresetProvider` | **UNTESTED** - should handle gracefully |
| Invalid preset index from storage | `preset-context.tsx` | Tested - falls back to 0 |
| Corrupted JSON in storage | Both contexts | Tested - uses defaults |
| App crash recovery | `ErrorBoundary` | **UNTESTED** - render/dismiss/restart |

### 4.3 Race Conditions to Test

| Condition | Scenario | Risk |
|-----------|----------|------|
| Rapid parameter changes | Fast slider dragging | Debounce overflow |
| Quick preset switching | Rapid preset taps | State desync |
| Config change during animation | Edit while LFO running | Visual glitches |
| Storage save during read | Concurrent operations | Data corruption |
| Factor change during phase update | `useSlowMotionPhase` | Jump artifacts |

---

## 5. Test Quality Issues

### 5.1 Potential Flaky Tests

| Test | File | Risk Factor |
|------|------|-------------|
| Timer-based tests | `preset-context.test.tsx` | Uses `jest.advanceTimersByTime()` - sensitive to timing |
| Async waitFor tests | `preset-context.test.tsx` | May timeout under load |
| Animation frame mocks | Jest setup | May not match real behavior |

### 5.2 Tests Too Coupled to Implementation

| Test | Issue |
|------|-------|
| Storage mock structure | Tests depend on specific `Storage.getItemSync`/`setItemSync` calls |
| LFO mock shape | Tests mock entire `LFO` class - may miss API changes |
| Shared value mock | Mock `useSharedValue` returns plain object, not real SharedValue |

### 5.3 Mock Appropriateness Review

| Mock | Current State | Recommendation |
|------|--------------|----------------|
| `expo-sqlite/kv-store` | Returns `null` by default | OK - good isolation |
| `react-native-reanimated` | Uses official mock | Consider adding worklet testing |
| `elektron-lfo` | Custom mock | OK - matches API |
| `console.warn/error` | Silenced | OK for clean output |
| `requestAnimationFrame` | Simple timeout mock | May need realistic timing tests |

---

## 6. Recommended Test Priorities

### 6.1 High-Value Tests to Add

| Test | ROI | Effort | Priority |
|------|-----|--------|----------|
| `useModulatedValue` unit tests | HIGH | LOW | **P0** |
| Slew smoothing calculations | HIGH | LOW | **P0** |
| `useSlowMotionPhase` edge cases | HIGH | MEDIUM | **P1** |
| Component snapshot tests | MEDIUM | LOW | **P1** |
| `ErrorBoundary` render tests | MEDIUM | LOW | **P1** |
| Full modulation flow integration | HIGH | HIGH | **P2** |
| `LFOVisualizer` rendering tests | MEDIUM | HIGH | **P2** |

### 6.2 Test Type ROI Analysis

| Test Type | Value | Cost | ROI |
|-----------|-------|------|-----|
| **Unit tests for calculations** | High - catches math bugs | Low | **BEST** |
| **Hook unit tests** | High - core logic | Medium | **GOOD** |
| **Context integration tests** | Medium - state flows | Medium | **GOOD** |
| **Component snapshots** | Low-Medium - UI stability | Very Low | **GOOD** |
| **E2E user flow tests** | High - confidence | Very High | MODERATE |
| **Visual regression tests** | Low - Skia rendering | Very High | LOW |

### 6.3 What NOT to Test

| Area | Reason |
|------|--------|
| Third-party library internals | Trust Expo, Reanimated, Skia |
| Pure styling/layout | Visual inspection sufficient |
| Simple passthrough components | Minimal logic |
| Native animation performance | Requires device testing |
| Platform-specific behaviors | Outside unit test scope |

---

## 7. Recommended Action Plan

### Phase 1: Quick Wins (1-2 days)

1. **Add `useModulatedValue` tests** - Core calculation logic
2. **Add slew smoothing tests** - `sampleRandomWithSlew()`, `sampleWaveformWithSlew()`
3. **Add `ErrorBoundary` tests** - Error state rendering
4. **Add preset data validation** - Ensure PRESETS array integrity

### Phase 2: Hook Coverage (3-5 days)

5. **Test `useSlowMotionPhase`** - Phase accumulation, discontinuity handling
6. **Test `useWaveformPath`** - Path generation with various inputs
7. **Add more edge cases** - Boundary conditions, error scenarios

### Phase 3: Integration Tests (5-7 days)

8. **Context integration** - Combined PresetProvider + ModulationProvider
9. **Component interactions** - Slider -> Visualizer -> Meter flow
10. **User flow tests** - End-to-end editing scenarios

### Phase 4: Stability (Ongoing)

11. **Add snapshot tests** - Prevent UI regressions
12. **Set up coverage reporting** - Track progress
13. **Add pre-commit hooks** - Enforce test requirements

---

## 8. Test File Inventory

### Existing Test Files (5 files, ~430 tests)

```
src/
  components/
    lfo/
      __tests__/
        worklets.test.ts                 (93 tests)
      utils/
        __tests__/
          getSlowdownInfo.test.ts        (15 tests)
  context/
    __tests__/
      preset-context.test.tsx            (158 tests)
      modulation-context.test.tsx        (130 tests)
  data/
    __tests__/
      destinations.test.ts               (34 tests)
```

### Source Files Needing Test Coverage

```
src/
  components/
    ErrorBoundary.tsx                    [NO TESTS]
    ParameterEditor.tsx                  [NO TESTS]
    controls/
      ParameterSlider.tsx                [NO TESTS]
      SegmentedControl.tsx               [NO TESTS]
    destination/
      CenterValueSlider.tsx              [NO TESTS]
      DestinationMeter.tsx               [NO TESTS]
      DestinationPicker.tsx              [NO TESTS]
      DestinationPickerInline.tsx        [NO TESTS]
    lfo/
      FadeEnvelope.tsx                   [NO TESTS]
      GridLines.tsx                      [NO TESTS]
      LFOVisualizer.tsx                  [NO TESTS]
      OutputValueDisplay.tsx             [NO TESTS]
      ParameterBadges.tsx                [NO TESTS]
      PhaseIndicator.tsx                 [NO TESTS]
      RandomWaveform.tsx                 [NO TESTS]
      SlowMotionBadge.tsx                [NO TESTS]
      TimingInfo.tsx                     [NO TESTS]
      WaveformDisplay.tsx                [NO TESTS]
      WaveformIcon.tsx                   [NO TESTS]
      hooks/
        useSlowMotionPhase.ts            [NO TESTS]
        useWaveformPath.ts               [NO TESTS]
    learn/
      SkiaIcons.tsx                      [NO TESTS]
    params/
      ParamBox.tsx                       [NO TESTS]
      ParamGrid.tsx                      [NO TESTS]
      ParamIcons.tsx                     [NO TESTS]
  hooks/
    useModulatedValue.ts                 [NO TESTS]
  data/
    presets.ts                           [PARTIAL - data only, no validation tests]
  types/
    destination.ts                       [TYPE ONLY - no tests needed]
  theme/
    colors.ts                            [NO TESTS - low priority]
```

---

## Appendix A: Test Examples

### A.1 Recommended `useModulatedValue` Test

```typescript
// src/hooks/__tests__/useModulatedValue.test.ts
import { renderHook } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useModulatedValue, useModulationInfo } from '../useModulatedValue';

describe('useModulatedValue', () => {
  it('should clamp output to destination range', () => {
    // Test setup and assertions
  });

  it('should handle bipolar destinations correctly', () => {
    // Test setup and assertions
  });

  it('should scale modulation by depth', () => {
    // Test setup and assertions
  });
});
```

### A.2 Recommended `ErrorBoundary` Test

```typescript
// src/components/__tests__/ErrorBoundary.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '../ErrorBoundary';

describe('ErrorBoundary', () => {
  it('should render children when no error', () => {
    // Test normal rendering
  });

  it('should display error UI when child throws', () => {
    // Test error state
  });

  it('should allow restart attempt', () => {
    // Test restart button
  });
});
```

---

## Appendix B: Test Configuration

### Current Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
  ],
};
```

### Recommended Coverage Thresholds

```javascript
// Add to jest.config.js
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
  'src/hooks/': {
    branches: 80,
    functions: 80,
    lines: 80,
  },
  'src/context/': {
    branches: 70,
    functions: 70,
    lines: 70,
  },
},
```

---

*Generated: January 2026*
*Analysis based on source code review of WTLFO v1.0.0*
