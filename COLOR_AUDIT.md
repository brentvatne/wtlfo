# Color Audit Report

## Executive Summary

This audit analyzes color usage across the wtlfo codebase to identify theming completeness, consistency issues, and recommendations for improvement.

**Key Findings:**
- 47 unique colors identified across the codebase
- Only 8 files import and use the centralized `colors` theme
- Most hardcoded colors are in the `/app/(learn)/` directory (educational screens)
- Several colors are used inconsistently for similar purposes
- The LFO component has its own theme system separate from the main app theme

---

## 1. Theme Colors (src/theme/colors.ts)

### Currently Defined Theme Colors

| Token | Value | Purpose |
|-------|-------|---------|
| `background` | `#0a0a0a` | Main app background |
| `surface` | `#1a1a1a` | Card/panel backgrounds |
| `surfaceHover` | `#2a2a2a` | Hover states, elevated surfaces |
| `textPrimary` | `#ffffff` | Primary text |
| `textSecondary` | `#888899` | Secondary/label text |
| `textMuted` | `#666677` | Muted/placeholder text |
| `textDisabled` | `#555566` | Disabled text |
| `accent` | `#ff6600` | Primary accent (orange) |
| `accentDark` | `#cc5500` | Darker accent variant |
| `warning` | `#ffaa00` | Warning messages |
| `warningBackground` | `#3a2a00` | Warning container bg |
| `warningBorder` | `#665500` | Warning container border |
| `error` | `#ff4444` | Error states |
| `border` | `#2a2a2a` | Default border color |
| `gridLines` | `rgba(255, 255, 255, 0.1)` | Grid/separator lines |

---

## 2. Complete Color Inventory

### Backgrounds

| Color | Usage | In Theme? | Recommendation |
|-------|-------|-----------|----------------|
| `#0a0a0a` | Main background | Yes (`background`) | Use theme token |
| `#000000` | Tab bar, meters, LFO bg | No | Add as `backgroundDark` |
| `#1a1a1a` | Surface/cards | Yes (`surface`) | Use theme token |
| `#1a1a2e` | LFO default dark theme | No | Keep in LFO theme |
| `#222222` | Elevated surface | No | Add as `surfaceElevated` |
| `#252525` | Elevated surface alt | No | Consolidate with #222222 |
| `#2a2a2a` | Hover/elevated | Yes (`surfaceHover`) | Use theme token |
| `#3a3a3a` | Slider tracks, buttons | No | Add as `surfaceActive` |
| `#f5f5f7` | Light theme bg | No | Keep in LFO light theme |

### Contextual Backgrounds

| Color | Usage | In Theme? | Recommendation |
|-------|-------|-----------|----------------|
| `#1a2a1a` | Success/positive bg | No | Add as `successBackground` |
| `#2a4a2a` | Active waveform bg | No | Keep for specific use |
| `#4a3a2a` | Alt waveform bg | No | Keep for specific use |
| `#0a1a1a` | Timing info dark | No | Consider consolidating |
| `#1a2a3a` | Info/highlight bg | No | Add as `infoBackground` |
| `#3a2a00` | Warning bg | Yes (`warningBackground`) | Use theme token |

### Text Colors

| Color | Usage | In Theme? | Recommendation |
|-------|-------|-----------|----------------|
| `#ffffff` | Primary text | Yes (`textPrimary`) | Use theme token |
| `#cccccc` | Body text, descriptions | No | Add as `textBody` |
| `#aaaaaa` | Placeholder/hint | No | Consolidate with textMuted |
| `#aaccee` | Info text light | No | Add as `infoText` |
| `#888899` | Secondary text | Yes (`textSecondary`) | Use theme token |
| `#888888` | Elektron theme secondary | No | Keep in LFO theme |
| `#777788` | Label text | No | Use `textSecondary` instead |
| `#666677` | Muted text | Yes (`textMuted`) | Use theme token |
| `#666` | Disabled/loading | No | Use `textMuted` or `textDisabled` |
| `#555566` | Disabled text | Yes (`textDisabled`) | Use theme token |
| `#1a1a1a` | Light theme text | No | Keep in LFO light theme |

### Accent Colors

| Color | Usage | In Theme? | Recommendation |
|-------|-------|-----------|----------------|
| `#ff6600` | Primary accent | Yes (`accent`) | Use theme token |
| `#cc5500` | Accent dark/pressed | Yes (`accentDark`) | Use theme token |

### Status Colors

| Color | Usage | In Theme? | Recommendation |
|-------|-------|-----------|----------------|
| `#ffaa00` | Warning | Yes (`warning`) | Use theme token |
| `#ff4444` | Error | Yes (`error`) | Use theme token |
| `#ff6666` | Error light | No | Add as `errorLight` |
| `#34C759` | Success (iOS green) | No | Add as `success` |

### Positive/Negative Indicators

