import React from 'react';
import { View, StyleSheet } from 'react-native';

interface MeterPlaceholderProps {
  width: number;
  height: number;
}

/**
 * Lightweight placeholder that matches the DestinationMeter dimensions.
 * Rendered during splash to defer expensive Skia initialization.
 */
export function MeterPlaceholder({ width, height }: MeterPlaceholderProps) {
  return (
    <View style={[styles.container, { width, height }]}>
      {/* Grid hint lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[
            styles.gridLine,
            { top: (i / 4) * (height - 16) + 8 },
            i === 2 && styles.centerLine,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: '#ffffff',
    opacity: 0.25,
  },
  centerLine: {
    opacity: 0.35,
  },
});
