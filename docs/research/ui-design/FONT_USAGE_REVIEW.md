# Font Usage Review: Monospace and Numeric Display

## Executive Summary

This review analyzes the usage of monospace fonts and numeric display formatting across the React Native app. The codebase shows **inconsistent patterns** between `fontFamily: 'monospace'` and `fontVariant: ['tabular-nums']`, which can lead to alignment issues and platform inconsistencies.

---

## 1. Monospace Font Usage

### Current Usage Locations

| File | Style Name | Uses `fontFamily: 'monospace'` | Uses `fontVariant: ['tabular-nums']` |
|------|-----------|-------------------------------|-------------------------------------|
| `src/components/params/ParamBox.tsx` | `value` | Yes | Yes |
| `src/components/lfo/OutputValueDisplay.tsx` | `text` | Yes | **No** |
| `src/components/lfo/TimingInfo.tsx` | `value` | Yes | **No** |
| `src/components/lfo/ParameterBadges.tsx` | `value` | Yes | **No** |
| `src/components/lfo/WaveformIcon.tsx` | `fallbackText` | Yes | **No** |
| `src/components/destination/DestinationMeter.tsx` | `valueText` | Yes | Yes |
| `src/components/destination/DestinationPicker.tsx` | `pickerValueText`, `destinationDisplay` | Yes | **No** |
| `src/components/destination/DestinationPickerInline.tsx` | `destinationDisplay` | Yes | **No** |
| `src/components/controls/ParameterSlider.tsx` | `value` | **No** | Yes |
| `src/components/destination/CenterValueSlider.tsx` | `value`, `rangeLabel` | **No** | Yes |
| `src/components/lfo/SlowMotionBadge.tsx` | `speedText` | **No** | Yes |
| `src/components/ErrorBoundary.tsx` | `errorText` | Yes | **No** |
| `app/(home)/presets.tsx` | `details` | Yes | **No** |
| `app/(destination)/index.tsx` | `valueNumber`, `valueNumberLive` | Yes | **No** |
| `app/(learn)/timing.tsx` | `formula`, `code`, `codeComment` | Yes | **No** |
| `app/(learn)/speed.tsx` | `formula` | Yes | **No** |
| `app/(learn)/depth.tsx` | `depthValue` | **No** | Yes |
| `app/(learn)/modes.tsx` | `modeCode` | **No** | Yes |
| `app/(learn)/presets.tsx` | `paramText` | **No** | Yes |
| `app/(learn)/waveforms.tsx` | `waveType` | **No** | Yes |
| `app/(learn)/parameters.tsx` | `paramName` | **No** | Yes |

### Consistency Issues

**Problem 1: Mixed approaches for numeric display**

Some components use only `fontFamily: 'monospace'`:
- `OutputValueDisplay.tsx` - displays LFO output values like "+0.00"
- `TimingInfo.tsx` - displays BPM, cycle time, note values

Some components use only `fontVariant: ['tabular-nums']`:
- `ParameterSlider.tsx` - displays slider values
- `CenterValueSlider.tsx` - displays center values and range labels
- `SlowMotionBadge.tsx` - displays speed fraction like "1/4"

Only a few use both together (best practice):
- `ParamBox.tsx` - the parameter value display
- `DestinationMeter.tsx` - the meter value display

**Problem 2: Numbers without any monospace treatment**

The following display numbers but lack any monospace/tabular-nums styling:
- `app/(learn)/speed.tsx`: `timingProduct` style (line 255-259) - displays product numbers
- `app/(home)/presets.tsx`: Preset config details display "SPD 16 | MULT 8" with monospace but this is appropriate for text+numbers

---

## 2. Tabular Numbers Analysis

### What `fontVariant: ['tabular-nums']` Does

Tabular numbers ensure each digit occupies the same width (like in a monospace font), but only for numeric characters. This prevents numbers from "jumping" when they change (e.g., going from "9" to "10").

