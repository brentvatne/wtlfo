import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaFrame } from 'react-native-safe-area-context';
import { DepthKnobDemo } from '@/src/components/learn/DepthKnobDemo';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function DepthScreen() {
  const { width: frameWidth } = useSafeAreaFrame();
  const demoWidth = frameWidth - 32;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.demoContainer}>
        <DepthKnobDemo width={demoWidth} height={200} />
        <Text style={styles.demoCaption}>
          Depth controls how far the parameter moves. Same LFO, different ranges.
        </Text>
      </View>

      <Section title="DEP (Depth)">
        <Text style={styles.paragraph}>
          Controls the intensity of modulation. Higher depth = larger parameter swings.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Negative depth</Text> inverts the waveform direction while keeping the same intensity.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Zero</Text> disables the LFO output entirely.
        </Text>
      </Section>

      <Section title="Depth & center value">
        <Text style={styles.paragraph}>
          The LFO moves the parameter above and below the <Text style={styles.bold}>center value</Text> you set. Depth determines how far it travels in each direction.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Bipolar waveforms</Text> (SIN, TRI, SQR, SAW) swing both above and below the center value.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Unipolar waveforms</Text> (EXP, RMP) only move in one direction from the center—useful for envelopes or one-sided modulation.
        </Text>
      </Section>

      <Section title="FADE parameter">
        <Text style={styles.paragraph}>
          Fade gradually brings the depth in or out over time after a trigger.
        </Text>
        <View style={styles.fadeOptions}>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Negative:</Text> Fade IN (silent → full)
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Zero:</Text> No fade (immediate)
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Positive:</Text> Fade OUT (full → silent)
          </Text>
        </View>
        <Text style={[styles.paragraph, { color: '#888899' }]}>
          Higher absolute values = slower fade (more cycles to complete). Only works in trigger modes.
        </Text>
      </Section>
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
  demoContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  demoCaption: {
    color: '#888899',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
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
    marginBottom: 8,
  },
  bold: {
    fontWeight: '600',
    color: '#ffffff',
  },
  fadeOptions: {
    gap: 0,
  },
});
