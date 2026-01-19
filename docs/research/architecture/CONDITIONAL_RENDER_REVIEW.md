# Conditional Rendering Review

## Executive Summary

This React Native app (wtlfo) demonstrates **generally solid conditional rendering patterns** with a few areas for improvement. The codebase uses opacity-based hiding strategically to prevent layout shifts, handles null states appropriately, and avoids common `&&` short-circuit pitfalls. However, there are opportunities to improve loading state handling and add skeleton patterns.

---

## 1. Conditional Components

### Ternary Usage - GOOD

The codebase uses ternaries appropriately for value selection and conditional rendering:

**File:** `/Users/brent/wtlfo/app/(home)/index.tsx` (lines 149, 168-169)
```tsx
// Correct: Ternary for value selection with null safety
centerValue={hasDestination ? getCenterValue(activeDestinationId) : 64}

// Correct: Ternary for conditional text
<Text style={styles.destinationName}>
  {hasDestination ? activeDestination.name : 'No Destination'}
</Text>
```

**File:** `/Users/brent/wtlfo/app/(home)/_layout.tsx` (line 25)
```tsx
// Correct: Nullish coalescing for safe default
title: preset?.name || 'LFO',
```

### Short-Circuit && Patterns - SAFE

The codebase correctly avoids falsy value rendering issues:

**File:** `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx` (lines 94, 145, 181)
```tsx
// SAFE: Boolean condition (not a number that could be 0)
{showParameters && (
  <ParameterBadges ... />
)}

// SAFE: Complex boolean condition
{fade !== undefined && fade !== 0 && mode !== 'FRE' && resolvedTheme.fadeCurve && (
  <FadeEnvelope ... />
)}
```

**File:** `/Users/brent/wtlfo/src/components/lfo/WaveformDisplay.tsx** (lines 25-26)
```tsx
// SAFE: Checks truthy object, not a number
{fillColor && (
  <Path path={fillPath} color={fillColor} ... />
)}
```

**File:** `/Users/brent/wtlfo/src/components/ErrorBoundary.tsx` (lines 83-86)
```tsx
// SAFE: Checks truthy object before rendering
{error && (
  <ScrollView ...>
    <Text style={styles.errorText}>{error.message}</Text>
  </ScrollView>
)}
```

### Null/Undefined Handling - GOOD

**File:** `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx** (lines 39-41)
```tsx
// Excellent: Defensive null handling with fallback defaults
const min = destination?.min ?? 0;
const max = destination?.max ?? 127;
const range = max - min;
```

**File:** `/Users/brent/wtlfo/app/(destination)/index.tsx** (lines 41-45)
```tsx
// Good: Handles null destination gracefully
const destMin = destination?.min ?? 0;
const destMax = destination?.max ?? 127;
const destName = destination?.name ?? 'None';
const destDisplayName = destination?.displayName ?? '—';
const destBipolar = destination?.bipolar ?? false;
```

---

## 2. Display vs Existence

### Opacity-Based Hiding - EXCELLENT

The app strategically uses opacity to prevent layout shifts:

**File:** `/Users/brent/wtlfo/app/(home)/index.tsx** (lines 167, 221-223)
```tsx
// EXCELLENT: Uses opacity 0 + pointerEvents: 'none' to hide without unmounting
// This prevents layout shift when destination changes
<View style={[styles.destinationSection, !hasDestination && styles.destinationHidden]}>
  ...
</View>

const styles = StyleSheet.create({
  destinationHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
});
```

**File:** `/Users/brent/wtlfo/src/components/params/ParamBox.tsx** (lines 83-88)
```tsx
// Good: Disabled state uses opacity, preserving layout
disabled: {
  opacity: 0.3,
},
disabledText: {
  opacity: 0.5,
},
```

**File:** `/Users/brent/wtlfo/app/(home)/index.tsx** (lines 140-142, 193-195)
```tsx
// Good: Paused state dims components without removing them
<Pressable style={[styles.visualizerContainer, isPaused && styles.paused]}>
  ...
</Pressable>

paused: {
  opacity: 0.5,
},
```

