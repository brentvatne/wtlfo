# Expandable Section UI Review

## Executive Summary

The app uses expandable/collapsible sections primarily in the Learn tab (`app/(learn)/*.tsx`). The pattern is implemented inline within each file rather than as a shared component. While functionally consistent, there are significant opportunities for improvement in accessibility, animation, and code reuse.

---

## 1. ExpandableSection Usage Analysis

### Files Using ExpandableSection Pattern

| File | Count | Purpose |
|------|-------|---------|
| `timing.tsx` | 3 | Formulas, Asymmetry Note, Modulation Update Rate |
| `destinations.tsx` | 1 | MIDI Track Destinations |
| `modes.tsx` | 1 | Mode Comparison Table |
| `depth.tsx` | 2 | Fade Timing Deep Dive, Combining Depth & Fade |
| `speed.tsx` | 1 | Negative Speed Deep Dive |
| `waveforms.tsx` | 1 | Bipolar vs Unipolar |

### ParameterRow Expandable Pattern

| File | Count | Purpose |
|------|-------|---------|
| `parameters.tsx` | 7 rows | Parameter details with accordion behavior |

**Total: 16 expandable sections** across 7 files

### Pattern Consistency

**ISSUE: Code Duplication**

The `ExpandableSection` component is duplicated verbatim in 6 files:
- `timing.tsx` (lines 29-44)
- `destinations.tsx` (lines 61-76)
- `modes.tsx` (lines 94-109)
- `depth.tsx` (lines 14-29)
- `speed.tsx` (lines 30-45)
- `waveforms.tsx` (lines 145-160)

All implementations are identical:
```tsx
function ExpandableSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.expandableSection}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={styles.expandableHeader}
      >
        <Text style={styles.expandableTitle}>{title}</Text>
        <Text style={styles.expandableIcon}>{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded && <View style={styles.expandableContent}>{children}</View>}
    </View>
  );
}
```

**RECOMMENDATION: Extract to shared component** at `/src/components/learn/ExpandableSection.tsx`

---

## 2. Accessibility Analysis

### Current State: POOR

The expandable sections lack proper accessibility implementation:

| Aspect | Status | Issue |
|--------|--------|-------|
| `accessibilityRole` | Missing | Should be `"button"` on header |
| `accessibilityState` | Missing | Should include `{ expanded: boolean }` |
| `accessibilityLabel` | Missing | Should describe the section and action |
| `accessibilityHint` | Missing | Should tell users what happens on tap |
| Keyboard navigation | N/A | React Native relies on native patterns |

### Comparison with Other Components

The app has good accessibility in other areas. For example, `ParamBox.tsx`:
```tsx
<Pressable
  accessibilityLabel={`${label} parameter, current value: ${value}`}
  accessibilityRole="button"
  accessibilityHint={`Double tap to edit ${label} parameter`}
  accessibilityState={{ selected: isActive, disabled }}
>
```

### Recommended Fix

```tsx
<Pressable
  onPress={() => setExpanded(!expanded)}
  style={styles.expandableHeader}
  accessibilityRole="button"
  accessibilityLabel={`${title} section`}
  accessibilityHint={expanded ? "Double tap to collapse" : "Double tap to expand"}
  accessibilityState={{ expanded }}
>
```

---

## 3. Animation Analysis

### Current State: NO ANIMATION

Content appears/disappears instantly with conditional rendering:
```tsx
{expanded && <View style={styles.expandableContent}>{children}</View>}
```

### Issues

1. **Jarring UX**: Instant show/hide can be disorienting
2. **No height animation**: Layout jumps abruptly
3. **No icon rotation**: Chevron could rotate smoothly

### Recommendations

**Option A: LayoutAnimation (Simple)**
```tsx
import { LayoutAnimation, UIManager, Platform } from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const toggleExpanded = () => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  setExpanded(!expanded);
};
```

**Option B: Reanimated (Smooth, More Control)**
```tsx
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue
} from 'react-native-reanimated';

// Animate height and opacity
const animatedStyle = useAnimatedStyle(() => ({
  height: withTiming(expanded ? 'auto' : 0),
  opacity: withTiming(expanded ? 1 : 0),
}));
```

Note: The app already uses `react-native-reanimated` (seen in `waveforms.tsx`, `presets.tsx`), so Option B aligns with existing patterns.

---

## 4. UX Pattern Analysis

### Visual Affordance

| Aspect | Status | Notes |
|--------|--------|-------|
| Indicator present | Yes | Uses `+` / `-` text |
| Indicator visible | Marginal | Color `#555566` is low contrast |
| Section looks tappable | Partial | No press feedback |
| Chevron/icon | No | Uses text characters instead |

### Current Indicator
```tsx
<Text style={styles.expandableIcon}>{expanded ? '−' : '+'}</Text>
```

Style:
```tsx
expandableIcon: {
  color: '#555566',  // Low contrast
  fontSize: 18,
  fontWeight: '500',
}
```

