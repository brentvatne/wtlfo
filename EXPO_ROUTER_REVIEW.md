# Expo Router Review: wtlfo

**Review Date:** 2026-01-19
**Expo Router Version:** ~6.0.21
**Expo SDK:** ~54.0

---

## Executive Summary

This React Native app (an LFO visualizer/editor for Elektron devices) demonstrates a well-structured Expo Router implementation with modern patterns. The routing architecture is clean, uses appropriate grouping strategies, and leverages native-first navigation APIs. There are a few areas for improvement, but overall this is a solid implementation.

**Overall Grade: B+**

---

## 1. Route Organization

### Current Structure

```
app/
  _layout.tsx              # Root: NativeTabs with providers
  (home)/
    _layout.tsx            # Stack navigator
    index.tsx              # Main LFO editor
    presets.tsx            # Modal: preset selector
    param/
      [param].tsx          # Dynamic modal: parameter editor
  (learn)/
    _layout.tsx            # Stack navigator
    index.tsx              # Topic list
    intro.tsx              # Individual learn pages...
    parameters.tsx
    waveforms.tsx
    speed.tsx
    depth.tsx
    modes.tsx
    destinations.tsx
    timing.tsx
    presets.tsx
  (settings)/
    _layout.tsx            # Stack navigator
    index.tsx              # Settings page
  (destination)/
    _layout.tsx            # Stack navigator
    index.tsx              # Destination detail view
```

### Assessment

| Criteria | Rating | Notes |
|----------|--------|-------|
| Logical structure | Good | Clear separation by feature/tab |
| Group usage | Good | Proper use of route groups for tabs |
| Nesting depth | Excellent | Max 3 levels deep, very manageable |
| Scalability | Good | Easy to add new sections |

### Findings

**Strengths:**
- Route groups `(home)`, `(learn)`, `(settings)`, `(destination)` cleanly organize tab content
- Shallow nesting (max 3 levels) keeps navigation predictable
- Each tab has its own stack, enabling independent navigation history

**Concerns:**
- **Orphaned `(destination)` group**: This route group exists but is not registered as a tab trigger in the root `_layout.tsx`. It appears to be unused or accessed via programmatic navigation only. If it's meant to be a modal from the home tab, it should be moved under `(home)/` or documented clearly.

**Recommendation:**
- Clarify the purpose of `(destination)` - either:
  1. Add it as a tab if intended
  2. Move it under `(home)/` as a modal/detail screen
  3. Add a comment explaining its navigation entry point

---

## 2. Layout Files

### Root Layout (`app/_layout.tsx`)

```tsx
<ErrorBoundary>
  <PresetProvider>
    <ModulationProvider>
      <NativeTabs tintColor="#ff6600" ...>
        <NativeTabs.Trigger name="(home)">...</NativeTabs.Trigger>
        <NativeTabs.Trigger name="(learn)">...</NativeTabs.Trigger>
        <NativeTabs.Trigger name="(settings)">...</NativeTabs.Trigger>
      </NativeTabs>
    </ModulationProvider>
  </PresetProvider>
</ErrorBoundary>
```

| Criteria | Rating | Notes |
|----------|--------|-------|
| Structure | Excellent | Clean provider hierarchy |
| Inheritance | Good | Providers wrap entire app |
| Efficiency | Good | Single render tree |

**Strengths:**
- Uses `expo-router/unstable-native-tabs` - a modern, native-first approach
- Properly nests providers (ErrorBoundary > PresetProvider > ModulationProvider)
- Clean conditional styling for legacy iOS
- SF Symbols integration for icons

**Concerns:**
- **Unstable API**: `expo-router/unstable-native-tabs` is marked as unstable. Monitor for breaking changes.
- **Missing `(destination)` tab trigger**: The `(destination)` group has no tab trigger.

### Home Layout (`app/(home)/_layout.tsx`)

```tsx
<Stack screenOptions={{ ... }}>
  <Stack.Screen name="index" options={{ title: preset?.name }} />
  <Stack.Screen name="presets" options={{ presentation: 'formSheet' }} />
  <Stack.Screen name="param/[param]" options={{ presentation: 'formSheet' }} />
</Stack>
```

| Criteria | Rating | Notes |
|----------|--------|-------|
| Structure | Excellent | All screens pre-defined |
| Modal config | Excellent | iOS form sheets with grabbers |
| Dynamic title | Good | Title updates with preset name |

**Strengths:**
- Explicitly defines all stack screens (best practice for typed routes)
- Excellent iOS modal configuration with `sheetGrabberVisible`, `sheetAllowedDetents`
- Dynamic header title from context
- Custom header buttons using `Link` and `Pressable`

### Learn Layout (`app/(learn)/_layout.tsx`)

