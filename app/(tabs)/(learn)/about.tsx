import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SymbolView } from 'expo-symbols';

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
      <Section title="What this app does">
        <Text style={styles.paragraph}>
          This is an LFO simulator and visualizer for the Elektron Digitakt II. It helps you understand what happens when you adjust each parameter, so you can learn how LFOs work and eventually not need the app at all.
        </Text>
      </Section>

      <Section title="Accuracy">
        <Text style={styles.paragraph}>
          Verified against Digitakt II hardware. LFO behavior is the same across all Elektron devices. Most behavior seems correct, but this is likely not a 100% accurate simulation as there is limited information available about the exact behavior of parameters like fade.
        </Text>
      </Section>

      <Section title="Test tone">
        <Text style={styles.paragraph}>
          Tap the speaker icon on the main screen to hear the LFO modulating a test tone. Supported destinations are marked with a speaker icon in the destination picker.
        </Text>
      </Section>

      <Section title="Visualization controls">
        <Text style={styles.paragraph}>
          Tap or long press the visualization to pause. When paused, tap to resume.
        </Text>
      </Section>

      <Section title="Limitations">
        <View style={styles.limitationsList}>
          <View style={styles.limitation}>
            <View style={styles.limitationIconContainer}>
              <SymbolView name="cable.connector" size={18} tintColor="#888899" />
            </View>
            <View style={styles.limitationContent}>
              <Text style={styles.limitationTitle}>Limited MIDI sync</Text>
              <Text style={styles.limitationText}>
                Only supports receiving clock from Digitakt II. Cannot send or receive parameter values.
              </Text>
            </View>
          </View>

          <View style={styles.limitation}>
            <View style={styles.limitationIconContainer}>
              <SymbolView name="bookmark.slash" size={18} tintColor="#888899" />
            </View>
            <View style={styles.limitationContent}>
              <Text style={styles.limitationTitle}>No custom presets</Text>
              <Text style={styles.limitationText}>
                Cannot save your own configurations. Only a few example presets are included.
              </Text>
            </View>
          </View>

          <View style={styles.limitation}>
            <View style={styles.limitationIconContainer}>
              <SymbolView name="clock.badge.questionmark" size={18} tintColor="#888899" />
            </View>
            <View style={styles.limitationContent}>
              <Text style={styles.limitationTitle}>Timing is approximate</Text>
              <Text style={styles.limitationText}>
                LFO timing won't match your device's exact position—there's no way to sync the phase. Use this to understand behavior, not to preview in sync.
              </Text>
            </View>
          </View>

          <View style={styles.limitation}>
            <View style={styles.limitationIconContainer}>
              <SymbolView name="speaker.wave.1" size={18} tintColor="#888899" />
            </View>
            <View style={styles.limitationContent}>
              <Text style={styles.limitationTitle}>Limited audio simulation</Text>
              <Text style={styles.limitationText}>
                Test tone only supports a few destinations (Volume, Filter, Pan, Pitch). Uses a basic synthesizer, not actual Digitakt sounds.
              </Text>
            </View>
          </View>

          <View style={styles.limitation}>
            <View style={styles.limitationIconContainer}>
              <SymbolView name="list.bullet" size={18} tintColor="#888899" />
            </View>
            <View style={styles.limitationContent}>
              <Text style={styles.limitationTitle}>Simplified destination list</Text>
              <Text style={styles.limitationText}>
                Not all destinations are listed. Filter params shown are for Multi-Mode filter only (Digitakt II's default).
              </Text>
            </View>
          </View>
        </View>
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
  limitationIconContainer: {
    width: 24,
    alignItems: 'center',
    paddingTop: 2,
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
