# Preset/Configuration Management System Review

**Date:** January 19, 2026
**Reviewer:** Systems Design Analysis
**App:** WTLFO - LFO Visualization App

---

## Executive Summary

The preset system is functional and well-architected for its current scope. It provides a solid foundation for factory presets with real-time editing and basic persistence. However, it lacks user-created preset management, import/export capabilities, and advanced features expected in a mature synthesizer application.

**Overall Assessment:** Good foundation, needs enhancement for production-level preset management.

---

## 1. Preset Data Model

### Current Structure

```typescript
// /Users/brent/wtlfo/src/data/presets.ts
interface LFOPresetConfig {
  waveform: Waveform;
  speed: number;
  multiplier: Multiplier;
  useFixedBPM: boolean;
  startPhase: number;
  mode: TriggerMode;
  depth: number;
  fade: number;
}

interface LFOPreset {
  name: string;
  config: LFOPresetConfig;
  destination?: DestinationId;
  centerValue?: number;
}
```

### Strengths

1. **Type-Safe:** Uses TypeScript with types imported from `elektron-lfo` package
2. **Comprehensive LFO Parameters:** Captures all essential LFO parameters
3. **Destination Integration:** Optional destination and center value support
4. **Clean Separation:** Config object separates engine parameters from metadata

### Weaknesses

1. **No Unique Identifier:** Presets use array index, not stable IDs
2. **No Metadata:** Missing creation date, author, description, tags, category
3. **No Versioning:** No schema version for future migrations
4. **Limited Destination:** Only single destination per preset (though multi-LFO support is planned per types)

### Recommendations

```typescript
interface LFOPreset {
  id: string;                    // UUID for stable reference
  name: string;
  description?: string;          // User-facing description
  category?: string;             // "Bass", "Ambient", "Rhythmic", etc.
  tags?: string[];               // Searchable tags
  author?: string;               // "Factory" or user name
  version: number;               // Schema version for migrations
  createdAt?: string;            // ISO date
  modifiedAt?: string;           // ISO date
  isFactory: boolean;            // Distinguish factory vs user presets
  config: LFOPresetConfig;
  destination?: DestinationId;
  centerValue?: number;
}
```

### Extensibility Assessment

**Current:** Limited - adding fields requires code changes everywhere
**Needed:** Schema versioning and migration strategy

---

## 2. Preset Persistence

### Current Implementation

**Location:** `/Users/brent/wtlfo/src/context/preset-context.tsx`

```typescript
// Storage keys
const STORAGE_KEY = 'activePreset';      // Stores index as string
const BPM_STORAGE_KEY = 'bpm';           // Stores BPM as string

// Sync storage using expo-sqlite/kv-store
Storage.getItemSync(STORAGE_KEY)
Storage.setItemSync(STORAGE_KEY, String(index))
```

### Strengths

1. **Synchronous Loading:** Initial state loads synchronously (no flash of default content)
2. **Error Handling:** Graceful fallback to defaults on storage errors
3. **Validation:** Validates stored values before use (range checks, NaN handling)
4. **Efficient:** Only stores active preset index, not full preset data

### Weaknesses

1. **Index-Based Reference:** Storing array index is fragile - reordering presets breaks saved references
2. **No User Preset Persistence:** Cannot save modified/custom presets
3. **No Backup/Restore:** No mechanism to export/import settings
4. **Scattered Storage:** BPM, active preset, center values, and routings stored separately
5. **No Sync:** No cloud sync or device transfer capability

### What IS Persisted

| Data | Storage Key | Format |
|------|-------------|--------|
| Active preset index | `activePreset` | String (number) |
| Global BPM | `bpm` | String (number) |
| Center values per destination | `centerValues` | JSON object |
| LFO routings | `routings` | JSON array |

### What is NOT Persisted

- Modified parameter values (reset on preset change)
- User-created presets
- Preset favorites/recently used

### Migration Concerns

**High Risk:** If preset array order changes, all saved `activePreset` indices become invalid

**Recommendation:** Migrate to ID-based preset references:
```typescript
const STORAGE_KEY = 'activePresetId';  // Store 'wobble-bass' instead of '1'
```

---

## 3. Preset Switching

### Current Flow

```typescript
// /Users/brent/wtlfo/app/(home)/presets.tsx
const handleSelect = (index: number) => {
  setActivePreset(index);
  if (preset.destination) {
    setActiveDestinationId(preset.destination);
    setCenterValue(preset.destination, preset.centerValue);
  }
  router.back();
};
```

### Strengths

1. **Instant State Update:** `setActivePreset` immediately updates React state
2. **Synchronous Storage:** Persistence is synchronous, no async race conditions
3. **Destination Sync:** Loads destination settings from preset
4. **UI Feedback:** Navigation closes sheet after selection

