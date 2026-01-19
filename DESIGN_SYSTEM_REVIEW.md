# Design System Review

**App:** wtlfo (LFO Visualizer/Editor)
**Review Date:** January 2026
**Platform:** React Native (Expo)

---

## Executive Summary

This app has a strong visual identity with an Elektron-inspired dark theme. However, the design system is partially implemented - while a color system exists in `/src/theme/colors.ts`, it is not consistently used throughout the codebase. Typography and spacing lack formal scales, leading to inconsistencies. The app benefits from excellent accessibility annotations and a cohesive icon system built with Skia.

---

## 1. Color System

### Findings

**Defined Color Palette** (`/src/theme/colors.ts`):
```typescript
background: '#0a0a0a'      // Dark backgrounds
surface: '#1a1a1a'         // Card/container backgrounds
surfaceHover: '#2a2a2a'    // Interactive hover states
textPrimary: '#ffffff'     // Primary text
textSecondary: '#888899'   // Secondary text (purple-tinted gray)
textMuted: '#666677'       // Muted text
textDisabled: '#555566'    // Disabled text
accent: '#ff6600'          // Orange accent (Elektron-inspired)
accentDark: '#cc5500'      // Darker accent variant
warning: '#ffaa00'         // Warning states
warningBackground: '#3a2a00'
warningBorder: '#665500'
error: '#ff4444'           // Error states
border: '#2a2a2a'
gridLines: 'rgba(255, 255, 255, 0.1)'
```

**Additional Theme** (`/src/components/lfo/constants.ts`):
```typescript
ELEKTRON_THEME: {
  background: '#000000',
  waveformStroke: '#ff6600',
  phaseIndicator: '#ffffff',
  gridLines: '#333333',
  text: '#ffffff',
  textSecondary: '#888888',  // Note: differs from colors.ts (#888899)
  positive: '#00ff00',
  negative: '#ff0000',
  accent: '#ff6600',
  fadeCurve: '#00ffcc',
}
```

### Issues

1. **Hardcoded Colors (Critical):** Over 200+ instances of hardcoded hex values across the codebase:
   - `#ff6600` appears ~50 times instead of `colors.accent`
   - `#0a0a0a` appears ~20 times instead of `colors.background`
   - `#1a1a1a` appears ~40 times instead of `colors.surface`
   - `#888899` appears ~25 times instead of `colors.textSecondary`
   - `#ffffff` appears ~40 times instead of `colors.textPrimary`

2. **Inconsistent Gray Usage:**
   - `#666677` vs `#666` vs `#666666` (multiple grays for similar purposes)
   - `#555566` vs `#555` for muted/disabled text
   - `#777788` in ParamBox.tsx not in color system

3. **Duplicate Theme Definitions:**
   - `ELEKTRON_THEME` duplicates values from `colors.ts`
   - `textSecondary` differs between themes (`#888899` vs `#888888`)

4. **One-off Colors:**
   - `#34C759` (iOS green) in Settings for update status
   - `#ff6666` for error text in ErrorBoundary (differs from `colors.error`)
   - Various learn section colors: `#88ff88`, `#88cc88`, `#66aaff`, `#aaccee`

### Recommendations

1. Replace all hardcoded colors with `colors.*` tokens
2. Consolidate ELEKTRON_THEME into the main color system
3. Add semantic color tokens for common patterns (e.g., `colors.success`, `colors.link`)
4. Create a color migration script to find/replace hardcoded values

---

## 2. Typography System

### Findings

**No formal typography scale defined.** Font sizes are applied ad-hoc.

**Font Sizes Found (in pixels):**
```
10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 24, 48
```

**Common Patterns (informal):**
- **Headings:** 18px (section titles), 24px (error boundary title)
- **Body:** 14-15px (descriptions), 13px (secondary text)
- **Labels:** 10-12px (parameter labels, badges)
- **Large Display:** 16-20px (values, picker items)

**Font Weights:**
- `'500'` - Medium (secondary buttons, labels)
- `'600'` - Semi-bold (most common: headings, labels, buttons)
- `'700'` - Bold (values, accent text)

**Font Families:**
- `'monospace'` used for numeric values (good for tabular alignment)
- System default for everything else

**Special Properties:**
- `fontVariant: ['tabular-nums']` - Used correctly for numeric displays
- `letterSpacing: 0.5` to `1` - Used for uppercase labels
- `textTransform: 'uppercase'` - Used consistently for labels

### Issues

