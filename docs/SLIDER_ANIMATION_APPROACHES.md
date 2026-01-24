# Slider-to-Meter Animation Performance Approaches

## Problem
When dragging the CenterValueSlider, the DestinationMeter animation feels choppy because:
1. Every slider movement goes through React state
2. State changes trigger re-renders
3. useEffect updates SharedValues after render
4. Multiple animation layers cause latency

## Approach 1: Direct SharedValue (Bypass React State) - CURRENTLY IMPLEMENTED

**Implementation:**
- Create SharedValue at context level
- Slider updates SharedValue directly (no React state)
- Meter observes SharedValue on UI thread
- React state updated via debounce (100-200ms) for persistence only

**Code pattern:**
```typescript
// In context
const centerValueSharedValue = useSharedValue(initialCenterValue);

// In slider
const handleValueChange = (newValue: number) => {
  centerValueSharedValue.value = newValue; // Direct, instant
  debounceUpdateReactState(newValue); // Async persistence
};

// In meter
const animatedCenterValue = useDerivedValue(() => {
  'worklet';
  return centerValueSharedValue.value;
});
```

**Pros:** True 60fps, eliminates React bridge, same pattern as LFO visualizer
**Cons:** State sync complexity, persistence challenges, undo/redo harder
**Complexity:** 3-4 hours

---

## Approach 2: Aggressive Throttling

**Implementation:**
- Keep React state flow but throttle to ~30Hz
- Use linear interpolation between throttled updates
- Remove runOnJS from hot path (reduce from 60/sec to 10/sec)

**Code pattern:**
```typescript
const throttleMs = 33; // ~30Hz
useEffect(() => {
  const now = Date.now();
  if (now - lastUpdateTime.current >= throttleMs) {
    centerValueSharedValue.value = withTiming(centerValue, { duration: throttleMs });
    lastUpdateTime.current = now;
  }
}, [centerValue]);
```

**Pros:** Minimal code changes, React state remains source of truth
**Cons:** Still 30 bridge events/sec, slight lag, not truly 60fps
**Complexity:** 1-2 hours

---

## Approach 3: Hybrid Modal Pattern (REVERTED - was worse)

**Implementation:**
- Create SharedValue at HomeScreen level
- Slider updates SharedValue directly during drag
- After drag complete, React state updates trigger spring animation
- Meter uses SharedValue when isEditing, animated value otherwise

**Code pattern:**
```typescript
// HomeScreen
const directCenterValue = useSharedValue(getCenterValue(activeDestinationId));

// CenterValueSlider
onDirectChange={(value) => { directCenterValue.value = value; }}

// DestinationMeter
const activeCenter = useDerivedValue(() => {
  'worklet';
  return isEditingShared.value ? directCenterValue.value : animatedCenterValue.value;
});
```

**Pros:** Best of both worlds, leverages existing isEditing, low risk
**Cons:** Two state sources, more conditional logic
**Complexity:** 2-3 hours

---

## Key Insights

1. **LFO uses Approach 1 pattern** - `lfoPhase` and `lfoOutput` are SharedValues updated directly in animation loop, which is why it's smooth

2. **runOnJS is expensive** - Performance analysis identified this as P0 issue. Each call crosses JS/UI bridge.

3. **isEditing infrastructure exists** - Already wired up in DestinationMeter, can leverage for mode switching

4. **Spring animations cause "chasing"** - When new spring starts before previous completes, creates stuttering effect

---

## Files Involved

- `app/(home)/index.tsx` - Creates SharedValue, passes to both components
- `src/components/destination/CenterValueSlider.tsx` - Updates SharedValue during drag
- `src/components/destination/DestinationMeter.tsx` - Uses SharedValue when editing
