# Value Display Review

## Overview

This document analyzes how numeric values, parameters, timing information, and labels are displayed across the LFO app. The review covers consistency, precision, formatting, and usability of value displays.

---

## 1. Numeric Displays

### Consistency Assessment

**Consistent Patterns Found:**

- **Sign prefix for bipolar values**: Speed, Depth, Fade consistently use `+` prefix for positive values (e.g., `+32`, `-16`)
- **Integer display**: Most values are shown as integers after rounding, appropriate for MIDI-like 0-127 ranges
- **Monospace fonts**: Critical numeric displays use `fontFamily: 'monospace'` for stable alignment

**Inconsistencies Found:**

| Component | Format | Issue |
|-----------|--------|-------|
| `ParameterBadges.tsx` | `speed.toFixed(2)` / `depth.toFixed(2)` | Shows 2 decimal places (e.g., "32.00") but these are integer parameters |
| `ParamGrid.tsx` | `+${numVal}` / `String(numVal)` | Uses integer format (correct) |
| `OutputValueDisplay.tsx` | `val.toFixed(2)` | Appropriate - raw LFO output is truly floating point |

**Recommendation**: `ParameterBadges.tsx` should use integer formatting for speed/depth to match other displays.

### Precision Analysis

| Value Type | Current Precision | Appropriate? |
|------------|-------------------|--------------|
| Speed (-64 to +63) | Integer | Yes |
| Depth (-64 to +63) | Integer | Yes |
| Fade (-64 to +63) | Integer | Yes |
| Start Phase (0-127) | Integer | Yes |
| Multiplier (1-2048) | Integer | Yes |
| LFO Output (-1 to +1) | 2 decimals | Yes |
| Center Value (0-127) | Integer | Yes |
| Cycle Time | 0-2 decimals | Mostly - see notes |
| Steps | 0-1 decimal | Yes |

**Cycle Time Precision Notes:**
- `TimingInfo.tsx` uses smart formatting:
  - `< 1000ms`: `cycleTimeMs.toFixed(0)` + "ms" (e.g., "500ms")
  - `>= 1000ms`: `(cycleTimeMs / 1000).toFixed(2)` + "s" (e.g., "2.50s")
- This is appropriate, though 2 decimal places for seconds may be excessive (1 decimal would suffice for readability)

---

## 2. Parameter Values

### Clarity Assessment

**Well-Implemented:**

- **ParamBox**: Displays value prominently with label beneath
- **ParamGrid**: Uses consistent formatting function `formatValue()` for all parameters
- **CenterValueSlider**: Shows live value with range labels (min/max) visible

**Areas for Improvement:**

1. **Multiplier display context**:
   - Current: `BPM 128` or just `128` (fixed mode)
   - The "BPM" prefix helps distinguish tempo-synced mode
   - Consider: `128x` for fixed mode to indicate multiplication?

2. **Start Phase / Slew dual-purpose**:
   - Label changes to "SLEW" for RND waveform (good contextual awareness)
   - Value format remains consistent (0-127)

### Range Communication

| Parameter | Range Shown? | Location |
|-----------|--------------|----------|
| Speed | In description only | Param modal details |
| Depth | In description only | Param modal details |
| Fade | In description only | Param modal details |
| Start Phase | In description only | Param modal details |
| Center Value | Yes - min/max labels | CenterValueSlider |

**Recommendation**: Range indicators are only visible when editing (in the parameter modal). The home screen grid shows no range context. Consider adding subtle visual range indicators.

### Special Values

**Center/Zero Handling:**
- `CenterValueSlider.tsx` shows "0" label for bipolar parameters (line 84)
- `OutputValueDisplay.tsx` shows `+0.00` for zero (includes sign)
- Zero values in ParamGrid show as `+0` for speed/depth/fade

**Extremes:**
- Min/max values display correctly
- No special styling or indicators for extreme values
- DestinationMeter properly clamps values: `Math.max(min, Math.min(max, value))`

---

## 3. Timing Displays

### BPM Display

**Location**: `TimingInfo.tsx`

**Implementation:**
```typescript
{bpm !== undefined && (
  <View style={styles.item}>
    <Text style={[styles.value, { color: theme.text }]}>{bpm}</Text>
    <Text style={[styles.label, { color: theme.textSecondary }]}>BPM</Text>
  </View>
)}
```

