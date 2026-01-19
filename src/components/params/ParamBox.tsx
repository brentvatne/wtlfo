import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { colors } from '@/src/theme';

export interface ParamBoxProps {
  label: string;
  value: string | number;
  onPress: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

export function ParamBox({ label, value, onPress, isActive = false, disabled = false }: ParamBoxProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.box,
        pressed && styles.pressed,
        isActive && styles.active,
        disabled && styles.disabled,
      ]}
      accessibilityLabel={`${label} parameter, current value: ${value}`}
      accessibilityRole="button"
      accessibilityHint={`Double tap to edit ${label} parameter`}
      accessibilityState={{ selected: isActive, disabled }}
    >
      <Text style={[styles.value, disabled && styles.disabledText]}>{value}</Text>
      <Text style={[styles.label, disabled && styles.disabledText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: 'transparent', // Seamless with background
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 4,
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#1a1a1a',
  },
  pressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  active: {
    backgroundColor: 'rgba(255, 102, 0, 0.1)',
  },
  label: {
    color: '#555566',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 3,
    textTransform: 'uppercase',
  },
  value: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: 'monospace',
  },
  disabled: {
    opacity: 0.3,
  },
  disabledText: {
    opacity: 0.5,
  },
});
