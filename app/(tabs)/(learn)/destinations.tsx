import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

const POPULAR_COMBOS = [
  { dest: 'Filter Cutoff', effect: 'Classic synth sweep' },
  { dest: 'Level', effect: 'Tremolo effect' },
  { dest: 'Pan', effect: 'Auto-panner' },
  { dest: 'Pitch', effect: 'Vibrato' },
  { dest: 'Reverb Send', effect: 'Evolving space' },
  { dest: 'Another LFO', effect: 'Complex movement' },
];

export default function DestinationsScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.intro}>
        LFOs can modulate almost any parameter. Each LFO has its own destination setting.
      </Text>

      <View style={styles.testToneNote}>
        <Text style={styles.testToneText}>
          Test tone preview supports: Volume, Filter Freq, Filter Reso, Pan, Pitch
        </Text>
      </View>

      <Text style={styles.sectionHeader}>Popular combinations</Text>

      <View style={styles.comboList}>
        {POPULAR_COMBOS.map((combo) => (
          <View key={combo.dest} style={styles.comboRow}>
            <Text style={styles.comboDest}>LFO → {combo.dest}</Text>
            <Text style={styles.comboEffect}>{combo.effect}</Text>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 16,
  },
  intro: {
    color: '#888899',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    textAlign: 'center',
  },
  testToneNote: {
    backgroundColor: '#1a2a1a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  testToneText: {
    color: '#88cc88',
    fontSize: 13,
    textAlign: 'center',
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  comboList: {
    gap: 8,
  },
  comboRow: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comboDest: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  comboEffect: {
    color: '#888899',
    fontSize: 13,
  },
});
