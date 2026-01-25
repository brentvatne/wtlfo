import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaFrame } from 'react-native-safe-area-context';
import { LFOKnobDemo } from '@/src/components/learn/LFOKnobDemo';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BulletPoint({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export default function IntroScreen() {
  const { width: frameWidth } = useSafeAreaFrame();
  const demoWidth = frameWidth - 32;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.demoContainer}>
        <LFOKnobDemo width={demoWidth} height={140} />
        <Text style={styles.demoCaption}>LFO waveform automatically turns a knob</Text>
      </View>

      <Section title="The basics">
        <BulletPoint>LFO = Low Frequency Oscillator</BulletPoint>
        <BulletPoint>Automatically moves parameters over time</BulletPoint>
        <BulletPoint>Creates movement in your sounds: filter sweeps, tremolo, vibrato, panning</BulletPoint>
      </Section>

      <Section title="Digitakt II LFO architecture">
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Audio Tracks</Text>
            <Text style={styles.infoValue}>3 LFOs each (LFO1, LFO2, LFO3)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>MIDI Tracks</Text>
            <Text style={styles.infoValue}>2 LFOs each (LFO1, LFO2)</Text>
          </View>
        </View>
        <Text style={styles.note}>
          LFOs can modulate each other for complex movement (LFO3 → LFO2 → LFO1)
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
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    color: '#ff6600',
    fontSize: 15,
    marginRight: 8,
    marginTop: 1,
  },
  bulletText: {
    color: '#cccccc',
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  infoBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    gap: 8,
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
  note: {
    color: '#888899',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
  },
});
