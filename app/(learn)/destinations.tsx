import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';

interface DestinationCategory {
  name: string;
  destinations: string[];
}

const AUDIO_DESTINATIONS: DestinationCategory[] = [
  {
    name: 'Sample/Source',
    destinations: ['Sample Slot', 'Sample Start', 'Sample Length', 'Loop Position', 'Bit Reduction'],
  },
  {
    name: 'Filter',
    destinations: ['Filter Frequency', 'Filter Resonance', 'Filter Env Depth', 'Base/Width'],
  },
  {
    name: 'Amplifier',
    destinations: ['Level (tremolo)', 'Pan (stereo movement)', 'Amp Envelope Depth'],
  },
  {
    name: 'Pitch',
    destinations: ['Tune (vibrato)', 'Detune'],
  },
  {
    name: 'Effects',
    destinations: ['Delay Send', 'Reverb Send', 'Overdrive', 'Chorus/Flanger', 'Bit Crusher'],
  },
  {
    name: 'LFO Cross-Mod',
    destinations: ['LFO2 Speed', 'LFO2 Depth', 'LFO1 Speed', 'LFO1 Depth'],
  },
];

const POPULAR_COMBOS = [
  { dest: 'Filter Cutoff', effect: 'Classic synth sweep' },
  { dest: 'Level', effect: 'Tremolo effect' },
  { dest: 'Pan', effect: 'Auto-panner' },
  { dest: 'Pitch', effect: 'Vibrato' },
  { dest: 'Reverb Send', effect: 'Evolving space' },
  { dest: 'Another LFO', effect: 'Complex movement' },
];

function DestinationCard({ category }: { category: DestinationCategory }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{category.name}</Text>
      <View style={styles.destList}>
        {category.destinations.map((dest) => (
          <View key={dest} style={styles.destItem}>
            <Text style={styles.destBullet}>•</Text>
            <Text style={styles.destText}>{dest}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ExpandableSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.expandableSection}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={styles.expandableHeader}
      >
        <Text style={styles.expandableTitle}>{title}</Text>
        <Text style={styles.expandableIcon}>{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded && <View style={styles.expandableContent}>{children}</View>}
    </View>
  );
}

export default function DestinationsScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.intro}>
        LFOs can modulate almost any parameter on Digitakt II. Each LFO has its own DEST (destination) setting.
      </Text>

      <Text style={styles.sectionHeader}>Audio Track Destinations</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.horizontalScroll}
        contentContainerStyle={styles.horizontalScrollContent}
      >
        {AUDIO_DESTINATIONS.map((cat) => (
          <DestinationCard key={cat.name} category={cat} />
        ))}
      </ScrollView>

      <Text style={styles.sectionHeader}>Popular Combinations</Text>

      <View style={styles.comboList}>
        {POPULAR_COMBOS.map((combo) => (
          <View key={combo.dest} style={styles.comboRow}>
            <Text style={styles.comboDest}>LFO → {combo.dest}</Text>
            <Text style={styles.comboEffect}>{combo.effect}</Text>
          </View>
        ))}
      </View>

      <ExpandableSection title="MIDI Track Destinations">
        <Text style={styles.expandedText}>
          MIDI tracks have fewer but powerful destinations:
        </Text>
        <View style={styles.midiList}>
          <Text style={styles.midiItem}>• CC values (any MIDI CC number)</Text>
          <Text style={styles.midiItem}>• Pitch bend</Text>
          <Text style={styles.midiItem}>• Aftertouch</Text>
          <Text style={styles.midiItem}>• Note parameters</Text>
        </View>
        <Text style={[styles.expandedText, { marginTop: 8 }]}>
          This makes Digitakt II a powerful controller for external synths and gear.
        </Text>
      </ExpandableSection>
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
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  horizontalScroll: {
    marginHorizontal: -16,
    marginBottom: 20,
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    minWidth: 180,
  },
  cardTitle: {
    color: '#ff6600',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  destList: {
    gap: 4,
  },
  destItem: {
    flexDirection: 'row',
    gap: 6,
  },
  destBullet: {
    color: '#555566',
    fontSize: 12,
  },
  destText: {
    color: '#cccccc',
    fontSize: 13,
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
  expandableSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    marginTop: 20,
    overflow: 'hidden',
  },
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  expandableTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  expandableIcon: {
    color: '#555566',
    fontSize: 18,
    fontWeight: '500',
  },
  expandableContent: {
    padding: 14,
    paddingTop: 0,
  },
  expandedText: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 20,
  },
  midiList: {
    marginTop: 8,
    gap: 4,
  },
  midiItem: {
    color: '#aaaaaa',
    fontSize: 13,
  },
});
