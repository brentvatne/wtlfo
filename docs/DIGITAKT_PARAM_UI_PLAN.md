# Digitakt-Style Parameter UI Plan

## Overview

Replace the current parameter sliders with a Digitakt-style grid of tappable parameter boxes. Tapping a box opens a bottom sheet for editing that specific parameter. The current full parameter editor becomes "Quick Edit" mode.

## Reference Design

Based on the Digitakt II display:
```
┌──────────┬──────────┬──────────┬──────────┐
│WAVE  SQR │SPD 22.00 │MULT   16 │MODE  FRE │
├──────────┼──────────┼──────────┼──────────┤
│DEP 63.00 │FADE    0 │SPH    45 │          │
└──────────┴──────────┴──────────┴──────────┘
```

- Dark boxes with subtle border/background (#1a1a1a or brown tint)
- Label in muted color (left/top), value in white/orange (right/bottom)
- 4 columns × 2 rows grid layout
- Rounded corners (~8px)

## Parameters Layout

| Row 1 | | | |
|-------|-------|------|------|
| WAVE | SPD | MULT | MODE |
| SIN | +16 | 16 | FRE |

| Row 2 | | | |
|-------|-------|------|------|
| DEP | FADE | SPH | (empty or DEST) |
| +63 | 0 | 0 | — |

## Architecture

### New Components

```
src/components/
├── params/
│   ├── index.ts
│   ├── ParamGrid.tsx          # Main grid container
│   ├── ParamBox.tsx           # Individual tappable parameter box
│   ├── ParamEditSheet.tsx     # Bottom sheet for editing
│   └── QuickEditPanel.tsx     # Renamed from ParameterEditor (collapsible)
```

### ParamBox Component

```typescript
interface ParamBoxProps {
  label: string;           // "WAVE", "SPD", etc.
  value: string | number;  // Display value
  onPress: () => void;     // Open edit sheet
  width?: 'single' | 'double';  // For flexible sizing
}
```

Visual states:
- Default: dark background (#1a1a1a)
- Pressed: slightly lighter (#2a2a2a)
- Active (sheet open): orange border (#ff6600)

### ParamEditSheet Component

A bottom sheet (modal) that slides up when a parameter is tapped:

```
┌─────────────────────────────────┐
│ ══════════ (drag handle) ══════ │
│                                 │
│           WAVEFORM              │  ← Parameter name
│                                 │
│  [TRI][SIN][SQR][SAW][EXP]...  │  ← For enum: segmented control
│                                 │
│     ─────── OR ───────          │
│                                 │
│         SPEED: +16              │  ← For numeric: large value display
│  [-64 ═══════════●══════ +63]  │  ← Slider
│                                 │
│           [Done]                │  ← Dismiss button
└─────────────────────────────────┘
```

Sheet contents vary by parameter type:
- **Enum params** (waveform, mode, multiplier): Segmented control or button grid
- **Numeric params** (speed, depth, fade, startPhase): Large value + slider

### QuickEditPanel (Collapsible)

Rename current `ParameterEditor` to `QuickEditPanel` and make it collapsible:

```
┌─────────────────────────────────┐
│ ▶ Quick Edit                    │  ← Collapsed by default
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ▼ Quick Edit                    │  ← Expanded shows all controls
├─────────────────────────────────┤
│ WAVEFORM                        │
│ [TRI][SIN][SQR][SAW]...         │
│                                 │
│ SPEED        [-64 ════● +63]   │
│ ... (all parameters)            │
└─────────────────────────────────┘
```

## UI Flow

```
┌─────────────────────────────────┐
│     [LFO Visualizer]            │
│        (tap to trigger)         │
├─────────────────────────────────┤
│ ┌────┬────┬────┬────┐          │
│ │WAVE│SPD │MULT│MODE│          │  ← ParamGrid (always visible)
│ │SIN │+16 │ 16 │FRE │          │
│ ├────┼────┼────┼────┤          │
│ │DEP │FADE│SPH │    │          │
│ │+63 │  0 │  0 │    │          │
│ └────┴────┴────┴────┘          │
├─────────────────────────────────┤
│ ▶ Quick Edit                    │  ← Collapsed
├─────────────────────────────────┤
│ ▶ All Waveforms                 │  ← Collapsed
└─────────────────────────────────┘
```

User taps "SPD" box:

```
┌─────────────────────────────────┐
│     [LFO Visualizer]            │
│                                 │
├─────────────────────────────────┤
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  ← Dimmed overlay
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
├─────────────────────────────────┤
│ ══════════════════════════════ │  ← Bottom sheet
│                                 │
│            SPEED                │
│             +16                 │  ← Large value
│                                 │
│  [-64 ═══════════●══════ +63]  │
│                                 │
│           [Done]                │
└─────────────────────────────────┘
```

## Implementation Steps

### Phase 1: ParamBox Component
1. Create `/src/components/params/ParamBox.tsx`
   - Pressable container with label + value
   - Consistent sizing for grid layout
   - Press feedback animation

### Phase 2: ParamGrid Component
2. Create `/src/components/params/ParamGrid.tsx`
   - 4-column grid using flexbox
   - Maps LFO config to ParamBox components
   - Handles which sheet to open

### Phase 3: ParamEditSheet Component
3. Create `/src/components/params/ParamEditSheet.tsx`
   - Use `@gorhom/bottom-sheet` or React Native Modal
   - Render appropriate control based on parameter type
   - Call `updateParameter` on change

### Phase 4: Integrate into Home Screen
4. Update `/app/(home)/index.tsx`
   - Add ParamGrid below visualizer
   - Manage sheet open/close state
   - Track which parameter is being edited

### Phase 5: Quick Edit Panel
5. Rename `ParameterEditor.tsx` → `QuickEditPanel.tsx`
   - Make it collapsible (collapsed by default)
   - Update imports

### Phase 6: Polish
6. Add haptic feedback on box tap
7. Animate sheet appearance
8. Ensure visualizer updates live while editing in sheet

## Dependencies

Consider adding:
```bash
npx expo install @gorhom/bottom-sheet react-native-gesture-handler
```

Or use simpler React Native Modal with custom animation.

## Styling Details

### ParamBox Styles
```typescript
const styles = {
  box: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    minWidth: 75,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: '#888899',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  value: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
};
```

### Value Formatting
```typescript
function formatParamValue(key: string, value: any): string {
  switch (key) {
    case 'waveform':
    case 'mode':
      return value; // Already short strings
    case 'speed':
    case 'depth':
    case 'fade':
      return value >= 0 ? `+${value}` : String(value);
    case 'multiplier':
      return value >= 1024 ? `${value/1024}k` : String(value);
    case 'startPhase':
      return String(value);
    default:
      return String(value);
  }
}
```

## Files to Create/Modify

**Create:**
- `src/components/params/ParamBox.tsx`
- `src/components/params/ParamGrid.tsx`
- `src/components/params/ParamEditSheet.tsx`
- `src/components/params/QuickEditPanel.tsx` (move from ParameterEditor)
- `src/components/params/index.ts`

**Modify:**
- `app/(home)/index.tsx` - Replace ParameterEditor with ParamGrid + QuickEdit
- `src/components/ParameterEditor.tsx` - Move to params/QuickEditPanel.tsx

**Delete:**
- `src/components/ParameterEditor.tsx` (after moving)

## Testing Checklist

- [ ] ParamGrid displays all 7 parameters correctly
- [ ] Tapping a box opens the correct sheet
- [ ] Sheet shows appropriate control (segmented vs slider)
- [ ] Changes in sheet update visualizer in real-time
- [ ] Sheet dismisses correctly (tap outside, drag down, Done button)
- [ ] Quick Edit panel expands/collapses
- [ ] Haptic feedback on interactions
- [ ] Works on both iOS and Android
