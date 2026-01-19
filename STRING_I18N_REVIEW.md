# String Handling and Internationalization Review

**Application:** WTLFO (LFO Visualizer for Elektron Digitakt II)
**Review Date:** 2026-01-19
**Reviewed Files:** 43 TypeScript/React files across `/app` and `/src/components`

---

## Executive Summary

This React Native app has **approximately 400+ hardcoded strings** that would require translation for internationalization. The app is currently English-only with no i18n infrastructure in place. While the codebase is well-structured, significant effort would be needed to internationalize due to:

1. Heavy educational content with technical music terminology
2. Numerous inline strings without centralized management
3. Some formatting patterns that may not translate well
4. Limited RTL considerations in layouts

---

## 1. Hardcoded Strings Analysis

### 1.1 Navigation/Screen Titles (~25 strings)
**Location:** Layout files (`_layout.tsx`)

| File | String Examples |
|------|----------------|
| `app/(settings)/_layout.tsx` | "Settings" |
| `app/(learn)/_layout.tsx` | "Learn", "What is an LFO?", "The 7 Parameters", "Waveforms", "Speed & Timing", "Depth & Fade", "Trigger Modes", "Destinations", "Timing Math", "Preset Recipes" |
| `app/(destination)/_layout.tsx` | "Destination" |
| `app/(home)/_layout.tsx` | "LFO", "Load Preset" |

### 1.2 UI Labels (~60 strings)
**Priority: High** - These are core to user interaction.

| Category | Examples |
|----------|----------|
| Parameter Labels | "WAVE", "SPD", "MULT", "SPH", "MODE", "DEP", "FADE", "DEST", "SLEW" |
| Control Labels | "Tempo", "BPM", "Tempo Sync", "Center Value" |
| Section Headers | "PARAMETERS", "Related Concepts", "Quick Reference" |
| Button Text | "Use This Preset", "Restart App", "Try Again", "Done" |
| Status Text | "Downloading...", "Checking...", "Update available - tap to download" |

### 1.3 Alert/Dialog Messages (~15 strings)
**Location:** `app/(settings)/index.tsx`

```typescript
// Alert titles and messages
"Updates Disabled" / "OTA updates are not enabled in this build."
"Up to Date" / "You're running the latest version."
"Error" / "Failed to check for updates: ${e}"
"Update Ready" / "A new version has been downloaded. Restart to apply?"
"Later" / "Restart"
```

### 1.4 Error Messages (~8 strings)
**Location:** `src/components/ErrorBoundary.tsx`, various screens

```typescript
"Something went wrong"
"The app encountered an unexpected error."
"Invalid parameter"
```

### 1.5 Educational Content (~250+ strings)
**Priority: Medium** - Extensive but less frequently changed.

**Location:** `/app/(learn)/*.tsx`

| Screen | Approximate Strings |
|--------|---------------------|
| `intro.tsx` | 25+ bullet points and explanations |
| `parameters.tsx` | 30+ parameter descriptions and details |
| `waveforms.tsx` | 40+ waveform descriptions, characteristics |
| `speed.tsx` | 30+ timing explanations |
| `depth.tsx` | 35+ depth/fade explanations |
| `modes.tsx` | 40+ trigger mode descriptions |
| `destinations.tsx` | 30+ destination descriptions |
| `timing.tsx` | 25+ formula explanations |
| `presets.tsx` | 20+ preset descriptions |

Example content pattern:
```typescript
const PARAMETERS = [
  {
    name: 'WAVE',
    label: 'Waveform',
    description: 'Shape of the modulation curve',
    details: '7 waveforms available: TRI, SIN, SQR, SAW, EXP, RMP, RND...',
    learnMore: { title: 'Waveforms', route: '/waveforms' },
  },
  // ... 6 more parameters
];
```

### 1.6 Technical/Domain Strings (~50 strings)
**Priority: Evaluate** - Some may not need translation.

```typescript
// Waveform types - likely should NOT translate (industry standard)
'TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'

// Trigger modes - likely should NOT translate
'FRE', 'TRG', 'HLD', 'ONE', 'HLF'

// Parameter abbreviations - may need context-aware translation
'BPM', 'MULT', 'SPD', 'DEP', 'SPH', 'SLEW'

// Destination names - mixed
'CUTOFF', 'RESO', 'DRIVE', 'VOL', 'PAN', 'TUNE'
```

### 1.7 Data/Preset Names (~30 strings)
**Location:** `/src/data/presets.ts`, `/src/data/destinations.ts`