```tsx
<Stack screenOptions={{ ... }}>
  <Stack.Screen name="index" />
  <Stack.Screen name="intro" />
  // ... 8 more screens
</Stack>
```

| Criteria | Rating | Notes |
|----------|--------|-------|
| Structure | Good | All 10 screens defined |
| Verbosity | Acceptable | Could use dynamic options |

**Consideration:**
- With 10 screens having similar configurations, you could consider dynamic screen options to reduce boilerplate. However, explicit definitions improve readability and typed route support.

### Settings & Destination Layouts

Both follow the same minimal pattern with a single index screen. Clean and appropriate.

---

## 3. Dynamic Routes

### Current Implementation: `param/[param].tsx`

```tsx
const { param: urlParam } = useLocalSearchParams<{ param: ParamKey }>();
type ParamKey = 'waveform' | 'speed' | 'multiplier' | 'mode' | 'depth' | 'fade' | 'startPhase' | 'destination';
```

| Criteria | Rating | Notes |
|----------|--------|-------|
| Usage | Good | Single dynamic route |
| Typing | Good | Custom ParamKey type |
| Validation | Good | Validates in component |

**Strengths:**
- Proper use of `useLocalSearchParams` with generic type
- Validates parameter against known values
- Shows error UI for invalid params
- Uses `router.setParams()` for instant param switching without animation

**Concerns:**
- **Type safety gap**: The generic `<{ param: ParamKey }>` provides runtime guidance but `urlParam` could still be any string. The component handles this with validation.
- **URL manipulation pattern**: Using `setParams` for navigation within the modal is clever but unconventional. This works but may cause issues with deep linking or browser history on web.

**Recommendations:**
1. Consider using Expo Router's typed routes feature (already enabled in `app.json`):
   ```tsx
   // Generate types from file structure
   import type { ParamListBase } from '@react-navigation/native';
   ```
2. If catch-all routes are needed in the future (e.g., `[...slug].tsx`), document the pattern.

---

## 4. Route Naming

### URL Structure Analysis

| Route | URL | Assessment |
|-------|-----|------------|
| Home | `/` | Good |
| Presets modal | `/presets` | Good |
| Param editor | `/param/waveform` | Good |
| Learn index | `/` (learn tab) | Good |
| Learn intro | `/intro` | Ambiguous |
| Settings | `/` (settings tab) | Good |
| Destination | `/` (orphaned) | Unclear |

**Strengths:**
- Short, clean URLs
- Semantic naming (`/presets`, `/param/[param]`)
- Matches tab structure

**Concerns:**
- **Learn routes are tab-relative**: `/intro`, `/waveforms` etc. work within the learn tab but could be confusing if accessed directly. Consider prefixing: `/learn/intro`.
- **Naming collision**: Both `(home)/presets.tsx` and `(learn)/presets.tsx` exist. While they're in different groups, this could cause confusion.

**Recommendations:**
1. Consider renaming `(learn)/presets.tsx` to `(learn)/recipes.tsx` to match the "Preset Recipes" title and avoid collision.
2. The short Learn routes work well for a tab-based app but won't support web SEO if needed later.

---

## 5. Navigation Patterns

### Stack vs Tab Usage

| Pattern | Implementation | Rating |
|---------|----------------|--------|
| Tab bar | NativeTabs (3 tabs) | Excellent |
| Stack nav | Per-tab stacks | Excellent |
| Modals | formSheet presentation | Excellent |
| Deep navigation | Standard push | Good |

**Strengths:**
- Native tab bar with SF Symbols
- iOS form sheets with modern configuration
- Each tab has isolated navigation history
- Proper back navigation in learn section

### Modal Configuration

```tsx
<Stack.Screen
  name="param/[param]"
  options={{
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    sheetAllowedDetents: [0.35, 0.5],
    contentStyle: { backgroundColor: '#0a0a0a' },
  }}
/>
```

**Excellent modal config!** This uses:
- `formSheet` - iOS 15+ native modal style
- `sheetGrabberVisible` - Shows drag indicator
- `sheetAllowedDetents` - Snap points for sheet height
- Consistent dark theme

### Deep Linking

Deep linking is configured via the `scheme` in `app.json`:
```json
"scheme": "wtlfo"
```

This enables:
- `wtlfo://` - Opens app
- `wtlfo://presets` - Opens presets modal
- `wtlfo://param/waveform` - Opens waveform param

**Concern:** The `(destination)` route is not accessible via tabs, making its deep link entry point unclear.

---

## 6. Route Guards

### Current State

| Feature | Implemented | Notes |
|---------|-------------|-------|
| Authentication | Not needed | No auth in this app |
| Protected routes | Not needed | Single-user app |
| Redirects | None | N/A |
| Error boundaries | Yes | Root-level ErrorBoundary |

**Assessment:** This app doesn't require authentication or protected routes. The current implementation is appropriate.

