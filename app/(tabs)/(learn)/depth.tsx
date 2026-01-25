import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';

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

export default function DepthScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Section title="DEP (Depth)">
        <Text style={styles.paragraph}>
          Range: -64 to +63. Controls intensity and polarity. Negative values invert the waveform. Zero = no output.
        </Text>
        <View style={styles.depthExamples}>
          <View style={styles.depthExample}>
            <Text style={styles.depthValue}>+63</Text>
            <Text style={styles.depthLabel}>Full</Text>
          </View>
          <View style={styles.depthExample}>
            <Text style={styles.depthValue}>0</Text>
            <Text style={styles.depthLabel}>Off</Text>
          </View>
          <View style={styles.depthExample}>
            <Text style={styles.depthValue}>-64</Text>
            <Text style={styles.depthLabel}>Inverted</Text>
          </View>
        </View>
      </Section>

      <Section title="FADE Parameter">
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Range</Text>
            <Text style={styles.infoValue}>-64 to +63</Text>
          </View>
        </View>

        <View style={styles.fadeExamples}>
          <View style={styles.fadeExample}>
            <Text style={styles.fadeIcon}>↗</Text>
            <View style={styles.fadeInfo}>
              <Text style={styles.fadeRange}>Negative (-64 to -1)</Text>
              <Text style={styles.fadeDesc}>Fade IN: 0 → full</Text>
            </View>
          </View>
          <View style={styles.fadeExample}>
            <Text style={styles.fadeIcon}>─</Text>
            <View style={styles.fadeInfo}>
              <Text style={styles.fadeRange}>Zero</Text>
              <Text style={styles.fadeDesc}>No fade (immediate)</Text>
            </View>
          </View>
          <View style={styles.fadeExample}>
            <Text style={styles.fadeIcon}>↘</Text>
            <View style={styles.fadeInfo}>
              <Text style={styles.fadeRange}>Positive (1 to 63)</Text>
              <Text style={styles.fadeDesc}>Fade OUT: full → 0</Text>
            </View>
          </View>
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Fade only works in trigger-based modes (TRG, ONE, HLD, HLF). It has no effect in FRE mode.
          </Text>
        </View>
      </Section>

      <ExpandableSection title="Fade Timing Deep Dive">
        <Text style={styles.expandedText}>
          Fade speed is relative to the LFO cycle time. Higher absolute values = faster fade.
        </Text>
        <Text style={[styles.expandedText, { marginTop: 8 }]}>
          <Text style={styles.bold}>FADE = -32:</Text> Fade in completes at 50% of cycle{'\n'}
          <Text style={styles.bold}>FADE = -64:</Text> Near-instant fade in{'\n'}
          <Text style={styles.bold}>FADE = -1:</Text> Very slow fade, nearly entire cycle
        </Text>
      </ExpandableSection>

      <ExpandableSection title="Combining Depth & Fade">
        <Text style={styles.expandedText}>
          <Text style={styles.bold}>Fade IN + Positive Depth:</Text>{'\n'}
          Modulation gradually builds up from zero.
        </Text>
        <Text style={[styles.expandedText, { marginTop: 8 }]}>
          <Text style={styles.bold}>Fade OUT + Negative Depth:</Text>{'\n'}
          Inverted modulation that fades away.
        </Text>
        <Text style={[styles.expandedText, { marginTop: 8 }]}>
          <Text style={styles.bold}>ONE mode + FADE:</Text>{'\n'}
          Creates envelope-like behavior - perfect for attack/decay shapes.
        </Text>
      </ExpandableSection>

      <View style={styles.relatedSection}>
        <Text style={styles.relatedTitle}>Related Concepts</Text>
        <Pressable
          onPress={() => router.push('/modes' as any)}
          style={styles.relatedLink}
        >
          <Text style={styles.relatedLinkText}>Trigger Modes → Use ONE + FADE for envelopes</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/waveforms' as any)}
          style={styles.relatedLink}
        >
          <Text style={styles.relatedLinkText}>Waveforms → See how shapes respond to inversion</Text>
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
  note: {
    color: '#888899',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  depthExamples: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  depthExample: {
    alignItems: 'center',
  },
  depthValue: {
    color: '#ff6600',
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  depthLabel: {
    color: '#888899',
    fontSize: 12,
    marginTop: 4,
  },
  comparisonBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  comparisonItem: {
    paddingVertical: 8,
  },
  comparisonLabel: {
    color: '#888899',
    fontSize: 13,
    marginBottom: 4,
  },
  comparisonValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  comparisonDivider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 4,
  },
  fadeExamples: {
    gap: 10,
    marginBottom: 12,
  },
  fadeExample: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  fadeIcon: {
    fontSize: 20,
    color: '#ff6600',
    width: 30,
    textAlign: 'center',
  },
  fadeInfo: {
    flex: 1,
  },
  fadeRange: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  fadeDesc: {
    color: '#888899',
    fontSize: 13,
    marginTop: 2,
  },
  warningBox: {
    backgroundColor: '#3a2a00',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#665500',
  },
  warningText: {
    color: '#ffaa00',
    fontSize: 13,
    lineHeight: 18,
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
