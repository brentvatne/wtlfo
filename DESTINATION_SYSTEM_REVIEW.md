# Destination/Modulation Routing System Review

**Review Date:** January 2026
**Reviewer:** Systems Design Analysis

---

## Executive Summary

The destination/modulation routing system in WTLFO is well-architected with clear separation of concerns, proper persistence, and good extensibility for multi-LFO support. However, there are gaps in Elektron destination coverage, some UX friction in destination selection, and opportunities for advanced features like multi-destination routing.

---

## 1. Destination Data Model

### Current Implementation

**File:** `/Users/brent/wtlfo/src/types/destination.ts`

```typescript
export interface DestinationDefinition {
  id: DestinationId;
  name: string;
  displayName: string;  // Short 3-5 char label for UI
  min: number;
  max: number;
  defaultValue: number;
  unit?: string;
  category: DestinationCategory;
  bipolar: boolean;     // true for parameters centering at 0
}
```

**Categories:** `filter`, `amp`, `pitch`, `sample`, `fx`

### Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| Structure | Good | Clear, well-typed, extensible |
| Field Coverage | Good | All essential fields present |
| Type Safety | Excellent | Union types for IDs prevent typos |
| Default Values | Good | Sensible defaults per parameter |

### Strengths

1. **Bipolar flag** correctly differentiates signed vs unsigned parameters
2. **Category system** enables logical grouping in UI
3. **Display names** provide consistent short labels (3-5 chars)
4. **Unit field** (optional) supports future value formatting

### Weaknesses

1. **No description field** - would help in educational UI
2. **No MIDI CC mapping** - needed for actual Elektron control
3. **No step size** - some parameters might need non-integer steps

### Elektron Destination Coverage

**File:** `/Users/brent/wtlfo/src/data/destinations.ts`

Currently implemented: **17 destinations**

| Category | Implemented | Missing from Elektron |
|----------|-------------|----------------------|
| Filter | 4 | Filter type, Base/Width |
| Amp | 6 | - |
| Pitch | 2 | Portamento |
| Sample | 2 | Loop position, Sample slot |
| FX | 3 | Chorus, Flanger, Phaser |

**Notable Omissions:**
- LFO cross-modulation destinations (LFO2 Speed/Depth, etc.)
- MIDI track destinations (CC, Pitch Bend, Aftertouch)
- Sample slot selection
- Filter type

**Recommendation:** Add missing destinations progressively, prioritizing those mentioned in the Learn section (`/Users/brent/wtlfo/app/(learn)/destinations.tsx`).

---

## 2. Destination Selection UX

### Current Implementation

Two picker variants exist:

1. **DestinationPicker** (`/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx`)
   - Modal-based full-screen picker
   - Shows current destination inline, opens modal on tap
   - Categories displayed vertically with wrapped items

2. **DestinationPickerInline** (`/Users/brent/wtlfo/src/components/destination/DestinationPickerInline.tsx`)
   - Embedded picker (no modal)
   - Shows all destinations organized by category
   - Supports toggle-to-deselect (tap again to set 'none')

### Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| Discoverability | Good | Category grouping helps navigation |
| Speed | Moderate | Modal adds 1 extra tap |
| Visual Clarity | Good | Selected state is clear (orange) |
| Accessibility | Excellent | Proper roles, labels, hints |

### Strengths

1. **Haptic feedback** on selection
2. **Category labels** match Elektron terminology
3. **Two-line display** shows both short code and full name
4. **Accessibility** is comprehensive (radio roles, hints)

### Pain Points

1. **No search/filter** - 17 destinations is manageable, but will grow
2. **No recent destinations** - must scroll to find frequently used
3. **No keyboard shortcuts** - would help power users
4. **Modal animation delay** - slight friction in quick workflows

### Recommendations

1. Add "Recent" section at top of picker (last 3-5 used)
2. Consider swipe gestures for quick category switching
3. Add destination preview showing expected modulation range

---

## 3. Center Value Handling

### Current Implementation

**File:** `/Users/brent/wtlfo/src/context/modulation-context.tsx`

```typescript
// Center values remembered per destination (persisted globally)
centerValues: Partial<Record<DestinationId, number>>;
setCenterValue: (destinationId: DestinationId, value: number) => void;
getCenterValue: (destinationId: DestinationId) => number;
```

