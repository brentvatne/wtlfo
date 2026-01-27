import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

type SymbolName = SymbolViewProps['name'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// Gesture control row component
function GestureRow({
  gesture,
  gestureIcon,
  result,
  resultIcon,
  note,
}: {
  gesture: string;
  gestureIcon: SymbolName;
  result: string;
  resultIcon: SymbolName;
  note?: string;
}) {
  return (
    <View style={styles.gestureRow}>
      <View style={styles.gestureLeft}>
        <SymbolView name={gestureIcon} size={20} tintColor="#888899" />
        <Text style={styles.gestureText}>{gesture}</Text>
      </View>
      <SymbolView name="arrow.right" size={14} tintColor="#555555" />
      <View style={styles.gestureRight}>
        <SymbolView name={resultIcon} size={20} tintColor="#ff6600" />
        <View>
          <Text style={styles.resultText}>{result}</Text>
          {note && <Text style={styles.gestureNote}>{note}</Text>}
        </View>
      </View>
    </View>
  );
}

// Test tone destination row
function DestinationRow({ name, icon }: { name: string; icon: SymbolName }) {
  return (
    <View style={styles.destinationRow}>
      <SymbolView name={icon} size={18} tintColor="#ff6600" />
      <Text style={styles.destinationText}>{name}</Text>
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
          Tap the speaker icon on the main screen to hear the LFO modulating a test tone.
        </Text>
        <View style={styles.destinationGrid}>
          <Text style={styles.destinationLabel}>Supported destinations:</Text>
          <View style={styles.destinationList}>
            <DestinationRow name="Volume" icon="speaker.wave.3.fill" />
            <DestinationRow name="Filter" icon="slider.horizontal.below.square.and.square.filled" />
            <DestinationRow name="Pan" icon="arrow.left.arrow.right" />
            <DestinationRow name="Pitch" icon="arrow.up.arrow.down" />
          </View>
        </View>
      </Section>

      <Section title="Visualization controls">
        <Text style={styles.paragraph}>
          Interact with the visualization to control playback:
        </Text>
        <View style={styles.gestureList}>
          <GestureRow
            gesture="Tap"
            gestureIcon="hand.tap.fill"
            result="Retrigger"
            resultIcon="dot.radiowaves.right"
            note="Reset to start phase"
          />
          <GestureRow
            gesture="Long press"
            gestureIcon="hand.tap.fill"
            result="Pause"
            resultIcon="pause.fill"
          />
          <GestureRow
            gesture="Tap"
            gestureIcon="hand.tap.fill"
            result="Resume"
            resultIcon="play.fill"
            note="When paused"
          />
        </View>
        <Text style={styles.noteText}>
          Note: Retrigger is disabled in FREE mode since the LFO runs continuously without triggers.
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
  // Gesture controls styles
  gestureList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginTop: 12,
    overflow: 'hidden',
  },
  gestureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a2a',
  },
  gestureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 100,
  },
  gestureText: {
    color: '#888899',
    fontSize: 14,
    fontWeight: '500',
  },
  gestureRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  resultText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  gestureNote: {
    color: '#666677',
    fontSize: 11,
    marginTop: 1,
  },
  noteText: {
    color: '#666677',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    fontStyle: 'italic',
  },
  // Test tone destination styles
  destinationGrid: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  destinationLabel: {
    color: '#888899',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  destinationList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#252525',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  destinationText: {
    color: '#cccccc',
    fontSize: 13,
    fontWeight: '500',
  },
  // Limitations styles
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
