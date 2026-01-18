import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ParameterBadgesProps } from './types';

export function ParameterBadges({
  waveform,
  speed,
  multiplier,
  mode,
  depth,
  fade,
  startPhase,
  theme,
}: ParameterBadgesProps) {
  const badges = [
    { label: 'WAVE', value: waveform },
    speed !== undefined && { label: 'SPD', value: speed.toFixed(2) },
    multiplier !== undefined && { label: 'MULT', value: String(multiplier) },
    mode && { label: 'MODE', value: mode },
    depth !== undefined && { label: 'DEP', value: depth.toFixed(2) },
    fade !== undefined && { label: 'FADE', value: fade.toString() },
    startPhase !== undefined && { label: 'SPH', value: startPhase.toString() },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <View style={styles.container}>
      {badges.map((badge, index) => (
        <View key={index} style={[styles.badge, { backgroundColor: theme.accent + '30' }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {badge.label}
          </Text>
          <Text style={[styles.value, { color: theme.text }]}>
            {badge.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  value: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