**Future consideration:** If user accounts or cloud sync are added, consider:
```tsx
// app/_layout.tsx
function RootLayoutNav() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <SplashScreen />;
  if (!user) return <Redirect href="/login" />;

  return <NativeTabs>...</NativeTabs>;
}
```

---

## 7. Best Practices

### Expo Router Conventions

| Convention | Status | Notes |
|------------|--------|-------|
| `_layout.tsx` for layouts | Yes | All present |
| File-based routing | Yes | Clean structure |
| Route groups `()` | Yes | For tabs |
| Dynamic routes `[]` | Yes | `[param].tsx` |
| Typed routes | Enabled | In `app.json` |
| `Link` component | Yes | Used for navigation |
| `router` object | Yes | Programmatic navigation |

### Deprecated Patterns

| Pattern | Status |
|---------|--------|
| `@react-navigation` direct imports | None found |
| `createStackNavigator` | Not used |
| Manual deep link config | Not used |

**No deprecated patterns detected!**

### Modern Patterns Used

1. **Native Tabs** - `expo-router/unstable-native-tabs`
2. **Form Sheets** - iOS native modal presentation
3. **SF Symbols** - Native iOS icons
4. **Typed Routes** - Enabled in experiments
5. **React Compiler** - Enabled in experiments
6. **Context Providers** - Clean hierarchy

---

## 8. Recommendations

### High Priority

1. **Resolve `(destination)` group purpose**
   - Currently orphaned with no tab trigger
   - Either add to tabs, move under `(home)`, or document why it exists

2. **Rename `(learn)/presets.tsx`**
   - Rename to `recipes.tsx` to match "Preset Recipes" title
   - Avoids naming collision with `(home)/presets.tsx`

### Medium Priority

3. **Document the `setParams` navigation pattern**
   - The `param/[param].tsx` uses `router.setParams()` for instant switching
   - Add a comment explaining this intentional pattern vs. `router.push()`

4. **Consider web URLs**
   - Current Learn routes (`/intro`, `/waveforms`) are tab-relative
   - If web support matters, consider URL structure for SEO

### Low Priority

5. **Monitor `unstable-native-tabs`**
   - Track Expo Router releases for API changes
   - Have a fallback plan for the standard Tab navigator

6. **Add `+not-found.tsx`**
   - Create a catch-all 404 page for invalid routes
   - Example: `app/+not-found.tsx`

---

## 9. File Reference

### All Route Files

| File | Purpose |
|------|---------|
| `/Users/brent/wtlfo/app/_layout.tsx` | Root layout with tabs |
| `/Users/brent/wtlfo/app/(home)/_layout.tsx` | Home stack |
| `/Users/brent/wtlfo/app/(home)/index.tsx` | Main LFO editor |
| `/Users/brent/wtlfo/app/(home)/presets.tsx` | Preset picker modal |
| `/Users/brent/wtlfo/app/(home)/param/[param].tsx` | Dynamic parameter editor |
| `/Users/brent/wtlfo/app/(learn)/_layout.tsx` | Learn stack |
| `/Users/brent/wtlfo/app/(learn)/index.tsx` | Learn topic list |
| `/Users/brent/wtlfo/app/(learn)/intro.tsx` | What is an LFO? |
| `/Users/brent/wtlfo/app/(learn)/parameters.tsx` | The 7 Parameters |
| `/Users/brent/wtlfo/app/(learn)/waveforms.tsx` | Waveforms |
| `/Users/brent/wtlfo/app/(learn)/speed.tsx` | Speed & Timing |
| `/Users/brent/wtlfo/app/(learn)/depth.tsx` | Depth & Fade |
| `/Users/brent/wtlfo/app/(learn)/modes.tsx` | Trigger Modes |
| `/Users/brent/wtlfo/app/(learn)/destinations.tsx` | Destinations |
| `/Users/brent/wtlfo/app/(learn)/timing.tsx` | Timing Math |
| `/Users/brent/wtlfo/app/(learn)/presets.tsx` | Preset Recipes |
| `/Users/brent/wtlfo/app/(settings)/_layout.tsx` | Settings stack |
| `/Users/brent/wtlfo/app/(settings)/index.tsx` | Settings page |
| `/Users/brent/wtlfo/app/(destination)/_layout.tsx` | Destination stack |
| `/Users/brent/wtlfo/app/(destination)/index.tsx` | Destination detail |

---

## 10. Summary

This Expo Router implementation is well-architected for a focused, single-purpose app. The use of modern APIs (NativeTabs, form sheets, SF Symbols) demonstrates familiarity with current best practices. The main areas for improvement are:

1. Clarifying the orphaned `(destination)` route group
2. Avoiding potential naming collisions
3. Adding a 404 handler

The routing structure supports the app's functionality well and should scale cleanly if new features are added.
