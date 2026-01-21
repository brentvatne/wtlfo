import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

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

export default function SpeedScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Section title="SPD (Speed) Parameter">
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Range</Text>
            <Text style={styles.infoValue}>-64 to +63</Text>
          </View>
        </View>
        <Text style={styles.paragraph}>
          Controls how fast the LFO cycles. The value represents "phase steps" that combine with MULT.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Positive values</Text> run the waveform forward.{'\n'}
          <Text style={styles.bold}>Negative values</Text> run it backward.
        </Text>
      </Section>

      <Section title="MULT (Multiplier) Parameter">
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Values</Text>
            <Text style={styles.infoValue}>1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1k, 2k</Text>
          </View>
        </View>
        <Text style={styles.paragraph}>
          Multiplies the speed relative to project tempo. Higher values = faster LFO.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>BPM mode</Text> syncs to project tempo.{'\n'}
          <Text style={styles.bold}>120 mode</Text> locks to fixed 120 BPM (shown without "BPM" prefix).
        </Text>
      </Section>

      <Section title="How They Work Together">
        <View style={styles.formulaBox}>
          <Text style={styles.formula}>|SPD| × MULT = Product</Text>
          <Text style={styles.formulaNote}>Product of 128 = exactly 1 bar per cycle</Text>
        </View>
        <Text style={styles.paragraph}>
          Higher product = faster LFO. The absolute value of speed is used in the calculation.
        </Text>
      </Section>

      <Section title="Quick Reference">
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

      <ExpandableSection title="Negative Speed Deep Dive">
        <Text style={styles.expandedText}>
          When speed is negative, the LFO runs backward through the waveform cycle.
        </Text>
        <Text style={[styles.expandedText, { marginTop: 8 }]}>
          <Text style={styles.bold}>SAW with positive speed:</Text> Rising ramp (builds up){'\n'}
          <Text style={styles.bold}>SAW with negative speed:</Text> Falling ramp (decays)
        </Text>
        <Text style={[styles.expandedText, { marginTop: 8 }]}>
          This is different from negative depth, which inverts the output but keeps the direction the same.
        </Text>
      </ExpandableSection>

      <View style={styles.relatedSection}>
        <Text style={styles.relatedTitle}>Related Concepts</Text>
        <Pressable
          onPress={() => router.push('/timing' as any)}
          style={styles.relatedLink}
        >
          <Text style={styles.relatedLinkText}>Timing Math → Full formulas and calculator</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/depth' as any)}
          style={styles.relatedLink}
        >
          <Text style={styles.relatedLinkText}>Depth & Fade → Another way to invert waveforms</Text>
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
  relatedSection: {
    marginTop: 8,
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
});
