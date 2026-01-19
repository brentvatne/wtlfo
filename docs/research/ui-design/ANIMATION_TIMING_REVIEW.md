# Animation Timing and Easing Review

**App:** WTLFO (Elektron LFO Visualizer)
**Review Date:** 2026-01-19
**Reviewer:** Motion Design Expert
**Framework:** React Native with Reanimated 3 and React Native Skia

---

## Executive Summary

This app uses a minimal but intentional approach to UI animations, with the primary animation being the real-time LFO visualization driven by `requestAnimationFrame`. The UI chrome employs Reanimated for a small number of transitions. Overall, the animation architecture is performance-focused with room for improvement in consistency and reduced motion support.

**Overall Assessment:** Good foundation, needs consistency improvements

| Category | Rating | Summary |
|----------|--------|---------|
| Duration Consistency | Needs Work | Limited timing values, no formal scale |
| Easing Curves | Good | Appropriate use of spring and ease |
| Reanimated Config | Good | Well-configured spring physics |
| Enter/Exit Animations | Minimal | Only one component uses layout animations |
| Micro-animations | Needs Work | Missing feedback animations |
| Performance | Excellent | Native thread animations, 60fps |
| Accessibility | Critical | No reduced motion support |

---

## 1. Duration Consistency

### Findings

The app uses very few explicit animation durations, as most animations are either:
1. Continuous real-time visualizations (no duration - frame-based)
2. Spring-based animations (duration determined by physics)

#### Explicit Durations Found

| Component | Duration | Purpose | Assessment |
|-----------|----------|---------|------------|
| `LFOVisualizer.tsx` | `100ms` | Phase indicator fade out when editing | Appropriate - quick micro-transition |
| `SlowMotionBadge.tsx` | `150ms` | FadeIn/FadeOut enter/exit | Appropriate for badge visibility |

#### Duration Analysis

**Strengths:**
- The two explicit durations (100ms, 150ms) are in the appropriate range for micro-interactions (100-200ms)
- No excessively long animations that would feel sluggish

**Weaknesses:**
- No formal timing scale or duration constants defined
- Ad-hoc duration values scattered across files
- Missing animation durations for common interactions (press states, selection changes)

### Recommendations

1. **Create a timing scale constant file:**
```typescript
// src/theme/timing.ts
export const DURATIONS = {
  instant: 0,
  micro: 100,    // Micro-interactions, state changes
  fast: 150,     // Enter/exit, quick feedback
  normal: 250,   // Standard transitions
  slow: 400,     // Emphasis, larger motions
} as const;
```

2. **Standardize usage across the app** - Replace hardcoded values with constants

---

## 2. Easing Curves

### Findings

#### Easing Functions Used

| Location | Easing | Context | Assessment |
|----------|--------|---------|------------|
| `LFOVisualizer.tsx:81` | `Easing.inOut(Easing.ease)` | Phase indicator opacity | Good - smooth symmetrical ease |
| `DestinationMeter.tsx:78` | Spring physics | Bound/value animations | Excellent - natural feel |

#### Analysis

**Strengths:**
- `Easing.inOut(Easing.ease)` is a solid choice for opacity transitions - symmetrical and smooth
- Spring physics are used for the meter's dynamic value transitions, which creates natural, physics-based motion
- No jarring linear animations for UI elements

**Weaknesses:**
- Limited variety - only two easing approaches used
- No defined easing curve constants for consistency
- Missing easing for press states and feedback

### Recommendations

1. **Define easing constants:**
```typescript
// src/theme/easing.ts
import { Easing } from 'react-native-reanimated';

export const EASING = {
  standard: Easing.inOut(Easing.ease),
  decelerate: Easing.out(Easing.cubic),  // Enter animations
  accelerate: Easing.in(Easing.cubic),   // Exit animations
  bounce: Easing.out(Easing.back),       // Emphasis
} as const;
```

2. **Consider different easings for different motion types:**
   - Enter: `Easing.out()` (decelerate into view)
   - Exit: `Easing.in()` (accelerate out of view)
   - State change: `Easing.inOut()` (current usage is correct)

---

## 3. Reanimated Timing Configuration

### Spring Configuration Analysis

**File:** `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx`

```typescript
const springConfig = { damping: 40, stiffness: 380, overshootClamping: true };
```

#### Assessment

| Parameter | Value | Analysis |
|-----------|-------|----------|
| `damping` | 40 | High damping - quick settle, minimal oscillation |
| `stiffness` | 380 | High stiffness - responsive, snappy |
| `overshootClamping` | true | Prevents overshoot - appropriate for meter bounds |

**Verdict:** Excellent configuration for the use case

The spring config creates a **critically damped** spring that settles quickly without overshoot, which is exactly right for a meter displaying precise value bounds. The high stiffness (380) ensures the animation feels responsive, while high damping (40) prevents bouncing that would be distracting in a precision context.