**Persistence:** Uses `expo-sqlite/kv-store` with synchronous read on mount.

### Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| Persistence | Excellent | Survives app restart |
| Default Fallback | Good | Uses destination's defaultValue |
| Zero Handling | Correct | Zero is valid, not treated as missing |
| Error Handling | Good | Silent fallback on parse errors |

### Verification (from tests)

```typescript
// Zero is properly handled
act(() => result.current.setCenterValue('pan', 0));
expect(result.current.getCenterValue('pan')).toBe(0);

// Falls back to destination default
expect(result.current.getCenterValue('filter_cutoff')).toBe(64);
```

### Strengths

1. **Per-destination persistence** - switching destinations recalls previous center
2. **Synchronous initialization** - no flash of default values
3. **'none' destination handled** - returns 0, no storage

### Potential Issues

1. **Global center values** - not per-preset. Changing a preset doesn't restore its center values
2. **No reset mechanism** - can't easily restore defaults
3. **Storage key collision** - uses simple "centerValues" key

### Recommendation

Consider scoping center values to presets for fuller state restoration:
```typescript
interface LFOPreset {
  // existing fields...
  centerValues?: Partial<Record<DestinationId, number>>;
}
```

---

## 4. Range and Scaling

### Modulation Math

**Core formula** (from `/Users/brent/wtlfo/src/hooks/useModulatedValue.ts`):

```typescript
const maxModulation = range / 2;  // Half the parameter range
const depthScale = lfoDepth / 63; // -1 to +1

// In worklet:
const modulationAmount = lfoOutput.value * depthScale * maxModulation;
const raw = centerValue + modulationAmount;
return Math.max(min, Math.min(max, raw));
```

### Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| Bipolar Scaling | Correct | depth/63 gives -1 to +1 |
| Clamping | Correct | Always within min/max bounds |
| Unipolar Handling | Partial | EXP/RMP special-cased in meter only |

### Detailed Analysis

1. **Depth normalization:** `depth / 63` (not 64) is correct for Elektron's -64 to +63 range where 63 is full positive scale.

2. **Range calculation:** `range / 2` means at depth +63:
   - Filter cutoff (0-127): swings +/- 63.5 from center
   - Pan (-64 to +63): swings +/- 63.5 from center
   - This is correct behavior

3. **Unipolar waveforms:** The `DestinationMeter` correctly handles EXP and RMP as unipolar:
   ```typescript
   const UNIPOLAR_WAVEFORMS: WaveformType[] = ['EXP', 'RMP'];
   if (isUnipolar) {
     if (depth >= 0) {
       targetLowerBound = centerValue;
       targetUpperBound = Math.min(max, centerValue + swing);
     } else {
       targetLowerBound = Math.max(min, centerValue - swing);
       targetUpperBound = centerValue;
     }
   }
   ```

### Potential Issue

The `useModulatedValue` hook doesn't account for unipolar waveforms - it applies the same bipolar formula to all waveforms. This might cause a mismatch between the meter visualization and actual computed values.

**Recommendation:** Either:
- Document that LFO engine handles unipolar scaling, or
- Add waveform-awareness to `useModulatedValue`

---

## 5. Destination Meter

### Current Implementation

**File:** `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`

Uses Skia Canvas with Reanimated for smooth 60fps updates:
- Vertical bar showing parameter range
- Orange fill showing modulation bounds
- White line showing current value
- Grid lines for visual reference

### Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| Animation Smoothness | Excellent | Skia + Reanimated worklets |
| Visual Clarity | Good | Clear distinction between bounds and value |
| Edge Case Handling | Good | Null destination shows empty meter |
| Edit Mode | Good | Hides current line when editing center |

### Strengths

1. **Animated transitions** using spring physics for bound changes
2. **Grid lines** provide scale reference
3. **Color coding** - orange bounds, white current value
4. **isEditing prop** - cleans up display during slider interaction

### Potential Improvements

1. **No scale labels** - hard to know exact values without the separate display
2. **Fixed dimensions** - could be more responsive
3. **No bipolar indicator** - doesn't show zero crossing for signed parameters

### Code Quality Note

The component follows hooks rules correctly - all derived values are created unconditionally even if not always rendered:

