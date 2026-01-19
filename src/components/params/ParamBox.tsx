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
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    flex: 1,
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pressed: {
    backgroundColor: colors.surfaceHover,
  },
  active: {
    borderColor: colors.accent,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  disabled: {
    opacity: 0.35,
  },
  disabledText: {
    opacity: 0.6,
  },
});
