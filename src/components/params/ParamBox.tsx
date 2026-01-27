import React, { useEffect } from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { colors } from '@/src/theme';

export interface ParamBoxProps {
  label: string;
  value: string | number;
  onPress: () => void;
  isActive?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  shake?: boolean; // Trigger shake animation when this changes to true
}

export function ParamBox({ label, value, onPress, isActive = false, disabled = false, icon, shake = false }: ParamBoxProps) {
  const translateX = useSharedValue(0);

  // Trigger shake animation when shake prop becomes true
  useEffect(() => {
    if (shake) {
      translateX.value = withSequence(
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-4, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(-2, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [shake, translateX]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.box,
        isActive && styles.active,
        disabled && styles.disabled,
      ]}
      accessibilityLabel={`${label} parameter, current value: ${value}`}
      accessibilityRole="button"
      accessibilityHint={`Double tap to edit ${label} parameter`}
      accessibilityState={{ selected: isActive, disabled }}
    >
      {({ pressed }) => (
        <View style={[styles.inner, pressed && styles.pressed]}>
          <Animated.View style={[styles.content, shakeStyle]}>
            <View style={styles.valueRow}>
              {icon && <View style={[styles.iconContainer, disabled && styles.disabledIcon]}>{icon}</View>}
              <Text style={[styles.value, disabled && styles.disabledText]}>{value}</Text>
            </View>
            <Text style={[styles.label, disabled && styles.disabledText]}>{label}</Text>
          </Animated.View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: 'transparent', // Seamless with background
    borderRadius: 0,
    flex: 1,
    minHeight: 52,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#1a1a1a',
  },
  inner: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  content: {
    alignItems: 'center',
  },
  pressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  active: {
    backgroundColor: 'rgba(255, 102, 0, 0.1)',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconContainer: {
    opacity: 0.9,
  },
  disabledIcon: {
    opacity: 0.4,
  },
  label: {
    color: '#777788',
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
