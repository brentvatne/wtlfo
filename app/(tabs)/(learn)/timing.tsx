import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { WaveformIcon } from '@/src/components/lfo';

interface TimingExample {
  label: string;
  speed: number;
  mult: number;
  product: number;
}

const TIMING_EXAMPLES: TimingExample[] = [
  { label: '1 bar', speed: 16, mult: 8, product: 128 },
  { label: '1/2 note', speed: 16, mult: 16, product: 256 },
  { label: '1/4 note', speed: 16, mult: 32, product: 512 },
  { label: '1/8 note', speed: 32, mult: 32, product: 1024 },
  { label: '1/16 note', speed: 32, mult: 64, product: 2048 },
  { label: '128 bars', speed: 1, mult: 1, product: 1 },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
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

function TimingCard({ example }: { example: TimingExample }) {
  return (
    <View style={styles.timingCard}>
      <Text style={styles.timingLabel}>{example.label}</Text>
      <View style={styles.timingValues}>
        <Text style={styles.timingValue}>SPD={example.speed}</Text>
        <Text style={styles.timingMultiply}>×</Text>
        <Text style={styles.timingValue}>MULT={example.mult}</Text>
      </View>
      <Text style={styles.timingProduct}>= {example.product}</Text>
    </View>
  );
}

export default function TimingScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Section title="SPD (Speed)">
        <Text style={styles.paragraph}>
          Range: -64.00 to +63.99. Positive = forward, negative = backward, zero = frozen.
        </Text>
      </Section>

      <Section title="MULT (multiplier)">
        <Text style={styles.paragraph}>
          Powers of 2 from 1 to 2k. Higher = faster. BPM mode syncs to tempo, 120 mode locks to 120 BPM.
        </Text>
      </Section>

      <Section title="The formula">
        <View style={styles.formulaBox}>
          <Text style={styles.formula}>|SPD| × MULT = Product</Text>
          <Text style={styles.formulaNote}>Product of 128 = 1 bar per cycle</Text>
        </View>
      </Section>

      <Section title="Quick reference">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.timingScroll}
          contentContainerStyle={styles.timingScrollContent}
        >
          {TIMING_EXAMPLES.map((example) => (
            <TimingCard key={example.label} example={example} />
          ))}
        </ScrollView>
      </Section>

      <ExpandableSection title="Negative speed">
        <Text style={styles.expandedText}>
          When speed is negative, the LFO runs backward through the waveform cycle.
        </Text>
        <View style={styles.waveformExamples}>
          <View style={styles.waveformExample}>
            <WaveformIcon waveform="SAW" size={24} color="#ff6600" />
            <View style={styles.waveformExampleText}>
              <Text style={styles.bold}>SAW with positive speed</Text>
              <Text style={styles.waveformDesc}>Rising ramp (builds up)</Text>
            </View>
          </View>
          <View style={styles.waveformExample}>
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <WaveformIcon waveform="SAW" size={24} color="#ff6600" />
            </View>
            <View style={styles.waveformExampleText}>
              <Text style={styles.bold}>SAW with negative speed</Text>
              <Text style={styles.waveformDesc}>Falling ramp (decays)</Text>
            </View>
          </View>
        </View>
        <Text style={[styles.expandedText, { marginTop: 12 }]}>
          This is different from negative depth, which inverts the output but keeps the direction the same.
        </Text>
      </ExpandableSection>

      <ExpandableSection title="Speed = 0: static LFO">
        <Text style={styles.expandedText}>
          When SPD is set to 0, the LFO becomes completely static—it doesn't move at all.
        </Text>
        <Text style={[styles.expandedText, { marginTop: 8 }]}>
          <Text style={styles.bold}>Why?</Text> The timing formula divides by |SPD| × MULT. When SPD=0, this results in division by zero → infinite cycle time.
        </Text>
        <Text style={[styles.expandedText, { marginTop: 8 }]}>
          The Start Phase parameter determines where on the waveform the frozen output sits.
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    color: '#888899',
    fontSize: 14,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  paragraph: {
    color: '#cccccc',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  bold: {
    fontWeight: '600',
    color: '#ffffff',
  },
  formulaBox: {
    backgroundColor: '#1a2a1a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  formula: {
    color: '#88ff88',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  formulaNote: {
    color: '#88aa88',
    fontSize: 13,
    marginTop: 6,
  },
  timingScroll: {
    marginHorizontal: -16,
  },
  timingScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  timingCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    minWidth: 120,
    alignItems: 'center',
  },
  timingLabel: {
    color: '#ff6600',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  timingValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timingValue: {
    color: '#888899',
    fontSize: 12,
  },
  timingMultiply: {
    color: '#555566',
    fontSize: 12,
  },
  timingProduct: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 6,
  },
  expandableSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    marginBottom: 16,
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
  waveformExamples: {
    marginTop: 12,
    gap: 10,
  },
  waveformExample: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 10,
  },
  waveformExampleText: {
    flex: 1,
  },
  waveformDesc: {
    color: '#888899',
    fontSize: 13,
    marginTop: 2,
  },
});
