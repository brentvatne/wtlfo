# Tomorrow's TODO List - WTLFO App

**Generated:** 2026-01-19
**Updated:** 2026-01-19 (removed memoization items - React Compiler handles automatically)
**Based on:** 13 analysis documents

> **Note:** React Compiler is enabled in Expo SDK 54 (`experiments.reactCompiler: true`).
> Manual `React.memo`, `useMemo`, and `useCallback` are NOT needed - the compiler
> auto-memoizes components and values. Items related to manual memoization have been removed.

---

## Critical Bugs (Fix First)

### 1. Depth Scaling Inconsistency (METER-1)
- **Problem:** DestinationMeter assumes `lfoOutput` is pre-scaled by depth, but `useModulatedValue` applies its own depth scaling. This causes the meter to show incorrect modulated values.
- **Source:** BEHAVIORAL_AUDIT.md (METER-1)
- **Effort:** S (Small)
- **Files:**
  - `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx` (lines 89-115)
  - `/Users/brent/wtlfo/src/hooks/useModulatedValue.ts` (line 29)
- **Fix:** Verify `elektron-lfo` engine output and ensure consistent depth application across all consumers

### 2. Potential Double Depth Sign Application (DEPTH-2)
- **Problem:** `depthSign` in DestinationScreen may double-apply the sign if the LFO engine already outputs depth-scaled values.
- **Source:** BEHAVIORAL_AUDIT.md, ANALYSIS_FINDINGS.md
- **Effort:** XS (Extra Small)
- **Files:** `/Users/brent/wtlfo/app/(destination)/index.tsx` (line 58)
- **Fix:** Remove `depthSign` multiplication if engine output is already depth-scaled

### 3. Depth Scaling Asymmetry (DEPTH-1)
- **Problem:** When depth = -64, `depth/63` produces -1.0159, exceeding the expected -1.0 to +1.0 range (101.59% of max).
- **Source:** BEHAVIORAL_AUDIT.md
- **Effort:** S
- **Files:** Multiple (search for `/ 63`)
  - `/Users/brent/wtlfo/src/hooks/useModulatedValue.ts`
  - `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`
  - `/Users/brent/wtlfo/src/components/lfo/hooks/useWaveformPath.ts`
- **Fix:** Use `depth / 64` for symmetrical scaling, OR clamp result to [-1, 1]

### 4. isEditing State Can Get Stuck (Navigation Issue)
- **Problem:** If user navigates away while slider is active, `onSlidingEnd` may not fire, leaving `isEditing=true` permanently. This hides the phase indicator.
- **Source:** ROBUSTNESS_ANALYSIS.md (Issue 5.5)
- **Effort:** XS
- **Files:** `/Users/brent/wtlfo/app/(home)/param/[param].tsx` (lines 176-177)
- **Fix:** Reset `isEditing` on screen blur/unmount

### 5. BPM Slider Min Value Mismatch
- **Problem:** Settings slider allows 30-300 BPM, but context clamps to 20-300. Minor inconsistency.
- **Source:** ANALYSIS_FINDINGS.md (Bug 2)
- **Effort:** XS
- **Files:** `/Users/brent/wtlfo/app/(settings)/index.tsx` (lines 88-89)
- **Fix:** Align slider min to 20 OR context min to 30

---

## Quick Wins (< 30 min each)

### 1. Fix Text Color Contrast (WCAG)
- **Value:** Achieve WCAG 2.1 AA compliance for text
- **Source:** ACCESSIBILITY_AUDIT.md (Issues A3.1.1, A3.1.2, A3.1.4)
- **Effort:** XS
- **Files:** `/Users/brent/wtlfo/src/theme/colors.ts` (lines 9-11)
- **Fix:**
  - `textSecondary`: `#888899` -> `#9999aa` (5.8:1 ratio)
  - `textMuted`: `#666677` -> `#8888a0` (4.6:1 ratio)
  - Category labels: `#666677` -> `#9090a0`

### 2. Add Accessibility Labels to Main Pressables
- **Value:** Screen reader users can navigate the app
- **Source:** ACCESSIBILITY_AUDIT.md (Issues A1.1.1, A1.1.2)
- **Effort:** S
- **Files:** `/Users/brent/wtlfo/app/(home)/index.tsx` (lines 102-157)
- **Fix:** Add `accessibilityLabel`, `accessibilityRole`, `accessibilityState` to visualizer and meter Pressables

### 3. Update Test Comment Inconsistency
- **Value:** Accurate documentation
- **Source:** BEHAVIORAL_AUDIT.md (RND-2)
- **Effort:** XS
- **Files:** `/Users/brent/wtlfo/src/components/lfo/__tests__/worklets.test.ts` (lines 216-221)
- **Fix:** Update comment from "0.8" to "0.9" to match implementation

