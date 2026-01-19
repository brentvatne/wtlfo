# Data Flow and Validation Review

**Review Date:** 2026-01-19
**Reviewer:** Data Engineering Analysis
**Application:** wtlfo - React Native LFO Visualizer App

---

## Executive Summary

This document analyzes data flow, validation, transformation, and persistence patterns in the wtlfo application. The app is a well-structured React Native LFO (Low Frequency Oscillator) visualization tool with solid TypeScript typing, comprehensive test coverage, and reasonable data validation patterns. Several areas for improvement are identified.

---

## 1. Data Sources

### 1.1 Internal Static Data

**Location:** `/Users/brent/wtlfo/src/data/`

| Source | File | Description |
|--------|------|-------------|
| Destinations | `destinations.ts` | 18 LFO modulation targets with min/max/default values |
| Presets | `presets.ts` | 6 predefined LFO configurations |

**Findings:**

- **GOOD:** Static data is strongly typed with TypeScript interfaces (`DestinationDefinition`, `LFOPreset`)
- **GOOD:** All destinations have validated ranges (min < max, defaultValue within bounds) - verified by unit tests
- **GOOD:** Consistent structure with required fields (id, name, displayName, min, max, defaultValue, category, bipolar)

### 1.2 Persisted Data (expo-sqlite/kv-store)

**Storage Keys:**
| Key | Context | Type | Validation |
|-----|---------|------|------------|
| `activePreset` | PresetContext | number (index) | Range check against PRESETS.length |
| `bpm` | PresetContext | number | Range 20-300, integer |
| `centerValues` | ModulationContext | JSON object | None on parse |
| `routings` | ModulationContext | JSON array | None on parse |

### 1.3 External Dependencies

| Dependency | Purpose | Trust Level |
|------------|---------|-------------|
| `elektron-lfo` | LFO engine library | Trusted (typed) |
| `expo-sqlite/kv-store` | Persistence | Trusted (platform) |
| `react-native-reanimated` | Animation | Trusted (typed SharedValue) |

**Findings:**

- **GOOD:** External library (`elektron-lfo`) is properly typed with imported types (`Waveform`, `TriggerMode`, `Multiplier`)
- **CONCERN:** No schema validation on JSON.parse for persisted routings and centerValues

---

## 2. Data Transformation

### 2.1 LFO Output Transformation

**Location:** `/Users/brent/wtlfo/src/hooks/useModulatedValue.ts`

```typescript
const modulationAmount = lfoOutput.value * depthScale * maxModulation;
const raw = centerValue + modulationAmount;
return Math.max(min, Math.min(max, raw));
```

**Flow:** LFO output (-1 to +1) -> depth scaling -> range mapping -> clamping

**Findings:**

- **GOOD:** Output is properly clamped to destination min/max bounds
- **GOOD:** Calculations happen in worklets for UI thread performance
- **GOOD:** Depth scale properly normalizes -64 to +63 range to -1 to +1

### 2.2 BPM Transformation

**Location:** `/Users/brent/wtlfo/src/context/preset-context.tsx` (line 144-152)

```typescript
const clampedBPM = Math.max(20, Math.min(300, Math.round(newBPM)));
```

**Findings:**

- **GOOD:** BPM is clamped AND rounded before storage
- **GOOD:** Consistent transformation at entry point

### 2.3 Waveform Sampling

**Location:** `/Users/brent/wtlfo/src/components/lfo/worklets.ts`

**Findings:**

- **GOOD:** All 7 waveform types are handled with explicit cases
- **GOOD:** Default case returns 0 (safe fallback)
- **GOOD:** Phase input is expected 0-1 range (no explicit validation, but mathematically handles any input)

### 2.4 Slow Motion Phase Transformation

**Location:** `/Users/brent/wtlfo/src/components/lfo/hooks/useSlowMotionPhase.ts`

**Findings:**

- **GOOD:** Extensive edge case handling for phase discontinuities
- **GOOD:** Drift correction every 60 frames to prevent accumulated floating-point errors
- **GOOD:** Wrap-around detection with thresholds

**Edge Cases Handled:**
- Factor changes (resets tracking)
- Phase discontinuities (large jumps)
- Wrap-around (0.95 -> 0.05)
- Early frame instability (extended 10-frame window)

---

## 3. Data Validation

### 3.1 Entry Point Validation