**Assessment:**
- Clean display with value and label
- No decimal places (appropriate for BPM)
- Uses theme colors for consistency

### Note Values

**Implementation:**
- `noteValue` is passed as a pre-formatted string (e.g., "1/4", "1 bar", "16 bars")
- Displayed as-is, which is appropriate

**Assessment:**
- Clear musical notation
- Formatting happens upstream in timing calculations

### Cycle Time

**Smart Formatting (Good):**
```typescript
{cycleTimeMs >= 1000
  ? `${(cycleTimeMs / 1000).toFixed(2)}s`
  : `${cycleTimeMs.toFixed(0)}ms`}
```

**Assessment:**
- Automatic unit switching is user-friendly
- Prevents awkward values like "1500ms" (shows "1.50s" instead)

### Steps Display

**Implementation:**
```typescript
const formatSteps = (s: number): string => {
  if (Number.isInteger(s)) return String(s);
  return s.toFixed(1);
};
```

**Assessment:**
- Clean: shows integers without decimals, fractional with 1 decimal
- Only shown when `steps > 0`

### Slow Motion Badge

**Location**: `SlowMotionBadge.tsx`

**Implementation:**
```typescript
const speedDisplay = Number.isInteger(factor)
  ? `1/${factor}`
  : `1/${factor.toFixed(1)}`;
```

**Assessment:**
- Excellent - shows speed as intuitive fraction (e.g., "1/4 SPEED")
- Handles non-integer factors gracefully

---

## 4. Labels and Units

### Unit Consistency

| Unit | Usage | Consistency |
|------|-------|-------------|
| BPM | Timing info | Consistent |
| ms | Cycle time < 1s | Consistent |
| s | Cycle time >= 1s | Consistent |
| STEPS | Step count | Consistent |
| NOTE | Musical notation | Consistent |
| CYCLE | Cycle duration | Consistent |

### Abbreviation Clarity

| Abbreviation | Full Name | Clear? |
|--------------|-----------|--------|
| SPD | Speed | Yes |
| MULT | Multiplier | Yes |
| DEP | Depth | Yes |
| SPH | Start Phase | Moderate - could be "PHASE" |
| SLEW | Slew (for RND) | Yes (audio term) |
| DEST | Destination | Yes |
| WAVE | Waveform | Yes |

### Label Styling Consistency

**Consistent patterns:**
- All uppercase labels
- Letter spacing: 0.5-1px
- Font weight: 500-700
- Colors: Theme's `textSecondary` or muted grays

**File-specific variations:**
| File | Font Size | Weight | Color |
|------|-----------|--------|-------|
| ParamBox.tsx | 10px | 600 | #777788 |
| TimingInfo.tsx | 10px | 500 | theme.textSecondary |
| CenterValueSlider.tsx | 12px | 600 | #888899 |
| ParameterSlider.tsx | 12px | 600 | colors.textSecondary |
| DestinationMeter.tsx | 10px | 500 | #666677 |

**Assessment**: Slight inconsistencies in label font sizes (10-12px) and weights (500-600). Consider standardizing.

---

## 5. Real-time Values

### Live Value Readability

**OutputValueDisplay:**
- Updates via `useAnimatedReaction` - smooth
- Format: `+0.00` to `-1.00`
- Color-coded: green for positive, red for negative (good visual feedback)

**DestinationMeter:**
- Shows current modulated value as integer
- Updates via `useAnimatedReaction` with `runOnJS`
- Clean numeric display

### Update Frequency

**Implementation Analysis:**
- Both `OutputValueDisplay` and `DestinationMeter` use `useAnimatedReaction`
- This means updates happen on every frame the value changes
- React Native Reanimated handles this efficiently on the UI thread

**Potential Jitter:**
- `DestinationMeter` uses `Math.round()` on line 94, which could cause value "flickering" if the raw value oscillates around .5 boundaries
- `OutputValueDisplay` uses `toFixed(2)`, which provides stable display

### Editing State Handling

**Well-implemented:**
- `isEditing` prop hides live values during parameter editing
- `OutputValueDisplay` shows "-" placeholder when editing
- `DestinationMeter` shows center value (not modulated) when editing

---