### Conditional Rendering (Unmounting) - APPROPRIATE

Used correctly for cases where content truly should not exist:

**File:** `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx** (line 118-141)
```tsx
// Correct: Different components need different rendering
{waveform === 'RND' && randomSamples && randomSamples.length > 0 ? (
  <RandomWaveform ... />
) : (
  <WaveformDisplay ... />
)}
```

**File:** `/Users/brent/wtlfo/src/components/lfo/SlowMotionBadge.tsx** (lines 17-19)
```tsx
// Correct: Early return for invisible badge - no layout impact needed
if (!visible) return null;
```

---

## 3. Loading States - NEEDS IMPROVEMENT

### Current Implementation

The app has minimal explicit loading state handling:

**File:** `/Users/brent/wtlfo/app/(settings)/index.tsx** (lines 152-158)
```tsx
// GOOD: Update checking uses ActivityIndicator
{isChecking || isDownloading ? (
  <View style={styles.updateRow}>
    <ActivityIndicator size="small" color="#666" />
    <Text style={styles.updateCheckingText}>
      {isDownloading ? 'Downloading...' : 'Checking...'}
    </Text>
  </View>
) : isUpdateAvailable ? (
  <Text style={styles.updateAvailableText}>
    Update available - tap to download
  </Text>
) : (
  <Text style={styles.updateIdText} selectable>
    {getUpdateId()}
  </Text>
)}
```

### RECOMMENDATION: Add Skeleton Patterns

The preset list and destination picker could benefit from skeleton loading:

```tsx
// Suggested pattern for PresetsScreen
function PresetSkeleton() {
  return (
    <View style={styles.item}>
      <View style={[styles.skeleton, { width: '60%', height: 18 }]} />
      <View style={[styles.skeleton, { width: '80%', height: 12, marginTop: 4 }]} />
    </View>
  );
}

// Then in render:
{isLoading ? (
  Array(5).fill(0).map((_, i) => <PresetSkeleton key={i} />)
) : (
  presets.map(...)
)}
```

---

## 4. Error States

### Error Boundary - EXCELLENT

**File:** `/Users/brent/wtlfo/src/components/ErrorBoundary.tsx**

The app has a well-implemented ErrorBoundary with:
- Clear error message display
- Restart and retry options
- Proper component stack logging
- OTA update integration for production restarts

```tsx
// Good: Conditional error display with fallback UI
if (this.state.hasError) {
  const { error } = this.state;
  return (
    <View style={styles.container}>
      ...
      {error && (
        <ScrollView style={styles.errorContainer}>
          <Text style={styles.errorText}>{error.message}</Text>
        </ScrollView>
      )}
      <View style={styles.buttonContainer}>
        <Pressable ... onPress={this.handleRestart}>
          <Text>Restart App</Text>
        </Pressable>
        <Pressable ... onPress={this.handleDismiss}>
          <Text>Try Again</Text>
        </Pressable>
      </View>
    </View>
  );
}
return this.props.children;
```

### Parameter Validation - GOOD

**File:** `/Users/brent/wtlfo/app/(home)/param/[param].tsx** (lines 203-209)
```tsx
// Good: Invalid parameter error handling
if (!activeParam || !(activeParam in PARAM_INFO)) {
  return (
    <View style={styles.container}>
      <Text style={styles.errorText}>Invalid parameter</Text>
    </View>
  );
}
```

### Contextual Warnings - EXCELLENT

**File:** `/Users/brent/wtlfo/app/(home)/param/[param].tsx** (lines 289-295)
```tsx
// Excellent: Contextual warning when setting is ineffective
{currentConfig.mode === 'FRE' && (
  <View style={styles.warningBanner}>
    <Text style={styles.warningText}>
      Fade has no effect in FRE mode. Switch to TRG, ONE, HLD, or HLF to use fade.
    </Text>
  </View>
)}
```

---

## 5. Empty States

### Array Handling - GOOD

