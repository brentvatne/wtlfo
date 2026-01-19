# Bundle Analysis Report

Generated: 2026-01-19

## Executive Summary

This analysis reviews the `wtlfo` Expo application for bundle optimization opportunities. The project is a React Native app using Expo SDK 54 with Skia-based LFO visualization, targeting iOS, Android, and web platforms.

---

## 1. Dependencies Analysis

### Production Dependencies (30 packages)

| Package | Estimated Size | Status | Notes |
|---------|---------------|--------|-------|
| `@shopify/react-native-skia` | **~2-3 MB** | Heavy | Core graphics library - necessary for visualizations |
| `react-native-reanimated` | **~500 KB** | Heavy | Essential for animations - required |
| `react-native-gesture-handler` | ~200 KB | Medium | Required by navigation |
| `react-native-screens` | ~100 KB | Light | Required by navigation |
| `react-native-safe-area-context` | ~50 KB | Light | Required by navigation |
| `@expo/vector-icons` | **~2 MB** | Heavy | **UNUSED** - only in package.json |
| `expo-font` | ~100 KB | Light | **UNUSED** - no custom fonts loaded |
| `expo-image` | ~150 KB | Light | **UNUSED** - no Image component usage |
| `expo-web-browser` | ~50 KB | Light | **UNUSED** - not imported anywhere |
| `expo-linking` | ~50 KB | Light | **UNUSED** - not imported anywhere |
| `expo-constants` | ~50 KB | Light | **UNUSED** - not imported anywhere |
| `expo-system-ui` | ~30 KB | Light | **UNUSED** - not imported anywhere |
| `react-native-worklets` | ~100 KB | Light | **UNUSED** - not imported anywhere |
| `react-native-web` | ~500 KB | Medium | Required for web builds only |
| `elektron-lfo` | ~10 KB | Tiny | Core LFO engine - essential |
| `expo-sqlite` | ~200 KB | Medium | Used for KV storage (persistence) |
| `expo-haptics` | ~30 KB | Light | Used in destination pickers |
| `expo-symbols` | ~50 KB | Light | Used in header icons |
| `expo-updates` | ~100 KB | Medium | OTA updates - used in settings/error boundary |
| `expo-splash-screen` | ~50 KB | Light | Used via config (app.json) |
| `expo-status-bar` | ~20 KB | Tiny | Likely auto-configured |
| `@react-navigation/*` | ~300 KB | Medium | Required by expo-router |
| `@react-native-community/slider` | ~50 KB | Light | Used for parameter sliders |

### Potentially Unused Dependencies

These packages are only referenced in `package.json` and not imported in any source file:

1. **`@expo/vector-icons`** (~2 MB) - No imports found. The app uses custom Skia icons instead.
2. **`expo-font`** - No custom fonts are loaded.
3. **`expo-image`** - No `expo-image` imports found.
4. **`expo-web-browser`** - Never imported.
5. **`expo-linking`** - Never imported (expo-router may use internally).
6. **`expo-constants`** - Never imported.
7. **`expo-system-ui`** - Never imported.
8. **`react-native-worklets`** - Never imported directly.

**Estimated savings if removed: ~2.5-3 MB**

### Required Peer Dependencies (Already Correct)

These are properly installed as dependencies (required by other packages):
- `react-native-gesture-handler` - Required by expo-router/navigation
- `react-native-screens` - Required by expo-router/navigation
- `react-native-safe-area-context` - Required by expo-router/navigation
- `react-native-reanimated` - Required by Skia and animations

---

## 2. Import Patterns Analysis

### Barrel Imports (Index Re-exports)

The project uses barrel exports in several locations:

| File | Exports | Tree-Shake Risk |
|------|---------|-----------------|
| `/src/components/lfo/index.ts` | 30+ exports | **HIGH** - Large barrel with many unused exports |
| `/src/components/controls/index.ts` | 2 exports | Low |
| `/src/components/params/index.ts` | 2 exports | Low |
| `/src/components/destination/index.ts` | 4 exports | Low |
| `/src/components/learn/index.ts` | 9 exports | Medium |
| `/src/theme/index.ts` | 2 exports | Low |