| Entry Point | Validation | Severity |
|-------------|------------|----------|
| `setActivePreset` | None (index) | **MEDIUM** |
| `setBPM` | Clamp 20-300, round | GOOD |
| `setCenterValue` | None (value) | **MEDIUM** |
| `setRouting` | None (destinationId) | **LOW** |
| `setRoutingAmount` | None (amount) | **MEDIUM** |
| `updateParameter` | Type-safe via generics | GOOD |

### 3.2 Bounds Checking

**GOOD:**
- BPM: Clamped to 20-300 range
- Modulated values: Clamped to destination min/max
- Preset index: Validated on load from storage (lines 21-22 in preset-context.tsx)

**GAPS:**
- `setCenterValue` accepts any number without checking destination bounds
- `setRoutingAmount` accepts any number (expected 0-100, not enforced)
- `setActivePreset` does not validate index is within PRESETS.length at runtime

### 3.3 Type Enforcement at Runtime

**Findings:**

- **GOOD:** TypeScript provides compile-time type safety throughout
- **CONCERN:** No runtime type validation for deserialized JSON data
- **CONCERN:** Type assertions used (`as Multiplier`, `as WaveformType`) without runtime checks

**Example (presets.ts line 28):**
```typescript
multiplier: 2 as Multiplier,  // Compile-time only
```

---

## 4. Data Flow Tracing

### 4.1 State Architecture

```
App Root
  |-- PresetProvider (preset-context.tsx)
  |     |-- activePreset (persisted)
  |     |-- currentConfig (derived from preset)
  |     |-- debouncedConfig (debounced 100ms)
  |     |-- bpm (persisted)
  |     |-- LFO engine (lfoRef)
  |     |-- Animation state (lfoPhase, lfoOutput SharedValues)
  |
  |-- ModulationProvider (modulation-context.tsx)
        |-- centerValues (persisted per destination)
        |-- routings (persisted LFO-to-destination mappings)
```

### 4.2 Data Flow Diagram

```
User Input (Slider)
      |
      v
  updateParameter() -----> currentConfig (immediate)
      |                          |
      |                    100ms debounce
      |                          |
      v                          v
  isEditing=true           debouncedConfig
                                 |
                                 v
                           LFO Engine Creation
                                 |
                                 v
                           Animation Loop
                                 |
                           lfoPhase/lfoOutput SharedValues
                                 |
                    +-----------+-----------+
                    |                       |
                    v                       v
              LFOVisualizer          DestinationMeter
                                           |
                                           v
                                    useModulatedValue()
                                           |
                                           v
                                    Clamped output (0-127)
```

### 4.3 Hidden Side Effects

**Identified Side Effects:**

1. **Preset change triggers config reset:**
   - `setActivePreset` -> `useEffect` -> `setCurrentConfig`
   - Location: preset-context.tsx lines 154-157

2. **Config change triggers engine recreation:**
   - `debouncedConfig` change -> `useEffect` -> `new LFO()`
   - Also clears pause state (`setIsPaused(false)`)
   - Location: preset-context.tsx lines 179-206

3. **Routing change triggers persistence:**
   - `setRoutings` -> `useEffect` -> `Storage.setItemSync`
   - Runs on every state change, not debounced
   - Location: modulation-context.tsx lines 67-73

### 4.4 Data Mutation Control

**Findings:**

