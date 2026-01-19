# Typography Review

## Executive Summary

This React Native app demonstrates reasonably consistent typography patterns for a synthesizer/LFO editor application. The app uses a dark theme with monospace fonts for numerical values, which is appropriate for the technical nature of the content. However, there are several areas where improvements could enhance consistency, accessibility, and readability.

---

## 1. Font Family Usage

### Current State

| Font Type | Usage |
|-----------|-------|
| System Default | Body text, labels, descriptions |
| `monospace` | Numerical values, parameter displays, technical codes |

### Findings

**Strengths:**
- Monospace is consistently applied to numerical values (good practice for alignment)
- No custom fonts loaded, reducing bundle size and load time
- System fonts ensure native feel on each platform

**Issues:**

1. **Generic `'monospace'` keyword used instead of platform-specific fonts**
   - Files affected: `ParameterBadges.tsx`, `OutputValueDisplay.tsx`, `DestinationPicker.tsx`, `DestinationPickerInline.tsx`, `DestinationMeter.tsx`, `TimingInfo.tsx`, `WaveformIcon.tsx`, `ParamBox.tsx`, `presets.tsx`, `ErrorBoundary.tsx`
   - The generic `fontFamily: 'monospace'` may render differently across platforms
   - **Recommendation:** Use Platform-specific font families:
     ```typescript
     fontFamily: Platform.select({
       ios: 'Menlo',
       android: 'monospace',
       default: 'monospace',
     })
     ```

2. **Inconsistent application of monospace**
   - `ParameterSlider.tsx` uses `fontVariant: ['tabular-nums']` without `fontFamily: 'monospace'`
   - This creates visual inconsistency when displaying parameter values

### Locations with `fontFamily: 'monospace'`
- `/Users/brent/wtlfo/src/components/lfo/ParameterBadges.tsx` (line 63)
- `/Users/brent/wtlfo/src/components/lfo/OutputValueDisplay.tsx` (line 49)
- `/Users/brent/wtlfo/src/components/lfo/TimingInfo.tsx` (line 63)
- `/Users/brent/wtlfo/src/components/lfo/WaveformIcon.tsx` (line 177)
- `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx` (lines 160, 236)
- `/Users/brent/wtlfo/src/components/destination/DestinationPickerInline.tsx` (line 119)
- `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx` (line 277)
- `/Users/brent/wtlfo/src/components/params/ParamBox.tsx` (line 81)
- `/Users/brent/wtlfo/src/components/ErrorBoundary.tsx` (line 164)
- `/Users/brent/wtlfo/app/(home)/presets.tsx` (line 94)

---

## 2. Font Sizes

### Current Scale Analysis

| Size (px) | Usage | Count |
|-----------|-------|-------|
| 10 | Small labels (category, parameter labels) | 12 |
| 11 | Category headings | 2 |
| 12 | Labels, details, small text | 14 |
| 13 | Segment control text, notes | 6 |
| 14 | Values, info text, navigation | 13 |
| 15 | Bullet text, param values | 7 |
| 16 | Primary values, buttons, body text | 16 |
| 18 | Section titles, headers | 7 |
| 24 | Large titles, chevrons | 3 |
| 48 | Error icon | 1 |

### Findings

**Strengths:**
- Generally appropriate sizes for mobile (10-18px range for most content)
- Clear hierarchy from labels (10-12px) to values (14-16px) to titles (18-24px)

**Issues:**

1. **Inconsistent type scale**
   - The scale jumps erratically: 10, 11, 12, 13, 14, 15, 16, 18, 24, 48
   - **Recommendation:** Adopt a consistent scale like:
     ```typescript
     const typography = {
       xs: 10,
       sm: 12,
       base: 14,
       md: 16,
       lg: 18,
       xl: 24,
     };
     ```

2. **Similar sizes used inconsistently**
   - Label text varies between 10px, 11px, and 12px without clear rationale
   - Value text varies between 14px, 15px, and 16px

3. **No centralized typography theme**
   - Font sizes are hardcoded in each StyleSheet
   - The `/Users/brent/wtlfo/src/theme/` directory only exports colors, no typography
   - **Recommendation:** Add typography constants to theme:
     ```typescript
     // /Users/brent/wtlfo/src/theme/typography.ts
     export const typography = {
       label: { fontSize: 10, fontWeight: '600' },
       body: { fontSize: 14, fontWeight: '400' },
       value: { fontSize: 16, fontWeight: '700' },
       heading: { fontSize: 18, fontWeight: '600' },
     };
     ```

---

## 3. Font Weights

### Current Usage

| Weight | Usage | Count |
|--------|-------|-------|
| 300 | Chevrons (decorative) | 1 |
| 500 | Secondary labels, meta text | 8 |
| 600 | Labels, buttons, headings | 27 |
| 700 | Values, primary content | 24 |

### Findings

**Strengths:**
- Clear weight hierarchy: 500 (secondary), 600 (labels/buttons), 700 (values)
- Consistent use of 700 for important numerical values
- Weights are available in system fonts

