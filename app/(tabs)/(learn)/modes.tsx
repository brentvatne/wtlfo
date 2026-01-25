import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';

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
        How the LFO responds to note triggers.
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


      <View style={styles.relatedSection}>
        <Text style={styles.relatedTitle}>Related</Text>
        <Pressable
          onPress={() => router.push('/depth' as any)}
          style={styles.relatedLink}
        >
          <Text style={styles.relatedLinkText}>Depth & Fade → Use FADE with ONE for envelopes</Text>
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
