import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors } from '@/src/theme';

interface ParameterSliderProps {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  step?: number;
  /** Called when user starts sliding */
  onSlidingStart?: () => void;
  /** Called when user finishes sliding */
  onSlidingEnd?: () => void;
}

export function ParameterSlider({
  label,
  min,
  max,
  value,
  onChange,
  formatValue = (v) => String(Math.round(v)),
  step = 1,
  onSlidingStart,
  onSlidingEnd,
}: ParameterSliderProps) {
  // Remap to positive range to work around @react-native-community/slider
  // not respecting initial value prop on iOS for negative values.
  // Supposedly fixed in https://github.com/callstack/react-native-slider/pull/483 but still occurs.
  const offset = min < 0 ? -min : 0;
  const sliderMin = min + offset; // Always 0 or positive
  const sliderMax = max + offset;

  // Convert between actual value and slider value
  const toSliderValue = (v: number) => v + offset;
  const fromSliderValue = (v: number) => v - offset;

  // Local state for smooth visual updates during dragging (in actual value space)
  const [localValue, setLocalValue] = useState(value);
  const lastCommittedValue = useRef(value);

  // Sync local value when prop changes externally
  React.useEffect(() => {
    if (value !== lastCommittedValue.current) {
      setLocalValue(value);
      lastCommittedValue.current = value;
    }
  }, [value]);

  // Handle slider changes - update local state immediately for smooth visuals
  const handleValueChange = useCallback((sliderValue: number) => {
    const actualValue = fromSliderValue(sliderValue);
    setLocalValue(actualValue);
    const rounded = Math.round(actualValue);
    // Only call onChange if the rounded value changed
    if (rounded !== lastCommittedValue.current) {
      lastCommittedValue.current = rounded;
      onChange(rounded);
    }
  }, [onChange, fromSliderValue]);

  // Called when user starts dragging
  const handleSlidingStart = useCallback(() => {
    onSlidingStart?.();
  }, [onSlidingStart]);

  // Commit final value when sliding completes (in case it wasn't sent yet)
  const handleSlidingComplete = useCallback((sliderValue: number) => {
    const actualValue = fromSliderValue(sliderValue);
    const rounded = Math.round(actualValue);
    if (rounded !== lastCommittedValue.current) {
      lastCommittedValue.current = rounded;
      onChange(rounded);
    }
    onSlidingEnd?.();
  }, [onChange, onSlidingEnd, fromSliderValue]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{formatValue(localValue)}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={sliderMin}
        maximumValue={sliderMax}
        value={toSliderValue(localValue)}
        onValueChange={handleValueChange}
        onSlidingStart={handleSlidingStart}
        onSlidingComplete={handleSlidingComplete}
        step={step}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor="#3a3a3a"
        thumbTintColor={colors.accent}
        accessibilityLabel={`${label} slider`}
        accessibilityRole="adjustable"
        accessibilityHint={`Adjust ${label} value between ${min} and ${max}`}
        accessibilityValue={{ min, max, now: localValue }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  slider: {
    width: '100%',
    height: 32,
  },
});