```typescript
// Preset names - should translate
'Init', 'Wobble Bass', 'Ambient Drift', 'Hi-Hat Humanizer',
'Pumping Sidechain', 'Fade-In One-Shot'

// Destination full names - should translate
'Filter Cutoff', 'Filter Resonance', 'Filter Drive', 'Pan', 'Volume'

// Category labels - should translate
'FILTER', 'AMP', 'PITCH', 'SAMPLE', 'FX'
```

---

## 2. String Formatting Analysis

### 2.1 Dynamic String Patterns

**Numeric Formatting:**
```typescript
// Good - uses consistent formatting
formatValue={(v) => (v >= 0 ? `+${Math.round(v)}` : String(Math.round(v)))}

// Numbers with units
`${cycleTimeMs / 1000}s`
`${cycleTimeMs}ms`

// Multiplier display
value >= 1024 ? `${value / 1024}k` : String(value)
```

**Issues:**
- No locale-aware number formatting (e.g., decimal separators)
- Time/duration formatting is hardcoded English (ms, s)

### 2.2 String Interpolation

**Alert messages with variables:**
```typescript
Alert.alert('Error', `Failed to check for updates: ${e}`);
```

**Template strings in UI:**
```typescript
// In DestinationScreen
`With depth at ${currentConfig.depth >= 0 ? '+' : ''}${currentConfig.depth}, the value will swing between ${minValue} and ${maxValue}.`
```

**Potential Issues:**
- Variable positioning may need reordering in other languages
- Complex sentences with multiple variables

### 2.3 Concatenation Patterns

**Good patterns found:**
```typescript
// Most strings are complete phrases, not concatenated
<Text>MIDI settings and more options will be available in future updates.</Text>
```

**Problematic patterns:**
```typescript
// Navigation button text with direction
{isPrev ? `< ${label}` : `${label} >`}

// Learn more links with arrow
`Learn more: ${param.learnMore.title} ->`
```

---

## 3. Pluralization Analysis

### Current State
**No plural handling detected.** The app primarily deals with:
- Singular technical terms (waveform, mode, depth)
- Count-agnostic descriptions
- Numeric displays without accompanying text

### Potential Future Needs
If features expand:
```typescript
// Would need pluralization for:
"1 bar" vs "2 bars"
"1 cycle" vs "multiple cycles"
"1/4 note" vs "3 quarter notes"
```

### Pluralization Complexity
Some languages (e.g., Arabic, Russian, Polish) have complex plural rules that would require:
- Cardinal plurals (0, 1, 2, few, many, other)
- Proper plural form selection based on count

---

## 4. RTL (Right-to-Left) Readiness

### Layout Analysis

**Potential Issues:**

1. **Fixed directional styling:**
```typescript
// Uses marginRight, paddingLeft explicitly
marginRight: 8,
paddingLeft: 16,
borderLeftWidth: 3,
borderLeftColor: '#ff6600',
```

2. **Horizontal scrolling assumptions:**
```typescript
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
```

3. **Icon/text positioning:**
```typescript
// Chevrons assume LTR
<Text style={styles.chevron}>&rsaquo;</Text>  // ">"
{isPrev ? `< ${label}` : `${label} >`}
```

4. **Row layouts with fixed order:**
```typescript
flexDirection: 'row',  // Would need 'row-reverse' for RTL
```

### Specific RTL Concerns

| Component | Issue |
|-----------|-------|
| `RelatedLink` | Chevron positioned right |
| `NavButton` | Arrow direction hardcoded |
| `ExpandableSection` | Plus/minus icons on right |
| `ParamGrid` | Grid order may need reversal |
| `TimingInfo` | Horizontal layout |
| `WaveformCard` | Badges positioned right |

### Recommendations
- Use `I18nManager.isRTL` for conditional styling
- Replace explicit `marginLeft/Right` with `marginStart/End`
- Consider `flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row'`

---

## 5. Text Truncation Analysis

### Current Truncation Handling

**No explicit truncation found.** Components rely on:
- `flex: 1` to fill available space
- Fixed-width containers

### Risk Areas

| Component | Risk | Max Expected Length |
|-----------|------|---------------------|
| Preset names | Medium | German/French can be 50% longer |
| Parameter descriptions | High | Educational content varies widely |
| Alert messages | Medium | System alerts may clip |
| Tab labels | High | "Editor", "Learn", "Settings" |
| Button text | Medium | "Use This Preset" |

### Specific Examples

```typescript
// Tab labels - fixed width concerns
<Label>Editor</Label>   // German: "Bearbeiter" (+38%)
<Label>Learn</Label>    // German: "Lernen" (+20%)
<Label>Settings</Label> // German: "Einstellungen" (+83%)
```

