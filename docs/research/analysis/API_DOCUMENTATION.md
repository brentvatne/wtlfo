# WTLFO Internal API Documentation

This document provides comprehensive API documentation for the key components and contexts used in the WTLFO application.

---

## Table of Contents

1. [LFOVisualizer](#lfovisualizer)
2. [DestinationMeter](#destinationmeter)
3. [ParamBox](#parambox)
4. [SegmentedControl](#segmentedcontrol)
5. [ParameterSlider](#parameterslider)
6. [PresetContext](#presetcontext)
7. [ModulationContext](#modulationcontext)

---

## LFOVisualizer

**Location:** `/src/components/lfo/LFOVisualizer.tsx`

A comprehensive LFO waveform visualizer that displays waveform shape, phase position, output value, parameter badges, and timing information.

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `phase` | `number \| SharedValue<number>` | Yes | - | Current phase position (0.0 to 1.0). Can be animated SharedValue or static number. |
| `output` | `number \| SharedValue<number>` | Yes | - | Current output value (-1.0 to 1.0 for bipolar, 0.0 to 1.0 for unipolar). |
| `waveform` | `WaveformType` | Yes | - | Waveform type to display. One of: `'TRI'`, `'SIN'`, `'SQR'`, `'SAW'`, `'EXP'`, `'RMP'`, `'RND'`. |
| `speed` | `number` | No | - | Speed value for display (-64 to +63). |
| `multiplier` | `number \| string` | No | - | Multiplier value for display. |
| `startPhase` | `number` | No | - | Start phase for display (0-127). |
| `mode` | `TriggerMode` | No | - | Trigger mode. One of: `'FRE'`, `'TRG'`, `'HLD'`, `'ONE'`, `'HLF'`. |
| `depth` | `number` | No | - | Depth value for display (-64 to +63). |
| `fade` | `number` | No | - | Fade value for display (-64 to +63). |
| `bpm` | `number` | No | - | BPM for timing calculations display. |
| `cycleTimeMs` | `number` | No | - | Calculated cycle time in milliseconds. |
| `noteValue` | `string` | No | - | Musical note value string (e.g., "1/4", "1 bar", "16 bars"). |
| `steps` | `number` | No | - | Number of 1/16 steps in one LFO cycle. |
| `width` | `number` | No | `300` | Width of the visualizer in pixels. |
| `height` | `number` | No | `150` | Height of the visualizer in pixels. |
| `theme` | `'dark' \| 'light' \| LFOTheme` | No | `'dark'` | Color theme for the visualizer. |
| `showParameters` | `boolean` | No | `true` | Show parameter badges at top. |
| `showTiming` | `boolean` | No | `true` | Show timing info at bottom. |
| `showOutput` | `boolean` | No | `true` | Show numeric output value. |
| `showPhaseIndicator` | `boolean` | No | `true` | Show phase indicator (dot and crosshairs). |
| `strokeWidth` | `number` | No | `2` | Waveform line thickness. |
| `isEditing` | `boolean` | No | `false` | When true, fades out phase indicator during parameter editing. |
| `fadeMultiplier` | `number` | No | - | Current fade envelope multiplier (0.0 to 1.0) from LFO state. |
| `randomSamples` | `Array<{ phase: number; value: number }>` | No | - | Random sample history for RND waveform visualization. |

### Types

```typescript
type WaveformType = 'TRI' | 'SIN' | 'SQR' | 'SAW' | 'EXP' | 'RMP' | 'RND';
type TriggerMode = 'FRE' | 'TRG' | 'HLD' | 'ONE' | 'HLF';

interface LFOTheme {
  background: string;
  waveformStroke: string;
  waveformFill?: string;
  phaseIndicator: string;
  gridLines: string;
  text: string;
  textSecondary: string;
  positive: string;
  negative: string;
  accent: string;
  fadeCurve?: string;
}
```

### Usage Example

```tsx
import { LFOVisualizer } from '@/src/components/lfo/LFOVisualizer';
import { useSharedValue } from 'react-native-reanimated';

function MyComponent() {
  const phase = useSharedValue(0);
  const output = useSharedValue(0);

  return (
    <LFOVisualizer
      phase={phase}
      output={output}
      waveform="SIN"
      speed={48}
      multiplier={2}
      mode="FRE"
      depth={47}
      fade={0}
      bpm={120}
      cycleTimeMs={500}
      noteValue="1/4"
      width={350}
      height={200}
      theme="dark"
    />
  );
}
```

### Common Pitfalls

1. **SharedValue vs static number**: Both `phase` and `output` can accept either a Reanimated SharedValue or a plain number. For animated visualizations, always use SharedValue.

2. **RND waveform**: When using `waveform="RND"`, provide the `randomSamples` prop for accurate visualization. Without it, a fallback display is used.

3. **Fade display**: The fade envelope curve only displays when `fade !== 0` and `mode !== 'FRE'` (fade does not apply in free-running mode).

4. **isEditing state**: Set `isEditing={true}` when the user is adjusting parameters to fade out the phase indicator and prevent visual distraction.

---

## DestinationMeter

**Location:** `/src/components/destination/DestinationMeter.tsx`

A vertical meter component that visualizes how the LFO modulates a destination parameter, showing the modulation range and current value.

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `lfoOutput` | `SharedValue<number>` | Yes | - | Animated LFO output value (already depth-scaled). |
| `destination` | `DestinationDefinition \| null` | Yes | - | The destination being modulated. Pass `null` for empty meter. |
| `centerValue` | `number` | Yes | - | The center/base value around which modulation occurs. |
| `depth` | `number` | Yes | - | Modulation depth (-63 to +63). |
| `waveform` | `WaveformType` | No | `'SIN'` | Waveform type (affects unipolar/bipolar behavior). |
| `width` | `number` | No | `60` | Width of the meter in pixels. |
| `height` | `number` | No | `108` | Height of the meter in pixels. |
| `style` | `ViewStyle` | No | - | Additional styles for the container. |
| `showValue` | `boolean` | No | `false` | Whether to show the current value text. |
| `isEditing` | `boolean` | No | `false` | When true, hides current value line and shows center value instead. |

### Types

```typescript
interface DestinationDefinition {
  id: DestinationId;
  name: string;
  displayName: string;
  min: number;
  max: number;
  defaultValue: number;
  unit?: string;
  category: DestinationCategory;
  bipolar: boolean;
}

type DestinationCategory = 'filter' | 'amp' | 'sample' | 'fx' | 'pitch';
```

### Usage Example

```tsx
import { DestinationMeter } from '@/src/components/destination/DestinationMeter';
import { usePreset } from '@/src/context/preset-context';
import { DESTINATIONS } from '@/src/data/destinations';

function MyComponent() {
  const { lfoOutput, currentConfig, isEditing } = usePreset();
  const destination = DESTINATIONS.find(d => d.id === 'filter_cutoff');

  return (
    <DestinationMeter
      lfoOutput={lfoOutput}
      destination={destination ?? null}
      centerValue={64}
      depth={currentConfig.depth}
      waveform={currentConfig.waveform}
      width={60}
      height={120}
      showValue={true}
      isEditing={isEditing}
    />
  );
}
```

### Common Pitfalls

1. **Unipolar waveforms**: `EXP` and `RMP` waveforms are unipolar (0 to 1 output). With positive depth, they only modulate above center; with negative depth, only below center.

2. **Null destination**: Always handle the case where `destination` is `null`. The meter will display with default min/max (0-127).

3. **lfoOutput scaling**: The `lfoOutput` SharedValue should already be depth-scaled by the LFO engine. The meter multiplies by `maxModulation` to calculate pixel positions.

4. **isEditing mode**: When `isEditing={true}`, the white current-value line is hidden and the value display shows `centerValue` instead of the modulated value.

---

## ParamBox

**Location:** `/src/components/params/ParamBox.tsx`

A pressable parameter display box used in parameter grids to show a label/value pair that can be tapped to edit.

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | Yes | - | The parameter label (displayed below value, uppercase). |
| `value` | `string \| number` | Yes | - | The current parameter value to display. |
| `onPress` | `() => void` | Yes | - | Callback when the box is pressed. |
| `isActive` | `boolean` | No | `false` | Whether this parameter is currently being edited (shows orange highlight). |
| `disabled` | `boolean` | No | `false` | Whether the parameter is disabled (reduces opacity, prevents press). |
| `icon` | `React.ReactNode` | No | - | Optional icon to display before the value. |

### Usage Example

```tsx
import { ParamBox } from '@/src/components/params/ParamBox';
import { View } from 'react-native';

function ParameterGrid() {
  const [activeParam, setActiveParam] = useState<string | null>(null);

  return (
    <View style={{ flexDirection: 'row' }}>
      <ParamBox
        label="Speed"
        value={48}
        onPress={() => setActiveParam('speed')}
        isActive={activeParam === 'speed'}
      />
      <ParamBox
        label="Depth"
        value={63}
        onPress={() => setActiveParam('depth')}
        isActive={activeParam === 'depth'}
      />
      <ParamBox
        label="Fade"
        value={0}
        onPress={() => setActiveParam('fade')}
        isActive={activeParam === 'fade'}
        disabled={currentMode === 'FRE'}
      />
    </View>
  );
}
```

### Accessibility

- `accessibilityLabel`: `"{label} parameter, current value: {value}"`
- `accessibilityRole`: `"button"`
- `accessibilityHint`: `"Double tap to edit {label} parameter"`
- `accessibilityState`: `{ selected: isActive, disabled }`

### Common Pitfalls

1. **Border styling**: ParamBoxes have a right border by default for grid separation. The last item in a row may need custom styling to remove the border.

2. **Flex behavior**: Each ParamBox has `flex: 1`, so they share space equally in a row. Wrap in a flex container.

3. **Icon alignment**: Icons are displayed in a row with the value. Ensure icons are appropriately sized (the container has gap: 4).

---

## SegmentedControl

**Location:** `/src/components/controls/SegmentedControl.tsx`

A generic segmented control for selecting from a list of options. Supports both string and number option types.

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | Yes | - | Label displayed above the segmented control. |
| `options` | `T[]` | Yes | - | Array of options (strings or numbers). |
| `value` | `T` | Yes | - | Currently selected value. |
| `onChange` | `(value: T) => void` | Yes | - | Callback when selection changes. |
| `formatOption` | `(option: T) => string` | No | `String(opt)` | Function to format option for display. |

### Type Parameter

```typescript
<T extends string | number>
```

### Usage Example

```tsx
import { SegmentedControl } from '@/src/components/controls/SegmentedControl';

// String options
function WaveformSelector() {
  const [waveform, setWaveform] = useState<WaveformType>('SIN');

  return (
    <SegmentedControl
      label="Waveform"
      options={['TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND']}
      value={waveform}
      onChange={setWaveform}
    />
  );
}

// Number options with custom formatting
function MultiplierSelector() {
  const [multiplier, setMultiplier] = useState(1);

  return (
    <SegmentedControl
      label="Multiplier"
      options={[1, 2, 4, 8, 16, 32, 64, 128]}
      value={multiplier}
      onChange={setMultiplier}
      formatOption={(m) => `x${m}`}
    />
  );
}
```

### Accessibility

- Container: `accessibilityRole="radiogroup"`, `accessibilityLabel="{label} selection"`
- Each segment: `accessibilityRole="radio"`, `accessibilityState={{ checked: isSelected }}`

### Common Pitfalls

1. **Horizontal scroll**: When there are many options, the control scrolls horizontally. Ensure the parent container allows enough width.

2. **Type safety**: The component is generic. TypeScript will enforce that `value` matches the type of items in `options`.

3. **Styling**: Selected segments use `colors.accent` background. Ensure this color has sufficient contrast with the text.

---

## ParameterSlider

**Location:** `/src/components/controls/ParameterSlider.tsx`

A labeled slider control for adjusting numeric parameters with real-time value display.

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | Yes | - | Label displayed above the slider. |
| `min` | `number` | Yes | - | Minimum slider value. |
| `max` | `number` | Yes | - | Maximum slider value. |
| `value` | `number` | Yes | - | Current slider value. |
| `onChange` | `(value: number) => void` | Yes | - | Callback when value changes (receives rounded integer). |
| `formatValue` | `(value: number) => string` | No | `Math.round(v)` | Function to format the displayed value. |
| `step` | `number` | No | `1` | Step increment for the slider. |
| `onSlidingStart` | `() => void` | No | - | Called when user starts sliding. |
| `onSlidingEnd` | `() => void` | No | - | Called when user finishes sliding. |

### Callback Signatures

```typescript
onChange: (value: number) => void;      // Called with rounded integer value
onSlidingStart: () => void;             // No parameters
onSlidingEnd: () => void;               // No parameters
```

### Usage Example

```tsx
import { ParameterSlider } from '@/src/components/controls/ParameterSlider';

function SpeedControl() {
  const { currentConfig, updateParameter, setIsEditing } = usePreset();

  return (
    <ParameterSlider
      label="Speed"
      min={-64}
      max={63}
      value={currentConfig.speed}
      onChange={(v) => updateParameter('speed', v)}
      formatValue={(v) => v > 0 ? `+${v}` : String(v)}
      onSlidingStart={() => setIsEditing(true)}
      onSlidingEnd={() => setIsEditing(false)}
    />
  );
}
```

### Accessibility

- `accessibilityLabel`: `"{label} slider"`
- `accessibilityRole`: `"adjustable"`
- `accessibilityHint`: `"Adjust {label} value between {min} and {max}"`
- `accessibilityValue`: `{ min, max, now: localValue }`

### Common Pitfalls

1. **Value rounding**: The `onChange` callback receives rounded integer values. The internal state tracks the exact slider position for smooth visuals, but only commits when the rounded value changes.

2. **External value changes**: If the `value` prop changes externally (not from sliding), the slider syncs to the new value. This handles preset changes, etc.

3. **Editing state**: Use `onSlidingStart` and `onSlidingEnd` to manage global editing state, which can control other UI elements (like hiding the phase indicator in LFOVisualizer).

---

## PresetContext

**Location:** `/src/context/preset-context.tsx`

The main application state context that manages presets, LFO configuration, animation state, and BPM.

### Exports

- `PresetProvider` - Context provider component
- `usePreset()` - Hook to access context values

### Context Value

```typescript
interface PresetContextValue {
  // Preset management
  activePreset: number;
  preset: LFOPreset;
  setActivePreset: (index: number) => void;
  presets: LFOPreset[];

  // Configuration
  currentConfig: LFOPresetConfig;      // Updates instantly for UI
  debouncedConfig: LFOPresetConfig;    // Updates 100ms after last change
  updateParameter: <K extends keyof LFOPresetConfig>(key: K, value: LFOPresetConfig[K]) => void;
  resetToPreset: () => void;

  // Editing state
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;

  // BPM
  bpm: number;
  setBPM: (bpm: number) => void;

  // LFO animation state (shared across tabs)
  lfoPhase: SharedValue<number>;
  lfoOutput: SharedValue<number>;
  lfoRef: React.MutableRefObject<LFO | null>;
  timingInfo: TimingInfo;

  // LFO control methods
  triggerLFO: () => void;
  startLFO: () => void;
  stopLFO: () => void;
  isLFORunning: () => boolean;

  // Pause state
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
}
```

### Types

```typescript
interface LFOPresetConfig {
  waveform: Waveform;
  speed: number;
  multiplier: Multiplier;
  useFixedBPM: boolean;
  startPhase: number;
  mode: TriggerMode;
  depth: number;
  fade: number;
}

interface LFOPreset {
  name: string;
  config: LFOPresetConfig;
  destination?: DestinationId;
  centerValue?: number;
}

interface TimingInfo {
  cycleTimeMs: number;
  noteValue: string;
  steps: number;
}
```

### Usage Example

```tsx
import { PresetProvider, usePreset } from '@/src/context/preset-context';

// Wrap app with provider
function App() {
  return (
    <PresetProvider>
      <MainScreen />
    </PresetProvider>
  );
}

// Use in components
function LFOControls() {
  const {
    currentConfig,
    updateParameter,
    setIsEditing,
    triggerLFO,
    isPaused,
    setIsPaused,
  } = usePreset();

  const handleDepthChange = (value: number) => {
    updateParameter('depth', value);
  };

  return (
    <View>
      <ParameterSlider
        label="Depth"
        min={-64}
        max={63}
        value={currentConfig.depth}
        onChange={handleDepthChange}
        onSlidingStart={() => setIsEditing(true)}
        onSlidingEnd={() => setIsEditing(false)}
      />
      <Button title="Trigger" onPress={triggerLFO} />
      <Button
        title={isPaused ? "Resume" : "Pause"}
        onPress={() => setIsPaused(!isPaused)}
      />
    </View>
  );
}
```

### Key Behaviors

1. **Debounced vs Immediate Config**:
   - `currentConfig` updates immediately when parameters change - use for UI display
   - `debouncedConfig` updates 100ms after the last change - use for LFO engine recreation
   - This prevents recreating the LFO engine on every slider tick

2. **Persistence**:
   - Active preset index is saved to `expo-sqlite/kv-store` with key `'activePreset'`
   - BPM is saved with key `'bpm'`
   - Values are loaded synchronously on app start

3. **Auto-trigger**: When config changes and mode is `'TRG'`, `'ONE'`, or `'HLF'`, the LFO is automatically triggered.

4. **Background handling**: The animation loop pauses when the app goes to background and resumes when returning to foreground (unless user had manually paused).

### Common Pitfalls

1. **Hook rules**: Must be used within `PresetProvider`. The hook throws if used outside.

2. **SharedValue usage**: `lfoPhase` and `lfoOutput` are Reanimated SharedValues. Access their `.value` property on the JS thread or use `useDerivedValue`/`useAnimatedStyle` for animations.

3. **isEditing state**: This is separate from the debounce mechanism. Set it manually via `setIsEditing()` when the user starts/stops interacting with controls.

4. **updateParameter optimization**: The function skips updates if the value hasn't changed, avoiding unnecessary debounce cycles.

---

## ModulationContext

**Location:** `/src/context/modulation-context.tsx`

Manages modulation routing between LFOs and destinations, including persisted center values for each destination.

### Exports

- `ModulationProvider` - Context provider component
- `useModulation()` - Hook to access context values

### Context Value

```typescript
interface ModulationContextValue {
  // Center values per destination (persisted)
  centerValues: Partial<Record<DestinationId, number>>;
  setCenterValue: (destinationId: DestinationId, value: number) => void;
  getCenterValue: (destinationId: DestinationId) => number;

  // Routing: which LFO targets which destination
  routings: LFORouting[];
  setRouting: (lfoId: string, destinationId: DestinationId) => void;
  getRouting: (lfoId: string) => LFORouting | undefined;
  setRoutingAmount: (lfoId: string, amount: number) => void;

  // Convenience for single-LFO mode
  activeDestinationId: DestinationId;
  setActiveDestinationId: (id: DestinationId) => void;
}
```

### Types

```typescript
interface LFORouting {
  lfoId: string;              // 'lfo1' for now, supports 'lfo2', etc. later
  destinationId: DestinationId;
  amount: number;             // 0-100% of LFO depth applied to this routing
}

type DestinationId =
  | 'none'
  | 'filter_cutoff'
  | 'filter_resonance'
  | 'filter_drive'
  | 'filter_env_depth'
  | 'volume'
  | 'pan'
  | 'pitch'
  | 'pitch_fine'
  | 'sample_start'
  | 'sample_length'
  | 'delay_send'
  | 'reverb_send'
  | 'amp_attack'
  | 'amp_decay'
  | 'amp_sustain'
  | 'amp_release'
  | 'overdrive'
  | 'bit_reduction';
```

### Usage Example

```tsx
import { ModulationProvider, useModulation } from '@/src/context/modulation-context';
import { DESTINATIONS } from '@/src/data/destinations';

// Wrap app with provider (typically nested inside PresetProvider)
function App() {
  return (
    <PresetProvider>
      <ModulationProvider>
        <MainScreen />
      </ModulationProvider>
    </PresetProvider>
  );
}

// Use in components
function DestinationSelector() {
  const {
    activeDestinationId,
    setActiveDestinationId,
    getCenterValue,
    setCenterValue,
  } = useModulation();

  const destination = DESTINATIONS.find(d => d.id === activeDestinationId);
  const centerValue = getCenterValue(activeDestinationId);

  return (
    <View>
      <Picker
        selectedValue={activeDestinationId}
        onValueChange={(id) => setActiveDestinationId(id)}
      >
        {DESTINATIONS.map(d => (
          <Picker.Item key={d.id} label={d.displayName} value={d.id} />
        ))}
      </Picker>

      <ParameterSlider
        label="Center Value"
        min={destination?.min ?? 0}
        max={destination?.max ?? 127}
        value={centerValue}
        onChange={(v) => setCenterValue(activeDestinationId, v)}
      />
    </View>
  );
}
```

### Key Behaviors

1. **Center value persistence**: Center values are remembered per destination. When switching destinations, the previously set center value is recalled.

2. **Multi-LFO ready**: The routing system supports multiple LFOs (`lfo1`, `lfo2`, etc.), though the current UI only uses `lfo1`. Use `setRouting('lfo2', destinationId)` for future expansion.

3. **Default values**: If no center value has been set for a destination, `getCenterValue()` returns the destination's `defaultValue` from its definition.

4. **'none' destination**: Setting destination to `'none'` disables modulation. `setCenterValue` is a no-op for `'none'`, and `getCenterValue('none')` returns `0`.

### Persistence

- Center values: Stored in `expo-sqlite/kv-store` with key `'centerValues'` as JSON
- Routings: Stored with key `'routings'` as JSON
- Both are loaded synchronously on app start

### Common Pitfalls

1. **Hook rules**: Must be used within `ModulationProvider`. The hook throws if used outside.

2. **Destination lookup**: The context stores IDs, not full definitions. Use `DESTINATIONS.find(d => d.id === id)` to get the full `DestinationDefinition`.

3. **activeDestinationId shortcut**: This is a convenience getter/setter for `lfo1`'s routing. It's equivalent to:
   ```typescript
   const routing = getRouting('lfo1');
   const activeDestinationId = routing?.destinationId ?? 'filter_cutoff';
   ```

4. **Amount vs depth**: `routingAmount` (0-100%) is separate from the LFO's depth parameter. The final modulation is `depth * (amount / 100)`.

---

## Component Relationships

```
PresetProvider
    |
    +-- Manages: activePreset, currentConfig, debouncedConfig, bpm
    |            lfoPhase, lfoOutput, lfoRef, timingInfo
    |            isEditing, isPaused
    |
    +-- Used by: LFOVisualizer (receives phase, output, config values)
    |            ParameterSlider (updates config via updateParameter)
    |            SegmentedControl (updates waveform, mode, multiplier)
    |            ParamBox (displays current values)

ModulationProvider
    |
    +-- Manages: centerValues, routings, activeDestinationId
    |
    +-- Used by: DestinationMeter (receives centerValue, destination)
    |            Destination selectors (updates activeDestinationId)
```

---

## Best Practices

1. **Always use context hooks inside providers**: Wrap your app with both `PresetProvider` and `ModulationProvider` at the root level.

2. **Manage editing state**: Call `setIsEditing(true)` when starting slider interactions and `setIsEditing(false)` when done. This coordinates UI feedback across components.

3. **Use debounced config for heavy operations**: For anything that recreates the LFO engine or performs expensive calculations, use `debouncedConfig` instead of `currentConfig`.

4. **Handle null destinations**: Always check if a destination is valid before accessing its properties.

5. **Prefer SharedValues for animations**: Pass `lfoPhase` and `lfoOutput` directly to animated components rather than extracting their `.value`.