| Color | Usage | In Theme? | Recommendation |
|-------|-------|-----------|----------------|
| `#88ff88` | Positive value | No | Add as `positive` |
| `#88cc88` | Positive muted | No | Add as `positiveMuted` |
| `#88aa88` | Positive secondary | No | Consolidate with positiveMuted |
| `#00ff00` | Elektron positive | No | Keep in LFO theme |
| `#4ade80` | Default positive | No | Keep in LFO theme |
| `#16a34a` | Light theme positive | No | Keep in LFO theme |
| `#ff0000` | Elektron negative | No | Keep in LFO theme |
| `#f87171` | Default negative | No | Keep in LFO theme |
| `#dc2626` | Light theme negative | No | Keep in LFO theme |

### LFO Visualization Colors

| Color | Usage | In Theme? | Recommendation |
|-------|-------|-----------|----------------|
| `#00d4ff` | Cyan waveform/accent | No | Keep in LFO theme |
| `#0066cc` | Light theme waveform | No | Keep in LFO theme |
| `#ff6b6b` | Phase indicator | No | Keep in LFO theme |
| `#ffcc00` | Fade curve (gold) | No | Keep in LFO theme |
| `#ff9900` | Light fade curve | No | Keep in LFO theme |
| `#00ffcc` | Elektron fade curve | No | Keep in LFO theme |

### Info/Highlight Colors

| Color | Usage | In Theme? | Recommendation |
|-------|-------|-----------|----------------|
| `#66aaff` | Info accent | No | Add as `info` |
| `#00d4ff` | Timing highlight | No | Keep in LFO theme |
| `#668888` | Timing muted | No | Keep for specific use |

### Border Colors

| Color | Usage | In Theme? | Recommendation |
|-------|-------|-----------|----------------|
| `#2a2a2a` | Default border | Yes (`border`) | Use theme token |
| `#1a1a1a` | Subtle border | No | Add as `borderSubtle` |
| `#3a3a3a` | Border emphasis | No | Add as `borderEmphasis` |
| `#222222` | Section dividers | No | Consolidate with border |
| `#252525` | Alt dividers | No | Consolidate with border |
| `#665500` | Warning border | Yes (`warningBorder`) | Use theme token |
| `#333333` | Elektron grid | No | Keep in LFO theme |

### RGBA Colors

| Color | Usage | In Theme? | Recommendation |
|-------|-------|-----------|----------------|
| `rgba(255, 255, 255, 0.1)` | Grid lines | Yes (`gridLines`) | Use theme token |
| `rgba(255, 255, 255, 0.05)` | Subtle hover | No | Add as `hoverOverlay` |
| `rgba(255, 255, 255, 0.15)` | Grid emphasis | No | Add as `gridLinesEmphasis` |
| `rgba(255, 102, 0, 0.1)` | Accent overlay | No | Add as `accentOverlay` |
| `rgba(255, 102, 0, 0.2)` | Accent highlight | No | Keep for specific use |
| `rgba(0, 0, 0, 0.6)` | Dark text overlay | No | Add as `textOnAccent` |
| `rgba(0, 0, 0, 0.75)` | Badge background | No | Add as `overlayDark` |

---

## 3. Semantic Analysis

### Consistent Patterns

**Backgrounds follow a clear hierarchy:**
- `#0a0a0a` / `#000000` - App background (deepest)
- `#1a1a1a` - Surface/cards
- `#2a2a2a` - Hover/elevated
- `#3a3a3a` - Active/pressed

**Text colors are well-organized:**
- `#ffffff` - Primary
- `#cccccc` - Body (needs theme token)
- `#888899` - Secondary
- `#666677` - Muted
- `#555566` - Disabled

### Inconsistencies Found

1. **Near-duplicate grays:**
   - `#222222` and `#252525` used interchangeably for dividers
   - `#777788` used instead of `#888899` (textSecondary)
   - `#888888` vs `#888899` (slight variation)

2. **Inconsistent positive/success colors:**
   - `#88ff88`, `#88cc88`, `#88aa88` all used for positive values
   - `#34C759` (iOS green) used in settings only
   - No unified success color in main theme

3. **Missing info/highlight color:**
   - `#66aaff`, `#00d4ff` used ad-hoc for info highlights
   - No consistent info color defined

4. **Shorthand colors:**
   - `#666` used instead of `#666677` (inconsistent notation)

---

## 4. Files Using Theme vs Hardcoded

### Files Importing Theme (Good)

| File | Usage |
|------|-------|
| `app/(home)/index.tsx` | Partial (background only) |
| `app/(home)/param/[param].tsx` | Good coverage |
| `app/(home)/presets.tsx` | Partial |
| `app/(destination)/index.tsx` | Good coverage |
| `src/components/controls/ParameterSlider.tsx` | Good coverage |
| `src/components/controls/SegmentedControl.tsx` | Good coverage |
| `src/components/params/ParamBox.tsx` | Partial |
| `src/components/lfo/SlowMotionBadge.tsx` | Partial |

### Files with Hardcoded Colors (Need Refactoring)