### Recommendations
- Add `numberOfLines` with `ellipsizeMode` for constrained text
- Test with 50% longer strings (rule of thumb for German)
- Use `adjustsFontSizeToFit` for critical labels

---

## 6. Accessibility Strings

### Current Accessibility Labels

**Good coverage found:**
```typescript
// SegmentedControl
accessibilityLabel={`${label} selection`}
accessibilityRole="radiogroup"
accessibilityHint={`Select ${displayValue} for ${label}`}

// ParameterSlider
accessibilityLabel={`${label} slider`}
accessibilityRole="adjustable"
accessibilityHint={`Adjust ${label} value between ${min} and ${max}`}

// ParamBox
accessibilityLabel={`${label} parameter, current value: ${value}`}
accessibilityHint={`Double tap to edit ${label} parameter`}

// DestinationPicker
accessibilityLabel={`Destination: ${currentDestination?.displayName}`}
accessibilityHint="Double tap to open destination picker"
```

### Issues

1. **All hardcoded in English:**
   - Screen reader would read English labels regardless of system language

2. **Template strings with variables:**
```typescript
// Would need full sentence translation with variable placeholders
accessibilityHint={`Select ${dest.name} as modulation destination`}
```

3. **Missing labels:**
   - Canvas elements (LFOVisualizer) lack accessibility descriptions
   - Some icons without labels

### Recommendations
- Extract all `accessibilityLabel` and `accessibilityHint` to translation files
- Add `accessibilityLabel` to decorative elements or mark as `accessibilityElementsHidden`
- Consider VoiceOver/TalkBack testing with translations

---

## 7. Technical Strings (Should NOT Translate)

### 7.1 Industry-Standard Abbreviations
```typescript
// Waveform types - universal in music production
'TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'

// Trigger modes - Elektron-specific, keep as-is
'FRE', 'TRG', 'HLD', 'ONE', 'HLF'

// Units
'BPM', 'ms', 's', 'Hz'
```

### 7.2 Parameter Display Names
```typescript
// These match Elektron hardware display - do not translate
'CUTOFF', 'RESO', 'DRIVE', 'VOL', 'PAN', 'TUNE', 'FINE'
'STRT', 'LEN', 'DLY', 'REV', 'OVR', 'BIT'
'ATK', 'DEC', 'SUS', 'REL'
```

### 7.3 Developer/Debug Strings
```typescript
// Console logs - no translation needed
console.error('ErrorBoundary caught an error:', error);
console.error('Component stack:', errorInfo.componentStack);

// Error for developers
throw new Error(`Unknown destination: ${id}`);
```

### 7.4 String Separation Strategy
```typescript
// TRANSLATE these full names
'Filter Cutoff', 'Filter Resonance', 'Volume', 'Pan'

// DO NOT TRANSLATE these display abbreviations
'CUTOFF', 'RESO', 'VOL', 'PAN'
```

---

## 8. I18n Implementation Recommendations

### 8.1 Recommended Framework

**Primary Recommendation: `react-i18next`**

Reasons:
- Excellent React Native support
- Large ecosystem and community
- Handles pluralization (ICU format)
- Supports interpolation with named variables
- Works with Expo

**Alternative: `expo-localization` + `i18n-js`**
- Simpler setup for Expo projects
- Less feature-rich but sufficient for this app size

### 8.2 Implementation Approach

**Phase 1: Infrastructure (2-3 days)**
```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// src/i18n/locales/en.json
{
  "navigation": {
    "settings": "Settings",
    "learn": "Learn",
    "editor": "Editor"
  },
  "parameters": {
    "wave": "Waveform",
    "speed": "Speed",
    ...
  }
}
```

**Phase 2: String Extraction (3-5 days)**
- Extract UI labels and navigation titles
- Extract error messages and alerts
- Extract accessibility strings

**Phase 3: Educational Content (5-7 days)**
- Extract all Learn section content
- Consider markdown support for complex formatting
- Create content management strategy

**Phase 4: RTL Support (2-3 days)**
- Add conditional RTL styling
- Test with Arabic/Hebrew languages
- Fix layout issues

### 8.3 String Organization

Recommended structure:
```
src/i18n/
  locales/
    en/
      common.json       # Shared strings
      navigation.json   # Screen titles, tabs
      parameters.json   # LFO parameter labels
      learn/
        intro.json      # What is an LFO?
        waveforms.json  # Waveform descriptions
        ...
      errors.json       # Error messages
      accessibility.json # A11y strings
    de/
      ... (same structure)
```