### withTiming Configuration

**File:** `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx`

```typescript
phaseIndicatorOpacity.value = withTiming(isEditing ? 0 : 1, {
  duration: 100,
  easing: Easing.inOut(Easing.ease),
});
```

**Assessment:** Good - 100ms with ease-in-out is appropriate for a quick opacity fade.

### Recommendations

1. **Define spring presets:**
```typescript
// src/theme/springs.ts
export const SPRINGS = {
  // For value displays, meters - no overshoot needed
  precise: { damping: 40, stiffness: 380, overshootClamping: true },

  // For UI elements - subtle bounce
  gentle: { damping: 20, stiffness: 200 },

  // For emphasis - noticeable spring
  bouncy: { damping: 10, stiffness: 180 },
} as const;
```

2. **Consider adding mass parameter** for heavier elements to give them more inertia

---

## 4. Enter/Exit Animations

### Layout Animations Found

**Only one component uses Reanimated layout animations:**

**File:** `/Users/brent/wtlfo/src/components/lfo/SlowMotionBadge.tsx`

```typescript
<Animated.View
  style={styles.container}
  entering={FadeIn.duration(150)}
  exiting={FadeOut.duration(150)}
>
```

**Assessment:**
- Duration (150ms) is appropriate for a small badge
- FadeIn/FadeOut are simple and effective
- Symmetrical enter/exit timing is correct

### Missing Enter/Exit Animations

The following components would benefit from layout animations:

| Component | Suggested Animation |
|-----------|---------------------|
| `DestinationPicker` modal | `SlideInUp` / `SlideOutDown` (currently uses native Modal) |
| `ParamGrid` items | `FadeIn` on mount |
| Error messages/warnings | `FadeInDown` / `FadeOutUp` |
| Parameter detail panels | `SlideInRight` when navigating |

### Modal Animation

**File:** `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx`

```typescript
<Modal
  visible={isOpen}
  animationType="slide"
  presentationStyle="pageSheet"
>
```

**Assessment:**
- Uses native Modal with `animationType="slide"` - this is correct for iOS page sheets
- Native animations are performant and platform-consistent
- `presentationStyle="pageSheet"` provides iOS-native interaction patterns

---

## 5. Micro-animations

### Current State

The app has **minimal micro-animations** for UI feedback:

#### Press State Handling

**File:** `/Users/brent/wtlfo/src/components/params/ParamBox.tsx`

```typescript
<Pressable
  onPress={onPress}
  style={({ pressed }) => [
    styles.box,
    pressed && styles.pressed,  // Instant style change
    isActive && styles.active,
  ]}
>
```

**Assessment:**
- Press states are handled with instant style changes (no animation)
- Active states also change instantly
- This is common in React Native but lacks polish

#### Missing Micro-animations

| Interaction | Current Behavior | Recommended |
|-------------|-----------------|-------------|
| ParamBox press | Instant background color | Animated highlight + scale (100ms) |
| SegmentedControl selection | Instant highlight | Animated indicator slide (150ms) |
| Slider thumb | Native slider behavior | Consider custom animated thumb |
| Navigation buttons | Instant press feedback | Scale/opacity animation (100ms) |
| Preset card selection | Instant | Scale down (0.98) + background animation |

### Recommendations

1. **Add animated press feedback:**
```typescript
// ParamBox with animated press
const scale = useSharedValue(1);
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

const handlePressIn = () => {
  scale.value = withTiming(0.97, { duration: 100 });
};
const handlePressOut = () => {
  scale.value = withTiming(1, { duration: 100 });
};
```

2. **Consider animated selection indicator** for SegmentedControl (sliding highlight bar)

---

## 6. Performance

### Animation Performance Analysis

**Excellent performance architecture:**

#### Real-time LFO Animation

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx`

```typescript
const animate = (timestamp: number) => {
  if (lfoRef.current) {
    const state = lfoRef.current.update(timestamp);
    lfoPhase.value = state.phase;
    lfoOutput.value = state.output;
  }
  animationRef.current = requestAnimationFrame(animate);
};
```

**Assessment:**
- Uses `requestAnimationFrame` for 60fps synchronization
- Updates Reanimated `SharedValue` which runs on UI thread
- React Native Skia Canvas renders on UI thread
- No JS thread blocking - clean separation

#### Reanimated Worklets

The app correctly uses worklets for animation calculations:

```typescript
// DestinationMeter.tsx - runs on UI thread
const meterFillHeight = useDerivedValue(() => {
  'worklet';
  const modulationAmount = lfoOutput.value * maxModulation;
  // ... calculations
}, []);
```

**Assessment:**
- All derived values are worklets (indicated by `'worklet';` directive)
- Calculations stay on UI thread
- No JS thread round-trips during animation

#### Performance Strengths

| Aspect | Implementation | Rating |
|--------|----------------|--------|
| Thread management | UI thread animations | Excellent |
| Frame rate | 60fps via rAF | Excellent |
| Skia rendering | Native Canvas | Excellent |
| Value updates | SharedValue | Excellent |
| Background handling | Pauses animation when app backgrounds | Excellent |

#### Potential Issues

1. **Learn screens create multiple LFO instances:**
   - `presets.tsx` creates an LFO per preset card
   - `waveforms.tsx` creates an LFO per waveform card
   - Each runs its own `requestAnimationFrame` loop
   - **Recommendation:** Consider virtualization or lazy loading for lists

2. **No frame drop detection** - Consider adding performance monitoring

### Recommendations

1. **Add FPS monitoring in development:**
```typescript
import { useFrameCallback } from 'react-native-reanimated';

