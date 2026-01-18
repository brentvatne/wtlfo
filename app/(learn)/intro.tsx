import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

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

function RelatedLink({ title, description, route }: { title: string; description: string; route: string }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(route as any)}
      style={({ pressed }) => [styles.relatedLink, pressed && styles.relatedLinkPressed]}
    >
      <View style={styles.relatedLinkContent}>
        <Text style={styles.relatedLinkTitle}>{title}</Text>
        <Text style={styles.relatedLinkDescription}>{description}</Text>
      </View>
      <Text style={styles.relatedLinkChevron}>›</Text>
    </Pressable>
  );
}

export default function IntroScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Section title="The Basics">
        <BulletPoint>LFO = Low Frequency Oscillator</BulletPoint>
        <BulletPoint>An invisible hand that automatically moves parameters over time</BulletPoint>
        <BulletPoint>Oscillates (cycles back and forth) at frequencies too slow to hear</BulletPoint>
        <BulletPoint>Creates movement, rhythm, and evolution in your sounds</BulletPoint>
      </Section>

      <Section title="What Can LFOs Do?">
        <BulletPoint>Sweeping filter effects (wah-wah)</BulletPoint>
        <BulletPoint>Tremolo and volume pumping</BulletPoint>
        <BulletPoint>Vibrato and pitch wobble</BulletPoint>
        <BulletPoint>Stereo movement and panning</BulletPoint>
        <BulletPoint>Evolving textures and atmospheres</BulletPoint>
      </Section>

      <Section title="Digitakt II LFO Architecture">
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

      <View style={styles.relatedSection}>
        <Text style={styles.relatedTitle}>Related Concepts</Text>
        <RelatedLink
          title="The 7 Parameters"
          description="Learn what each control does"
          route="/parameters"
        />
        <RelatedLink
          title="Modulation Destinations"
          description="See where LFOs can go"
          route="/destinations"
        />
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
  relatedSection: {
    marginTop: 16,
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
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  relatedLinkPressed: {
    backgroundColor: '#252525',
  },
  relatedLinkContent: {
    flex: 1,
  },
  relatedLinkTitle: {
    color: '#ff6600',
    fontSize: 15,
    fontWeight: '600',
  },
  relatedLinkDescription: {
    color: '#888899',
    fontSize: 13,
    marginTop: 2,
  },
  relatedLinkChevron: {
    color: '#555566',
    fontSize: 20,
  },
});
