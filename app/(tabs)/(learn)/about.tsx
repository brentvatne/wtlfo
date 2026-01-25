import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function AboutScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Section title="What This App Does">
        <Text style={styles.paragraph}>
          This is an LFO simulator and visualizer for the Elektron Digitakt II. It helps you understand how LFO parameters interact before dialing them in on your hardware.
        </Text>
      </Section>

      <Section title="Limitations">
        <View style={styles.limitationsList}>
          <View style={styles.limitation}>
            <Text style={styles.limitationIcon}>!</Text>
            <View style={styles.limitationContent}>
              <Text style={styles.limitationTitle}>Limited MIDI sync</Text>
              <Text style={styles.limitationText}>
                Only supports receiving clock from Digitakt II. Cannot send or receive parameter values.
              </Text>
            </View>
          </View>

          <View style={styles.limitation}>
            <Text style={styles.limitationIcon}>!</Text>
            <View style={styles.limitationContent}>
              <Text style={styles.limitationTitle}>No custom presets</Text>
              <Text style={styles.limitationText}>
                Cannot save your own configurations. Only a few example presets are included.
              </Text>
            </View>
          </View>

          <View style={styles.limitation}>
            <Text style={styles.limitationIcon}>!</Text>
            <View style={styles.limitationContent}>
              <Text style={styles.limitationTitle}>Timing is approximate</Text>
              <Text style={styles.limitationText}>
                LFO timing won't match your device's exact position. Use this to understand behavior, not to preview in sync.
              </Text>
            </View>
          </View>

          <View style={styles.limitation}>
            <Text style={styles.limitationIcon}>!</Text>
            <View style={styles.limitationContent}>
              <Text style={styles.limitationTitle}>Limited audio simulation</Text>
              <Text style={styles.limitationText}>
                Test tone only supports a few destinations (Volume, Filter, Pan, Pitch). Uses a basic synthesizer, not actual Digitakt sounds.
              </Text>
            </View>
          </View>

          <View style={styles.limitation}>
            <Text style={styles.limitationIcon}>!</Text>
            <View style={styles.limitationContent}>
              <Text style={styles.limitationTitle}>Simplified destination list</Text>
              <Text style={styles.limitationText}>
                Not all destinations are listed. Filter params shown are for Multi-Mode filter only (Digitakt II's default).
              </Text>
            </View>
          </View>
        </View>
      </Section>

      <Section title="Accuracy">
        <Text style={styles.paragraph}>
          LFO calculations are based on the Elektron formula and verified against Digitakt II hardware. The visualizations accurately represent waveform shapes, timing relationships, and parameter interactions.
        </Text>
      </Section>

      <Section title="Test Tone">
        <Text style={styles.paragraph}>
          Tap the speaker icon on the main screen to hear the LFO modulating a test tone. Supported destinations are marked with a speaker icon in the destination picker.
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
  limitationsList: {
    gap: 12,
  },
  limitation: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  limitationIcon: {
    color: '#ffaa00',
    fontSize: 16,
    fontWeight: '700',
    width: 20,
    textAlign: 'center',
  },
  limitationContent: {
    flex: 1,
  },
  limitationTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  limitationText: {
    color: '#888899',
    fontSize: 13,
    lineHeight: 18,
  },
});
