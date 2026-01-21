import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface ModeInfo {
  mode: string;
  name: string;
  description: string;
  behavior: string;
  bestFor: string[];
  runsContinuously: boolean;
  respondsToTrigger: string;
  stops: string;
}

const MODES: ModeInfo[] = [
  {
    mode: 'FRE',
    name: 'Free',
    description: 'LFO runs continuously, ignoring all triggers',
    behavior: 'Endless cycling regardless of note events',
    bestFor: ['Ambient textures', 'Evolving pads', 'Background movement'],
    runsContinuously: true,
    respondsToTrigger: 'No',
    stops: 'Never',
  },
  {
    mode: 'TRG',
    name: 'Trigger',
    description: 'LFO restarts from start phase on each trigger',
    behavior: 'Resets to SPH position every time a note plays',
    bestFor: ['Rhythmic effects', 'Synced modulation', 'Consistent attacks'],
    runsContinuously: true,
    respondsToTrigger: 'Restarts',
    stops: 'Never',
  },
  {
    mode: 'HLD',
    name: 'Hold',
    description: 'LFO runs hidden; trigger freezes current value',
    behavior: 'Samples and holds output at moment of trigger',
    bestFor: ['Sample-and-hold', 'Frozen modulation', 'Random snapshots'],
    runsContinuously: true,
    respondsToTrigger: 'Freezes output',
    stops: 'Never',
  },
  {
    mode: 'ONE',
    name: 'One-Shot',
    description: 'Single complete cycle from trigger, then stops',
    behavior: 'Runs exactly one full cycle and holds final value',
    bestFor: ['Envelope-like effects', 'One-time sweeps', 'Attack shapes'],
    runsContinuously: false,
    respondsToTrigger: 'Starts',
    stops: 'After 1 cycle',
  },
  {
    mode: 'HLF',
    name: 'Half',
    description: 'Half cycle from trigger, then stops',
    behavior: 'Runs exactly half a cycle and holds final value',
    bestFor: ['Attack-only envelopes', 'Single-direction sweeps'],
    runsContinuously: false,
    respondsToTrigger: 'Starts',
    stops: 'After 1/2 cycle',
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

      <View style={styles.behaviorBox}>
        <Text style={styles.behaviorText}>{info.behavior}</Text>
      </View>

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

export default function ModesScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.intro}>
        Trigger modes control how the LFO responds to note events. Each mode creates different rhythmic and musical behavior.
      </Text>

      <View style={styles.modeList}>
        {MODES.map((info) => (
          <ModeCard key={info.mode} info={info} />
        ))}
      </View>

      <ExpandableSection title="Hardware Verified Behavior">
        <Text style={styles.verifiedText}>
          Verified against Digitakt II via MIDI CC capture:
        </Text>
        <View style={styles.verifiedList}>
          <Text style={styles.verifiedItem}>
            • <Text style={styles.verifiedHighlight}>TRG and FRE have identical timing</Text> — same cycle duration, only phase reset differs
          </Text>
          <Text style={styles.verifiedItem}>
            • <Text style={styles.verifiedHighlight}>TRG resets to startPhase on trigger</Text> — SPH=0 starts at center going UP, SPH=64 starts at center going DOWN
          </Text>
          <Text style={styles.verifiedItem}>
            • <Text style={styles.verifiedHighlight}>FRE ignores all triggers</Text> — LFO continues from current phase
          </Text>
          <Text style={styles.verifiedItem}>
            • <Text style={styles.verifiedHighlight}>All modes output full bipolar range</Text> — 0-127 CC (for bipolar waveforms)
          </Text>
        </View>
        <Text style={[styles.verifiedText, { marginTop: 12 }]}>
          MIDI Transport behavior:
        </Text>
        <View style={styles.verifiedList}>
          <Text style={styles.verifiedItem}>
            • <Text style={styles.verifiedHighlight}>Start (0xFA)</Text> — Reset LFO to beginning and play
          </Text>
          <Text style={styles.verifiedItem}>
            • <Text style={styles.verifiedHighlight}>Continue (0xFB)</Text> — Resume from current position
          </Text>
          <Text style={styles.verifiedItem}>
            • <Text style={styles.verifiedHighlight}>Stop (0xFC)</Text> — Pause, keep current position
          </Text>
        </View>
      </ExpandableSection>

      <ExpandableSection title="Mode Comparison Table">
        <View style={styles.comparisonTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 0.8 }]}>Mode</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText]}>Continuous?</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText]}>On Trigger</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText]}>Stops?</Text>
          </View>
          {MODES.map((info) => (
            <View key={info.mode} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.modeCell, { flex: 0.8 }]}>{info.mode}</Text>
              <Text style={styles.tableCell}>{info.runsContinuously ? 'Yes' : 'No'}</Text>
              <Text style={styles.tableCell}>{info.respondsToTrigger}</Text>
              <Text style={styles.tableCell}>{info.stops}</Text>
            </View>
          ))}
        </View>
      </ExpandableSection>

      <View style={styles.relatedSection}>
        <Text style={styles.relatedTitle}>Related Concepts</Text>
        <Pressable
          onPress={() => router.push('/depth' as any)}
          style={styles.relatedLink}
        >
          <Text style={styles.relatedLinkText}>Depth & Fade → Use FADE with ONE for envelopes</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/speed' as any)}
          style={styles.relatedLink}
        >
          <Text style={styles.relatedLinkText}>Speed & Timing → Mode behavior depends on LFO speed</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/presets' as any)}
          style={styles.relatedLink}
        >
          <Text style={styles.relatedLinkText}>Preset Recipes → See modes in action</Text>
        </Pressable>
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
    marginBottom: 20,
    textAlign: 'center',
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
  behaviorBox: {
    backgroundColor: '#252525',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  behaviorText: {
    color: '#aaaaaa',
    fontSize: 13,
    fontStyle: 'italic',
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
  expandableSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    marginTop: 16,
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
  comparisonTable: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#252525',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    fontWeight: '600',
    color: '#888899',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  tableCell: {
    flex: 1,
    color: '#cccccc',
    fontSize: 12,
    textAlign: 'center',
  },
  modeCell: {
    color: '#ff6600',
    fontWeight: '600',
  },
  relatedSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#222222',
  },
  relatedTitle: {
    color: '#888899',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  relatedLink: {
    paddingVertical: 8,
  },
  relatedLinkText: {
    color: '#ff6600',
    fontSize: 14,
  },
  verifiedText: {
    color: '#88cc88',
    fontSize: 14,
    lineHeight: 20,
  },
  verifiedList: {
    marginTop: 8,
    gap: 6,
  },
  verifiedItem: {
    color: '#aaccaa',
    fontSize: 13,
    lineHeight: 19,
  },
  verifiedHighlight: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