**File:** `/Users/brent/wtlfo/src/components/lfo/RandomWaveform.tsx** (lines 98-101)
```tsx
// Good: Early return for empty arrays
if (samples.length === 0) {
  return null;
}
```

### Destination "None" State - GOOD

**File:** `/Users/brent/wtlfo/src/components/params/ParamGrid.tsx** (lines 60-61)
```tsx
// Good: Displays dash for no destination
const destination = getDestination(activeDestinationId);
const destinationDisplayName = destination?.displayName ?? '—';
```

**File:** `/Users/brent/wtlfo/app/(home)/index.tsx** (lines 167-179)
```tsx
// Good: "No Destination" text and dimmed meter when nothing selected
<View style={[styles.destinationSection, !hasDestination && styles.destinationHidden]}>
  <Text style={styles.destinationName}>
    {hasDestination ? activeDestination.name : 'No Destination'}
  </Text>
  ...
</View>
```

### RECOMMENDATION: Add explicit empty state for preset list

Currently, the preset list assumes presets always exist. Consider:

```tsx
{presets.length === 0 ? (
  <View style={styles.emptyState}>
    <Text style={styles.emptyText}>No presets available</Text>
  </View>
) : (
  presets.map(...)
)}
```

---

## 6. Platform Conditions

### Platform.OS Check - CORRECT

**File:** `/Users/brent/wtlfo/app/_layout.tsx** (lines 7-8, 17-20)
```tsx
// Correct: Platform-specific configuration using spread
const isLegacyIOS =
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) < 26;

<NativeTabs
  tintColor="#ff6600"
  {...(isLegacyIOS && {
    backgroundColor: '#000000',
    blurEffect: 'systemChromeMaterialDark',
  })}
>
```

### Web Fallback - GOOD

**File:** `/Users/brent/wtlfo/src/components/lfo/WaveformIcon.tsx** (lines 117-138)
```tsx
// Good: Platform-specific fallback for web when Skia unavailable
if (Platform.OS === 'web' && typeof Skia === 'undefined') {
  return (
    <View ... accessibilityLabel={WAVEFORM_LABELS[waveform]}>
      <Text style={[styles.fallbackText, { color, fontSize: size * 0.5 }]}>
        {waveform}
      </Text>
    </View>
  );
}
```

---

## 7. Performance

### Conditional Expensive Components - GOOD

**File:** `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx** (lines 94-105, 118-141)
```tsx
// Good: Optional expensive components only render when needed
{showParameters && (
  <ParameterBadges ... />
)}

// Good: Conditional complex waveform rendering
{waveform === 'RND' && randomSamples && randomSamples.length > 0 ? (
  <RandomWaveform ... />
) : (
  <WaveformDisplay ... />
)}
```

### Memoization - GOOD

**File:** `/Users/brent/wtlfo/src/components/lfo/WaveformIcon.tsx** (lines 36-75)
```tsx
// Excellent: Path caching for performance
const pathCache = new Map<string, ReturnType<typeof Skia.Path.Make>>();

function getCachedPath(...) {
  const key = `${waveform}-${size}-${strokeWidth}`;
  if (!pathCache.has(key)) {
    // ... expensive path creation
    pathCache.set(key, path);
  }
  return pathCache.get(key)!;
}
```

### useMemo for Expensive Computations - GOOD

**File:** `/Users/brent/wtlfo/src/components/lfo/FadeEnvelope.tsx** (lines 42-93)
```tsx
// Good: Memoized path computation
const path = useMemo(() => {
  const p = Skia.Path.Make();
  // ... expensive path calculations
  return p;
}, [waveform, width, height, resolution, depthScale, fade, startPhaseNormalized]);
```

### RECOMMENDATION: Consider Lazy Loading

The Learn tab has many screens that could benefit from lazy loading:

```tsx
// Potential optimization for Learn screens
const WaveformsScreen = React.lazy(() => import('./waveforms'));

// In layout:
<Suspense fallback={<LoadingScreen />}>
  <WaveformsScreen />
</Suspense>
```

---

## Summary of Findings

### Strengths