### Platform Support

| Platform | Support |
|----------|---------|
| iOS | Full support with system fonts |
| Android | Depends on font; Roboto supports it |
| Web | Full support with most modern fonts |

### Files Using Only `tabular-nums` (No Monospace)

These may have alignment issues if the font doesn't support tabular figures:

1. **`ParameterSlider.tsx`** (line 117)
   - Displays slider values that change during dragging
   - Risk: Numbers could shift if font lacks tabular support

2. **`CenterValueSlider.tsx`** (lines 110, 124)
   - Displays center value and range labels
   - Risk: Same as above

3. **`SlowMotionBadge.tsx`** (line 60)
   - Displays speed as "1/4 SPEED"
   - Lower risk: Format is more static

4. **Learn screens** (depth.tsx, modes.tsx, presets.tsx, waveforms.tsx, parameters.tsx)
   - Display parameter values and labels
   - Lower risk: Most are static displays

---

## 3. Alignment and Update Issues

### High-Risk Components for Shifting Numbers

1. **`OutputValueDisplay.tsx`**
   - **Issue**: Uses `fontFamily: 'monospace'` but NOT `fontVariant: ['tabular-nums']`
   - **Content**: Rapidly updating values like "+0.57", "-0.23"
   - **Risk**: HIGH - values update every frame during LFO animation
   - **Recommendation**: Add `fontVariant: ['tabular-nums']`

2. **`TimingInfo.tsx`**
   - **Issue**: Uses `fontFamily: 'monospace'` but NOT `fontVariant: ['tabular-nums']`
   - **Content**: BPM, cycle time (e.g., "2.00s", "500ms"), note values
   - **Risk**: MEDIUM - values update when parameters change
   - **Recommendation**: Add `fontVariant: ['tabular-nums']`

3. **`ParameterSlider.tsx`** and **`CenterValueSlider.tsx`**
   - **Issue**: Uses ONLY `fontVariant: ['tabular-nums']`, no monospace
   - **Content**: Slider values that change during dragging
   - **Risk**: MEDIUM - could shift on platforms where system font doesn't support tabular-nums well
   - **Recommendation**: Consider adding `fontFamily: 'monospace'` as fallback

4. **`app/(destination)/index.tsx`**
   - **Issue**: `valueNumber` and `valueNumberLive` use only `fontFamily: 'monospace'`
   - **Content**: Computed modulation values that update with LFO
   - **Risk**: HIGH - live updating values
   - **Recommendation**: Add `fontVariant: ['tabular-nums']`

### Low-Risk Components

- `ParamBox.tsx` and `DestinationMeter.tsx` - Already use BOTH approaches (best practice)
- Learn screens with static display values
- Error boundary (error messages, not numbers)

---

## 4. Font Consistency Analysis

### Current State

The app does NOT define a centralized font configuration. The `src/theme/colors.ts` file only contains color definitions.

**No custom fonts are loaded** - the app relies entirely on:
- `fontFamily: 'monospace'` - maps to platform system monospace
- `fontVariant: ['tabular-nums']` - enables OpenType feature on system font

### Platform Font Mapping

| Platform | `fontFamily: 'monospace'` Maps To |
|----------|----------------------------------|
| iOS | Menlo or Courier |
| Android | Droid Sans Mono or monospace |
| Web | Browser default monospace |

### Consistency Issues

1. **No centralized font style definition** - Each component defines its own font styles inline
2. **No typography constants** - Font sizes and weights are hardcoded in each file
3. **Inconsistent font weight** - `fontWeight: '700'` vs `'600'` vs `'500'` used inconsistently

---

## 5. Platform Differences

### iOS vs Android Monospace Appearance

The generic `'monospace'` family name renders differently:

