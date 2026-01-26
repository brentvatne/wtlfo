import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaFrame } from 'react-native-safe-area-context';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { TimingDemo } from '@/src/components/learn/TimingDemo';

function SawtoothIcon({ reversed = false, size = 28 }: { reversed?: boolean; size?: number }) {
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    const pad = 3;
    const w = size - pad * 2;
    const h = size - pad * 2;

    if (reversed) {
      // Rising ramp: starts low, rises, then resets
      p.moveTo(pad, pad + h);
      p.lineTo(pad + w * 0.7, pad);
      p.moveTo(pad + w * 0.7, pad + h);
      p.lineTo(pad + w, pad + h * 0.3);
    } else {
      // Falling ramp: starts high, falls, then resets
      p.moveTo(pad, pad);
      p.lineTo(pad + w * 0.7, pad + h);
      p.moveTo(pad + w * 0.7, pad);
      p.lineTo(pad + w, pad + h * 0.7);
    }
    return p;
  }, [size, reversed]);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={path}
        color="#ff6600"
        style="stroke"
        strokeWidth={2}
        strokeCap="round"
        strokeJoin="round"
      />
    </Canvas>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function TimingScreen() {
  const { width: frameWidth } = useSafeAreaFrame();
  const demoWidth = frameWidth - 32;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.demoContainer}>
        <TimingDemo width={demoWidth} height={160} />
        <Text style={styles.demoCaption}>
          Higher SPD × MULT = faster cycles. The orange wave completes 8× faster than the blue wave.
        </Text>
      </View>

      <Section title="SPD (Speed)">
        <Text style={styles.paragraph}>
          Positive = forward, negative = backward, zero = frozen. Fine-grained control over cycle time.
        </Text>
      </Section>

      <Section title="MULT (multiplier)">
        <Text style={styles.paragraph}>
          Doubles or halves the speed in big steps. BPM mode syncs to tempo, 120 mode locks to 120 BPM.
        </Text>
      </Section>

      <Section title="Why two parameters?">
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>MULT</Text> = coarse control. Jump between musical divisions (1 bar, 1/2 note, 1/4 note).
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>SPD</Text> = fine control + extras. Precise adjustment, plus reverse direction (negative) or freeze (zero).
        </Text>
      </Section>

      <Section title="The formula">
        <View style={styles.formulaBox}>
          <Text style={styles.formula}>|SPD| × MULT = Product</Text>
          <Text style={styles.formulaNote}>Product of 128 = 1 bar per cycle</Text>
        </View>
      </Section>

      <Section title="Negative speed">
        <Text style={styles.paragraph}>
          When speed is negative, the LFO runs backward through the waveform cycle.
        </Text>
        <View style={styles.waveformExamples}>
          <View style={styles.waveformExample}>
            <SawtoothIcon />
            <View style={styles.waveformExampleText}>
              <Text style={styles.bold}>SAW with positive speed</Text>
              <Text style={styles.waveformDesc}>Falling ramp (decays)</Text>
            </View>
          </View>
          <View style={styles.waveformExample}>
            <SawtoothIcon reversed />
            <View style={styles.waveformExampleText}>
              <Text style={styles.bold}>SAW with negative speed</Text>
              <Text style={styles.waveformDesc}>Rising ramp (builds up)</Text>
            </View>
          </View>
        </View>
        <Text style={[styles.paragraph, { marginTop: 12, color: '#888899' }]}>
          This is different from negative depth, which inverts the output but keeps the direction the same.
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
  waveformExamples: {
    marginTop: 12,
    gap: 10,
  },
  waveformExample: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 10,
  },
  waveformExampleText: {
    flex: 1,
  },
  waveformDesc: {
    color: '#888899',
    fontSize: 13,
    marginTop: 2,
  },
});