1. **No Typography Scale:** Font sizes are arbitrary (10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 24)
2. **Inconsistent Line Heights:** Most components don't specify `lineHeight`, relying on defaults
3. **Missing Line Height:** Only found explicit `lineHeight` in a few places (20, 17, 18, 80)
4. **Weight Inconsistency:** Labels use both '600' and '700' interchangeably

### Recommendations

1. Define a typography scale:
   ```typescript
   export const typography = {
     sizes: {
       xs: 10,    // Micro labels
       sm: 12,    // Labels, captions
       base: 14,  // Body text
       md: 16,    // Large body, small headings
       lg: 18,    // Section headings
       xl: 24,    // Page titles
     },
     lineHeights: {
       tight: 1.2,
       normal: 1.5,
       relaxed: 1.75,
     },
     weights: {
       medium: '500',
       semibold: '600',
       bold: '700',
     },
   };
   ```

2. Create text components or styles for common patterns (Heading, Body, Label, Caption)

---

## 3. Spacing System

### Findings

**No formal spacing scale defined.** Spacing values are ad-hoc.

**Padding Values Found:**
```
4, 6, 8, 10, 12, 14, 16, 20, 24, 40
```

**Margin Values Found:**
```
2, 4, 6, 8, 10, 12, 16, 20, 24, 32
```

**Gap Values Found:**
```
0, 4, 6, 8, 10, 12
```

### Issues

1. **Magic Numbers:** Nearly all spacing uses arbitrary pixel values
2. **Near-duplicate Values:** 14 and 16 often used interchangeably for similar elements
3. **Inconsistent Container Padding:**
   - Some screens use `padding: 16`
   - Others use `padding: 20`
   - Some use `paddingHorizontal: 16` with different vertical
4. **Gap Inconsistency:** Row gaps vary between 8, 10, 12 for similar layouts

### Recommendations

1. Define a spacing scale (4px base unit):
   ```typescript
   export const spacing = {
     xxs: 2,
     xs: 4,
     sm: 8,
     md: 12,
     lg: 16,
     xl: 20,
     xxl: 24,
     xxxl: 32,
   };
   ```

2. Standardize container padding to `spacing.lg` (16)
3. Use consistent gap values per context

---

## 4. Component Patterns

### Buttons

**Primary Button Style (ErrorBoundary):**
```typescript
{
  backgroundColor: '#ff6600',  // Should use colors.accent
  paddingVertical: 14,
  paddingHorizontal: 24,
  borderRadius: 12,
}
```

**Secondary Button Style:**
```typescript
{
  backgroundColor: '#1a1a1a',  // Should use colors.surface
  paddingVertical: 14,
  paddingHorizontal: 24,
  borderRadius: 12,
}
```

**Issues:**
- No shared button component - styles are duplicated
- Segmented control buttons use different padding (8-12px)
- Nav buttons in param screen have different padding (12h x 8v)

### Cards/Containers

**Standard Card:**
```typescript
{
  backgroundColor: '#1a1a1a',  // colors.surface
  borderRadius: 12,            // Mostly consistent
  padding: 14-16,             // Varies
}
```

**Issues:**
- Card border radius varies: 8, 10, 12 for similar components
- Some cards use `padding: 14`, others `padding: 16`
- Learn section cards all use `borderRadius: 12`, home uses `borderRadius: 10`

### Inputs (Sliders)

**Slider Styling (Consistent):**
```typescript
{
  minimumTrackTintColor: '#ff6600',  // colors.accent
  maximumTrackTintColor: '#3a3a3a',
  thumbTintColor: '#ff6600',
}
```

**Issues:**
- `#3a3a3a` is not in the color system

### Recommendations

1. Create shared components: `<Button variant="primary|secondary">`, `<Card>`, `<Section>`
2. Standardize border radius: `8` for small, `12` for cards/modals
3. Add `#3a3a3a` to color system as `colors.track` or similar

---

## 5. Icon System

### Findings

**Excellent icon system using @shopify/react-native-skia:**

**Parameter Icons** (`/src/components/params/ParamIcons.tsx`):
- Custom Skia-drawn icons for each parameter
- Consistent size: 18px
- Consistent color: `#ff6600` (hardcoded, should use colors.accent)
- Consistent stroke width: 1.5

**Learn Section Icons** (`/src/components/learn/SkiaIcons.tsx`):
- Larger icons for navigation cards
- Configurable: size (default 40), color, strokeWidth, backgroundColor
- Consistent default color: `#ff6600`
- Consistent background: `#2a2a2a`