### Debounced Engine Recreation

```typescript
// preset-context.tsx
const ENGINE_DEBOUNCE_MS = 100;

// Config changes are debounced
useEffect(() => {
  debounceRef.current = setTimeout(() => {
    setDebouncedConfig({ ...currentConfig });
  }, ENGINE_DEBOUNCE_MS);
  // ...
}, [currentConfig]);

// LFO engine recreated on debounced config change
useEffect(() => {
  lfoRef.current = new LFO(debouncedConfig, bpm);
  // Reset phase, auto-trigger modes, clear pause state
}, [debouncedConfig, bpm]);
```

### Potential Glitches

1. **100ms Latency:** Engine recreation is debounced, so audio would lag if this were connected to audio
2. **Phase Reset:** `lfoPhase.value = startPhaseNormalized` resets on every config change (acceptable for visual app)
3. **Pause State Reset:** `setIsPaused(false)` on config change (intentional behavior)

### Assessment

**Switching is instant for UI** - the `currentConfig` updates immediately
**Engine recreation is debounced** - appropriate for this visualization app
**No glitches observed** - clean handoff between presets

---

## 4. Preset Editing

### Current Capabilities

```typescript
// Live parameter updates
const updateParameter = useCallback(<K extends keyof LFOPresetConfig>(
  key: K, value: LFOPresetConfig[K]
) => {
  setCurrentConfig(prev => {
    if (prev[key] === value) return prev;  // Skip if unchanged
    return { ...prev, [key]: value };
  });
}, []);

// Reset to original preset
const resetToPreset = useCallback(() => {
  setCurrentConfig({ ...PRESETS[activePreset].config });
}, [activePreset]);
```

### Strengths

1. **Real-Time Updates:** `currentConfig` updates instantly for UI
2. **Change Detection:** Skips updates if value unchanged (prevents debounce churn)
3. **Reset Capability:** Can revert to original preset values
4. **Editing State:** `isEditing` flag tracks user interaction

### Weaknesses

1. **No Undo History:** Can only reset to original, no incremental undo
2. **No A/B Comparison:** Cannot toggle between modified and original
3. **Edits Not Saved:** Modified values lost when switching presets
4. **No "Dirty" Indicator:** UI doesn't show if preset has been modified
5. **No "Save As" Capability:** Cannot save modifications as new preset

### Recommendations

```typescript
interface PresetContextValue {
  // ... existing ...
  isDirty: boolean;                      // Has preset been modified?
  undoStack: LFOPresetConfig[];          // Undo history
  undo: () => void;                      // Step back
  compareWithOriginal: () => void;       // A/B toggle
  saveAsNewPreset: (name: string) => void;  // Save modifications
}
```

---

## 5. Preset Organization

### Current Discovery

**Preset List UI:** `/Users/brent/wtlfo/app/(home)/presets.tsx`

- Simple scrollable list
- Shows preset name and key parameters (waveform, speed, multiplier, mode)
- Active preset highlighted
- No search, filtering, or categories

**Learn Tab Presets:** `/Users/brent/wtlfo/app/(learn)/presets.tsx`

- Educational view with live animated previews
- Shows detailed parameter breakdown
- "Use This Preset" button per card
- Still no categorization

### Factory Presets (6 total)

| Name | Purpose |
|------|---------|
| Init | Basic starting point |
| Wobble Bass | Classic dubstep wobble |
| Ambient Drift | Slow panning movement |
| Hi-Hat Humanizer | Random velocity variation |
| Pumping Sidechain | Compressor ducking effect |
| Fade-In One-Shot | Filter sweep one-shot |

### Weaknesses

1. **No Categories:** All presets in flat list
2. **No Search:** Cannot search by name or parameters
3. **No Favorites:** Cannot mark presets as favorites
4. **No Recent:** No "recently used" section
5. **No Custom Presets:** Users cannot save their own presets
6. **No Factory/User Separation:** (N/A since no user presets exist)

### Recommendations

```typescript
// Category-based organization
const PRESET_CATEGORIES = {
  'Rhythmic': ['Wobble Bass', 'Pumping Sidechain'],
  'Ambient': ['Ambient Drift', 'Fade-In One-Shot'],
  'Utility': ['Init', 'Hi-Hat Humanizer'],
};

// Search/filter support
interface PresetFilter {
  category?: string;
  waveform?: Waveform[];
  mode?: TriggerMode[];
  searchQuery?: string;
}
```

---

## 6. Missing Features

### Import/Export

**Current:** Not implemented

**Needed:**
- Export single preset as JSON/file
- Export all presets as backup
- Import preset from file/clipboard
- Share preset via system share sheet

