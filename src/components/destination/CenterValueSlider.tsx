import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

interface CenterValueSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  label: string;
  bipolar?: boolean;
}

export function CenterValueSlider({
  value,
  onChange,
  min,
  max,
  label,
  bipolar = false,
}: CenterValueSliderProps) {
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

  const formatValue = (v: number) => {
    const rounded = Math.round(v);
    if (bipolar && rounded > 0) return `+${rounded}`;
    return String(rounded);
  };

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

  // Commit final value when sliding completes (in case it wasn't sent yet)
  const handleSlidingComplete = useCallback((newValue: number) => {
    const rounded = Math.round(newValue);
    if (rounded !== lastCommittedValue.current) {
      lastCommittedValue.current = rounded;
      onChange(rounded);
    }
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
        step={1}
        minimumTrackTintColor="#ff6600"
        maximumTrackTintColor="#3a3a3a"
        thumbTintColor="#ff6600"
        accessibilityLabel={`${label} slider`}
        accessibilityRole="adjustable"
        accessibilityHint={`Adjust ${label} value between ${min} and ${max}${bipolar ? ', centered at zero' : ''}`}
        accessibilityValue={{ min, max, now: localValue }}
      />
      <View style={styles.rangeLabels}>
        <Text style={styles.rangeLabel}>{min}</Text>
        {bipolar && <Text style={styles.rangeLabel}>0</Text>}
        <Text style={styles.rangeLabel}>{max}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    color: '#888899',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    color: '#ff6600',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  slider: {
    width: '100%',
    height: 32,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  rangeLabel: {
    color: '#555566',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
});
