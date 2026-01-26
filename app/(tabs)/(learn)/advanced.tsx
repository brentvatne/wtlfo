import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

interface TimingReference {
  noteValue: string;
  product: number;
}

const TIMING_REFERENCE: TimingReference[] = [
  { noteValue: '1/16 note', product: 2048 },
  { noteValue: '1/8 note', product: 1024 },
  { noteValue: '1/4 note', product: 512 },
  { noteValue: '1/2 note', product: 256 },
  { noteValue: '1 bar', product: 128 },
  { noteValue: '2 bars', product: 64 },
  { noteValue: '4 bars', product: 32 },
  { noteValue: '8 bars', product: 16 },
  { noteValue: '∞ (frozen)', product: 0 },
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

function FormulaBox({ formula, note }: { formula: string; note?: string }) {
  return (
    <View style={styles.formulaBox}>
      <Text style={styles.formula}>{formula}</Text>
      {note && <Text style={styles.formulaNote}>{note}</Text>}
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
      <Section title="The core concept">
        <FormulaBox
          formula="|SPD| × MULT = Product"
          note="Product of 128 = exactly 1 bar per cycle"
        />
        <Text style={styles.paragraph}>
          The product of absolute speed times multiplier determines cycle length. Higher product = faster LFO.
        </Text>
      </Section>

      <Section title="Common timing reference">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.horizontalScrollContent}
        >
          {TIMING_REFERENCE.map((ref) => (
            <View key={ref.noteValue} style={styles.timingCard}>
              <Text style={styles.timingNote}>{ref.noteValue}</Text>
              <Text style={styles.timingProduct}>= {ref.product}</Text>
            </View>
          ))}
        </ScrollView>
      </Section>

      <ExpandableSection title="The formulas">
        <Text style={styles.formulaLabel}>Calculating Cycle Length:</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>product = |SPD| × MULT</Text>
        </View>

        <Text style={[styles.formulaLabel, { marginTop: 12 }]}>If product {'>'} 128:</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>cycle = product / 128</Text>
          <Text style={styles.codeComment}>(fraction of whole note)</Text>
        </View>

        <Text style={[styles.formulaLabel, { marginTop: 12 }]}>If product {'<'} 128:</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>whole_notes = 128 / product</Text>
          <Text style={styles.codeComment}>(multiple bars)</Text>
        </View>

        <Text style={[styles.formulaLabel, { marginTop: 16 }]}>Time in Milliseconds:</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>cycle_ms = (60000 / BPM) × 4 × (128 / product)</Text>
          <Text style={styles.codeComment}>(when product = 0, cycle = ∞)</Text>
        </View>

        <Text style={[styles.formulaLabel, { marginTop: 16 }]}>Phase to Degrees:</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>degrees = (SPH / 128) × 360</Text>
        </View>
        <Text style={styles.phaseNote}>
          0 = 0°, 32 = 90°, 64 = 180°, 96 = 270°, 127 ≈ 360°
        </Text>
      </ExpandableSection>

      <ExpandableSection title="Asymmetry note">
        <Text style={styles.expandedText}>
          The speed range is -64.00 to +63.99.
        </Text>
        <Text style={[styles.expandedText, { marginTop: 8 }]}>
          At SPD=-64, the magnitude is slightly greater than 1.0 (64/63.99 ≈ 1.0002).
        </Text>
        <Text style={[styles.expandedText, { marginTop: 8 }]}>
          <Text style={styles.bold}>Workaround:</Text> Use SPD=-64 with SPH=127 for nearly perfect sync when running backward.
        </Text>
      </ExpandableSection>

      <ExpandableSection title="Modulation update rate">
        <Text style={styles.expandedText}>
          The Digitakt LFO updates <Text style={styles.bold}>continuously</Text>, not quantized to sequencer steps.
        </Text>
        <Text style={[styles.expandedText, { marginTop: 8 }]}>
          On real hardware, modulation runs at audio-rate (44.1-48kHz) for smooth, sample-accurate control.
        </Text>
        <Text style={[styles.expandedText, { marginTop: 8 }]}>
          <Text style={styles.bold}>Key points:</Text>
        </Text>
        <Text style={[styles.expandedText, { marginTop: 4 }]}>
          • Update rate is independent of BPM
        </Text>
        <Text style={styles.expandedText}>
          • BPM only affects cycle duration
        </Text>
        <Text style={styles.expandedText}>
          • Phase advances smoothly (float64 precision)
        </Text>
        <Text style={styles.expandedText}>
          • No stepping artifacts in output
        </Text>
        <Text style={[styles.expandedText, { marginTop: 8 }]}>
          This is standard for professional synths—continuous modulation independent of step quantization.
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
  paragraph: {
    color: '#cccccc',
    fontSize: 15,
    lineHeight: 22,
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
  horizontalScroll: {
    marginHorizontal: -16,
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  timingCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    minWidth: 100,
    alignItems: 'center',
  },
  timingNote: {
    color: '#ff6600',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  timingProduct: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  expandableSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    marginBottom: 12,
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
  bold: {
    fontWeight: '600',
    color: '#ffffff',
  },
  formulaLabel: {
    color: '#888899',
    fontSize: 13,
    marginBottom: 6,
  },
  codeBlock: {
    backgroundColor: '#0a1a1a',
    borderRadius: 6,
    padding: 10,
  },
  code: {
    color: '#00d4ff',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  codeComment: {
    color: '#668888',
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  phaseNote: {
    color: '#888899',
    fontSize: 12,
    marginTop: 6,
  },
});
