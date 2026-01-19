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
}

export function ParameterSlider({
  label,
  min,
  max,
  value,
  onChange,
  formatValue = (v) => String(Math.round(v)),
  step = 1,
}: ParameterSliderProps) {
  // Local state for smooth visual updates during dragging
  const [localValue, setLocalValue] = useState(value);
  const lastCommittedValue = useRef(value);

  // Sync local value when prop changes externally
  React.useEffect(() => {
    if (value !== lastCommittedValue.current) {
      setLocalValue(value);
      lastCommittedValue.current = value;
    }
  }, [value]);

  // Throttle parent updates to prevent native crash from rapid events
  const lastUpdateTime = useRef(0);
  const throttleMs = 32; // ~30fps - safe rate that avoids crash

  // Handle slider changes - update local state immediately, throttle parent updates
  const handleValueChange = useCallback((newValue: number) => {
    setLocalValue(newValue);

    // Throttle parent updates to prevent Fabric event dispatcher crash
    const now = Date.now();
    if (now - lastUpdateTime.current >= throttleMs) {
      lastUpdateTime.current = now;
      onChange(Math.round(newValue));
    }
  }, [onChange]);

  // Always commit final value when sliding completes
  const handleSlidingComplete = useCallback((newValue: number) => {
    const rounded = Math.round(newValue);
    lastCommittedValue.current = rounded;
    onChange(rounded);
  }, [onChange]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{formatValue(localValue)}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        value={localValue}
        onValueChange={handleValueChange}
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
