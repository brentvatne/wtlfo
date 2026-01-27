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
  /** Step value for slider granularity (default: 0.01 for decimal support) */
  step?: number;
  onSlidingStart?: () => void;
  onSlidingEnd?: () => void;
}

export function CenterValueSlider({
  value,
  onChange,
  min,
  max,
  label,
  bipolar = false,
  step = 0.01,
  onSlidingStart,
  onSlidingEnd,
}: CenterValueSliderProps) {
  // Local state for smooth visual updates during dragging
  const [localValue, setLocalValue] = useState(value);
  const lastCommittedValue = useRef(value);
  const pendingValue = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  // Round to step precision
  const roundToStep = (v: number): number => {
    const decimals = step < 1 ? Math.ceil(-Math.log10(step)) : 0;
    const factor = Math.pow(10, decimals);
    return Math.round(v * factor) / factor;
  };

  // Sync local value when prop changes externally
  React.useEffect(() => {
    if (value !== lastCommittedValue.current) {
      setLocalValue(value);
      lastCommittedValue.current = value;
    }
  }, [value]);

  // Cleanup RAF on unmount
  React.useEffect(() => {
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  const formatValue = (v: number) => {
    const formatted = v.toFixed(2);
    if (bipolar && v > 0) return `+${formatted}`;
    return formatted;
  };

  // Handle slider changes - throttle to once per frame
  const handleValueChange = useCallback((newValue: number) => {
    const rounded = roundToStep(newValue);
    setLocalValue(rounded);
    pendingValue.current = rounded;

    // Throttle onChange to once per frame
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        if (pendingValue.current !== null && pendingValue.current !== lastCommittedValue.current) {
          lastCommittedValue.current = pendingValue.current;
          onChange(pendingValue.current);
        }
      });
    }
  }, [onChange, step]);

  // Commit final value when sliding completes (in case it wasn't sent yet)
  const handleSlidingComplete = useCallback((newValue: number) => {
    // Cancel any pending RAF
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    const rounded = roundToStep(newValue);
    if (rounded !== lastCommittedValue.current) {
      lastCommittedValue.current = rounded;
      onChange(rounded);
    }
    pendingValue.current = null;
    onSlidingEnd?.();
  }, [onChange, onSlidingEnd, step]);

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
        onSlidingStart={onSlidingStart}
        onSlidingComplete={handleSlidingComplete}
        step={step}
        minimumTrackTintColor="#ff6600"
        maximumTrackTintColor="#3a3a3a"
        thumbTintColor="#ff6600"
        accessibilityLabel={`${label} slider`}
        accessibilityRole="adjustable"
        accessibilityHint={`Adjust ${label} value between ${min} and ${max}${bipolar ? ', centered at zero' : ''}`}
        accessibilityValue={{ min, max, now: localValue }}
      />
      <View style={styles.rangeLabels}>
        <Text style={styles.rangeLabel}>{min.toFixed(2)}</Text>
        {bipolar && <Text style={styles.rangeLabel}>0.00</Text>}
        <Text style={styles.rangeLabel}>{max.toFixed(2)}</Text>
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