- **GOOD:** All state updates use React's immutable update patterns
- **GOOD:** Spread operators used consistently (`{ ...prev, [key]: value }`)
- **GOOD:** No direct mutations of state objects detected
- **GOOD:** SharedValues are only mutated via `.value` property (Reanimated's controlled mutation)

---

## 5. Data Persistence

### 5.1 What Is Persisted

| Data | Storage Key | Format | When Persisted |
|------|-------------|--------|----------------|
| Active preset index | `activePreset` | String (number) | On change |
| BPM setting | `bpm` | String (number) | On change |
| Center values | `centerValues` | JSON object | On change |
| LFO routings | `routings` | JSON array | On change |

**NOT Persisted:**
- `currentConfig` modifications (volatile until preset change)
- `isPaused` state
- `isEditing` state
- Animation phase/output

### 5.2 Serialization/Deserialization

**Serialization:**
```typescript
Storage.setItemSync(KEY, JSON.stringify(data));
```

**Deserialization:**
```typescript
const saved = Storage.getItemSync(KEY);
return saved ? JSON.parse(saved) : defaultValue;
```

**Findings:**

- **GOOD:** Try-catch around all storage operations
- **GOOD:** Fallback to defaults on parse failure
- **CONCERN:** No schema validation after JSON.parse

**Example vulnerability (modulation-context.tsx lines 39-48):**
```typescript
function getInitialRoutings(): LFORouting[] {
  try {
    const saved = Storage.getItemSync(ROUTINGS_KEY);
    return saved ? JSON.parse(saved) : defaultRoutings;
  } catch {
    return defaultRoutings;
  }
}
// If saved data has wrong shape, app may crash later
```

### 5.3 Migration Concerns

**Current State:**
- No versioning on persisted data
- No migration logic exists
- Schema changes would require manual handling

**Risk Scenarios:**
1. Adding new required fields to `LFORouting` would break existing saved data
2. Changing `DestinationId` enum values would orphan center values
3. Changing preset structure would require preset index reset

**Recommendation:** Consider adding a version field to persisted data:
```typescript
interface PersistedData<T> {
  version: number;
  data: T;
}
```

---

## 6. Data Consistency

### 6.1 Single Source of Truth

| Data | Source of Truth | Derived Values |
|------|-----------------|----------------|
| Preset config | `PRESETS[activePreset].config` | `currentConfig`, `debouncedConfig` |
| Destination definitions | `DESTINATIONS` array | `getDestination()` lookups |
| Active destination | `routings[lfo1]` | `activeDestinationId` |
| Center values | `centerValues` state | Fallback to `destination.defaultValue` |

**Findings:**

- **GOOD:** Clear single sources of truth for each data domain
- **GOOD:** Derived values computed via selectors/getters, not duplicated state

### 6.2 Synchronization Issues

**Potential Sync Issues:**

1. **Preset vs currentConfig:**
   - `currentConfig` can diverge from preset when parameters are modified
   - `resetToPreset()` exists to re-sync
   - **Status:** Intentional design, not a bug

2. **currentConfig vs debouncedConfig:**
   - 100ms debounce intentionally creates temporary inconsistency
   - Used to prevent engine thrashing during rapid slider movement
   - **Status:** Intentional design

3. **Center values for unknown destinations:**
   - `getCenterValue` falls back to definition or 64
   - If destination is removed, orphan center values remain in storage
   - **Status:** Low-risk, storage waste only

### 6.3 Derived Value Synchronization

**Location:** `/Users/brent/wtlfo/src/hooks/useModulatedValue.ts`

```typescript
// Derived values are computed outside worklet
const destination = getDestination(destinationId);
const min = destination?.min ?? 0;
const max = destination?.max ?? 127;
const range = max - min;
const maxModulation = range / 2;
const depthScale = lfoDepth / 63;
```

**Findings:**

- **GOOD:** Derived values recomputed when dependencies change (via hook re-render)
- **CONCERN:** If `destinationId` becomes invalid, null coalescing hides the error

---

## 7. Data Integrity

### 7.1 Invalid Data Crash Potential

| Scenario | Risk | Mitigation |
|----------|------|------------|
| Invalid preset index | **MEDIUM** | Validated on load, not on set |
| Invalid JSON in storage | LOW | Try-catch with fallback |
| Unknown destination ID | **MEDIUM** | Throws error in `getDestination()` |
| Out-of-bounds center value | LOW | Clamped during modulation |
| NaN in calculations | LOW | All numeric operations are safe |
| Division by zero | LOW | `cycleTimeMs > 0` checks exist |

**High-Risk Code Path:**

```typescript
// destinations.ts line 197
export function getDestination(id: DestinationId): DestinationDefinition | null {
  if (id === 'none') return null;
  const dest = DESTINATIONS.find(d => d.id === id);
  if (!dest) throw new Error(`Unknown destination: ${id}`);  // CRASH
  return dest;
}
```

This will crash if:
- Corrupted storage contains invalid destination ID
- Future code removes a destination ID that's in saved routings

### 7.2 Sanitization Needs

**Current Sanitization:**
- BPM: Clamped and rounded
- Modulated values: Clamped to min/max

**Missing Sanitization:**
- Preset index: Not range-checked on `setActivePreset`
- Center values: Not validated against destination bounds
- Routing amounts: Not validated (0-100 expected)

### 7.3 Post-Restoration Validation

**Current Implementation:**

```typescript
// preset-context.tsx lines 16-28
function getInitialPreset(): number {
  try {
    const saved = Storage.getItemSync(STORAGE_KEY);
    if (saved !== null) {
      const index = parseInt(saved, 10);
      if (!isNaN(index) && index >= 0 && index < PRESETS.length) {
        return index;
      }
    }
  } catch {
    console.warn('Failed to load saved preset');
  }
  return 0;
}
```

**Findings:**

- **GOOD:** Preset index is validated on restoration
- **GOOD:** BPM is validated on restoration (20-300 range check)
- **GAP:** centerValues not validated against destination bounds
- **GAP:** routings not validated for schema correctness

---

## 8. Test Coverage Analysis

### 8.1 Context Tests

**Files Reviewed:**
- `/Users/brent/wtlfo/src/context/__tests__/preset-context.test.tsx`
- `/Users/brent/wtlfo/src/context/__tests__/modulation-context.test.tsx`

**Coverage Highlights:**

| Area | Coverage | Notes |
|------|----------|-------|
| Initial state loading | GOOD | Tests for defaults and saved values |
| Invalid storage values | GOOD | NaN, out-of-range tested |
| Storage errors | GOOD | Read/write errors handled gracefully |
| State updates | GOOD | All setters tested |
| Edge cases | PARTIAL | Zero values, boundary values tested |

### 8.2 Data Tests

**File:** `/Users/brent/wtlfo/src/data/__tests__/destinations.test.ts`

**Coverage Highlights:**

- All destination IDs verified
- Min/max range validity verified
- Default value bounds verified
- Category assignments verified
- Bipolar flag consistency verified
- Unknown destination error throwing verified

---

## 9. Recommendations

### 9.1 Critical (Should Fix)

1. **Add runtime validation for restored routings:**
   ```typescript
   function validateRouting(r: unknown): r is LFORouting {
     return (
       typeof r === 'object' && r !== null &&
       typeof (r as LFORouting).lfoId === 'string' &&
       typeof (r as LFORouting).amount === 'number' &&
       // Validate destinationId against known IDs
       isValidDestinationId((r as LFORouting).destinationId)
     );
   }
   ```

2. **Add bounds checking to `setCenterValue`:**
   ```typescript
   const setCenterValue = useCallback((destinationId: DestinationId, value: number) => {
     if (destinationId === 'none') return;
     const dest = DESTINATIONS.find(d => d.id === destinationId);
     if (!dest) return;
     const clampedValue = Math.max(dest.min, Math.min(dest.max, value));
     setCenterValues(prev => ({ ...prev, [destinationId]: clampedValue }));
   }, []);
   ```

3. **Validate preset index in `setActivePreset`:**
   ```typescript
   const setActivePreset = useCallback((index: number) => {
     if (index < 0 || index >= PRESETS.length) return;
     setActivePresetState(index);
     // ...
   }, []);
   ```

### 9.2 Moderate (Should Consider)

4. **Add data versioning for storage:**
   - Enables future migrations
   - Prevents silent data corruption

5. **Make `getDestination` return null instead of throwing:**
   - Prevents crash from corrupted storage
   - Caller must handle null case

6. **Add validation to `setRoutingAmount`:**
   ```typescript
   const clampedAmount = Math.max(0, Math.min(100, amount));
   ```

### 9.3 Low Priority (Nice to Have)

7. **Add telemetry for data restoration failures:**
   - Track when fallbacks are used
   - Identify data corruption patterns

8. **Consider using Zod or io-ts for runtime type validation:**
   - Schema-based validation
   - Auto-generated TypeScript types

9. **Add data export/import functionality:**
   - User backup capability
   - Debug data inspection

---

## 10. Conclusion

The wtlfo application demonstrates solid data architecture with:
- Clear separation of concerns (contexts for different domains)
- Strong TypeScript typing throughout
- Comprehensive test coverage for core data operations
- Proper use of React state patterns and Reanimated SharedValues

Key areas for improvement:
- Runtime validation of persisted JSON data
- Bounds checking on setter functions
- Data versioning for future migrations
- Graceful handling of unknown destination IDs

The most critical gap is the lack of runtime validation when restoring JSON data from storage, which could lead to crashes if data becomes corrupted or schema changes in future versions.

---

## Files Analyzed

| Category | Files |
|----------|-------|
| Contexts | `src/context/preset-context.tsx`, `src/context/modulation-context.tsx` |
| Data | `src/data/destinations.ts`, `src/data/presets.ts` |
| Types | `src/types/destination.ts` |
| Hooks | `src/hooks/useModulatedValue.ts` |
| Components | `src/components/lfo/worklets.ts`, `src/components/lfo/hooks/useSlowMotionPhase.ts`, `src/components/lfo/utils/getSlowdownInfo.ts` |
| Controls | `src/components/controls/ParameterSlider.tsx`, `src/components/destination/CenterValueSlider.tsx` |
| Tests | `src/context/__tests__/*.test.tsx`, `src/data/__tests__/*.test.ts` |
| App | `app/_layout.tsx`, `app/(home)/index.tsx` |