```typescript
// Example export format
interface PresetExport {
  version: 1;
  exportedAt: string;
  presets: LFOPreset[];
}
```

### Preset Sharing

**Current:** Not implemented

**Needed:**
- Share via AirDrop, Messages, etc.
- Deep link to load shared preset
- QR code for preset sharing (nice-to-have)

### Preset Comparison

**Current:** Only `resetToPreset()` to revert

**Needed:**
- A/B comparison toggle
- Side-by-side visualization
- Parameter diff view

### Preset Naming/Editing

**Current:** Factory presets only, names hardcoded

**Needed:**
- Rename preset (for user presets)
- Edit preset description
- Add/edit tags

### User Preset Management

**Current:** Not implemented

**Needed:**
- Save current config as new preset
- Delete user presets
- Reorder presets
- Organize into folders/categories

---

## 7. Specific Code Issues

### Issue 1: Index-Based Preset Reference

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx`

```typescript
// Fragile - breaks if preset array reorders
const saved = Storage.getItemSync(STORAGE_KEY);
const index = parseInt(saved, 10);
if (index >= 0 && index < PRESETS.length) {
  return index;
}
```

**Fix:** Use stable preset IDs instead of array indices.

### Issue 2: Preset Switching Doesn't Save Edits

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx`

```typescript
// Edits lost when changing presets
useEffect(() => {
  setCurrentConfig({ ...PRESETS[activePreset].config });
}, [activePreset]);
```

**Consideration:** Could prompt user "Save changes before switching?" or maintain a dirty edits cache.

### Issue 3: No Schema Migration

**Risk:** If `LFOPresetConfig` fields change in future, stored data could be incompatible.

**Fix:** Add version field and migration logic:
```typescript
function migratePreset(stored: unknown): LFOPreset {
  // Handle different schema versions
}
```

---

## 8. Architecture Recommendations

### Short-Term (Low Effort)

1. Add stable `id` field to presets
2. Add `isDirty` flag to show modified state
3. Add basic undo (single level)
4. Persist to ID instead of index

### Medium-Term (Moderate Effort)

1. Implement user preset storage
2. Add "Save As" functionality
3. Add preset categories
4. Add search/filter to preset list
5. Add export to clipboard/file

### Long-Term (Higher Effort)

1. Full undo/redo history
2. A/B comparison mode
3. Preset sharing via deep links
4. Cloud sync (iCloud/Firebase)
5. Preset versioning and migrations

---

## 9. Test Coverage

**File:** `/Users/brent/wtlfo/src/context/__tests__/preset-context.test.tsx`

### Covered

- Initial state loading from storage
- Preset switching and persistence
- BPM changes and clamping
- Parameter updates and debouncing
- Reset to preset functionality
- Storage error handling
- LFO control methods
- Shared values and refs

### Not Covered

- User preset creation (feature doesn't exist)
- Preset deletion (feature doesn't exist)
- Import/export (feature doesn't exist)
- Migration scenarios

---

## 10. Summary Table

| Feature | Status | Priority |
|---------|--------|----------|
| Factory presets | Implemented | - |
| Preset switching | Implemented | - |
| Live editing | Implemented | - |
| Reset to preset | Implemented | - |
| Persistence (active) | Implemented | - |
| **User presets** | Not Implemented | High |
| **Save As** | Not Implemented | High |
| **Dirty state indicator** | Not Implemented | Medium |
| **Undo/Redo** | Not Implemented | Medium |
| **Categories** | Not Implemented | Medium |
| **Search/Filter** | Not Implemented | Low |
| **A/B Compare** | Not Implemented | Low |
| **Export/Import** | Not Implemented | Medium |
| **Sharing** | Not Implemented | Low |
| **Cloud sync** | Not Implemented | Low |

---

## Files Analyzed

- `/Users/brent/wtlfo/src/data/presets.ts` - Preset definitions
- `/Users/brent/wtlfo/src/context/preset-context.tsx` - Preset state management
- `/Users/brent/wtlfo/src/context/modulation-context.tsx` - Modulation/routing state
- `/Users/brent/wtlfo/app/(home)/presets.tsx` - Preset selection UI
- `/Users/brent/wtlfo/app/(learn)/presets.tsx` - Educational preset view
- `/Users/brent/wtlfo/app/(home)/_layout.tsx` - Navigation structure
- `/Users/brent/wtlfo/src/components/ParameterEditor.tsx` - Parameter editing UI
- `/Users/brent/wtlfo/src/types/destination.ts` - Destination types
- `/Users/brent/wtlfo/src/data/destinations.ts` - Destination definitions
- `/Users/brent/wtlfo/src/context/__tests__/preset-context.test.tsx` - Test coverage