### Tree-Shaking Issues

**Problem 1: Large LFO barrel import**
```typescript
// app/(home)/index.tsx - Imports 6 items but barrel has 30+
import {
  LFOVisualizer,
  ELEKTRON_THEME,
  SlowMotionBadge,
  useSlowMotionPhase,
  getSlowdownInfo,
  sampleWaveformWorklet,
} from '@/src/components/lfo';
```

**Recommendation:** Consider direct imports for production builds:
```typescript
import { LFOVisualizer } from '@/src/components/lfo/LFOVisualizer';
import { ELEKTRON_THEME } from '@/src/components/lfo/constants';
// etc.
```

**Problem 2: Type-only imports mixed with runtime imports**
```typescript
// Could be split for cleaner tree-shaking
import type { WaveformType, TriggerMode } from '@/src/components/lfo';
```

### Good Patterns Found

1. Direct file imports in internal components (e.g., `LFOVisualizer.tsx` imports from `./WaveformDisplay`)
2. Type-only imports are properly marked with `import type`
3. No wildcard `import *` statements found

---

## 3. Bundle Impact Analysis

### Largest Dependencies by Impact

1. **@shopify/react-native-skia** (~3 MB)
   - Heavy but essential for real-time waveform visualization
   - Cannot be removed without complete rewrite

2. **@expo/vector-icons** (~2 MB)
   - **NOT USED** - Remove immediately
   - Project uses custom Skia-drawn icons instead

3. **react-native-reanimated** (~500 KB)
   - Essential for 60fps animations
   - Properly tree-shakes individual hooks

4. **react-native-web** (~500 KB)
   - Only needed for web builds
   - Could be made a peer dependency if web isn't a priority

### Duplicate Functionality

| Functionality | Packages | Recommendation |
|--------------|----------|----------------|
| Icons | `@expo/vector-icons` + custom `SkiaIcons` | Remove vector-icons |
| Storage | `expo-sqlite/kv-store` | No duplicates - good |
| Navigation | `expo-router` + `@react-navigation/*` | Required combination |

### Peer Dependency Candidates

These could potentially be peer dependencies if the project is extracted as a library:
- `react-native-reanimated` (animation framework)
- `@shopify/react-native-skia` (graphics framework)

For a standalone app, current setup is appropriate.

---

## 4. Dev Dependencies Analysis

### Current Dev Dependencies

| Package | Purpose | Status |
|---------|---------|--------|
| `@testing-library/jest-native` | Testing | Correct |
| `@testing-library/react-native` | Testing | Correct |
| `@types/jest` | TypeScript types | Correct |
| `@types/react` | TypeScript types | Correct |
| `eslint` | Linting | Correct |
| `eslint-config-expo` | Linting config | Correct |
| `expo-mcp` | CLI tooling | Correct |
| `jest` | Testing | Correct |
| `jest-expo` | Testing | Correct |
| `typescript` | Build | Correct |

**Status: All dev dependencies are properly categorized.**

### No Production Leakage Detected

All test files are in `__tests__` directories and testing packages are only imported in test files.

---

## 5. Circular Dependencies Analysis

### Dependency Graph Review

Analyzed import chains for circular references:

| Module A | Module B | Status |
|----------|----------|--------|
| `preset-context.tsx` | `presets.ts` | One-way (safe) |
| `modulation-context.tsx` | `destinations.ts` | One-way (safe) |
| `LFOVisualizer.tsx` | `WaveformDisplay.tsx` | One-way (safe) |
| `ParamGrid.tsx` | `ParamBox.tsx` | One-way (safe) |
| `DestinationMeter.tsx` | `lfo/types.ts` | One-way (safe) |

**No circular dependencies detected.**

### Import Hierarchy (Healthy)

```
app/
  -> src/context/
  -> src/components/
  -> src/data/

src/components/
  -> src/context/
  -> src/data/
  -> src/types/
  -> src/theme/

src/context/
  -> src/data/
  -> src/types/
```

---

## 6. Code Splitting Opportunities

### Lazy Loading Candidates

