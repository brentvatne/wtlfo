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
  formatValue,
  step = 1,
  onSlidingStart,
  onSlidingEnd,
}: ParameterSliderProps) {
  // Round value to step precision (e.g., step=0.1 rounds to 1 decimal place)
  const roundToStep = (v: number): number => {
    const decimals = step < 1 ? Math.ceil(-Math.log10(step)) : 0;
    const factor = Math.pow(10, decimals);
    return Math.round(v * factor) / factor;
  };

  // Default format shows decimals based on step
  const defaultFormat = (v: number): string => {
    if (step >= 1) return String(Math.round(v));
    const decimals = Math.ceil(-Math.log10(step));
    return v.toFixed(decimals);
  };
  const format = formatValue ?? defaultFormat;

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
  const pendingValue = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

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

  // Handle slider changes - throttle onChange to once per frame for performance
  const handleValueChange = useCallback((sliderValue: number) => {
    const actualValue = fromSliderValue(sliderValue);
    setLocalValue(actualValue);
    const rounded = roundToStep(actualValue);

    // Only schedule update if value changed
    if (rounded !== lastCommittedValue.current) {
      pendingValue.current = rounded;

      // Throttle to one update per frame
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(() => {
          rafId.current = null;
          if (pendingValue.current !== null && pendingValue.current !== lastCommittedValue.current) {
            lastCommittedValue.current = pendingValue.current;
            onChange(pendingValue.current);
          }
        });
      }
    }
  }, [onChange, fromSliderValue, roundToStep]);

  // Called when user starts dragging
  const handleSlidingStart = useCallback(() => {
    onSlidingStart?.();
  }, [onSlidingStart]);

  // Commit final value when sliding completes (flush any pending RAF)
  const handleSlidingComplete = useCallback((sliderValue: number) => {
    // Cancel any pending RAF
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }

    const actualValue = fromSliderValue(sliderValue);
    const rounded = roundToStep(actualValue);
    if (rounded !== lastCommittedValue.current) {
      lastCommittedValue.current = rounded;
      onChange(rounded);
    }
    pendingValue.current = null;
    onSlidingEnd?.();
  }, [onChange, onSlidingEnd, fromSliderValue, roundToStep]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{format(localValue)}</Text>
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
