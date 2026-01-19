# Header Navigation Review

This document analyzes the navigation headers in the wtlfo React Native Expo Router app.

## Overview

The app uses a tab-based navigation structure with native tabs (`expo-router/unstable-native-tabs`) at the root, and Stack navigators within each tab section. The tabs are:
- **Editor** (`(home)`) - Main LFO editing interface
- **Learn** (`(learn)`) - Educational content
- **Settings** (`(settings)`) - App configuration

---

## 1. Stack Headers Configuration

### Root Layout (`/app/_layout.tsx`)

**Status: GOOD**

The root uses `NativeTabs` which handles tab bar styling correctly:
- Tint color set to `#ff6600` (orange accent)
- Legacy iOS fallback for iOS < 26 with dark chrome material
- No header configuration needed at root level (tabs handle this)

### Home Layout (`/app/(home)/_layout.tsx`)

**Status: GOOD with minor concerns**

```tsx
screenOptions={{
  headerStyle: { backgroundColor: '#0a0a0a' },
  headerTintColor: '#ff6600',
  headerTitleStyle: { fontWeight: '600', color: '#ffffff' },
}}
```

**Strengths:**
- Consistent dark theme (`#0a0a0a` background)
- Accent color (`#ff6600`) used for tint
- White title text for contrast
- Custom `headerLeft` button for presets navigation

**Concerns:**
- No `headerBackTitle` configuration - back button will use default text
- Missing `headerShadowVisible: false` for cleaner dark theme look

### Settings Layout (`/app/(settings)/_layout.tsx`)

**Status: GOOD**

Identical header styling to Home layout - **consistent**. Single screen, simple configuration.

### Learn Layout (`/app/(learn)/_layout.tsx`)

**Status: GOOD**

- Same header styling as other layouts - **consistent**
- All 9 screens have explicit title configurations
- Titles are descriptive and helpful:
  - "What is an LFO?"
  - "The 7 Parameters"
  - "Waveforms"
  - "Speed & Timing"
  - "Depth & Fade"
  - "Trigger Modes"
  - "Destinations"
  - "Timing Math"
  - "Preset Recipes"

### Destination Layout (`/app/(destination)/_layout.tsx`)

**Status: GOOD**

Consistent styling with other layouts.

---

## 2. Header Content Analysis

### Index Screen (Home)

**Title:** Dynamic - shows preset name or "LFO" as fallback
```tsx
title: preset?.name || 'LFO'
```

**Custom Header Content:**
- **Left button:** Opens presets modal with list icon (`list.bullet` SF Symbol)
- Good `hitSlop` for touch targets
- No right button (appropriate)

**Assessment: EXCELLENT** - Dynamic title provides context

### Parameter Edit Modal (`/app/(home)/param/[param].tsx`)

**Title:** Dynamic - updates based on selected parameter via `Stack.Screen`
```tsx
<Stack.Screen options={{ title: info.title, ... }} />
```

**Custom Header Content:**
- **Left:** Previous parameter navigation button (e.g., "< SPD")
- **Right:** Next parameter navigation button (e.g., "FADE >")
- Both buttons have proper `hitSlop`

**Assessment: EXCELLENT** - Innovative parameter cycling navigation

### Presets Modal (`/app/(home)/presets.tsx`)

**Title:** "Load Preset" - Clear and descriptive

**No custom header content** - relies on form sheet grabber

### Destination Screen (`/app/(destination)/index.tsx`)

**Title:** Dynamic - updates via `navigation.setOptions()`
```tsx
navigation.setOptions({
  title: destination ? `${destName} (${destDisplayName})` : 'No Destination',
});
```

**Assessment: GOOD** - Context-aware title

### Learn Screens

All screens rely on layout-defined static titles. No custom header buttons.

**Assessment: GOOD** - Consistent, simple navigation

---

## 3. Header Transitions

### Form Sheet Modals

**Presets Modal:**
```tsx
presentation: 'formSheet',
sheetGrabberVisible: true,
sheetAllowedDetents: [0.5, 0.75],
contentStyle: { backgroundColor: '#0a0a0a' },
```

**Parameter Modal:**
```tsx
presentation: 'formSheet',
sheetGrabberVisible: true,
sheetAllowedDetents: [0.35, 0.5],
contentStyle: { backgroundColor: '#0a0a0a' },
```

**Assessment: GOOD**
- Appropriate detent heights (parameter modal is shorter)
- Sheet grabber visible for discoverability
- Background matches app theme

### Large Title Mode

**Status: NOT USED**

No screens use `headerLargeTitle` or `headerLargeTitleStyle`.

**Assessment: ACCEPTABLE**
- The Learn section could benefit from large titles on the index screen
- For this app's compact design, standard titles are appropriate

### Scroll Effects

**Status: NOT CONFIGURED**

No `headerTransparent`, `headerBlurEffect`, or scroll-based header changes.

**Assessment: ACCEPTABLE**
- All screens use `contentInsetAdjustmentBehavior="automatic"` which is correct
- Solid dark headers work well with the dark theme

---

## 4. Modal Headers

### Presets Form Sheet

**Status: NEEDS IMPROVEMENT**

