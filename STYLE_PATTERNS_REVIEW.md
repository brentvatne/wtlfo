# Style Patterns Review

A comprehensive analysis of styling patterns in the React Native LFO app.

## Executive Summary

The codebase demonstrates generally **good styling practices** with consistent use of `StyleSheet.create()`, proper theme integration, and well-organized component styles. However, there are several areas for improvement including hardcoded color values, duplicated style patterns, and inconsistent theme usage.

---

## 1. StyleSheet Usage

### Strengths

- **Consistent StyleSheet.create()**: All components properly extract styles to `StyleSheet.create()` at the module level, outside component functions.
- **No styles created in render**: Styles are created once when the module loads, not on every render.
- **Proper placement**: StyleSheet definitions are consistently placed at the bottom of each file.

### Examples of Good Practice

```typescript
// /Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx
const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
  },
});
```

```typescript
// /Users/brent/wtlfo/src/components/controls/SegmentedControl.tsx
const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { color: colors.textSecondary, ... },
  // All styles extracted properly
});
```

### Inline Styles Found

| File | Location | Inline Style | Recommendation |
|------|----------|--------------|----------------|
| `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx` | Line 92 | `{ width, backgroundColor: resolvedTheme.background }` | Dynamic - acceptable |
| `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx` | Line 108 | `{ width, height: canvasHeight }` | Dynamic dimensions - acceptable |
| `/Users/brent/wtlfo/app/(home)/index.tsx` | Lines 94-97 | `{ flex: 1, backgroundColor: colors.background }` | Extract to StyleSheet |
| `/Users/brent/wtlfo/app/(settings)/index.tsx` | Lines 63-75 | Multiple inline style objects | Extract to StyleSheet |
| `/Users/brent/wtlfo/app/(home)/_layout.tsx` | Lines 28-32 | Inline Pressable styles | Extract to StyleSheet |

### Issues

**Settings Screen has significant inline styling:**
```typescript
// /Users/brent/wtlfo/app/(settings)/index.tsx - Lines 69-85
<View
  style={{
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  }}
>
  <Text
    style={{
      fontSize: 18,
      fontWeight: '600',
      color: '#ffffff',
      marginBottom: 16,
    }}
  >
```
**Recommendation**: Extract these to a StyleSheet at the bottom of the file.

---

## 2. Style Composition

### Strengths

- **Correct array composition order**: Override styles come last in arrays
- **Conditional styles handled well**: Uses `&&` operator and Pressable's function style pattern

### Examples of Good Practice

```typescript
// /Users/brent/wtlfo/src/components/params/ParamBox.tsx - Lines 17-23
style={({ pressed }) => [
  styles.box,
  pressed && styles.pressed,
  isActive && styles.active,
  disabled && styles.disabled,
]}
```

```typescript
// /Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx - Lines 93-95
style={[
  styles.destinationItem,
  isSelected && styles.destinationItemSelected,
]}
```

```typescript
// /Users/brent/wtlfo/src/components/controls/SegmentedControl.tsx - Lines 42-47
style={[
  styles.segment,
  isFirst && styles.segmentFirst,
  isLast && styles.segmentLast,
  isSelected && styles.segmentSelected,
]}
```

### No Issues Found

Style composition is implemented correctly throughout the codebase.

---

## 3. Style Reuse (Duplicated Patterns)

### Critical Duplications

#### 3.1 Destination Item Styles (Exact Duplicate)

**Files:**
- `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx` (Lines 221-247)
- `/Users/brent/wtlfo/src/components/destination/DestinationPickerInline.tsx` (Lines 104-131)

Both files contain identical styles:
```typescript
destinationItem: {
  backgroundColor: '#1a1a1a',
  borderRadius: 8,
  paddingVertical: 12,
  paddingHorizontal: 14,
  minWidth: 80,
  alignItems: 'center',
},
destinationItemSelected: {
  backgroundColor: '#ff6600',
},
destinationDisplay: {
  color: '#ffffff',
  fontSize: 14,
  fontWeight: '700',
  fontFamily: 'monospace',
  marginBottom: 2,
},
// ... more duplicates
```

**Recommendation**: Create a shared styles file at `/Users/brent/wtlfo/src/components/destination/styles.ts`.

#### 3.2 Category Label Styles (Duplicate)

**Files:**
- `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx` (Lines 207-212)
- `/Users/brent/wtlfo/src/components/destination/DestinationPickerInline.tsx` (Lines 93-98)

```typescript
categoryLabel: {
  color: '#666677',
  fontSize: 11,
  fontWeight: '700',
  letterSpacing: 1,
},
```

