# Modal and Sheet Behavior Review

## Executive Summary

This React Native Expo app uses a combination of native iOS form sheets (via Expo Router's `presentation: 'formSheet'`) and traditional React Native `Modal` components. Overall, the modal implementations follow good practices, but there are several areas for improvement regarding keyboard handling, accessibility, and gesture management.

---

## 1. Modal Usage Analysis

### When Are Modals Used?

The app uses modals/sheets in three primary scenarios:

| Screen | Presentation Type | Purpose |
|--------|------------------|---------|
| `presets` | `formSheet` | Load preset selection |
| `param/[param]` | `formSheet` | Edit individual LFO parameters |
| `DestinationPicker` | React Native `Modal` | Select modulation destination |

### Modal vs Screen Choice Assessment

**Appropriate Choices:**

1. **Preset Selection (`/presets`)** - Good choice for formSheet
   - Quick selection task, doesn't require full screen
   - User returns to main view after selection
   - Detents at 50% and 75% are appropriate for list content

2. **Parameter Editing (`/param/[param]`)** - Good choice for formSheet
   - Focused editing of single parameter
   - Small content footprint (35% and 50% detents)
   - Navigation between params within sheet works well

3. **Destination Picker** - Acceptable but inconsistent
   - Uses traditional `Modal` with `pageSheet` presentation
   - Could benefit from using native formSheet for consistency
   - Currently opens full height which may be excessive

**Recommendations:**
- Consider migrating `DestinationPicker` to use Expo Router's native formSheet for consistency
- The `DestinationPickerInline` component (used in param modal) is a better inline approach

### Dismissibility

| Modal | Back Gesture | Back Button | Programmatic |
|-------|--------------|-------------|--------------|
| Presets Sheet | Yes (grabber) | Native back | `router.back()` |
| Param Sheet | Yes (grabber) | Native back | Available via router |
| DestinationPicker | No | "Done" button | `setIsOpen(false)` |

**Issues Found:**
- `DestinationPicker` implements `onRequestClose` correctly for Android back button
- Missing: Hardware keyboard Escape key handling in DestinationPicker

---

## 2. Sheet Behavior Analysis

### Bottom Sheets Configuration

**Presets Sheet:**
```typescript
{
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.5, 0.75],
  contentStyle: { backgroundColor: '#0a0a0a' },
}
```

**Parameter Sheet:**
```typescript
{
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.35, 0.5],
  contentStyle: { backgroundColor: '#0a0a0a' },
}
```

### Drag Behavior Assessment

**Strengths:**
- `sheetGrabberVisible: true` provides clear visual affordance
- Detents are reasonable for content size
- iOS native sheet behavior provides intuitive drag mechanics

**Potential Issues:**
- Parameter sheet's 35% detent may be too small for longer parameter lists (e.g., Destination picker has many categories)
- No `sheetExpandsWhenScrolledToEdge` configuration - content scrolling may fight with sheet dismissal

**Recommendations:**
1. Consider adding `sheetExpandsWhenScrolledToEdge: false` if content has long scrollable areas
2. Evaluate if 35% is sufficient for destination content within param sheet

### Snap Points Assessment

| Sheet | Detents | Appropriateness |
|-------|---------|-----------------|
| Presets | 50%, 75% | Good - preset list may vary |
| Params | 35%, 50% | May be too small for destination picker |

---

## 3. Parameter Editing Modals

### Navigation Behavior

**Implementation at `/Users/brent/wtlfo/app/(home)/param/[param].tsx`:**

The parameter modal implements clever navigation:

```typescript
const goToPrev = () => {
  setActiveParam(prevParam);
  router.setParams({ param: prevParam }); // No navigation = no animation
};
```

**Strengths:**
- Uses `setParams` for instant switching (no animation lag)
- Maintains internal state (`activeParam`) for immediate UI updates
- Circular navigation through 8 parameters
- Dynamic labels (SPH changes to SLEW for RND waveform)

**Navigation Elements:**
- Left/Right nav buttons in header: `< SPD` and `MULT >`
- Title updates dynamically to show current parameter name
- URL syncs with visual state

### Navigation Clarity

**Good:**
- Clear chevron indicators (`<` and `>`)
- Short labels (SPD, MULT, FADE, etc.) keep buttons compact
- Current param name shown in title
- Description and details shown below control

**Could Improve:**
- No visual indication of current position in 8-param sequence
- No way to quickly jump to specific parameter
- Consider adding pagination dots or progress indicator

### Dismissibility

Users can dismiss via:
1. Swipe down on grabber
2. Native back button/gesture
3. Tap outside sheet area (iOS native behavior)

**Missing:**
- No explicit "Done" or "Close" button
- Relies entirely on gesture discovery

---

## 4. Overlay Stacking

### Can Modals Stack?

**Current Implementation:**
- `DestinationPicker` Modal can technically open over param sheet
- However, the inline `DestinationPickerInline` is used within param sheets instead
- No evidence of intentional modal stacking

**Z-Order Handling:**
- Native formSheets handle z-ordering automatically
- React Native `Modal` appears above everything (portal-based)
- No custom z-index management in app code

### Background Dimming

**Native FormSheets:**
- iOS handles dimming automatically
- `contentStyle: { backgroundColor: '#0a0a0a' }` ensures content area is consistent
- Background content remains visible but non-interactive (iOS default)

**DestinationPicker Modal:**
- Uses `pageSheet` presentation style
- Background dimming handled by iOS
- Background color explicitly set: `backgroundColor: '#0a0a0a'`

**Recommendations:**
- Consider adding `sheetBackgroundInteraction` option if you want to allow taps through to background
- Current setup (dimmed, non-interactive) is appropriate for focused selection

---

## 5. Keyboard Interaction

### Current State: INADEQUATE

**Missing Implementations:**

1. **No `KeyboardAvoidingView`** in any modal content
2. **No `keyboardDismissMode`** on ScrollViews in modals
3. **No keyboard-aware scroll behavior**

### Impact on Parameter Editing

While most parameter controls are sliders or segmented controls (no keyboard input), the app could have future text inputs.

**Current Controls:**
- `ParameterSlider` - no keyboard needed
- `SegmentedControl` - no keyboard needed
- `DestinationPickerInline` - no keyboard needed

### Scrollability with Keyboard

**Presets Screen:**
```typescript
<ScrollView
  style={styles.container}
  contentContainerStyle={styles.content}
  contentInsetAdjustmentBehavior="automatic"
>
```

**Param Screen:**
```typescript
<ScrollView
  style={styles.container}
  contentContainerStyle={styles.content}
  contentInsetAdjustmentBehavior="automatic"
  bounces={false}
>
```

- `contentInsetAdjustmentBehavior="automatic"` handles iOS safe areas
- No explicit keyboard avoidance

### Dismissal with Keyboard Open

**DestinationPicker:**
- `onRequestClose` handles Android back button
- No Escape key handling for hardware keyboards
- Tapping "Done" button should dismiss regardless of keyboard state

**Recommendations:**
1. Add `keyboardDismissMode="on-drag"` to modal ScrollViews
2. Implement `KeyboardAvoidingView` wrapper for future-proofing
3. Add Escape key listener for hardware keyboard users

---

## 6. Gesture Conflicts

### Potential Conflicts Identified

**Slider Gestures vs Sheet Dismiss:**

The `ParameterSlider` component uses `@react-native-community/slider`:
- Horizontal sliding gesture
- Could potentially conflict with sheet edge gestures

**Current Mitigation:**
```typescript
<ScrollView bounces={false}>
```
- Disabling bounce prevents overscroll interference

**Visualization Tap vs Sheet Dismiss:**
- Main screen taps control pause/play
- These are isolated to main screen, not within modals

### Swipe Down Handling

**Native FormSheet:**
- iOS handles swipe-to-dismiss automatically
- `sheetGrabberVisible: true` provides clear affordance

**DestinationPicker Modal:**
- Uses `animationType="slide"` and `presentationStyle="pageSheet"`
- iOS native swipe-to-dismiss works on pageSheet

### Edge Swipes

**Safe Areas:**
- Left edge swipe: Native back gesture works
- Right edge swipe: No conflicting gestures
- Bottom edge: Home indicator area handled by iOS

**Potential Issue:**
- Parameter sheet's small detent (35%) may make content area feel cramped
- Sliders near edge could have accidental dismissal

### isEditing State

The app tracks editing state:
```typescript
const handleSlidingStart = () => setIsEditing(true);
const handleSlidingEnd = () => setIsEditing(false);
```

This could be leveraged to temporarily prevent sheet dismissal during slider interaction, but isn't currently implemented.

**Recommendation:**
Consider using `sheetBlocksDragGesture` or similar mechanism when `isEditing` is true.

---

## 7. Accessibility

### Focus Trapping

**Native FormSheets:**
- iOS automatically traps focus within sheet
- VoiceOver navigation stays within sheet content
- Good: No custom focus management needed

**DestinationPicker Modal:**
- React Native Modal has built-in focus trapping
- Focus automatically moves to modal content

### Accessibility Labels and Roles

**Well-Implemented Components:**

| Component | Labels | Roles | Hints |
|-----------|--------|-------|-------|
| `ParamBox` | Yes | `button` | Yes |
| `ParameterSlider` | Yes | `adjustable` | Yes |
| `SegmentedControl` | Yes | `radiogroup` + `radio` | Yes |
| `DestinationPickerInline` | Yes | `radiogroup` + `radio` | Yes |
| `CenterValueSlider` | Yes | `adjustable` | Yes |
| `DestinationPicker` | Yes | `button` + `radio` | Yes |

**Example Good Implementation:**
```typescript
<Pressable
  accessibilityLabel={`${label} parameter, current value: ${value}`}
  accessibilityRole="button"
  accessibilityHint={`Double tap to edit ${label} parameter`}
  accessibilityState={{ selected: isActive, disabled }}
>
```

### Modal Dismissibility via Accessibility

**Native FormSheets:**
- VoiceOver users can use standard dismiss gestures
- Two-finger scrub gesture dismisses modals

**DestinationPicker:**
- "Done" button is accessible with proper label
- `accessibilityHint="Close destination picker"`

### Announcements

**Missing:**
- No `AccessibilityInfo.announceForAccessibility()` calls
- Opening/closing modals doesn't announce state changes
- Parameter changes don't announce new values

**Recommendations:**
1. Add announcement when modal opens: "Editing [parameter name]"
2. Announce when parameter value changes significantly
3. Add live region for real-time value display in destination meter

### Param Sheet Navigation Accessibility

```typescript
<NavButton
  direction="prev"
  label={PARAM_LABELS[prevParam]}
  onPress={goToPrev}
/>
```

**Missing:**
- `accessibilityLabel` on NavButton
- `accessibilityHint` indicating navigation behavior
- No announcement of new parameter after navigation

---

## Summary of Issues and Recommendations

### Critical Issues

| Issue | Severity | Location |
|-------|----------|----------|
| No keyboard handling | Medium | All modals |
| Missing accessibility announcements | Medium | All modals |
| DestinationPicker inconsistent with native sheets | Low | `DestinationPicker.tsx` |

### Recommended Improvements

#### High Priority

1. **Add accessibility announcements for modal state changes**
   ```typescript
   useEffect(() => {
     AccessibilityInfo.announceForAccessibility(`Editing ${info.title}`);
   }, [activeParam]);
   ```

2. **Add accessibility labels to navigation buttons**
   ```typescript
   <NavButton
     accessibilityLabel={`Previous parameter: ${PARAM_LABELS[prevParam]}`}
     accessibilityHint="Navigate to previous parameter"
     // ...
   />
   ```

3. **Add keyboard dismiss mode to ScrollViews**
   ```typescript
   <ScrollView
     keyboardDismissMode="on-drag"
     keyboardShouldPersistTaps="handled"
     // ...
   >
   ```

#### Medium Priority

4. **Migrate DestinationPicker to native formSheet** for consistency

5. **Add position indicator in param modal** (e.g., "2 of 8" or pagination dots)

6. **Consider larger detent for destination parameter** due to content volume

7. **Add explicit close button** to param sheets for gesture-unaware users

#### Low Priority

8. **Add `sheetExpandsWhenScrolledToEdge` configuration** where appropriate

9. **Implement gesture conflict prevention** using `isEditing` state

10. **Add hardware keyboard Escape handler** for modal dismissal

---

## Files Reviewed

| File | Purpose |
|------|---------|
| `/Users/brent/wtlfo/app/(home)/_layout.tsx` | Home stack with sheet configurations |
| `/Users/brent/wtlfo/app/(home)/param/[param].tsx` | Parameter editing modal |
| `/Users/brent/wtlfo/app/(home)/presets.tsx` | Preset selection sheet |
| `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx` | Destination selection modal |
| `/Users/brent/wtlfo/src/components/destination/DestinationPickerInline.tsx` | Inline destination picker |
| `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx` | Slider control with accessibility |
| `/Users/brent/wtlfo/src/components/controls/SegmentedControl.tsx` | Segmented control with accessibility |
| `/Users/brent/wtlfo/src/components/params/ParamBox.tsx` | Parameter box with accessibility |
| `/Users/brent/wtlfo/src/components/params/ParamGrid.tsx` | Parameter grid navigation |

---

## Conclusion

The app demonstrates solid foundational modal/sheet implementation with good use of native iOS form sheets through Expo Router. Accessibility is partially implemented with good role and label coverage on interactive elements. The main gaps are in keyboard handling (not critical given current control types), accessibility announcements, and minor gesture conflict considerations. The parameter navigation within sheets is cleverly implemented to avoid animation lag through state-based switching.