// Dev mode FPS counter
const frameCount = useSharedValue(0);
useFrameCallback(() => {
  frameCount.value += 1;
});
```

2. **Virtualize preset/waveform lists** to reduce concurrent animations

---

## 7. Accessibility (Reduced Motion)

### Critical Issue: No Reduced Motion Support

**Finding:** The app does not respect the system "Reduce Motion" accessibility setting.

#### Impact

Users who have enabled "Reduce Motion" (iOS) or "Remove Animations" (Android) due to vestibular disorders or motion sensitivity will still see:

1. Continuous LFO waveform animation
2. Animated phase indicator moving across the screen
3. Badge fade in/out animations
4. Spring animations on meter bounds

#### Current Implementation

The accessibility audit (`ACCESSIBILITY_AUDIT.md`) notes this issue but it remains unimplemented:

**File:** `/Users/brent/wtlfo/src/components/lfo/SlowMotionBadge.tsx`
- Uses `FadeIn/FadeOut` without checking reduced motion

**File:** `/Users/brent/wtlfo/src/components/lfo/LFOVisualizer.tsx`
- No reduced motion check for phase indicator

**File:** `/Users/brent/wtlfo/src/context/preset-context.tsx`
- Animation loop runs regardless of accessibility settings

### Required Fixes

1. **Check reduced motion preference:**
```typescript
import { useReducedMotion } from 'react-native-reanimated';

// In components
const reduceMotion = useReducedMotion();

// Disable or simplify animations
entering={reduceMotion ? undefined : FadeIn.duration(150)}
```

2. **Handle LFO visualization in reduced motion mode:**
   - Option A: Show static waveform shape, hide phase indicator
   - Option B: Significantly slow down animation (10% speed)
   - Option C: Replace animation with periodic value updates

3. **Apply to all animated components:**
   - `SlowMotionBadge.tsx` - disable fade animations
   - `LFOVisualizer.tsx` - hide or slow phase indicator
   - `DestinationMeter.tsx` - instant value updates instead of spring

### Example Implementation

```typescript
// src/hooks/useAccessibleAnimation.ts
import { useReducedMotion } from 'react-native-reanimated';

export function useAccessibleTiming(duration: number) {
  const reduceMotion = useReducedMotion();
  return reduceMotion ? 0 : duration;
}

export function useAccessibleSpring(config: SpringConfig) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return { duration: 0 }; // Instant
  }
  return config;
}
```

---

## Summary of Recommendations

### High Priority

1. **Add reduced motion support** - Critical accessibility requirement
2. **Create animation constants file** - Centralize timing, easing, and spring configs
3. **Add micro-animations for press states** - Improve tactile feedback

### Medium Priority

4. **Add enter/exit animations** to more components
5. **Virtualize Learn screen lists** to reduce concurrent animations
6. **Implement animated selection indicators** for SegmentedControl

### Low Priority

7. **Add frame rate monitoring** in development builds
8. **Consider custom animated slider thumb** for consistent styling
9. **Add subtle scale animations** to Pressable components

---

## Animation Timing Cheat Sheet (Proposed)

| Use Case | Duration | Easing | Implementation |
|----------|----------|--------|----------------|
| Micro-interaction | 100ms | `ease-in-out` | `withTiming(value, { duration: 100 })` |
| Badge appear/disappear | 150ms | `ease-in-out` | `FadeIn.duration(150)` |
| State transition | 200ms | `ease-out` | `withTiming(value, { duration: 200 })` |
| Value change (precise) | Spring | Critically damped | `withSpring(value, { damping: 40, stiffness: 380 })` |
| Value change (bouncy) | Spring | Under-damped | `withSpring(value, { damping: 10, stiffness: 180 })` |
| Reduced motion | 0ms | None | `withTiming(value, { duration: 0 })` |

---

*Report generated by Motion Design Expert Review*
