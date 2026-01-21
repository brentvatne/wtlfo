import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface Parameter {
  icon: string;
  name: string;
  label: string;
  description: string;
  details: string;
  learnMore?: { title: string; route: string };
}

const PARAMETERS: Parameter[] = [
  {
    icon: '~',
    name: 'WAVE',
    label: 'Waveform',
    description: 'Shape of the modulation curve',
    details: '7 waveforms available: TRI, SIN, SQR, SAW, EXP, RMP, RND. Each creates a different character of movement.',
    learnMore: { title: 'Waveforms', route: '/waveforms' },
  },
  {
    icon: '>',
    name: 'SPD',
    label: 'Speed',
    description: 'How fast the LFO cycles',
    details: 'Range: -64 to +63. Negative values run the waveform backward. Works with MULT to determine cycle rate.',
    learnMore: { title: 'Speed & Timing', route: '/speed' },
  },
  {
    icon: 'x',
    name: 'MULT',
    label: 'Multiplier',
    description: 'Tempo-synced speed multiplier',
    details: 'Powers of 2: 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1k, 2k. Multiplies the speed relative to project tempo. Higher values = faster LFO.',
    learnMore: { title: 'Speed & Timing', route: '/speed' },
  },
  {
    icon: 'O',
    name: 'SPH',
    label: 'Start Phase',
    description: 'Where in the cycle to start',
    details: 'Range: 0 to 127. Sets the starting point when LFO is triggered. 0=0°, 32=90°, 64=180°, 96=270°.',
  },
  {
    icon: 'M',
    name: 'MODE',
    label: 'Trigger Mode',
    description: 'How triggers affect the LFO',
    details: '5 modes: FRE (free running), TRG (restart), HLD (hold), ONE (one-shot), HLF (half cycle).',
    learnMore: { title: 'Trigger Modes', route: '/modes' },
  },
  {
    icon: '+',
    name: 'DEP',
    label: 'Depth',
    description: 'Intensity and direction of modulation',
    details: 'Range: -64 to +63. Controls how much the LFO affects the destination. Negative inverts the waveform.',
    learnMore: { title: 'Depth & Fade', route: '/depth' },
  },
  {
    icon: '/',
    name: 'FADE',
    label: 'Fade',
    description: 'Gradual intro or outro of effect',
    details: 'Range: -64 to +63. Negative = fade in, positive = fade out. Zero = immediate full effect.',
    learnMore: { title: 'Depth & Fade', route: '/depth' },
  },
];

function ParameterRow({ param, isExpanded, onToggle }: { param: Parameter; isExpanded: boolean; onToggle: () => void }) {
  const router = useRouter();

  return (
    <View style={styles.paramContainer}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.paramRow, pressed && styles.paramRowPressed]}
      >
        <View style={styles.paramIcon}>
          <Text style={styles.paramIconText}>{param.icon}</Text>
        </View>
        <View style={styles.paramContent}>
          <View style={styles.paramHeader}>
            <Text style={styles.paramName}>{param.name}</Text>
            <Text style={styles.paramLabel}>{param.label}</Text>
          </View>
          <Text style={styles.paramDescription}>{param.description}</Text>
        </View>
        <Text style={styles.expandIcon}>{isExpanded ? '−' : '+'}</Text>
      </Pressable>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.detailsText}>{param.details}</Text>
          {param.learnMore && (
            <Pressable
              onPress={() => router.push(param.learnMore!.route as any)}
              style={styles.learnMoreButton}
            >
              <Text style={styles.learnMoreText}>Learn more: {param.learnMore.title} →</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export default function ParametersScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.header}>
        Every Elektron LFO has the same 7 parameters. Tap any row to learn more.
      </Text>

      <View style={styles.paramList}>
        {PARAMETERS.map((param) => (
          <ParameterRow
            key={param.name}
            param={param}
            isExpanded={expandedId === param.name}
            onToggle={() => setExpandedId(expandedId === param.name ? null : param.name)}
          />
        ))}
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
  header: {
    color: '#888899',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  paramList: {
    gap: 8,
  },
  paramContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    overflow: 'hidden',
  },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  paramRowPressed: {
    backgroundColor: '#222222',
  },
  paramIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paramIconText: {
    color: '#ff6600',
    fontSize: 16,
    fontWeight: '700',
  },
  paramContent: {
    flex: 1,
  },
  paramHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  paramName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  paramLabel: {
    color: '#8888a0',
    fontSize: 13,
  },
  paramDescription: {
    color: '#888899',
    fontSize: 13,
  },
  expandIcon: {
    color: '#555566',
    fontSize: 18,
    fontWeight: '500',
  },
  expandedContent: {
    padding: 12,
    paddingTop: 0,
    marginLeft: 48,
  },
  detailsText: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 20,
  },
  learnMoreButton: {
    marginTop: 10,
  },
  learnMoreText: {
    color: '#ff6600',
    fontSize: 14,
    fontWeight: '500',
  },
});