**Issues:**

1. **No 400 (normal) weight used**
   - All body text uses 500+, which may feel heavy for longer passages
   - Learn section content (`bulletText`, `description`) could benefit from 400 weight

2. **Labels inconsistently weighted**
   - Some labels use 500, others use 600
   - Example: `TimingInfo.tsx` label uses 500, `ParamBox.tsx` label uses 600

---

## 4. Line Height

### Current State

Only **5 instances** of explicit `lineHeight` across the entire codebase:

| File | Line Height | Context |
|------|-------------|---------|
| `ErrorBoundary.tsx` | 80 | Icon centering hack |
| `param/[param].tsx` | 20 | Description text |
| `param/[param].tsx` | 17 | Detail text |
| `param/[param].tsx` | 18 | Warning text |
| `intro.tsx` | 22 | Bullet text |

### Findings

**Critical Issue: Most text lacks explicit lineHeight**

**Affected areas:**
- Modal content text
- Destination names and descriptions
- All label text
- Card descriptions

**Recommendations:**

1. **Add line height to all multi-line text**
   - Body text: `lineHeight: fontSize * 1.5` (minimum)
   - Single-line labels: Can omit lineHeight

2. **Create consistent line height ratios:**
   ```typescript
   const getLineHeight = (fontSize: number, type: 'tight' | 'normal' | 'relaxed') => {
     const ratios = { tight: 1.2, normal: 1.5, relaxed: 1.8 };
     return Math.round(fontSize * ratios[type]);
   };
   ```

3. **Specific fixes needed:**
   - `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx`: Add lineHeight to `destinationName` style
   - `/Users/brent/wtlfo/app/(learn)/index.tsx`: Add lineHeight to `cardDescription`
   - `/Users/brent/wtlfo/app/(settings)/index.tsx`: Add lineHeight to coming soon text

---

## 5. Text Truncation

### Current State

**No instances of `numberOfLines` or `ellipsizeMode` found in the codebase.**

### Findings

**Potential issues:**

1. **Destination picker values could overflow**
   - File: `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx`
   - Long destination names may wrap unexpectedly

2. **Preset names have no truncation**
   - File: `/Users/brent/wtlfo/app/(home)/presets.tsx`
   - User-created preset names could be very long

3. **Parameter values in ParamGrid**
   - File: `/Users/brent/wtlfo/src/components/params/ParamBox.tsx`
   - BPM multiplier values like "BPM 2048" are long strings

**Recommendations:**

1. Add truncation to potentially long text:
   ```typescript
   <Text numberOfLines={1} ellipsizeMode="tail" style={styles.presetName}>
     {preset.name}
   </Text>
   ```

2. Consider adding `adjustsFontSizeToFit` for constrained numeric displays:
   ```typescript
   <Text
     adjustsFontSizeToFit
     numberOfLines={1}
     minimumFontScale={0.8}
   >
     {value}
   </Text>
   ```

---

## 6. Numeric Rendering

### Current State

| Technique | Files Using |
|-----------|-------------|
| `fontVariant: ['tabular-nums']` | 6 files |
| `fontFamily: 'monospace'` | 10 files |
| Both together | 2 files |
| Neither | Several numeric displays |

### Files using `tabular-nums`:
- `/Users/brent/wtlfo/src/components/params/ParamBox.tsx` (line 80) - **With monospace**
- `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx` (line 276) - **With monospace**
- `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx` (line 117) - **Without monospace**
- `/Users/brent/wtlfo/src/components/destination/CenterValueSlider.tsx` (lines 110, 124) - **Without monospace**
- `/Users/brent/wtlfo/src/components/lfo/SlowMotionBadge.tsx` (line 60) - **Without monospace**

### Findings

**Strengths:**
- Good use of `tabular-nums` for animated/updating numeric values (meters, sliders)
- Ensures numbers don't "jump" as values change

**Issues:**

1. **Inconsistent application of `tabular-nums`**
   - `OutputValueDisplay.tsx` uses monospace but not `tabular-nums`
   - `TimingInfo.tsx` uses monospace but not `tabular-nums`
   - `ParameterBadges.tsx` uses monospace but not `tabular-nums`

2. **Redundant when using monospace**
   - Monospace fonts inherently have tabular number spacing
   - Using both is harmless but unnecessary

**Recommendations:**

1. Standardize numeric display style:
   ```typescript
   const numericStyle = {
     fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
     fontVariant: ['tabular-nums'], // Fallback for proportional fonts
   };
   ```

2. Add `tabular-nums` to remaining numeric displays:
   - `/Users/brent/wtlfo/src/components/lfo/OutputValueDisplay.tsx`
   - `/Users/brent/wtlfo/src/components/lfo/TimingInfo.tsx`
   - `/Users/brent/wtlfo/src/components/lfo/ParameterBadges.tsx`

---

## 7. Text Accessibility

### Current State

**No instances of `allowFontScaling` found in the codebase.**

