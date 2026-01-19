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
    backgroundColor: '#121212', // Darker for OLED-like contrast
    borderRadius: 6, // Tighter radius
    paddingVertical: 8,
    paddingHorizontal: 6,
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a', // Subtle outline always visible
  },
  pressed: {
    backgroundColor: '#1a1a1a',
    borderColor: '#3a3a3a',
  },
  active: {
    borderColor: colors.accent,
    backgroundColor: '#1a1a0a', // Subtle warm tint when active
  },
  label: {
    color: '#666677',
    fontSize: 10, // Slightly smaller for tighter look
    fontWeight: '700',
    letterSpacing: 0.8, // More letter spacing
    marginTop: 2,
    textTransform: 'uppercase',
  },
  value: {
    color: '#ffffff',
    fontSize: 16, // Larger for better readability
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
