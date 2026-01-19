# Error and Feedback UX Review

This document analyzes how WTLFO communicates errors, states, and feedback to users.

---

## 1. Error States

### Global Error Boundary
**File:** `/Users/brent/wtlfo/src/components/ErrorBoundary.tsx`

The app implements a React Error Boundary that catches JavaScript errors in the component tree.

**Current Implementation:**
- **Visual Design:** Full-screen error state with orange accent icon, clear title "Something went wrong"
- **Error Message Display:** Shows the raw `error.message` in a scrollable container with monospace font
- **Recovery Options:** Two buttons - "Restart App" (primary) and "Try Again" (secondary)
- **Recovery Logic:** Uses `expo-updates` for full reload in production; resets error state in development

**Strengths:**
- Clear visual hierarchy with prominent error indicator
- Two recovery paths (full restart vs. soft retry)
- Error message is visible for debugging

**Issues & Recommendations:**

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| Raw error messages shown to users | Medium | Translate technical errors into user-friendly language. E.g., "Failed to parse JSON" -> "We had trouble loading your settings." |
| No error reporting mechanism | Medium | Add "Send Report" option or automatic crash reporting |
| No explanation of what was lost | Medium | Tell users if their changes were saved or if they need to redo something |
| Generic messaging | Low | Consider showing context about what failed: "The waveform editor encountered a problem" |

### Context Errors
**Files:** `/Users/brent/wtlfo/src/context/modulation-context.tsx`, `/Users/brent/wtlfo/src/context/preset-context.tsx`

**Current Handling:**
- Storage failures are silently logged with `console.warn`
- Missing context throws descriptive errors for developers

**Issues:**

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| Silent storage failures | Medium | Show subtle toast when settings fail to save: "Changes may not persist" |
| No offline/storage-full handling | Medium | Detect storage issues and inform user proactively |

### Invalid Route/Parameter Handling
**File:** `/Users/brent/wtlfo/app/(home)/param/[param].tsx`

**Current Implementation:**
```jsx
if (!activeParam || !(activeParam in PARAM_INFO)) {
  return (
    <View style={styles.container}>
      <Text style={styles.errorText}>Invalid parameter</Text>
    </View>
  );
}
```

**Issues:**

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| Terse error message | Medium | More helpful: "This parameter doesn't exist. Tap back to return to the editor." |
| No navigation help | Medium | Add a button to return to home screen |
| Dead-end screen | High | User has no clear way to recover |

---

## 2. Loading States

### Current Implementation

The app has **minimal loading states** due to synchronous data loading:

**Strengths:**
- Storage uses `getItemSync` for instant initial load
- LFO animation starts immediately
- No async data fetching from network

**Loading Indicators Present:**
- **Settings Screen:** `ActivityIndicator` during update check/download
- **Slow Motion Badge:** Animates in with fade when LFO is slowed (informational, not loading)

**Missing Loading States:**

| Location | Situation | Recommendation |
|----------|-----------|----------------|
| App Startup | Initial mount | Consider splash screen with brand identity |
| Preset Loading | After selecting preset | Visual feedback that preset is being applied |
| Settings Save | BPM/preference changes | Subtle confirmation that save completed |

### Update Download Flow
**File:** `/Users/brent/wtlfo/app/(settings)/index.tsx`

**Strengths:**
- Clear "Checking..." and "Downloading..." text states
- Activity indicator present
- Button disabled during operations

**Issues:**

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| No progress indicator for download | Low | Show percentage or indeterminate progress bar |
| "Checking..." is vague | Low | "Looking for updates..." or similar |

---

## 3. Success Feedback

### Haptic Feedback
**File:** `/Users/brent/wtlfo/src/components/destination/DestinationPickerInline.tsx`

**Implementation:**
- `Haptics.selectionAsync()` on destination selection

**Missing Haptic Feedback:**

| Location | Action | Recommendation |
|----------|--------|----------------|
| Preset selection | Tap on preset | Add `Haptics.selectionAsync()` |
| Parameter changes | Slider/segmented control | Add subtle haptic on value change |
| Mode toggle | Waveform/mode selection | Add selection haptic |
| LFO pause/play | Tap on visualizer | Add `Haptics.impactAsync(ImpactFeedbackStyle.Light)` |

### Visual Confirmation

**Current Strengths:**
- Active preset highlighted with accent color
- Selected destinations visually distinct
- Parameter values update in real-time

**Missing Visual Feedback:**

| Location | Issue | Recommendation |
|----------|-------|----------------|
| Preset load | No confirmation | Brief toast or flash animation: "Preset loaded" |
| Settings changes | Changes feel unacknowledged | Subtle "Saved" indicator |
| Navigation | Destination picker closes without confirmation | Add brief checkmark or animation |

### Sound Feedback

**Current:** None implemented

**Recommendation:** Consider optional audio feedback for LFO trigger/restart (given this is an audio-focused app, users may expect audio confirmation).

---

## 4. Empty States

### Current Empty States

**Destination "None" State:**

**Files:** `/Users/brent/wtlfo/app/(home)/index.tsx`, `/Users/brent/wtlfo/app/(destination)/index.tsx`