## 6. Alignment and Spacing

### Number Alignment

**Tabular Nums Usage:**

| Component | Uses tabular-nums? | Correct? |
|-----------|-------------------|----------|
| ParamBox.tsx | Yes (`fontVariant: ['tabular-nums']`) | Yes |
| DestinationMeter.tsx | Yes | Yes |
| CenterValueSlider.tsx | Yes (value display) | Yes |
| ParameterSlider.tsx | Yes | Yes |
| SlowMotionBadge.tsx | Yes | Yes |
| TimingInfo.tsx | No - uses `fontFamily: 'monospace'` | Partial* |
| OutputValueDisplay.tsx | No - uses `fontFamily: 'monospace'` | Partial* |

*Note: `monospace` provides fixed-width characters but `tabular-nums` specifically ensures all digits are equal width in proportional fonts. For monospace fonts, this is redundant.

**Recommendation**: Standardize on either:
1. `fontFamily: 'monospace'` only, OR
2. `fontVariant: ['tabular-nums']` with system font

Currently mixed approaches may cause subtle alignment differences.

### Spacing Consistency

**ParamGrid spacing:**
- Rows use `borderBottomWidth: StyleSheet.hairlineWidth`
- Items use `paddingVertical: 10`, `paddingHorizontal: 4`
- Consistent visual rhythm

**Timing Info spacing:**
- `paddingVertical: 8`, `paddingHorizontal: 16`
- Items use `space-around` justification

**Assessment**: Generally consistent within components, though `paddingHorizontal` varies (4-16px) across different display contexts.

---

## 7. Edge Cases

### Zero Values

| Component | Zero Display | Assessment |
|-----------|--------------|------------|
| Speed/Depth/Fade | `+0` | Clear, explicit sign |
| Output | `+0.00` | Clear, consistent precision |
| Steps | Hidden when 0 | Appropriate |
| Center Value | `0` (no sign) | Correct for unipolar |
| Bipolar Center | `+0` with "0" label shown | Clear |

### Negative Values

- Speed, Depth, Fade: Show as `-N` (e.g., `-32`)
- Output: Shows as `-0.XX` with red color
- All negative handling is consistent

### Extremes

**Min/Max clamping in DestinationMeter:**
```typescript
const value = Math.round(Math.max(min, Math.min(max, center + modulationAmount)));
```

- Values are properly clamped before display
- No special visual indication of hitting limits (could be an enhancement)

### Invalid Values

**Current handling:**
- `destination ?? null` patterns handle missing destinations
- `getDestination(activeDestinationId)` returns null for 'none'
- Display shows "—" (em dash) for no destination

**Assessment**: Good null handling, no crashes on invalid state.

---

## Summary of Issues

### High Priority

1. **ParameterBadges.tsx decimal inconsistency**: Speed and depth show `.toFixed(2)` but should be integers

### Medium Priority

2. **Label styling inconsistency**: Font sizes vary (10-12px) and weights (500-600) across components
3. **Mixed font approach**: Some use `fontFamily: 'monospace'`, others `fontVariant: ['tabular-nums']`

### Low Priority / Enhancements

4. **Cycle time precision**: 2 decimal places for seconds may be excessive; 1 would suffice
5. **Range indicators**: No visual range context on home screen parameter grid
6. **Extreme value indicators**: No visual feedback when values hit min/max limits

---

## Files Reviewed

- `/Users/brent/wtlfo/src/components/params/ParamBox.tsx`
- `/Users/brent/wtlfo/src/components/params/ParamGrid.tsx`
- `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`
- `/Users/brent/wtlfo/src/components/destination/CenterValueSlider.tsx`
- `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx`
- `/Users/brent/wtlfo/src/components/lfo/TimingInfo.tsx`
- `/Users/brent/wtlfo/src/components/lfo/ParameterBadges.tsx`
- `/Users/brent/wtlfo/src/components/lfo/OutputValueDisplay.tsx`
- `/Users/brent/wtlfo/src/components/lfo/SlowMotionBadge.tsx`
- `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx`
- `/Users/brent/wtlfo/src/components/controls/SegmentedControl.tsx`
- `/Users/brent/wtlfo/app/(home)/index.tsx`
- `/Users/brent/wtlfo/app/(home)/param/[param].tsx`