| Category | Status | Notes |
|----------|--------|-------|
| Ternary usage | Excellent | Appropriate value selection patterns |
| && short-circuits | Safe | No falsy number rendering issues |
| Null handling | Excellent | Consistent use of `??` and `?.` |
| Layout shift prevention | Excellent | Strategic opacity + pointerEvents |
| Error boundary | Excellent | Full-featured with recovery options |
| Contextual warnings | Excellent | User-friendly mode warnings |
| Platform handling | Good | Correct Platform.OS usage |
| Performance | Good | Memoization and caching used |

### Areas for Improvement

| Issue | Priority | Recommendation |
|-------|----------|----------------|
| No skeleton loaders | Medium | Add skeleton UI for lists |
| No lazy loading | Low | Consider for Learn tab screens |
| Limited empty states | Low | Add explicit empty state for preset list |

### Critical Issues

**None found.** The codebase follows React and React Native best practices for conditional rendering.

---

## Files Reviewed

### App Routes
- `/Users/brent/wtlfo/app/_layout.tsx`
- `/Users/brent/wtlfo/app/(home)/_layout.tsx`
- `/Users/brent/wtlfo/app/(home)/index.tsx`
- `/Users/brent/wtlfo/app/(home)/presets.tsx`
- `/Users/brent/wtlfo/app/(home)/param/[param].tsx`
- `/Users/brent/wtlfo/app/(destination)/_layout.tsx`
- `/Users/brent/wtlfo/app/(destination)/index.tsx`
- `/Users/brent/wtlfo/app/(settings)/_layout.tsx`
- `/Users/brent/wtlfo/app/(settings)/index.tsx`
- `/Users/brent/wtlfo/app/(learn)/_layout.tsx`
- `/Users/brent/wtlfo/app/(learn)/index.tsx`
- `/Users/brent/wtlfo/app/(learn)/intro.tsx`
- `/Users/brent/wtlfo/app/(learn)/parameters.tsx`
- `/Users/brent/wtlfo/app/(learn)/waveforms.tsx`
- `/Users/brent/wtlfo/app/(learn)/speed.tsx`
- `/Users/brent/wtlfo/app/(learn)/depth.tsx`
- `/Users/brent/wtlfo/app/(learn)/modes.tsx`
- `/Users/brent/wtlfo/app/(learn)/destinations.tsx`
- `/Users/brent/wtlfo/app/(learn)/timing.tsx`
- `/Users/brent/wtlfo/app/(learn)/presets.tsx`

### Components
- `/Users/brent/wtlfo/src/components/ErrorBoundary.tsx`
- `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx`
- `/Users/brent/wtlfo/src/components/lfo/WaveformDisplay.tsx`
- `/Users/brent/wtlfo/src/components/lfo/RandomWaveform.tsx`
- `/Users/brent/wtlfo/src/components/lfo/OutputValueDisplay.tsx`
- `/Users/brent/wtlfo/src/components/lfo/SlowMotionBadge.tsx`
- `/Users/brent/wtlfo/src/components/lfo/TimingInfo.tsx`
- `/Users/brent/wtlfo/src/components/lfo/ParameterBadges.tsx`
- `/Users/brent/wtlfo/src/components/lfo/PhaseIndicator.tsx`
- `/Users/brent/wtlfo/src/components/lfo/FadeEnvelope.tsx`
- `/Users/brent/wtlfo/src/components/lfo/GridLines.tsx`
- `/Users/brent/wtlfo/src/components/lfo/WaveformIcon.tsx`
- `/Users/brent/wtlfo/src/components/params/ParamGrid.tsx`
- `/Users/brent/wtlfo/src/components/params/ParamBox.tsx`
- `/Users/brent/wtlfo/src/components/params/ParamIcons.tsx`
- `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`
- `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx`
- `/Users/brent/wtlfo/src/components/destination/DestinationPickerInline.tsx`
- `/Users/brent/wtlfo/src/components/destination/CenterValueSlider.tsx`
- `/Users/brent/wtlfo/src/components/controls/SegmentedControl.tsx`
- `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx`
- `/Users/brent/wtlfo/src/components/learn/SkiaIcons.tsx`