This means all text will scale with system Dynamic Type settings (the default behavior).

### Findings

**Strengths:**
- Default font scaling is enabled (good for accessibility)
- Semantic accessibility labels are used extensively throughout the app

**Issues:**

1. **No maximum font scale limits**
   - Layouts may break at very large text sizes
   - Particularly concerning for:
     - `ParamGrid` - constrained grid layout
     - `ParameterBadges` - compact badge containers
     - Navigation buttons with fixed hit areas

2. **No `accessibilityRole="text"` on informational text**
   - Screen readers may not properly announce text content

3. **Contrast ratios need verification**
   - Current colors from theme:
     - `textPrimary: '#ffffff'` on `background: '#0a0a0a'` - Excellent (21:1)
     - `textSecondary: '#888899'` on `background: '#0a0a0a'` - Acceptable (~5.5:1)
     - `textMuted: '#666677'` on `background: '#0a0a0a'` - **Borderline (~4.1:1)**
     - `textDisabled: '#555566'` on `background: '#0a0a0a'` - **Fails WCAG AA (~3:1)**

**Recommendations:**

1. **Add maximum font scale to constrained layouts:**
   ```typescript
   <Text maxFontSizeMultiplier={1.3}>
     {compactValue}
   </Text>
   ```

2. **Improve muted/disabled text contrast:**
   - Change `textMuted` from `#666677` to `#8888aa` (~5.5:1)
   - Change `textDisabled` from `#555566` to `#777788` (~4.5:1)

3. **Test with accessibility inspector:**
   - Enable iOS Dynamic Type at maximum setting
   - Verify all screens remain usable

---

## 8. Additional Observations

### Letter Spacing

Used consistently for uppercase labels:
- `letterSpacing: 0.5` - Labels, badges
- `letterSpacing: 1` - Section headings, all-caps titles

This is a good practice that improves readability of uppercase text.

### Text Transform

`textTransform: 'uppercase'` is used appropriately for:
- Parameter labels (SPD, MULT, WAVE, etc.)
- Section headings
- Category labels

### Missing Features

1. **No typography theme file**
   - All text styles are defined inline in StyleSheets
   - Creates maintenance burden and inconsistency

2. **No text style presets**
   - Would benefit from reusable text styles:
     ```typescript
     const textStyles = {
       paramLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
       paramValue: { fontSize: 15, fontWeight: '700', fontFamily: 'monospace' },
       sectionHeading: { fontSize: 18, fontWeight: '600' },
       // etc.
     };
     ```

---

## Summary of Recommendations

### High Priority

1. **Create `/Users/brent/wtlfo/src/theme/typography.ts`** with centralized text styles
2. **Improve contrast** for muted/disabled text colors
3. **Add line heights** to multi-line text (descriptions, body copy)
4. **Add `maxFontSizeMultiplier`** to constrained layouts

### Medium Priority

5. **Standardize font sizes** to a consistent scale
6. **Use platform-specific monospace fonts** instead of generic `'monospace'`
7. **Add `tabular-nums`** consistently to all numeric displays
8. **Add text truncation** to potentially long user content

### Low Priority

9. **Consider 400 weight** for longer body text in Learn section
10. **Standardize label weights** (choose 500 or 600, not both)

---

## Appendix: File Reference

### Components with Typography
- `/Users/brent/wtlfo/src/components/lfo/ParameterBadges.tsx`
- `/Users/brent/wtlfo/src/components/lfo/OutputValueDisplay.tsx`
- `/Users/brent/wtlfo/src/components/lfo/TimingInfo.tsx`
- `/Users/brent/wtlfo/src/components/lfo/SlowMotionBadge.tsx`
- `/Users/brent/wtlfo/src/components/lfo/WaveformIcon.tsx`
- `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx`
- `/Users/brent/wtlfo/src/components/destination/DestinationPickerInline.tsx`
- `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`
- `/Users/brent/wtlfo/src/components/destination/CenterValueSlider.tsx`
- `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx`
- `/Users/brent/wtlfo/src/components/controls/SegmentedControl.tsx`
- `/Users/brent/wtlfo/src/components/params/ParamBox.tsx`
- `/Users/brent/wtlfo/src/components/params/ParamGrid.tsx`
- `/Users/brent/wtlfo/src/components/ParameterEditor.tsx`
- `/Users/brent/wtlfo/src/components/ErrorBoundary.tsx`

### Screens with Typography
- `/Users/brent/wtlfo/app/(home)/index.tsx`
- `/Users/brent/wtlfo/app/(home)/presets.tsx`
- `/Users/brent/wtlfo/app/(home)/param/[param].tsx`
- `/Users/brent/wtlfo/app/(learn)/index.tsx`
- `/Users/brent/wtlfo/app/(learn)/intro.tsx`
- `/Users/brent/wtlfo/app/(settings)/index.tsx`

### Theme Files
- `/Users/brent/wtlfo/src/theme/colors.ts`
- `/Users/brent/wtlfo/src/theme/index.ts` (needs typography export)