| Aspect | iOS (Menlo) | Android (Droid Sans Mono) |
|--------|-------------|--------------------------|
| Character width | Consistent | Consistent |
| Glyph design | Apple aesthetic | Google aesthetic |
| Number clarity | Excellent | Good |
| Tabular-nums support | Native | Via Roboto |

### Known Platform-Specific Issues

1. **`fontVariant` on older Android**
   - `fontVariant: ['tabular-nums']` requires Android API 21+ (Lollipop)
   - The app checks for old iOS (line 8 in `app/_layout.tsx`) but not old Android
   - Lower risk: Most devices are API 21+

2. **Web platform handling**
   - `WaveformIcon.tsx` (line 117) checks `Platform.OS === 'web'` for Skia fallback
   - Uses monospace for fallback text display

### Recommendations for Cross-Platform Consistency

1. Consider using a specific monospace font (e.g., JetBrains Mono, Fira Code) loaded via `expo-font`
2. Create platform-specific font families if needed:
   ```javascript
   fontFamily: Platform.select({
     ios: 'Menlo',
     android: 'monospace',
     default: 'monospace'
   })
   ```

---

## 6. Recommendations Summary

### High Priority (Alignment/Shifting Issues)

1. **Add `fontVariant: ['tabular-nums']` to these files:**
   - `src/components/lfo/OutputValueDisplay.tsx` (line 49)
   - `src/components/lfo/TimingInfo.tsx` (line 63)
   - `src/components/lfo/ParameterBadges.tsx` (line 63)
   - `app/(destination)/index.tsx` (lines 211, 217)

2. **Add `fontFamily: 'monospace'` fallback to:**
   - `src/components/controls/ParameterSlider.tsx` (line 117)
   - `src/components/destination/CenterValueSlider.tsx` (lines 110, 124)

### Medium Priority (Consistency)

3. **Create centralized typography constants** in `src/theme/`:
   ```typescript
   export const typography = {
     monoValue: {
       fontFamily: 'monospace',
       fontVariant: ['tabular-nums'] as const,
     },
     // ... other text styles
   };
   ```

4. **Standardize font weights** - Use consistent weights across similar components

### Low Priority (Polish)

5. **Consider custom monospace font** for brand consistency across platforms
6. **Add font loading state** if custom fonts are added

---

## 7. Files Requiring Updates

| File | Line(s) | Current | Recommended |
|------|---------|---------|-------------|
| `src/components/lfo/OutputValueDisplay.tsx` | 49 | `fontFamily: 'monospace'` | Add `fontVariant: ['tabular-nums']` |
| `src/components/lfo/TimingInfo.tsx` | 63 | `fontFamily: 'monospace'` | Add `fontVariant: ['tabular-nums']` |
| `src/components/lfo/ParameterBadges.tsx` | 63 | `fontFamily: 'monospace'` | Add `fontVariant: ['tabular-nums']` |
| `app/(destination)/index.tsx` | 211, 217 | `fontFamily: 'monospace'` | Add `fontVariant: ['tabular-nums']` |
| `src/components/controls/ParameterSlider.tsx` | 117 | `fontVariant: ['tabular-nums']` | Add `fontFamily: 'monospace'` |
| `src/components/destination/CenterValueSlider.tsx` | 110, 124 | `fontVariant: ['tabular-nums']` | Add `fontFamily: 'monospace'` |
| `src/components/lfo/SlowMotionBadge.tsx` | 60 | `fontVariant: ['tabular-nums']` | Add `fontFamily: 'monospace'` |

---

## Conclusion

The app has a functional but inconsistent approach to numeric/monospace typography. The main issues are:

1. **Inconsistent use** of `fontFamily: 'monospace'` vs `fontVariant: ['tabular-nums']`
2. **Missing tabular-nums** on rapidly updating numeric displays (OutputValueDisplay, TimingInfo)
3. **No centralized font definitions** leading to scattered, inconsistent styling

Implementing the recommendations will improve numeric alignment stability, especially for live-updating values, and create a more maintainable codebase.