#### 3.3 Segmented Control Pattern (Similar Pattern in Multiple Places)

**Files:**
- `/Users/brent/wtlfo/src/components/controls/SegmentedControl.tsx` (Lines 101-112)
- `/Users/brent/wtlfo/app/(settings)/index.tsx` (Lines 174-198)

Both implement similar segment styling with slight variations.

#### 3.4 Common Text Styles

Multiple files repeat similar patterns:
```typescript
// Monospace value display (repeated in 8+ files)
{
  fontWeight: '700',
  fontVariant: ['tabular-nums'],
  fontFamily: 'monospace',
}

// Uppercase label style (repeated in 10+ files)
{
  textTransform: 'uppercase',
  letterSpacing: 0.5 | 1,
  fontWeight: '600',
  fontSize: 10 | 11 | 12,
}
```

### Recommended Shared Styles

Create `/Users/brent/wtlfo/src/theme/typography.ts`:
```typescript
export const typography = StyleSheet.create({
  monoValue: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: 'monospace',
  },
  labelUppercase: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
});
```

---

## 4. Dynamic Styles

### Strengths

- **Correct memoization**: `useMemo` is used appropriately for computed paths in Skia components
- **useDerivedValue for animations**: Proper Reanimated patterns for animated values

### Examples of Good Practice

```typescript
// /Users/brent/wtlfo/src/components/lfo/FadeEnvelope.tsx - Lines 42-93
const path = useMemo(() => {
  const p = Skia.Path.Make();
  // ... path computation
  return p;
}, [waveform, width, height, resolution, depthScale, fade, startPhaseNormalized]);
```

```typescript
// /Users/brent/wtlfo/src/components/lfo/WaveformIcon.tsx - Lines 111-114
const path = useMemo(
  () => getCachedPath(waveform, size, strokeWidth),
  [waveform, size, strokeWidth]
);
```

```typescript
// /Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx
const meterFillHeight = useDerivedValue(() => {
  'worklet';
  // ... computation
}, [maxModulation, min, max, range, height]);
```

### Potential Improvements

**Theme Resolution in LFOVisualizer:**
```typescript
// /Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx - Lines 45-48
const resolvedTheme: LFOTheme = useMemo(() => {
  if (typeof theme === 'object') return theme;
  return theme === 'dark' ? DEFAULT_THEME_DARK : DEFAULT_THEME_LIGHT;
}, [theme]);
```
This is correctly memoized.

### No Issues Found

Dynamic styles are handled appropriately with proper memoization.

---

## 5. Theme Integration

### Current Theme Structure

```typescript
// /Users/brent/wtlfo/src/theme/colors.ts
export const colors = {
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceHover: '#2a2a2a',
  textPrimary: '#ffffff',
  textSecondary: '#888899',
  textMuted: '#666677',
  textDisabled: '#555566',
  accent: '#ff6600',
  accentDark: '#cc5500',
  warning: '#ffaa00',
  warningBackground: '#3a2a00',
  warningBorder: '#665500',
  error: '#ff4444',
  border: '#2a2a2a',
  gridLines: 'rgba(255, 255, 255, 0.1)',
} as const;
```

### Theme Usage Analysis

| Component | Uses Theme | Hardcoded Values |
|-----------|------------|------------------|
| SegmentedControl.tsx | Yes | `#3a3a3a` border |
| ParameterSlider.tsx | Yes | `#3a3a3a` track |
| ParamBox.tsx | No | `#1a1a1a`, `#777788`, `#ffffff`, etc. |
| ParamGrid.tsx | No | `#0a0a0a`, `#1a1a1a` |
| DestinationPicker.tsx | No | All colors hardcoded |
| DestinationPickerInline.tsx | No | All colors hardcoded |
| DestinationMeter.tsx | No | `#000000`, `#ffffff`, `#666677`, `#ff6600` |
| CenterValueSlider.tsx | No | `#888899`, `#ff6600`, `#3a3a3a`, `#555566` |
| HomeScreen (index.tsx) | Partial | Uses colors.background only |
| Settings (index.tsx) | No | All inline colors |
| Learn pages | No | All hardcoded |

### Hardcoded Colors That Should Use Theme

| Hardcoded Value | Should Be | Files |
|-----------------|-----------|-------|
| `#0a0a0a` | `colors.background` | 12+ files |
| `#1a1a1a` | `colors.surface` | 15+ files |
| `#2a2a2a` | `colors.surfaceHover` or `colors.border` | 8+ files |
| `#ffffff` | `colors.textPrimary` | 10+ files |
| `#888899` | `colors.textSecondary` | 8+ files |
| `#666677` | `colors.textMuted` | 6+ files |
| `#555566` | `colors.textDisabled` | 4+ files |
| `#ff6600` | `colors.accent` | 18+ files |
| `#3a3a3a` | Add to theme as `colors.surfaceActive` | 5+ files |
| `#777788` | Add to theme (between secondary/muted) | 2 files |
| `#cccccc` | Add to theme as `colors.textLight` | 4 files |

