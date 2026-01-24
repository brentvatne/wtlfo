import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { LFO } from 'elektron-lfo';
import { LFOVisualizer } from '@/src/components/lfo';
import type { WaveformType } from '@/src/components/lfo';

interface WaveformInfo {
  type: WaveformType;
  name: string;
  polarity: 'Bipolar' | 'Unipolar';
  character: string;
  bestFor: string[];
}

const WAVEFORMS: WaveformInfo[] = [
  {
    type: 'TRI',
    name: 'Triangle',
    polarity: 'Bipolar',
    character: 'Smooth, symmetrical rise and fall',
    bestFor: ['Classic vibrato', 'Gentle sweeps'],
  },
  {
    type: 'SIN',
    name: 'Sine',
    polarity: 'Bipolar',
    character: 'Rounded, natural movement',
    bestFor: ['Natural modulation', 'Smooth transitions'],
  },
  {
    type: 'SQR',
    name: 'Square',
    polarity: 'Bipolar',
    character: 'Instant on/off switching',
    bestFor: ['Rhythmic gating', 'Trills'],
  },
  {
    type: 'SAW',
    name: 'Sawtooth',
    polarity: 'Bipolar',
    character: 'Falling ramp, instant reset',
    bestFor: ['Decay effects', 'Filter sweeps'],
  },
  {
    type: 'EXP',
    name: 'Exponential',
    polarity: 'Unipolar',
    character: 'Accelerating curve',
    bestFor: ['Percussive attacks', 'Swells'],
  },
  {
    type: 'RMP',
    name: 'Ramp',
    polarity: 'Unipolar',
    character: 'Rising ramp, instant reset',
    bestFor: ['Build-up effects', 'Fade-ins', 'Rising sweeps'],
  },
  {
    type: 'RND',
    name: 'Random',
    polarity: 'Bipolar',
    character: 'Sample-and-hold random',
    bestFor: ['Humanization', 'Chaos', 'Variation'],
  },
];

// Animated waveform preview component
function WaveformPreview({ waveform, width }: { waveform: WaveformType; width: number }) {
  const phase = useSharedValue(0);
  const output = useSharedValue(0);
  const lfoRef = useRef<LFO | null>(null);

  useEffect(() => {
    lfoRef.current = new LFO(
      {
        waveform: waveform,
        speed: 24,
        multiplier: 8,
        mode: 'FRE',
        depth: 63,
        fade: 0,
      },
      120
    );

    let animationId: number;
    const animate = (timestamp: number) => {
      if (lfoRef.current) {
        const state = lfoRef.current.update(timestamp);
        phase.value = state.phase;
        output.value = state.output;
      }
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [waveform, phase, output]);

  return (
    <LFOVisualizer
      phase={phase}
      output={output}
      waveform={waveform}
      width={width}
      height={100}
      theme="dark"
      showParameters={false}
      showTiming={false}
      showOutput={false}
      strokeWidth={2}
    />
  );
}

function WaveformCard({ info, width }: { info: WaveformInfo; width: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.nameRow}>
          <Text style={styles.waveType}>{info.type}</Text>
          <Text style={styles.waveName}>{info.name}</Text>
        </View>
        <View style={[styles.polarityBadge, info.polarity === 'Unipolar' && styles.unipolarBadge]}>
          <Text style={styles.polarityText}>{info.polarity === 'Bipolar' ? '±' : '+'}</Text>
        </View>
      </View>

      <WaveformPreview waveform={info.type} width={width - 32} />

      <Text style={styles.character}>{info.character}</Text>

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

export default function WaveformsScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 32;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.intro}>
        The waveform determines the shape of modulation over time. Each creates a different character of movement.
      </Text>

      <View style={styles.cardList}>
        {WAVEFORMS.map((info) => (
          <WaveformCard key={info.type} info={info} width={cardWidth} />
        ))}
      </View>

      <ExpandableSection title="Bipolar vs Unipolar">
        <Text style={styles.sectionText}>
          <Text style={styles.bold}>Bipolar</Text> waveforms swing both above and below center (±). They oscillate between -1 and +1.
        </Text>
        <Text style={[styles.sectionText, { marginTop: 8 }]}>
          <Text style={styles.bold}>Unipolar</Text> waveforms only produce positive values. They range from 0 to +1. EXP and RMP are unipolar.
        </Text>
        <Text style={[styles.sectionText, { marginTop: 8 }]}>
          This distinction matters when using negative depth - inverting a unipolar waveform keeps it positive but reverses its direction.
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
  cardList: {
    gap: 12,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waveType: {
    color: '#ff6600',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  waveName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  polarityBadge: {
    backgroundColor: '#2a4a2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  unipolarBadge: {
    backgroundColor: '#4a3a2a',
  },
  polarityText: {
    color: '#88cc88',
    fontSize: 12,
    fontWeight: '600',
  },
  character: {
    color: '#cccccc',
    fontSize: 14,
    marginTop: 12,
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
  sectionText: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: '#ffffff',
  },
});
