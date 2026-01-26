import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { OutputValueDisplayProps } from './types';

export function OutputValueDisplay({ output, theme, isEditing }: OutputValueDisplayProps) {
  const [displayValue, setDisplayValue] = useState({ text: '+0.00', isPositive: true });

  const updateDisplay = useCallback((val: number) => {
    const sign = val >= 0 ? '+' : '';
    setDisplayValue({
      text: `${sign}${val.toFixed(2)}`,
      isPositive: val >= 0,
    });
  }, []);

  // React to output changes and update the display
  useAnimatedReaction(
    () => output.value,
    (currentValue) => {
      scheduleOnRN(updateDisplay, currentValue);
    },
    [output]
  );

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.text,
          { color: isEditing ? theme.textSecondary : (displayValue.isPositive ? theme.positive : theme.negative) },
        ]}
      >
        {isEditing ? '-' : displayValue.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 28,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
