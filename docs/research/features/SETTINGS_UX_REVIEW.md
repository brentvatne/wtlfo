# Settings UX Review

## Executive Summary

This review analyzes the Settings screen (`/app/(settings)/index.tsx`) and related preset management UI (`/app/(home)/presets.tsx`) of the LFO app. The current implementation provides a minimal but functional settings experience, with significant opportunities for improvement in organization, feature completeness, and user empowerment.

**Overall Assessment: Functional but Sparse**

The settings screen handles its current responsibilities well (BPM control, version info, OTA updates) but lacks the depth users would expect from a professional audio tool.

---

## 1. Settings Organization

### Current Structure

The settings screen has three distinct sections:
1. **Tempo** - BPM slider with preset buttons
2. **Coming Soon** - Placeholder for future MIDI settings
3. **Version/Update Info** - App version and OTA update controls

### Findings

| Aspect | Rating | Notes |
|--------|--------|-------|
| Logical grouping | Adequate | Tempo is properly isolated; version info at bottom is standard |
| Hierarchy clarity | Weak | Only two actual setting groups; no clear visual hierarchy system |
| Related settings | N/A | Too few settings to evaluate clustering |

### Issues

1. **Missing section headers pattern** - The "Tempo" section uses inline styled text, but there's no consistent `SectionHeader` component
2. **"Coming Soon" placeholder** - While honest, this feels unpolished; better to omit or provide a "Request Features" link
3. **No settings categories** - As the app grows, need architecture for:
   - Audio/MIDI settings
   - Display/visualization preferences
   - Preset management
   - About/Help

### Recommendations

- Create a reusable `SettingsSection` component with consistent styling
- Remove or redesign "Coming Soon" placeholder
- Plan for settings categories with clear visual separation
- Consider iOS-style grouped table layout for better affordance

---

## 2. BPM Control

### Current Implementation

```typescript
<ParameterSlider
  label="BPM"
  min={30}
  max={300}
  value={bpm}
  onChange={setBPM}
  formatValue={(v) => String(Math.round(v))}
/>
```

Plus segmented control with preset values: `[90, 100, 120, 130, 140]`

### Findings

| Aspect | Rating | Notes |
|--------|--------|-------|
| Intuitiveness | Good | Slider + presets is a solid pattern |
| Range | Good | 30-300 BPM covers most use cases |
| Feedback | Good | Real-time value display, immediate effect |
| Precision | Moderate | Step=1 is default; hard to hit exact values on slider |

### Strengths

