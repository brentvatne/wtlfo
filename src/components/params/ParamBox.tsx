import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';

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
    >
      <Text style={[styles.label, disabled && styles.disabledText]}>{label}</Text>
      <Text style={[styles.value, disabled && styles.disabledText]}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#1a1a1a',
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
    backgroundColor: '#2a2a2a',
  },
  active: {
    borderColor: '#ff6600',
  },
  label: {
    color: '#888899',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    color: '#ffffff',
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