### 8.4 Priority Order for Translation

| Priority | Category | String Count | Effort |
|----------|----------|--------------|--------|
| 1 | UI Labels & Navigation | ~85 | Low |
| 2 | Error Messages & Alerts | ~25 | Low |
| 3 | Accessibility Labels | ~40 | Medium |
| 4 | Preset/Destination Names | ~50 | Low |
| 5 | Educational Content | ~250+ | High |

### 8.5 Technical Recommendations

1. **Use named placeholders:**
```typescript
// Instead of
`Value is ${value}`

// Use
t('parameter.valueDisplay', { value })
// en.json: "parameter.valueDisplay": "Value is {{value}}"
// de.json: "parameter.valueDisplay": "Wert ist {{value}}"
```

2. **Handle plurals with ICU:**
```typescript
// en.json
"bars": "{count, plural, one {# bar} other {# bars}}"

// Usage
t('bars', { count: 2 })
```

3. **Separate translatable from non-translatable:**
```typescript
// Create constants for non-translatable
export const WAVEFORM_CODES = ['TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'] as const;

// Translate descriptions separately
const WAVEFORM_DESCRIPTIONS = {
  TRI: t('waveforms.tri.description'),
  SIN: t('waveforms.sin.description'),
  ...
};
```

4. **Handle RTL layout:**
```typescript
import { I18nManager } from 'react-native';

const styles = StyleSheet.create({
  row: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
  },
  text: {
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
});
```

---

## 9. Estimated Effort

| Task | Time Estimate |
|------|---------------|
| Setup i18n infrastructure | 2-3 days |
| Extract UI strings | 3-4 days |
| Extract educational content | 5-7 days |
| RTL support | 2-3 days |
| Accessibility strings | 1-2 days |
| Testing & QA | 3-4 days |
| **Total** | **16-23 days** |

**Per-language translation effort:**
- Professional translation: ~15,000-20,000 words
- Estimated cost: $0.10-0.20/word = $1,500-4,000 per language

---

## 10. Quick Wins

These can be done immediately with minimal risk:

1. **Centralize navigation titles** in a constants file
2. **Extract error messages** to a dedicated module
3. **Add `numberOfLines` props** to prevent overflow
4. **Replace explicit margin/padding** with start/end variants
5. **Document which strings should NOT be translated**

---

## Appendix: String Inventory by File

<details>
<summary>Click to expand full string inventory</summary>

### /app/(settings)/index.tsx
- "Tempo"
- "BPM"
- "Coming Soon"
- "MIDI settings and more options will be available in future updates."
- "Updates Disabled"
- "OTA updates are not enabled in this build."
- "Up to Date"
- "You're running the latest version."
- "Error"
- "Update Ready"
- "A new version has been downloaded. Restart to apply?"
- "Later"
- "Restart"
- "Downloading..."
- "Checking..."
- "Update available - tap to download"

### /app/(learn)/intro.tsx
- "The Basics"
- "LFO = Low Frequency Oscillator"
- "An invisible hand that automatically moves parameters over time"
- "Oscillates (cycles back and forth) at frequencies too slow to hear"
- "Creates movement, rhythm, and evolution in your sounds"
- "What Can LFOs Do?"
- "Sweeping filter effects (wah-wah)"
- "Tremolo and volume pumping"
- "Vibrato and pitch wobble"
- "Stereo movement and panning"
- "Evolving textures and atmospheres"
- "Digitakt II LFO Architecture"
- "Audio Tracks"
- "3 LFOs each (LFO1, LFO2, LFO3)"
- "MIDI Tracks"
- "2 LFOs each (LFO1, LFO2)"
- "LFOs can modulate each other for complex movement (LFO3 -> LFO2 -> LFO1)"
- "Related Concepts"
- "The 7 Parameters"
- "Learn what each control does"
- "Modulation Destinations"
- "See where LFOs can go"

*(Additional ~350 strings across other files)*

</details>

---

## Conclusion

The WTLFO app is well-structured but was clearly built with English-only in mind. Adding internationalization would be a moderate effort primarily due to the extensive educational content in the Learn section. The technical nature of the app (music production/synthesis) means careful consideration is needed to determine which strings should and should not be translated.

**Key recommendations:**
1. Use `react-i18next` for maximum flexibility
2. Separate technical abbreviations (keep) from full descriptions (translate)
3. Address RTL layout issues before translation begins
4. Start with UI strings, defer educational content
5. Consider a hybrid approach where technical terms remain English with translated explanations