### 4. Add Reduced Motion Support
- **Value:** Accessibility for users sensitive to motion
- **Source:** ACCESSIBILITY_AUDIT.md (Issue A3.4.1), FEATURE_IDEAS.md (8.4)
- **Effort:** S
- **Files:** `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx`
- **Fix:** Check `useReducedMotion()` from Reanimated; show static waveform if enabled

---

## High Priority Improvements

### 1. Add Tests for useSlowMotionPhase Hook
- **Value:** Catch edge cases in complex phase tracking logic
- **Source:** MAINTAINABILITY_REVIEW.md (Issue 23), BEHAVIORAL_AUDIT.md
- **Effort:** M (Medium)
- **Files:** Create `/Users/brent/wtlfo/src/components/lfo/hooks/__tests__/useSlowMotionPhase.test.ts`

### 2. Add Tests for Trigger Mode Behaviors
- **Value:** Verify all 5 modes work correctly (MODE-1)
- **Source:** BEHAVIORAL_AUDIT.md
- **Effort:** M
- **Files:** Create `/Users/brent/wtlfo/src/context/__tests__/trigger-modes.test.tsx`

### 3. Extract Shared Slider Logic Hook
- **Value:** Remove code duplication, DRY
- **Source:** MAINTAINABILITY_REVIEW.md (Issue 7)
- **Effort:** S
- **Files:**
  - `/Users/brent/wtlfo/src/components/controls/ParameterSlider.tsx`
  - `/Users/brent/wtlfo/src/components/destination/CenterValueSlider.tsx`
- **Fix:** Create `useSliderValue(value, onChange)` hook

### 4. Consolidate Destination Picker Rendering
- **Value:** Remove duplicate JSX and styles
- **Source:** MAINTAINABILITY_REVIEW.md (Issues 8, 9)
- **Effort:** M
- **Files:**
  - `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx`
  - `/Users/brent/wtlfo/src/components/destination/DestinationPickerInline.tsx`
- **Fix:** Extract shared `DestinationList` component

### 5. Move PARAM_INFO to Data File
- **Value:** Centralize parameter metadata, reduce file size
- **Source:** MAINTAINABILITY_REVIEW.md (Issues 10, 11, 25)
- **Effort:** M
- **Files:**
  - `/Users/brent/wtlfo/app/(home)/param/[param].tsx`
  - Create `/Users/brent/wtlfo/src/data/parameterInfo.ts`

### 6. Add Accessibility to LFO Visualizer Canvas
- **Value:** Screen reader support for complex visualization
- **Source:** ACCESSIBILITY_AUDIT.md (Issue A1.2.1)
- **Effort:** S
- **Files:** `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx` (lines 91-200)
- **Fix:** Wrap Canvas in View with `accessibilityLabel` describing current state

### 7. Announce LFO State Changes
- **Value:** VoiceOver/TalkBack users know when LFO pauses/resumes
- **Source:** ACCESSIBILITY_AUDIT.md (Issue A1.3.1)
- **Effort:** XS
- **Files:** `/Users/brent/wtlfo/app/(home)/index.tsx` (lines 78-91)
- **Fix:** Use `AccessibilityInfo.announceForAccessibility()`

### 8. Add Section Comments to PresetContext
- **Value:** Improve maintainability of 220+ line file
- **Source:** MAINTAINABILITY_REVIEW.md (Issue 5)
- **Effort:** XS
- **Files:** `/Users/brent/wtlfo/src/context/preset-context.tsx`

---

## Feature Backlog

### High Value, Medium Effort
1. **Trig Simulation Button** - Manual trigger for TRG/ONE/HLF modes (UX_IMPROVEMENTS.md)
2. **Haptic Feedback** - Tactile confirmation on parameter changes (UX_IMPROVEMENTS.md, FEATURE_IDEAS.md)
3. **Tap Tempo** - Set BPM by tapping (UX_IMPROVEMENTS.md, FEATURE_IDEAS.md)
4. **Contextual Help Hints** - "?" icons linking to Learn content (UX_IMPROVEMENTS.md)
5. **Step Grid Overlay** - Show 1/16 step divisions on visualizer (UX_IMPROVEMENTS.md)
6. **User Presets - Save As** - Save modified configs (PRESET_SYSTEM_REVIEW.md)

### Medium Value
7. **A/B Compare Mode** - Toggle between two configurations (UX_IMPROVEMENTS.md, FEATURE_IDEAS.md)
8. **Direct Value Entry** - Tap number to type exact value (UX_IMPROVEMENTS.md)
9. **Swipe Navigation in Param Modal** - Gesture to switch params (UX_IMPROVEMENTS.md)
10. **Phase Marker Trail** - Comet tail effect on phase indicator (UX_IMPROVEMENTS.md, FEATURE_IDEAS.md)
11. **Hold/Release Phase Indicators** - Visualize held value in ONE/HLF (UX_IMPROVEMENTS.md)
12. **Preset Categories** - Organize presets by type (PRESET_SYSTEM_REVIEW.md)
13. **"Explain This Preset"** - Why each parameter is set (FEATURE_IDEAS.md)