```typescript
// Pre-compute derived values for bound lines (must be unconditional)
const upperBoundP1 = useDerivedValue(() => vec(meterX, upperBoundY.value));
// ... used conditionally in render
{depth !== 0 && <Line p1={upperBoundP1} ... />}
```

---

## 6. Missing Features

### Multi-Destination Support

**Current state:** Architecture supports multiple LFOs via routings array, but UI is single-LFO only.

```typescript
interface LFORouting {
  lfoId: string;              // 'lfo1' for now
  destinationId: DestinationId;
  amount: number;             // 0-100%
}
```

**For multi-destination per LFO:**
- Would need to change from `LFORouting[]` to a structure allowing multiple destinations per LFO
- Or add a second LFO with different destination

### Destination Presets

**Not implemented.** Users cannot save/recall destination + center value combinations.

Presets DO include destination info:
```typescript
interface LFOPreset {
  config: LFOPresetConfig;
  destination?: DestinationId;
  centerValue?: number;
}
```

But center values are stored globally, not restored from preset.

### Quick Switching

**Partial.** The param modal (`/Users/brent/wtlfo/app/(home)/param/[param].tsx`) allows cycling through parameters with prev/next buttons, but no direct destination cycling from main screen.

### Feature Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Recent destinations | High | Low | P1 |
| Preset center value restore | High | Medium | P1 |
| MIDI CC mapping | High | High | P2 |
| Multi-destination routing | Medium | High | P3 |
| Destination search | Low | Low | P3 |

---

## 7. UX Improvement Opportunities

### Selection Speed

**Current flow:** Tap DEST box -> Modal opens -> Scroll to category -> Tap destination -> Modal closes

**Improvements:**
1. **Gesture-based:** Long-press DEST to show quick picker
2. **Recent section:** Show last 3-5 destinations at top
3. **Category tabs:** Horizontal tabs for faster category access

### Feedback Sufficiency

**Current feedback:**
- Haptic on selection (good)
- Visual highlight on selected (good)
- Modal header shows "Select Destination" (basic)

**Missing feedback:**
- No preview of what modulation will look like
- No indication of current center value for destination
- No warning when center value is at extreme

### Identified Pain Points

1. **Two places to set destination:** ParamGrid -> DEST modal, and standalone /(destination) screen
2. **Inconsistent behavior:** Inline picker supports toggle-deselect, modal picker doesn't
3. **No undo:** Accidental destination change requires finding previous one

### Recommendations Summary

| Issue | Solution | Complexity |
|-------|----------|------------|
| Slow selection | Add recent destinations | Low |
| No preview | Show mini-meter in picker | Medium |
| Inconsistent toggle | Unify picker behavior | Low |
| Lost center values | Scope to presets | Medium |
| Missing destinations | Add Elektron parity | Low each |

---

## Appendix: File Reference

| File | Purpose |
|------|---------|
| `/Users/brent/wtlfo/src/types/destination.ts` | Type definitions |
| `/Users/brent/wtlfo/src/data/destinations.ts` | Destination registry |
| `/Users/brent/wtlfo/src/context/modulation-context.tsx` | State management |
| `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx` | Modal picker |
| `/Users/brent/wtlfo/src/components/destination/DestinationPickerInline.tsx` | Inline picker |
| `/Users/brent/wtlfo/src/components/destination/CenterValueSlider.tsx` | Center value control |
| `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx` | Visual meter |
| `/Users/brent/wtlfo/src/hooks/useModulatedValue.ts` | Modulation math |
| `/Users/brent/wtlfo/app/(destination)/index.tsx` | Destination screen |
| `/Users/brent/wtlfo/app/(home)/param/[param].tsx` | Parameter edit modal |
| `/Users/brent/wtlfo/src/context/__tests__/modulation-context.test.tsx` | Context tests |

---

## Conclusion

The destination/modulation system is solidly built with good foundations for future expansion. The main areas for improvement are:

1. **Elektron parity** - Add missing destinations
2. **UX polish** - Recent destinations, faster selection
3. **State coherence** - Scope center values to presets
4. **Documentation** - Add descriptions to destination definitions

The architecture supports multi-LFO routing, positioning the app well for future Digitakt II feature parity.