```tsx
<Stack.Screen
  name="presets"
  options={{
    title: 'Load Preset',
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    // Missing close button!
  }}
/>
```

**Issues:**
- No explicit close/done button in header
- Relies solely on drag gesture and grabber
- Users may not realize they can swipe down

**Recommendation:** Add `headerRight` with a "Done" button

### Parameter Form Sheet

**Status: BETTER**

Has navigation buttons in header (prev/next), but:
- No explicit close button
- User must swipe down to dismiss
- Nav buttons provide alternative way to navigate away

**Assessment: ACCEPTABLE** - Navigation buttons provide escape routes

---

## 5. Accessibility

### Header Elements Accessibility

**Status: PARTIAL**

**Good:**
- Components like `ParamBox`, `SegmentedControl`, `ParameterSlider` have proper accessibility attributes
- Learn icons have `accessibilityLabel` and `accessibilityRole="image"`

**Gaps in Navigation:**
- Header buttons in `(home)/_layout.tsx` (presets link) lack explicit accessibility labels
- Navigation buttons in param modal lack accessibility labels

**Presets Button (Home Header):**
```tsx
<Pressable
  style={{ paddingHorizontal: 8, paddingVertical: 6 }}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
  <SymbolView name="list.bullet" size={22} tintColor="#ff6600" />
</Pressable>
```
**Missing:** `accessibilityLabel="Open presets"` and `accessibilityRole="button"`

**Nav Buttons (Param Modal):**
```tsx
<Pressable onPress={goToPrev} style={styles.navButton} hitSlop={...}>
  <Text style={styles.navButtonText}>{isPrev ? `< ${label}` : `${label} >`}</Text>
</Pressable>
```
**Missing:** `accessibilityLabel` for navigation intent

### Navigation Announcements

**Status: ACCEPTABLE**

- Expo Router handles screen reader announcements for screen transitions
- Dynamic titles are updated which should trigger announcements
- No manual `accessibilityLiveRegion` usage found (not needed)

---

## Summary of Findings

### Strengths

1. **Consistent Header Styling** - All 4 Stack layouts use identical color scheme
2. **Dynamic Titles** - Home screen and parameter modal show context-aware titles
3. **Custom Navigation** - Parameter modal has innovative prev/next cycling
4. **Proper Form Sheets** - Good detent configurations and grabber visibility
5. **Good Component Accessibility** - Core UI components have accessibility attributes

### Issues to Address

| Priority | Issue | Location |
|----------|-------|----------|
| Medium | Missing close button on presets modal | `/app/(home)/_layout.tsx` |
| Medium | Missing accessibility labels on header buttons | `/app/(home)/_layout.tsx`, `/app/(home)/param/[param].tsx` |
| Low | No header shadow removal for dark theme polish | All layouts |
| Low | Could use large titles in Learn section | `/app/(learn)/_layout.tsx` |

### Recommendations

1. **Add Close Button to Presets Modal:**
```tsx
<Stack.Screen
  name="presets"
  options={{
    title: 'Load Preset',
    presentation: 'formSheet',
    headerRight: () => (
      <Pressable onPress={() => router.back()} accessibilityLabel="Close">
        <Text style={{ color: '#ff6600', fontSize: 17, fontWeight: '600' }}>Done</Text>
      </Pressable>
    ),
  }}
/>
```

2. **Add Accessibility to Header Buttons:**
```tsx
<Pressable
  accessibilityLabel="Open presets"
  accessibilityRole="button"
  ...
>
```

3. **Consider Header Shadow Removal:**
```tsx
screenOptions={{
  headerShadowVisible: false,
  ...
}}
```

4. **Consider Large Titles for Learn Index:**
```tsx
<Stack.Screen
  name="index"
  options={{
    title: 'Learn',
    headerLargeTitle: true,
    headerLargeTitleStyle: { color: '#ffffff' },
  }}
/>
```

---

## Files Reviewed

- `/Users/brent/wtlfo/app/_layout.tsx` - Root tab navigator
- `/Users/brent/wtlfo/app/(home)/_layout.tsx` - Home stack navigator
- `/Users/brent/wtlfo/app/(home)/index.tsx` - Home screen
- `/Users/brent/wtlfo/app/(home)/param/[param].tsx` - Parameter edit modal
- `/Users/brent/wtlfo/app/(home)/presets.tsx` - Presets picker modal
- `/Users/brent/wtlfo/app/(settings)/_layout.tsx` - Settings stack navigator
- `/Users/brent/wtlfo/app/(settings)/index.tsx` - Settings screen
- `/Users/brent/wtlfo/app/(learn)/_layout.tsx` - Learn stack navigator
- `/Users/brent/wtlfo/app/(learn)/index.tsx` - Learn index screen
- `/Users/brent/wtlfo/app/(learn)/intro.tsx` - Sample learn screen
- `/Users/brent/wtlfo/app/(learn)/waveforms.tsx` - Sample learn screen
- `/Users/brent/wtlfo/app/(destination)/_layout.tsx` - Destination stack navigator
- `/Users/brent/wtlfo/app/(destination)/index.tsx` - Destination screen
- `/Users/brent/wtlfo/src/components/params/ParamGrid.tsx` - Parameter grid component
- Various component files for accessibility audit