### Recommendations

1. **Use chevron icon** (rotates on expand):
   ```tsx
   <ChevronIcon
     style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
   />
   ```

2. **Improve contrast**: Change color from `#555566` to `#888899` or accent color

3. **Add press feedback**: The `Pressable` has no visual feedback currently
   ```tsx
   style={({ pressed }) => [
     styles.expandableHeader,
     pressed && styles.expandableHeaderPressed,
   ]}
   ```

### Tap Target Size

| Aspect | Current | Recommended |
|--------|---------|-------------|
| Header padding | 14px | Adequate (56px+ total height) |
| Minimum touch target | ~48px | Meets 44x44pt iOS guideline |

The tap target appears adequate but could benefit from explicit minimum height:
```tsx
expandableHeader: {
  minHeight: 48,  // Ensure accessibility
  ...
}
```

---

## 5. Performance Analysis

### Content Rendering

**Current behavior**: Content is NOT rendered when collapsed
```tsx
{expanded && <View style={styles.expandableContent}>{children}</View>}
```

**Performance implications**:
- Good: No unnecessary rendering overhead when collapsed
- Good: Child components (tables, lists) not in memory until needed

### Layout Measurement

**No issues detected**. However, if animations are added:
- Using `measure()` or `onLayout` could cause extra layout passes
- Reanimated's `useAnimatedStyle` avoids this by running on UI thread

### Memory Considerations

For the `ParameterRow` component in `parameters.tsx`:
- Uses accordion pattern (only one expanded at a time)
- More memory efficient than allowing multiple expanded
- Good pattern for longer lists

---

## 6. State Management Analysis

### Current Approach

Each component manages its own expanded state:
```tsx
const [expanded, setExpanded] = useState(false);
```

### State Persistence

**Current**: State is NOT persisted
- Collapsing when navigating away
- Resets on component remount

### Recommendations

**Consider persistence for**:
- Long content users may want to reference
- Educational content (Learn tab) where users may navigate back

**Implementation options**:

1. **URL-based** (if using expo-router):
   ```tsx
   const [searchParams, setSearchParams] = useSearchParams();
   const expanded = searchParams.get('expanded') === 'true';
   ```

2. **Context-based** (for related screens):
   ```tsx
   const { expandedSections, toggleSection } = useLearnContext();
   ```

3. **AsyncStorage** (for long-term):
   ```tsx
   // Persist user preferences for which sections they keep expanded
   ```

**Recommendation**: For the Learn tab, state persistence is likely unnecessary since users typically read sequentially. Current approach is acceptable.

---

## 7. Summary of Recommendations

### High Priority

1. **Extract shared component**
   - Create `/src/components/learn/ExpandableSection.tsx`
   - Remove duplication from 6 files
   - Single source of truth for styling and behavior

2. **Add accessibility attributes**
   - `accessibilityRole="button"`
   - `accessibilityState={{ expanded }}`
   - `accessibilityLabel` and `accessibilityHint`

### Medium Priority

3. **Add expand/collapse animation**
   - Use `LayoutAnimation` for simple implementation
   - Or Reanimated for more control (already in project)

4. **Improve visual feedback**
   - Add pressed state styling
   - Consider chevron icon instead of +/- text
   - Increase indicator contrast

### Low Priority

5. **Consider chevron rotation animation**
   - Smooth 180-degree rotation on toggle
   - Visual polish enhancement

6. **Document the component**
   - Props interface
   - Usage examples
   - Accessibility notes

---

## 8. Proposed Shared Component

```tsx
// /src/components/learn/ExpandableSection.tsx

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function ExpandableSection({
  title,
  children,
  defaultExpanded = false
}: ExpandableSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [
          styles.header,
          pressed && styles.headerPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${title} section`}
        accessibilityHint={expanded ? "Double tap to collapse" : "Double tap to expand"}
        accessibilityState={{ expanded }}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.icon, expanded && styles.iconExpanded]}>
          {expanded ? '−' : '+'}
        </Text>
      </Pressable>
      {expanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    minHeight: 48,
  },
  headerPressed: {
    backgroundColor: '#252525',
  },
  title: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  icon: {
    color: '#888899',
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 8,
  },
  iconExpanded: {
    color: '#ff6600',
  },
  content: {
    padding: 14,
    paddingTop: 0,
  },
});
```

---

## Files to Update

After creating the shared component, update these files:
- `/Users/brent/wtlfo/app/(learn)/timing.tsx`
- `/Users/brent/wtlfo/app/(learn)/destinations.tsx`
- `/Users/brent/wtlfo/app/(learn)/modes.tsx`
- `/Users/brent/wtlfo/app/(learn)/depth.tsx`
- `/Users/brent/wtlfo/app/(learn)/speed.tsx`
- `/Users/brent/wtlfo/app/(learn)/waveforms.tsx`

And export from:
- `/Users/brent/wtlfo/src/components/learn/index.ts`
