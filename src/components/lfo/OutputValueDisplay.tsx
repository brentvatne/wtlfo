import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useAnimatedReaction } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { OutputValueDisplayProps } from './types';

interface ExtendedOutputValueDisplayProps extends OutputValueDisplayProps {
  /** SharedValue for editing state - avoids re-renders when editing state changes */
  isEditingShared?: SharedValue<boolean>;
}

export function OutputValueDisplay({ output, theme, isEditing, isEditingShared }: ExtendedOutputValueDisplayProps) {
  const [displayValue, setDisplayValue] = useState({ text: '+0.00', isPositive: true });
  // Local state for editing - updated via scheduleOnRN when using SharedValue
  const [isEditingState, setIsEditingState] = useState(isEditing ?? false);

  // Determine editing state: use local state when isEditingShared is provided, otherwise use prop
  const effectiveIsEditing = isEditingShared ? isEditingState : (isEditing ?? false);

  const updateDisplay = useCallback((val: number) => {
    setDisplayValue({
      text: `${val >= 0 ? '+' : ''}${val.toFixed(2)}`,
      isPositive: val >= 0,
    });
  }, []);

  // React to output changes and update the display
  useAnimatedReaction(
    () => output.value,
    (currentValue) => {
      'worklet';
      scheduleOnRN(updateDisplay, currentValue);
    },
    [output, updateDisplay]
  );

  // React to isEditingShared changes on UI thread
  useAnimatedReaction(
    () => isEditingShared?.value,
    (editing, prevEditing) => {
      'worklet';
      if (isEditingShared === undefined || prevEditing === undefined) return;
      if (editing === prevEditing) return;
      scheduleOnRN(setIsEditingState, editing ?? false);
    },
    [isEditingShared]
  );

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.text,
          { color: effectiveIsEditing ? theme.textSecondary : (displayValue.isPositive ? theme.positive : theme.negative) },
        ]}
      >
        {effectiveIsEditing ? '-' : displayValue.text}
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
