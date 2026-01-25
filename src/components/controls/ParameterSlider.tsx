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
  // Local state for smooth visual updates during dragging
  const [localValue, setLocalValue] = useState(value);
  const lastCommittedValue = useRef(value);

  // Force slider re-render on mount to fix @react-native-community/slider
  // not respecting initial value prop on iOS (especially for negative values).
  // Supposedly fixed in https://github.com/callstack/react-native-slider/pull/483 but still occurs.
  const [sliderKey, setSliderKey] = useState(0);
  React.useEffect(() => {
    setSliderKey(1);
  }, []);

  // Sync local value when prop changes externally
  React.useEffect(() => {
    if (value !== lastCommittedValue.current) {
      setLocalValue(value);
      lastCommittedValue.current = value;
    }
  }, [value]);

  // Handle slider changes - update local state immediately for smooth visuals
  const handleValueChange = useCallback((newValue: number) => {
    setLocalValue(newValue);
    const rounded = Math.round(newValue);
    // Only call onChange if the rounded value changed
    if (rounded !== lastCommittedValue.current) {
      lastCommittedValue.current = rounded;
      onChange(rounded);
    }
  }, [onChange]);

  // Called when user starts dragging
  const handleSlidingStart = useCallback(() => {
    onSlidingStart?.();
  }, [onSlidingStart]);

  // Commit final value when sliding completes (in case it wasn't sent yet)
  const handleSlidingComplete = useCallback((newValue: number) => {
    const rounded = Math.round(newValue);
    if (rounded !== lastCommittedValue.current) {
      lastCommittedValue.current = rounded;
      onChange(rounded);
    }
    onSlidingEnd?.();
  }, [onChange, onSlidingEnd]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{formatValue(localValue)}</Text>
      </View>
      <Slider
        key={sliderKey}
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        value={localValue}
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