1. **ParameterSlider component** is well-designed:
   - Shows current value prominently
   - Has proper accessibility labels (`accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, `accessibilityValue`)
   - Uses local state for smooth visual updates during dragging
   - Throttles onChange to only fire on rounded value changes

2. **Quick-access BPM presets** - Segmented control offers common tempos

3. **Persistence** - BPM is saved to storage and restored on launch

### Issues

1. **Missing tap-to-edit** - No way to type an exact BPM value
2. **No tap tempo** - Standard feature in music apps for matching live tempo
3. **Preset values fixed** - Common BPMs hardcoded; users may prefer different values
4. **No visual tempo indication** - Could flash/pulse at current tempo
5. **Slider thumb hard to grab** - Standard React Native slider; could use larger touch target

### Recommendations

- Add tap-to-edit: tapping the BPM value should open a numeric input
- Add tap tempo button: "TAP" button that calculates BPM from tap intervals
- Allow customizable preset buttons
- Consider adding tempo subdivision indicator (quarter notes, eighth notes, etc.)

---

## 3. Preset Management

### Current Implementation

Presets are accessed from the home screen via a header button, not from Settings. The preset screen (`/app/(home)/presets.tsx`) displays a scrollable list of hardcoded presets.

### Preset Data Structure

```typescript
interface LFOPreset {
  name: string;
  config: LFOPresetConfig;
  destination?: DestinationId;
  centerValue?: number;
}
```

Current presets: Init, Wobble Bass, Ambient Drift, Hi-Hat Humanizer, Pumping Sidechain, Fade-In One-Shot

### Findings

| Aspect | Rating | Notes |
|--------|--------|-------|
| Display clarity | Good | Name + config summary visible |
| Selection feedback | Good | Active preset highlighted with accent color |
| Organization | Weak | Flat list; no categories or search |
| Management | Poor | No create, edit, delete, or reorder capabilities |

### Strengths

1. **Clean preset cards** - Name prominently displayed, technical details in monospace
2. **Active state clear** - Orange background with inverted text colors
3. **Press feedback** - Opacity change on press
4. **Destination restoration** - Selecting preset restores associated destination and center value

### Issues

1. **No user presets** - Cannot save current settings as new preset
2. **No preset editing** - Cannot modify existing presets
3. **No preset deletion** - Cannot remove unwanted presets
4. **No preset organization** - No folders, favorites, or tags
5. **No preset sharing** - Cannot export/import presets
6. **No preset search** - Will be needed as list grows
7. **Preset details cryptic** - `SPD 48 | MULT 2 | FRE` requires knowledge to parse

### Recommendations

**High Priority:**
- Add "Save as Preset" functionality from home screen
- Add preset edit and delete (swipe actions or edit mode)
- Add user presets section separate from factory presets

**Medium Priority:**
- Add preset categories or tags
- Make preset details human-readable ("Sine wave, 1/4 note, Free-running")
- Add preset preview (show waveform thumbnail)

**Lower Priority:**
- Add preset search/filter
- Add preset sharing via share sheet
- Add preset favorites

---

## 4. Missing Settings

### Expected Settings Not Present

| Category | Missing Setting | Priority |
|----------|-----------------|----------|
| **Audio** | MIDI output enable/disable | High |
| **Audio** | MIDI channel selection | High |
| **Audio** | Audio output enable/disable | Medium |
| **Display** | Theme selection (dark only currently) | Low |
| **Display** | Visualizer frame rate / quality | Medium |
| **Display** | Show/hide timing info | Low |
| **Behavior** | Auto-pause on background | Medium |
| **Behavior** | Keep screen awake | Medium |
| **Presets** | Default preset on launch | Medium |
| **Presets** | Preset management (create/delete) | High |
| **Data** | Export all presets | Medium |
| **Data** | Reset all data | Medium |
| **Help** | Link to documentation | Low |
| **Help** | Send feedback | Low |

### Hidden Preferences (Currently Hardcoded)

1. **Default BPM** - Hardcoded to 120 in `preset-context.tsx`
2. **Debounce time** - `ENGINE_DEBOUNCE_MS = 100` not configurable
3. **Slow-motion threshold** - Visualization slow-motion kicks in automatically
4. **Color theme** - Hardcoded in `colors.ts`

### Recommendations

- Add MIDI settings section (highest impact for target users)
- Add "Keep screen awake" toggle for live performance use
- Add "Restore Defaults" option
- Consider advanced settings panel for power users

---

## 5. Reset and Defaults

### Current State

| Feature | Present | Notes |
|---------|---------|-------|
| Reset to defaults button | No | Not implemented |
| Reset confirmation | N/A | No reset functionality |
| Per-setting reset | Partial | `resetToPreset()` exists but not exposed in UI |
| Factory reset | No | No way to clear all user data |

### Context API Provides

```typescript
resetToPreset: () => void; // Resets currentConfig to active preset's defaults
```

This function exists but is not exposed in any UI.

### Issues

1. **No global reset** - Cannot restore all settings to factory defaults
2. **No preset reset button** - Cannot reset modified preset to original
3. **BPM has no reset** - If user sets unusual BPM, no quick way to return to 120
4. **No confirmation dialogs** - If reset were added, would need confirmation

### Recommendations

**Critical:**
- Add "Reset Preset to Default" button when current settings differ from loaded preset
- Add "Reset BPM to 120" quick action

**Important:**
- Add "Reset All Settings" in settings with confirmation dialog
- Add "Clear All User Data" with two-step confirmation

**Implementation Pattern:**
```
"Are you sure you want to reset all settings?"
[Cancel] [Reset]
```

---

## 6. Visual Design

### Current Design Language

- **Background**: `#0a0a0a` (near black)
- **Surface**: `#1a1a1a` (card backgrounds)
- **Accent**: `#ff6600` (orange)
- **Text**: White primary, gray secondary
- **Corners**: 12px border radius on cards

### Findings

| Aspect | Rating | Notes |
|--------|--------|-------|
| Consistency | Good | Matches app-wide theme from `colors.ts` |
| Control appropriateness | Good | Slider for continuous, segmented for discrete |
| Information density | Low | Very sparse; lots of whitespace |
| Visual hierarchy | Weak | Sections blend together |

### Strengths

1. **Dark theme** - Appropriate for studio/performance context
2. **High contrast** - Orange on dark is highly visible
3. **Consistent spacing** - 16px padding used consistently
4. **Card-based layout** - Clear content grouping

### Issues

1. **Inline styles dominate** - Settings screen uses many inline styles instead of StyleSheet
2. **No dividers between sections** - Sections only separated by whitespace
3. **Version info styling inconsistent** - Uses different text sizes/colors
4. **Segmented control contrast** - Selected state (`#3a3a3a`) is subtle
5. **No icons** - Settings items lack visual anchors

### Recommendations

- Consolidate inline styles into StyleSheet
- Add subtle dividers or increase spacing between sections
- Add icons to section headers (tempo icon for BPM, etc.)
- Improve segmented control selected state contrast
- Consider adding section footers for explanatory text

---

## 7. Accessibility

### Current Implementation

**ParameterSlider accessibility (good):**
```typescript
accessibilityLabel={`${label} slider`}
accessibilityRole="adjustable"
accessibilityHint={`Adjust ${label} value between ${min} and ${max}`}
accessibilityValue={{ min, max, now: localValue }}
```

### Findings

| Aspect | Rating | Notes |
|--------|--------|-------|
| Screen reader labels | Partial | Slider good; buttons lack labels |
| Touch targets | Adequate | Standard sizing |
| Color contrast | Good | Orange on black exceeds WCAG AA |
| Keyboard navigation | Unknown | Not tested |
| Dynamic type | Not implemented | Fixed font sizes |

### Issues

1. **Segmented control buttons lack accessibility labels**
   ```typescript
   // Current - no accessibility props
   <Pressable onPress={() => setBPM(tempo)}>
   ```

2. **Update button lacks accessibility label** - Version/update pressable has no label

3. **No `accessibilityRole` on buttons** - Should have `role="button"`

4. **Fixed font sizes** - Does not respect iOS Dynamic Type / Android font scaling

5. **No reduce motion support** - Animations don't check `AccessibilityInfo.isReduceMotionEnabled`

### Recommendations

**High Priority:**
- Add `accessibilityLabel` to all Pressable components
- Add `accessibilityRole="button"` to all buttons
- Add meaningful labels: "Set tempo to 120 BPM" not just "120"

**Medium Priority:**
- Support Dynamic Type for all text
- Add reduce motion checks for animations
- Test with VoiceOver/TalkBack

**Example Fix:**
```typescript
<Pressable
  onPress={() => setBPM(tempo)}
  accessibilityRole="button"
  accessibilityLabel={`Set tempo to ${tempo} BPM`}
  accessibilityState={{ selected: isSelected }}
>
```

---

## Summary of Recommendations

### Critical (Implement First)

1. Add "Save as Preset" functionality
2. Add tap-to-edit for BPM value
3. Add accessibility labels to all interactive elements
4. Add preset edit/delete capabilities

### High Priority

1. Add MIDI settings section
2. Add "Reset to Default" for presets and settings
3. Add tap tempo feature
4. Improve preset details readability

### Medium Priority

1. Add "Keep Screen Awake" toggle
2. Add preset categories/favorites
3. Support Dynamic Type
4. Add settings section icons
5. Create consistent `SettingsSection` component

### Lower Priority

1. Add preset sharing
2. Add theme options
3. Add visualizer quality settings
4. Add documentation/help links

---

## Files Analyzed

- `/Users/brent/wtlfo/app/(settings)/index.tsx` - Main settings screen
- `/Users/brent/wtlfo/app/(settings)/_layout.tsx` - Settings navigation layout
- `/Users/brent/wtlfo/app/(home)/presets.tsx` - Preset selection screen
- `/Users/brent/wtlfo/app/(home)/_layout.tsx` - Home navigation layout
- `/Users/brent/wtlfo/app/(home)/index.tsx` - Main home screen
- `/Users/brent/wtlfo/app/_layout.tsx` - Root app layout with tabs
- `/Users/brent/wtlfo/src/context/preset-context.tsx` - Preset state management
- `/Users/brent/wtlfo/src/data/presets.ts` - Preset definitions
- `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx` - Reusable slider component
- `/Users/brent/wtlfo/src/theme/colors.ts` - Theme color definitions