**System Icons:**
- expo-symbols `SymbolView` for navigation (SF Symbols)
- Size: 22px (header icons)
- Consistent tint: `#ff6600`

### Issues

1. **Hardcoded Icon Colors:** All icons use `#ff6600` directly instead of `colors.accent`
2. **No Icon Size Scale:** 18px for param icons, 22px for nav, 40px for learn cards

### Recommendations

1. Replace hardcoded `#ff6600` with `colors.accent` in all icon components
2. Define icon size tokens: `iconSize.sm: 18`, `iconSize.md: 22`, `iconSize.lg: 40`

---

## 6. Motion System

### Findings

**Animations Used:**

1. **Spring Animations** (DestinationMeter):
   ```typescript
   { damping: 40, stiffness: 380, overshootClamping: true }
   ```
   - Used for meter value transitions
   - Subtle, no overshoot (appropriate for data visualization)

2. **Timing Animations** (LFOVisualizer):
   ```typescript
   { duration: 100, easing: Easing.inOut(Easing.ease) }
   ```
   - Used for phase indicator opacity fade

3. **Layout Animations** (SlowMotionBadge):
   ```typescript
   FadeIn.duration(150)
   FadeOut.duration(150)
   ```

### Issues

1. **No Centralized Duration Tokens:** 100ms and 150ms used without named constants
2. **Limited Animation Library:** Only a few components are animated
3. **No Shared Spring Config:** Spring values are inline

### Recommendations

1. Define motion tokens:
   ```typescript
   export const motion = {
     duration: {
       instant: 100,
       fast: 150,
       normal: 250,
       slow: 400,
     },
     spring: {
       stiff: { damping: 40, stiffness: 380, overshootClamping: true },
       bouncy: { damping: 20, stiffness: 300 },
     },
   };
   ```

2. Consider adding micro-interactions to buttons and cards

---

## 7. Dark Mode Considerations

### Findings

**The app is dark-mode only.** No light mode support exists.

**Background Hierarchy:**
- `#000000` - True black (visualizer canvas, meter)
- `#0a0a0a` - App background (near-black)
- `#1a1a1a` - Card/surface background
- `#2a2a2a` - Hover/pressed states
- `#3a3a3a` - Track backgrounds (slider)

**Text Hierarchy:**
- `#ffffff` - Primary text (high contrast)
- `#cccccc` - Body text (good readability)
- `#888899` - Secondary text (purple-tinted gray)
- `#666677` / `#666` - Muted text
- `#555566` / `#555` - Disabled text

### Issues

1. **OLED Optimization:** Uses `#000000` for canvas which is good for OLED
2. **Contrast Ratios:** Need verification but appear adequate
3. **No Light Mode:** Not an issue if intentional (Elektron aesthetic)

### Recommendations

1. Document that dark-mode-only is intentional
2. Consider adding `prefers-color-scheme` detection if light mode is ever needed
3. Test contrast ratios with accessibility tools

---

## Summary of Priority Fixes

### High Priority
1. **Replace hardcoded colors** with `colors.*` tokens (200+ instances)
2. **Create typography scale** and apply consistently
3. **Define spacing scale** and replace magic numbers

### Medium Priority
4. **Consolidate ELEKTRON_THEME** into main color system
5. **Create shared Button and Card components**
6. **Add icon color to color system** (icon size tokens)

### Low Priority
7. **Define motion tokens** for animations
8. **Standardize border radius** usage
9. **Document design decisions** (dark-mode-only, Elektron aesthetic)

---

## Files to Update

| File | Issue |
|------|-------|
| `/src/theme/colors.ts` | Add missing colors (#3a3a3a, #34C759, etc.) |
| All `app/(learn)/*.tsx` | Replace hardcoded colors (~100+ instances) |
| All `src/components/**/*.tsx` | Replace hardcoded colors (~100+ instances) |
| `/src/components/params/ParamIcons.tsx` | Use colors.accent |
| `/src/components/learn/SkiaIcons.tsx` | Use colors.accent |
| `/src/components/lfo/constants.ts` | Consolidate with colors.ts |

---

## Accessibility Notes (Positive)

The app has excellent accessibility annotations:
- `accessibilityLabel` on interactive elements
- `accessibilityRole` properly set (button, radio, slider, adjustable)
- `accessibilityHint` provides context
- `accessibilityState` for selection/disabled states
- `accessibilityValue` for sliders with min/max/now
- `hitSlop` on small touch targets

This is a strength that should be maintained as the design system is formalized.
