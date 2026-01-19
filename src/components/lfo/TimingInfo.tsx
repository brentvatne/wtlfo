import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TimingInfoProps } from './types';

export function TimingInfo({ bpm, cycleTimeMs, noteValue, steps, theme }: TimingInfoProps) {
  // Format steps - show decimal only if not a whole number
  const formatSteps = (s: number): string => {
    if (Number.isInteger(s)) return String(s);
    return s.toFixed(1);
  };

  return (
    <View style={[styles.container, { borderTopColor: theme.gridLines + '20' }]}>
      {bpm !== undefined && (
        <View style={styles.item}>
          <Text style={[styles.value, { color: theme.text }]}>{bpm}</Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>BPM</Text>
        </View>
      )}

      {cycleTimeMs !== undefined && (
        <View style={styles.item}>
          <Text style={[styles.value, { color: theme.text }]}>
            {cycleTimeMs >= 1000
              ? `${(cycleTimeMs / 1000).toFixed(2)}s`
              : `${cycleTimeMs.toFixed(0)}ms`}
          </Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>CYCLE</Text>
        </View>
      )}

      {noteValue && (
        <View style={styles.item}>
          <Text style={[styles.value, { color: theme.text }]}>{noteValue}</Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>NOTE</Text>
        </View>
      )}

      {steps !== undefined && steps > 0 && (
        <View style={styles.item}>
          <Text style={[styles.value, { color: theme.text }]}>{formatSteps(steps)}</Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>STEPS</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  item: {
    alignItems: 'center',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
