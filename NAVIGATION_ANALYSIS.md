# Navigation Architecture Analysis

**App:** wtlfo - LFO Editor for Elektron Devices
**Framework:** Expo Router (file-based routing with React Navigation)
**Analysis Date:** January 2026

---

## 1. Route Structure

### Directory Layout

```
app/
  _layout.tsx           # Root: NativeTabs with 3 tabs
  (home)/
    _layout.tsx         # Stack navigator
    index.tsx           # Main LFO editor
    presets.tsx         # Preset picker (modal)
    param/[param].tsx   # Parameter editor (modal)
  (learn)/
    _layout.tsx         # Stack navigator
    index.tsx           # Topic list
    intro.tsx           # What is an LFO?
    parameters.tsx      # The 7 Parameters
    waveforms.tsx       # Waveforms deep dive
    speed.tsx           # Speed & Timing
    depth.tsx           # Depth & Fade
    modes.tsx           # Trigger Modes
    destinations.tsx    # Destinations guide
    timing.tsx          # Timing Math
    presets.tsx         # Preset Recipes
  (settings)/
    _layout.tsx         # Stack navigator
    index.tsx           # Settings screen
  (destination)/
    _layout.tsx         # Stack navigator (unused in main nav)
    index.tsx           # Destination detail view
```

### Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| Organization | Excellent | Route groups `(home)`, `(learn)`, `(settings)` cleanly separate concerns |
| Route Names | Good | Names are intuitive (`intro`, `waveforms`, `depth`). `param/[param].tsx` is well-designed for dynamic parameters |
| Nesting | Good | Single level of nesting is appropriate for this app's complexity |

### Observations

- **Positive:** The use of route groups with parentheses keeps the URL structure clean (e.g., `/intro` instead of `/learn/intro`)
- **Positive:** Dynamic route `param/[param].tsx` elegantly handles all 8 parameter types in one file
- **Minor Issue:** The `(destination)` route group appears to be orphaned - it's not accessible from the main navigation flow

---

## 2. Navigation Flows

### Primary Flows

```
Tab Bar
  |
  +-- Editor Tab (home)
  |     |
  |     +-- index (Main LFO editor)
  |     |     |
  |     |     +-- Header Left -> /presets (modal)
  |     |     +-- ParamGrid tap -> /param/[param] (modal)
  |     |
  |     +-- presets -> back() on selection
  |     +-- param/[param] -> prev/next navigation within modal
  |
  +-- Learn Tab
  |     |
  |     +-- index (Topic list)
  |           |
  |           +-- intro, parameters, waveforms, etc.
  |                 |
  |                 +-- RelatedLinks -> cross-navigation
  |
  +-- Settings Tab
        |
        +-- index (Settings only)
```

### Flow Analysis

| Flow | Efficiency | Dead Ends? | Back Predictable? |
|------|------------|------------|-------------------|
| Editor -> Presets | Excellent | No | Yes (swipe/tap) |
| Editor -> Param Modal | Excellent | No | Yes (swipe down) |
| Param Modal Navigation | Excellent | No (circular) | N/A (uses setParams) |
| Learn -> Topics | Good | Potential | Yes |
| Cross-topic Links | Good | Potential | Yes |

### Observations

- **Excellent:** The param modal uses `router.setParams()` for instant navigation between parameters without animation, providing a smooth editing experience
- **Excellent:** The preset picker uses `router.back()` after selection, returning users to exactly where they were
- **Good:** Learn section has RelatedLinks for cross-navigation (intro -> parameters, speed -> timing, etc.)
- **Potential Issue:** Learn topic screens are terminal - no "next topic" navigation. Users must back out and select the next topic manually
- **Missing Flow:** The `(destination)` screen at `/destination/index.tsx` is not reachable from the current navigation

---

## 3. Tab Bar Design

### Configuration