### Advanced Features (Future)
14. **MIDI CC Output** - Control external hardware (UX_IMPROVEMENTS.md)
15. **Audio Preview** - Simple synth to hear LFO effect (UX_IMPROVEMENTS.md, FEATURE_IDEAS.md)
16. **Multi-LFO Mode** - 2-3 LFOs like Digitakt II (UX_IMPROVEMENTS.md, ELEKTRON_AUTHENTICITY.md)
17. **Universal Links** - Share presets via URL (FEATURE_IDEAS.md)
18. **Export/Import Presets** - JSON backup/restore (PRESET_SYSTEM_REVIEW.md)

---

## Technical Debt

### Code Quality
1. **Rename ParameterEditor.tsx** - Resolve naming confusion with QuickEditPanel (MAINTAINABILITY_REVIEW.md)
2. **Remove unused BPM constant** - `/Users/brent/wtlfo/src/data/presets.ts` line 115 (MAINTAINABILITY_REVIEW.md)
3. **Audit unused dependencies** - Run `npx depcheck` (MAINTAINABILITY_REVIEW.md)
4. **Extract fade envelope calculation** to worklets.ts (MAINTAINABILITY_REVIEW.md Issue 14)
5. **Standardize guard patterns** in getSlowdownInfo (ROBUSTNESS_ANALYSIS.md Issue 1.1)

### Architecture
6. **Use ID-based preset references** instead of array index (PRESET_SYSTEM_REVIEW.md)
7. **Add schema version** to preset data model (PRESET_SYSTEM_REVIEW.md)
8. **Add isDirty flag** for modified preset state (PRESET_SYSTEM_REVIEW.md)
9. **Consolidate duplicate waveform path generation** (PERFORMANCE_ANALYSIS.md Issue 1.5)
10. **Extract LFO engine management** to custom hook (MAINTAINABILITY_REVIEW.md Issue 12)

### Testing
11. **Add render tests for UI components** (ANALYSIS_FINDINGS.md, MAINTAINABILITY_REVIEW.md)
12. **Add tests for fade envelope calculations** (BEHAVIORAL_AUDIT.md)
13. **Add integration tests for background/foreground transitions** (ROBUSTNESS_ANALYSIS.md)

### Performance
14. ~~**Pre-compute GridLines points in useMemo**~~ - Not needed (React Compiler)
15. **Consolidate useDerivedValue calls in DestinationMeter** (PERFORMANCE_ANALYSIS.md Issue 2.3)
16. **Consider path object reuse** instead of recreation (PERFORMANCE_ANALYSIS.md Issue 3.1)

---

## Priority Summary

| Priority | Count | Time Estimate |
|----------|-------|---------------|
| Critical Bugs | 5 | ~2 hours |
| Quick Wins | 4 | ~1 hour |
| High Priority | 8 | ~8 hours |
| **Total for Tomorrow** | **17** | **~11 hours** |

### Suggested Morning Order
1. Fix Critical Bugs #1-#5 (most impact, known issues)
2. Quick Wins #1-#2 (accessibility - color contrast, labels)
3. Quick Wins #3-#4 (test fix, reduced motion)
4. High Priority #7-#8 (documentation, low risk)

### For Later This Week
- High Priority #1-#6 (testing and refactoring)
- Technical Debt items
- Feature Backlog prioritization

### Items Removed (React Compiler handles these)
- ~~Add React.memo to sub-components~~
- ~~Memoize context value~~
- ~~Memoize badges array~~
- ~~Pre-compute GridLines in useMemo~~
- ~~Throttle runOnJS~~ (disputed - may make UI laggy)

---

## Document Sources

| Document | Key Issues |
|----------|------------|
| ANALYSIS_FINDINGS.md | depthSign bug, BPM mismatch, type safety |
| UX_IMPROVEMENTS.md | Haptics, tap tempo, trig button, contextual hints |
| BEHAVIORAL_AUDIT.md | Depth scaling, meter sync, trigger mode testing |
| FEATURE_IDEAS.md | MIDI, audio preview, multi-LFO, gamification |
| ROBUSTNESS_ANALYSIS.md | Phase wraparound, isEditing stuck, animation state |
| PERFORMANCE_ANALYSIS.md | React.memo, runOnJS throttling, path reuse |
| ELEKTRON_AUTHENTICITY.md | Multi-LFO, pattern sync, slew exposure |
| MAINTAINABILITY_REVIEW.md | Code duplication, missing tests, complexity |
| ACCESSIBILITY_AUDIT.md | Color contrast, screen reader labels, touch targets |
| SECURITY_REVIEW.md | No critical issues (good!) |
| LEARN_CONTENT_REVIEW.md | Start Phase section, navigation, interactivity |
| NAVIGATION_ANALYSIS.md | Orphaned destination route, Learn navigation |
| PRESET_SYSTEM_REVIEW.md | User presets, ID-based refs, dirty state |

---

*This is your morning checklist. Start with Critical Bugs, then Quick Wins for momentum.*
