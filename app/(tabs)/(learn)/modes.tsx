import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

interface ModeInfo {
  mode: string;
  name: string;
  description: string;
  bestFor: string[];
}

const MODES: ModeInfo[] = [
  {
    mode: 'FRE',
    name: 'Free',
    description: 'Runs continuously, ignores triggers',
    bestFor: ['Ambient textures', 'Evolving pads'],
  },
  {
    mode: 'TRG',
    name: 'Trigger',
    description: 'Restarts from SPH on each trigger',
    bestFor: ['Rhythmic effects', 'Synced modulation'],
  },
  {
    mode: 'HLD',
    name: 'Hold',
    description: 'Freezes current value on trigger',
    bestFor: ['Sample-and-hold', 'Random snapshots'],
  },
  {
    mode: 'ONE',
    name: 'One-Shot',
    description: 'One full cycle from trigger, then stops',
    bestFor: ['Envelope-like effects', 'One-time sweeps'],
  },
  {
    mode: 'HLF',
    name: 'Half',
    description: 'Half cycle from trigger, then stops',
    bestFor: ['Attack-only envelopes'],
  },
];

function ModeCard({ info }: { info: ModeInfo }) {
  return (
    <View style={styles.modeCard}>
      <View style={styles.modeHeader}>
        <Text style={styles.modeCode}>{info.mode}</Text>
        <Text style={styles.modeName}>{info.name}</Text>
      </View>

      <Text style={styles.modeDescription}>{info.description}</Text>

      <View style={styles.tagsRow}>
        {info.bestFor.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ModesScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.intro}>
        How the LFO responds to note triggers.
      </Text>

      <View style={styles.lfoTSection}>
        <Text style={styles.sectionTitle}>LFO.T on the TRIG screen</Text>
        <Text style={styles.sectionText}>
          Each step has an <Text style={styles.bold}>LFO.T</Text> parameter that controls whether the LFO restarts on that step.
        </Text>
        <View style={styles.lfoTOptions}>
          <Text style={styles.sectionText}>
            <Text style={styles.bold}>ON:</Text> Restart from start phase (SPH)
          </Text>
          <Text style={styles.sectionText}>
            <Text style={styles.bold}>OFF:</Text> Continue from current position
          </Text>
        </View>
        <Text style={styles.sectionNote}>
          LFO.T only works in trigger modes below. In FRE mode, it&apos;s ignored.
        </Text>
      </View>

      <View style={styles.modeList}>
        {MODES.map((info) => (
          <ModeCard key={info.mode} info={info} />
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
    marginBottom: 16,
    textAlign: 'center',
  },
  lfoTSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#ff6600',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionText: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 20,
  },
  lfoTOptions: {
    marginTop: 8,
    gap: 4,
  },
  sectionNote: {
    color: '#888899',
    fontSize: 13,
    marginTop: 12,
    fontStyle: 'italic',
  },
  modeList: {
    gap: 12,
  },
  modeCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  modeCode: {
    color: '#ff6600',
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  modeName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  modeDescription: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    color: '#888899',
    fontSize: 12,
  },
  bold: {
    fontWeight: '600',
    color: '#ffffff',
  },
});