| Route/Component | Current Size | Load Priority | Recommendation |
|-----------------|--------------|---------------|----------------|
| `(learn)/*` screens | ~50 KB | Low | **Lazy load entire Learn tab** |
| `(settings)/index.tsx` | ~10 KB | Low | Lazy load |
| `SkiaIcons.tsx` | ~15 KB | Medium | Bundle with Learn tab |
| `DestinationPicker.tsx` | ~5 KB | Medium | Already modular |

### Expo Router Lazy Loading

The `(learn)` tab is an educational section that most users access infrequently. Consider:

```typescript
// Potential optimization for app/_layout.tsx
// expo-router automatically code-splits by route, but the Learn content
// could be further optimized by deferring heavy SkiaIcon imports
```

### Large Modules That Could Be Split

1. **SkiaIcons.tsx (469 lines)**
   - Contains 9 icon components
   - Only used in Learn tab
   - Consider: Split into individual icon files

2. **DestinationMeter.tsx (289 lines)**
   - Complex but focused component
   - Already well-isolated

3. **LFOVisualizer.tsx (209 lines)**
   - Core component used everywhere
   - Should NOT be split (critical path)

---

## 7. Asset Optimization

### Image Assets Found

| File | Location | Purpose | Notes |
|------|----------|---------|-------|
| `icon.png` | assets/images/ | App icon | Check optimization |
| `splash-icon.png` | assets/images/ | Splash screen | Check optimization |
| `favicon.png` | assets/images/ | Web favicon | Small |
| `android-icon-*.png` | assets/images/ | Adaptive icons | 3 variants |
| `icon-*.png` | assets/ | **Orphaned?** | 2 files with timestamps |

### Potential Issues

1. **Orphaned assets**: Two icon files with timestamps in `/assets/`:
   - `icon-1768805112862.png`
   - `icon-1768805488518.png`

   These appear to be unused - consider removing.

2. **Image optimization**: Ensure all PNGs are optimized using tools like:
   - `pngquant` for lossy compression
   - `optipng` for lossless compression

### Recommendations

```bash
# Check orphaned files
ls -la assets/*.png

# Optimize images (if not already done)
# pngquant --quality=65-80 assets/images/*.png
```

---

## 8. Recommendations Summary

### High Priority (Large Impact)

1. **Remove `@expo/vector-icons`** - Save ~2 MB
   ```bash
   npx expo uninstall @expo/vector-icons
   ```

2. **Remove unused Expo packages**:
   ```bash
   npx expo uninstall expo-font expo-image expo-web-browser expo-linking expo-constants expo-system-ui
   ```

3. **Verify `react-native-worklets` usage** - May be a peer dependency of Skia

### Medium Priority (Moderate Impact)

4. **Consider direct imports** for the large `@/src/components/lfo` barrel in critical paths

5. **Remove orphaned icon files** in `/assets/`

6. **Optimize image assets** if not already compressed

### Low Priority (Minor Impact)

7. **Split `SkiaIcons.tsx`** into individual components for Learn tab

8. **Document required vs optional dependencies** for future maintenance

---

## 9. Estimated Bundle Savings

| Action | Estimated Savings |
|--------|-------------------|
| Remove `@expo/vector-icons` | ~2 MB |
| Remove other unused packages | ~500 KB |
| Better tree-shaking (barrel imports) | ~50-100 KB |
| **Total Potential Savings** | **~2.5-2.7 MB** |

---

## Appendix: Files Analyzed

### Source Files (46 files)
- `/Users/brent/wtlfo/src/components/**/*.tsx` - 29 files
- `/Users/brent/wtlfo/src/context/**/*.tsx` - 2 files
- `/Users/brent/wtlfo/src/data/**/*.ts` - 2 files
- `/Users/brent/wtlfo/src/hooks/**/*.ts` - 1 file
- `/Users/brent/wtlfo/src/types/**/*.ts` - 1 file
- `/Users/brent/wtlfo/src/theme/**/*.ts` - 2 files
- `/Users/brent/wtlfo/app/**/*.tsx` - 20 files

### Configuration Files
- `/Users/brent/wtlfo/package.json`
- `/Users/brent/wtlfo/app.json`

### Test Files (5 files)
- `/Users/brent/wtlfo/src/**/__tests__/*.test.ts(x)`
