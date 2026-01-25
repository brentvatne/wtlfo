import React from 'react';
import { View, StyleSheet } from 'react-native';

interface VisualizationPlaceholderProps {
  width: number;
  height: number;
}

/**
 * Lightweight placeholder that matches the LFOVisualizer dimensions.
 * Rendered during splash to defer expensive Skia initialization.
 */
export function VisualizationPlaceholder({ width, height }: VisualizationPlaceholderProps) {
  return (
    <View style={[styles.container, { width, height }]}>
      {/* Center line hint */}
      <View style={styles.centerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  centerLine: {
    height: 1,
    backgroundColor: '#ffffff',
    opacity: 0.25,
    marginHorizontal: 8,
  },
});
