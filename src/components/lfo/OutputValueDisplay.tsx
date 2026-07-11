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

  // React to output changes and update the display. Rounding happens in the
  // prepare function and the callback compares against the previous prepared
  // value, so the UI→JS hop (and React re-render) only fires when the two
  // displayed decimals actually change — and not at all while editing shows '-'.
  useAnimatedReaction(
    () => Math.round(output.value * 100) / 100,
    (currentValue, previous) => {
      if (isEditing || currentValue === previous) return;
      scheduleOnRN(updateDisplay, currentValue);
    },
    [output, isEditing]
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
