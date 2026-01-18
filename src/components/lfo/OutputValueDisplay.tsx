import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import type { OutputValueDisplayProps } from './types';

export function OutputValueDisplay({ output, theme }: OutputValueDisplayProps) {
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
      runOnJS(updateDisplay)(currentValue);
    },
    [output]
  );

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.text,
          { color: displayValue.isPositive ? theme.positive : theme.negative },
        ]}
      >
        {displayValue.text}
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