### Missing Theme Values

Add to `/Users/brent/wtlfo/src/theme/colors.ts`:
```typescript
// Additional colors to add
surfaceActive: '#3a3a3a',
surfaceDark: '#000000',
textLight: '#cccccc',
sliderTrack: '#3a3a3a',
```

---

## 6. Platform Styles

### Current Usage

```typescript
// /Users/brent/wtlfo/app/_layout.tsx - Lines 7-8
const isLegacyIOS =
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) < 26;
```

This is used for conditional tab bar styling on older iOS versions.

### StyleSheet.flatten

Not currently used in the codebase. No identified need for it.

### Platform-Specific Observations

```typescript
// /Users/brent/wtlfo/src/components/lfo/WaveformIcon.tsx - Lines 117-137
if (Platform.OS === 'web' && typeof Skia === 'undefined') {
  return (
    <View style={[styles.fallback, ...]}>
      // Web fallback
    </View>
  );
}
```

Good practice: Provides fallback for web platform when Skia isn't available.

### Recommendations

No significant platform-specific styling issues found. The codebase correctly handles the iOS/web differences where needed.

---

## 7. Performance

### Strengths

- **Styles outside components**: All StyleSheet.create() calls are at module level
- **No style object creation in render**: No instances of `style={{ ... }}` creating new objects in render (except dynamic values)
- **Proper memoization**: useMemo used for computed styles/paths

### Performance-Safe Patterns Found

```typescript
// Static styles defined once
const styles = StyleSheet.create({ ... });

// Dynamic styles with memoization
const resolvedTheme = useMemo(() => ..., [theme]);

// Pressable callback styles (React optimizes these)
style={({ pressed }) => [...]}
```

### Minor Performance Concerns

**Settings Screen inline styles** create new objects on each render:
```typescript
// /Users/brent/wtlfo/app/(settings)/index.tsx
style={{ flex: 1, backgroundColor: '#0a0a0a' }}  // New object each render
```

While React Native is good at shallow comparing simple objects, extracting to StyleSheet is still preferred.

---

## Summary of Recommendations

### High Priority

1. **Extract shared destination styles** to `/Users/brent/wtlfo/src/components/destination/styles.ts`
2. **Replace hardcoded colors with theme values** across all components
3. **Extract inline styles in settings screen** to StyleSheet

### Medium Priority

4. **Create typography shared styles** in `/Users/brent/wtlfo/src/theme/typography.ts`
5. **Add missing theme colors**: `surfaceActive`, `textLight`, `sliderTrack`
6. **Extract header layout inline styles** in `_layout.tsx` files

### Low Priority

7. **Consistent use of theme import** - some files import colors, others use hardcoded values
8. **Consider shared button/card styles** for common patterns

---

## Files Requiring Attention

| File | Priority | Issue |
|------|----------|-------|
| `/Users/brent/wtlfo/app/(settings)/index.tsx` | High | Significant inline styles |
| `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx` | High | Duplicated styles, no theme |
| `/Users/brent/wtlfo/src/components/destination/DestinationPickerInline.tsx` | High | Duplicated styles, no theme |
| `/Users/brent/wtlfo/src/components/params/ParamBox.tsx` | Medium | No theme usage |
| `/Users/brent/wtlfo/src/components/params/ParamGrid.tsx` | Medium | No theme usage |
| `/Users/brent/wtlfo/src/components/destination/CenterValueSlider.tsx` | Medium | No theme usage |
| `/Users/brent/wtlfo/app/(learn)/*.tsx` | Low | Hardcoded colors throughout |
| `/Users/brent/wtlfo/app/(home)/_layout.tsx` | Low | Minor inline styles |

---

## Overall Assessment

| Category | Rating | Notes |
|----------|--------|-------|
| StyleSheet Usage | Good | Consistent extraction |
| Style Composition | Excellent | Correct patterns throughout |
| Style Reuse | Needs Work | Significant duplication |
| Dynamic Styles | Good | Proper memoization |
| Theme Integration | Needs Work | Inconsistent, many hardcoded values |
| Platform Styles | Good | Appropriate handling |
| Performance | Good | Styles defined at module level |

**Overall Score: B+**

The codebase shows good fundamental practices but would benefit from better theme integration and reduced duplication.
