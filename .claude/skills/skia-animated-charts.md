# Animated Charts with @shopify/react-native-skia

## Overview
Best practices for creating performant animated visualizations using React Native Skia with Reanimated, learned from building an LFO visualizer with real-time meter display.

## Architecture: Separate UI Thread from JS Thread

The key insight is **decoupling**:
- **Skia animation** runs at 60fps on the UI thread via SharedValues
- **Text displays** update at 30fps on the JS thread via setInterval
- These don't interfere with each other when properly separated

## Anti-Patterns to Avoid

### 1. Don't use useAnimatedReaction + runOnJS for display updates
```typescript
// BAD - crosses JS/UI bridge 60x/sec
useAnimatedReaction(
  () => animatedValue.value,
  (value) => {
    runOnJS(setDisplayValue)(value); // Bridge overhead every frame
  }
);
```

### 2. Don't use springs for rapidly-changing values
```typescript
// BAD - overlapping springs cause ghosting
useEffect(() => {
  animatedValue.value = withSpring(newValue, springConfig);
}, [newValue]); // If newValue changes rapidly, springs overlap
```

### 3. Don't chain multiple useDerivedValue hooks unnecessarily
```typescript
// BAD - each hook runs independently per frame
const a = useDerivedValue(() => source.value * 2);
const b = useDerivedValue(() => a.value + 10);
const c = useDerivedValue(() => b.value / 2);
// 3 separate worklet executions per frame
```

## Recommended Patterns

### 1. Read SharedValues from JS via setInterval
```typescript
const [displayValue, setDisplayValue] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    // Read SharedValue directly from JS - no bridge crossing
    const value = Math.round(animatedValue.value);
    setDisplayValue(value);
  }, 33); // 30fps is plenty for readable text
  return () => clearInterval(interval);
}, [animatedValue]);
```

### 2. Use direct assignment for frequently-changing values
```typescript
// GOOD - no animation overlap
useEffect(() => {
  animatedValue.value = newValue; // Direct assignment
}, [newValue]);
```

### 3. Consolidate derived values when possible
```typescript
// GOOD - single worklet execution
const finalPosition = useDerivedValue(() => {
  'worklet';
  const base = source.value * 2;
  const offset = base + 10;
  return offset / 2;
});
```

### 4. Use timing for predictable transitions (when animation is needed)
```typescript
// GOOD - predictable, no overshoot
animatedValue.value = withTiming(newValue, {
  duration: 100,
  easing: Easing.out(Easing.ease),
});
```

## Reanimated 4.x Notes

- `runOnJS` is deprecated - use `scheduleOnRN` from `react-native-worklets`
- But better yet, avoid crossing the bridge during animation entirely
- SharedValues can be read synchronously from JS via `.value`

## React Compiler Compatibility

With React Compiler enabled:
- No need for `useMemo` - compiler handles memoization automatically
- Grid lines and static JSX elements are auto-memoized
- Focus on the animation architecture, not manual memoization

## Example: Animated Meter Component

```typescript
function AnimatedMeter({ lfoOutput, centerValue }: Props) {
  // Animated values for Skia (UI thread, 60fps)
  const animatedCenter = useSharedValue(centerValue);

  // Update directly, no spring
  useEffect(() => {
    animatedCenter.value = centerValue;
  }, [centerValue]);

  // Skia position derived from SharedValues (UI thread)
  const positionY = useDerivedValue(() => {
    'worklet';
    const modulated = animatedCenter.value + lfoOutput.value * range;
    return mapToScreenY(modulated);
  });

  // Text display (JS thread, 30fps)
  const [displayValue, setDisplayValue] = useState(centerValue);
  useEffect(() => {
    const interval = setInterval(() => {
      const value = Math.round(centerValue + lfoOutput.value * range);
      setDisplayValue(value);
    }, 33);
    return () => clearInterval(interval);
  }, [lfoOutput, centerValue]);

  return (
    <View>
      <Canvas style={{ width, height }}>
        <Line p1={vec(0, positionY)} p2={vec(width, positionY)} />
      </Canvas>
      <Text>{displayValue}</Text>
    </View>
  );
}
```

## Performance Checklist

- [ ] Skia animations use SharedValues directly (no React state in animation loop)
- [ ] Text/display updates use setInterval, not useAnimatedReaction
- [ ] No runOnJS calls during animation frames
- [ ] Springs only used for infrequent transitions, not rapid changes
- [ ] Derived values consolidated where possible
- [ ] No manual useMemo (React Compiler handles it)