```typescript
<NativeTabs tintColor="#ff6600">
  <NativeTabs.Trigger name="(home)">
    <Icon sf={{ default: 'waveform', selected: 'waveform' }} />
    <Label>Editor</Label>
  </NativeTabs.Trigger>
  <NativeTabs.Trigger name="(learn)">
    <Icon sf={{ default: 'book', selected: 'book.fill' }} />
    <Label>Learn</Label>
  </NativeTabs.Trigger>
  <NativeTabs.Trigger name="(settings)">
    <Icon sf={{ default: 'gear', selected: 'gear' }} />
    <Label>Settings</Label>
  </NativeTabs.Trigger>
</NativeTabs>
```

### Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| Tab Appropriateness | Excellent | Three tabs for distinct purposes: create, learn, configure |
| Icon Clarity | Good | SF Symbols are recognizable; book.fill provides feedback |
| Active State | Good | Tint color `#ff6600` is distinctive; filled icons for Learn |
| Tab Count | Excellent | 3 tabs is optimal for thumb reach |

### Observations

- **Positive:** SF Symbols are native iOS icons, ensuring consistency with platform conventions
- **Positive:** The accent color (#ff6600) provides clear visual feedback for active state
- **Minor:** `waveform` and `gear` icons don't have filled variants in the selected state (both use same icon). Consider `waveform.circle.fill` or `gear.circle.fill` for stronger differentiation
- **Positive:** Legacy iOS handling with explicit backgroundColor and blurEffect

---

## 4. Modal and Sheet Usage

### Modal Configuration

**Presets Modal:**
```typescript
presentation: 'formSheet',
sheetGrabberVisible: true,
sheetAllowedDetents: [0.5, 0.75],
```

**Parameter Editor Modal:**
```typescript
presentation: 'formSheet',
sheetGrabberVisible: true,
sheetAllowedDetents: [0.35, 0.5],
```

### Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| Modal Appropriateness | Excellent | Editing actions correctly use modals |
| Dismissal | Excellent | Sheet grabber visible, swipe-to-dismiss enabled |
| Content Blocking | Good | Detents allow partial view of underlying content |

### Observations

- **Excellent:** Form sheets are perfect for this use case - they feel like "tools" rather than navigation
- **Excellent:** Multiple detents (0.35, 0.5, 0.75) allow users to see the visualizer while editing
- **Excellent:** Consistent dark styling (`contentStyle: { backgroundColor: '#0a0a0a' }`)
- **Good:** Preset modal at 0.5-0.75 allows seeing the main editor, reinforcing context
- **Good:** Parameter modal at 0.35-0.5 is compact, appropriate for single-value editing

---

## 5. Deep Linking

### Current Configuration

```json
{
  "scheme": "wtlfo",
  "expo": {
    "extra": {
      "router": {}
    }
  }
}
```

### Deep-Linkable Routes

| Route | URL | Deep Link Value |
|-------|-----|-----------------|
| Editor | `wtlfo://` | Low - main entry point |
| Presets | `wtlfo://presets` | Medium - could share preset selection |
| Parameter | `wtlfo://param/depth` | High - could link to specific parameter |
| Learn Topic | `wtlfo://intro` | High - shareable educational content |
| Settings | `wtlfo://settings` | Low - personal config |

### Recommendations

**High-Value Deep Links:**
1. `wtlfo://param/waveform` - Link directly to waveform selector
2. `wtlfo://intro` - Share "What is an LFO?" with beginners
3. `wtlfo://timing` - Link to timing math reference
4. `wtlfo://presets` - Could accept preset name as query param

**Implementation Note:** Expo Router automatically generates deep links based on file structure. The `scheme: "wtlfo"` is configured, so links like `wtlfo://intro` should work out of the box.

---

## 6. State Preservation

### Context Architecture

```typescript
<PresetProvider>      // LFO configuration, BPM, presets
  <ModulationProvider>  // Destination, center values
    <NativeTabs>
      ...
    </NativeTabs>
  </ModulationProvider>
</PresetProvider>
```

### Assessment

| Scenario | State Preserved? | Notes |
|----------|------------------|-------|
| Tab switching | Yes | Context providers at root level |
| Modal open/close | Yes | Modals don't unmount parent |
| Param modal navigation | Yes | Uses setParams, no remount |
| Learn navigation | Yes | Stack preserves history |
| Background/foreground | Partially | Context resets on app kill |

### Observations

- **Excellent:** Root-level context providers ensure state persists across all navigation
- **Excellent:** The `setParams` approach in param modal avoids state reset during navigation
- **Good:** `isEditing` state in PresetProvider tracks slider interaction for visual feedback
- **Potential Issue:** No persistence layer detected - LFO settings are lost on app restart
- **Good:** The `useAnimatedReaction` in destination screen properly syncs with LFO output

---

## 7. Transition Animations

### Animation Configuration

| Navigation Type | Animation | Notes |
|-----------------|-----------|-------|
| Tab switching | Native | NativeTabs uses system transitions |
| Stack push | Slide from right | Default Stack behavior |
| Modal present | Slide from bottom | formSheet presentation |
| Param switching | None | setParams prevents animation |

### Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| Consistency | Excellent | All animations match iOS conventions |
| Performance | Excellent | Native animations, Reanimated worklets |
| Usability Aid | Good | Modals sliding up reinforces "tool" metaphor |

### Observations

- **Excellent:** The decision to use `setParams` for param-to-param navigation eliminates jarring animations when switching between parameters in the modal
- **Excellent:** Native tab transitions feel responsive
- **Good:** Form sheet slide-up animation clearly indicates temporary overlay
- **Note:** `useSlowMotionPhase` hook provides smooth slow-motion preview for fast LFOs

---

## Summary

### Strengths

1. **Clean Route Organization** - Route groups effectively separate Editor, Learn, and Settings
2. **Thoughtful Modal Design** - Sheet detents allow context visibility during editing
3. **Smart State Management** - Root-level contexts prevent state loss during navigation
4. **Excellent Param Modal UX** - `setParams` enables instant parameter switching
5. **Native Feel** - NativeTabs and SF Symbols create platform-appropriate experience

### Opportunities for Improvement

1. **Orphaned Destination Route** - The `(destination)` group is not accessible from main navigation. Consider:
   - Integrating into Editor as a detail view
   - Adding as 4th tab if destination editing is a core flow
   - Removing if no longer needed

2. **Learn Section Navigation** - Topic screens lack forward/back navigation between related topics. Consider:
   - Adding "Next Topic" / "Previous Topic" buttons
   - Creating a sequential learning path

3. **Tab Icon Selected States** - Editor and Settings icons don't change on selection. Consider:
   - Using filled variants or circle backgrounds for active state

4. **State Persistence** - LFO settings reset on app restart. Consider:
   - AsyncStorage for preset persistence
   - SQLite (already in plugins) for robust storage

5. **Deep Link Strategy** - No apparent sharing features. Consider:
   - "Share Preset" generating a deep link
   - "Share Learn Topic" for educational content

### Architecture Diagram

```
+----------------------------------------------------------+
|                    ErrorBoundary                          |
|  +------------------------------------------------------+ |
|  |                   PresetProvider                      | |
|  |  +--------------------------------------------------+ | |
|  |  |               ModulationProvider                  | | |
|  |  |  +----------------------------------------------+ | | |
|  |  |  |               NativeTabs                      | | | |
|  |  |  |  +------------------------------------------+ | | | |
|  |  |  |  | Editor  |   Learn   |  Settings  |       | | | | |
|  |  |  |  +------------------------------------------+ | | | |
|  |  |  |  | Stack   |   Stack   |   Stack    |       | | | | |
|  |  |  |  |  |      |     |     |     |      |       | | | | |
|  |  |  |  |  v      |     v     |     v      |       | | | | |
|  |  |  |  | index   |   index   |   index    |       | | | | |
|  |  |  |  | presets |   intro   |            |       | | | | |
|  |  |  |  | param/* |   etc...  |            |       | | | | |
|  |  |  +----------------------------------------------+ | | |
|  |  +--------------------------------------------------+ | |
|  +------------------------------------------------------+ |
+----------------------------------------------------------+
```

---

*Generated by Navigation Architecture Analysis - UX Engineering Review*
