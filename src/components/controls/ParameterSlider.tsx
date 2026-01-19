import React from 'react';
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
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{formatValue(value)}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        value={value}
        onValueChange={onChange}
        step={step}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor="#3a3a3a"
        thumbTintColor={colors.accent}
        accessibilityLabel={`${label} slider`}
        accessibilityRole="adjustable"
        accessibilityHint={`Adjust ${label} value between ${min} and ${max}`}
        accessibilityValue={{ min, max, now: value }}
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