**Implementation:**
- Meter displays dimmed (30% opacity) when no destination selected
- Destination section hidden with `opacity: 0` and `pointerEvents: 'none'`
- "No Destination" text in navigation title

**Issues:**

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| Dimmed meter unclear | Medium | Add text label: "No destination selected" or icon overlay |
| Hidden section causes potential confusion | Low | Show placeholder: "Select a destination to see modulation range" |
| Destination screen shows "None" without guidance | Medium | Empty state with call-to-action: "Choose a destination parameter to modulate" |

### Presets List

**Current:** Always has presets (not a true empty state concern)

### Learn Section

**Current:** Static list of topics, no data-dependent empty states

---

## 5. Validation Feedback

### BPM Input
**File:** `/Users/brent/wtlfo/app/(settings)/index.tsx`

**Implementation:**
- BPM clamped to 20-300 range silently
- No visual indication when user hits min/max

**Issues:**

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| Silent clamping | Medium | Visual indicator when hitting boundaries (flash border, subtle shake) |
| No min/max labels | Low | Show "20-300 BPM" hint text |

### Parameter Sliders
**File:** `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx`

**Strengths:**
- Values update in real-time
- Accessible with proper `accessibilityValue` including min/max/current

**Issues:**

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| No boundary feedback | Low | Subtle haptic or visual when hitting min/max |

### Mode-Dependent Parameters

**File:** `/Users/brent/wtlfo/app/(home)/param/[param].tsx`

**Excellent Implementation:**
```jsx
{currentConfig.mode === 'FRE' && (
  <View style={styles.warningBanner}>
    <Text style={styles.warningText}>
      Fade has no effect in FRE mode. Switch to TRG, ONE, HLD, or HLF to use fade.
    </Text>
  </View>
)}
```

**This is a model pattern** - contextual warning that explains why a parameter is ineffective and what to do about it.

**Apply This Pattern To:**

| Parameter | Condition | Message |
|-----------|-----------|---------|
| Start Phase | ONE/HLF modes | "Start Phase determines where the one-shot begins" |
| Depth = 0 | Any mode | "Set Depth above 0 to see modulation effect" |

### Disabled State Communication

**File:** `/Users/brent/wtlfo/src/components/params/ParamGrid.tsx`

**Implementation:**
- Fade param shows disabled state when mode is FRE
- Uses `opacity: 0.3` for disabled appearance

**Issues:**

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| Disabled state unexplained | Medium | Tooltip or long-press explanation for why param is disabled |

---

## 6. System Status

### LFO Running/Paused State

**File:** `/Users/brent/wtlfo/app/(home)/index.tsx`

**Implementation:**
- `isPaused` state dims visualizer and meter to 50% opacity
- Tap to pause/resume/restart based on context

**Strengths:**
- Visual dimming clearly indicates paused state
- Intuitive tap-to-toggle interaction

**Issues:**

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| No pause icon/indicator | Medium | Overlay play/pause icon on visualizer |
| State unclear to new users | Medium | Brief onboarding tip: "Tap to pause/play" |
| ONE/HLF completion state unclear | Medium | When stopped, show "Complete - tap to restart" |

### Slow Motion Mode

**File:** `/Users/brent/wtlfo/src/components/lfo/SlowMotionBadge.tsx`

**Excellent Implementation:**
- Clear badge showing "1/4 SPEED" or similar
- Animates in/out smoothly with Reanimated
- Positioned non-intrusively

**This is exemplary status communication.**

### App Background/Foreground

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx`

**Implementation:**
- Animation pauses when app goes to background
- Resumes automatically (respecting user pause state)

**Issues:**

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| Silent pause/resume | Low | Optional subtle visual indicator when animation resumes |

### OTA Update Status

**File:** `/Users/brent/wtlfo/app/(settings)/index.tsx`

**Strengths:**
- Multiple states: checking, downloading, available, up-to-date
- Alert dialogs for update ready
- Version info displayed

**Issues:**

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| Update ready alert may be disruptive | Low | Consider less intrusive banner notification |

---

## Summary of Priorities

### High Priority

1. **Fix dead-end invalid parameter screen** - Add navigation help
2. **Improve LFO play/pause visibility** - Add icon overlay or clear indicator
3. **Add haptic feedback** - Preset selection, parameter changes, LFO control

### Medium Priority

4. **Humanize error messages** - Translate technical errors
5. **Add empty state guidance** - Destination picker, meter view
6. **Show boundary feedback** - When sliders hit min/max
7. **Expand contextual warnings** - Apply the Fade/FRE pattern more broadly

### Low Priority

8. **Add subtle save confirmations** - Settings, preset loads
9. **Consider progress indication** - Update downloads
10. **Optional audio feedback** - LFO trigger sounds

---

## Accessibility Notes

The app has good accessibility foundations:
- `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` on controls
- `accessibilityState` for selection/disabled states
- `accessibilityValue` with min/max/current for sliders

**Recommendations:**
- Add `accessibilityLiveRegion` for dynamic value updates
- Ensure error states are announced to screen readers
- Consider reduced-motion alternatives for animations