| File | Hardcoded Colors Count |
|------|----------------------|
| `app/(learn)/timing.tsx` | 25+ |
| `app/(learn)/depth.tsx` | 30+ |
| `app/(learn)/modes.tsx` | 25+ |
| `app/(learn)/speed.tsx` | 25+ |
| `app/(learn)/intro.tsx` | 15+ |
| `app/(learn)/waveforms.tsx` | 20+ |
| `app/(learn)/parameters.tsx` | 15+ |
| `app/(learn)/presets.tsx` | 15+ |
| `app/(learn)/destinations.tsx` | 20+ |
| `app/(learn)/index.tsx` | 12+ |
| `app/(settings)/index.tsx` | 12+ |
| `src/components/ErrorBoundary.tsx` | 10+ |
| `src/components/destination/*.tsx` | 20+ |
| `src/components/learn/SkiaIcons.tsx` | 10+ |
| Layout files (`_layout.tsx`) | 5-6 each |

---

## 5. Recommendations

### Priority 1: Add Missing Theme Tokens

```typescript
export const colors = {
  // Existing...

  // Backgrounds - Add
  backgroundDark: '#000000',
  surfaceElevated: '#222222',
  surfaceActive: '#3a3a3a',

  // Status - Add
  success: '#34C759',
  successBackground: '#1a2a1a',
  errorLight: '#ff6666',
  info: '#66aaff',
  infoBackground: '#1a2a3a',

  // Text - Add
  textBody: '#cccccc',
  textOnAccent: 'rgba(0, 0, 0, 0.6)',

  // Positive/Negative - Add
  positive: '#88ff88',
  positiveMuted: '#88cc88',
  negative: '#ff4444', // Same as error

  // Borders - Add
  borderSubtle: '#1a1a1a',
  borderEmphasis: '#3a3a3a',

  // Overlays - Add
  hoverOverlay: 'rgba(255, 255, 255, 0.05)',
  accentOverlay: 'rgba(255, 102, 0, 0.1)',
  overlayDark: 'rgba(0, 0, 0, 0.75)',
} as const;
```

### Priority 2: Consolidate Duplicates

| Replace | With |
|---------|------|
| `#252525` | `#222222` (surfaceElevated) |
| `#777788` | `#888899` (textSecondary) |
| `#888888` | `#888899` (textSecondary) |
| `#666` | `#666677` (textMuted) |
| `#88aa88` | `#88cc88` (positiveMuted) |

### Priority 3: Refactor Files

1. **Layout files** - Replace hardcoded `#ff6600` with `colors.accent`
2. **Settings screen** - Import and use theme colors
3. **Learn screens** - Large refactor needed, consider creating a shared styles file
4. **Destination components** - Import and use theme colors
5. **ErrorBoundary** - Import and use theme colors

### Priority 4: LFO Theme Integration

Consider creating a unified theme system that:
1. Keeps LFO visualization themes separate (they serve different purposes)
2. Ensures base colors (background, text) align with main theme
3. Uses main theme colors for UI elements around LFO visualizations

---

## 6. Suggested Theme Structure

```typescript
// src/theme/colors.ts (proposed expansion)

export const colors = {
  // === BACKGROUNDS ===
  background: '#0a0a0a',
  backgroundDark: '#000000',
  surface: '#1a1a1a',
  surfaceElevated: '#222222',
  surfaceHover: '#2a2a2a',
  surfaceActive: '#3a3a3a',

  // Contextual backgrounds
  successBackground: '#1a2a1a',
  warningBackground: '#3a2a00',
  errorBackground: '#3a1a1a',
  infoBackground: '#1a2a3a',

  // === TEXT ===
  textPrimary: '#ffffff',
  textBody: '#cccccc',
  textSecondary: '#888899',
  textMuted: '#666677',
  textDisabled: '#555566',
  textOnAccent: 'rgba(0, 0, 0, 0.6)',

  // === ACCENT ===
  accent: '#ff6600',
  accentDark: '#cc5500',
  accentOverlay: 'rgba(255, 102, 0, 0.1)',

  // === STATUS ===
  success: '#34C759',
  warning: '#ffaa00',
  error: '#ff4444',
  errorLight: '#ff6666',
  info: '#66aaff',

  // === POSITIVE/NEGATIVE ===
  positive: '#88ff88',
  positiveMuted: '#88cc88',
  negative: '#ff4444',

  // === BORDERS ===
  border: '#2a2a2a',
  borderSubtle: '#1a1a1a',
  borderEmphasis: '#3a3a3a',
  warningBorder: '#665500',

  // === OVERLAYS ===
  gridLines: 'rgba(255, 255, 255, 0.1)',
  hoverOverlay: 'rgba(255, 255, 255, 0.05)',
  overlayDark: 'rgba(0, 0, 0, 0.75)',
} as const;
```

---

## 7. Summary Statistics

| Metric | Count |
|--------|-------|
| Unique colors in codebase | 47 |
| Colors defined in theme | 15 |
| Colors missing from theme | 32 |
| Files using theme import | 8 |
| Files with hardcoded colors | 25+ |
| Near-duplicate colors | 5 pairs |

---

*Generated: 2026-01-19*
