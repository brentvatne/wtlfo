import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import type { Waveform, TriggerMode, Multiplier } from 'elektron-lfo';
import { SegmentedControl, ParameterSlider } from '@/src/components/controls';
import { usePreset } from '@/src/context/preset-context';

type ParamKey = 'waveform' | 'speed' | 'multiplier' | 'mode' | 'depth' | 'fade' | 'startPhase' | 'destination';

const WAVEFORMS: Waveform[] = ['TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'];
const MODES: TriggerMode[] = ['FRE', 'TRG', 'HLD', 'ONE', 'HLF'];
const MULTIPLIERS: Multiplier[] = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

interface ParamInfo {
  title: string;
  description: string;
  details?: string[];
}

const PARAM_INFO: Record<ParamKey, ParamInfo> = {
  waveform: {
    title: 'Waveform',
    description: 'The shape of the modulation over time. Each waveform creates a different character of movement.',
    details: [
      'TRI - Smooth triangle wave, classic vibrato',
      'SIN - Rounded sine wave, natural movement',
      'SQR - Instant on/off, rhythmic gating',
      'SAW - Rising ramp, building effects',
      'EXP - Accelerating curve (unipolar)',
      'RMP - Falling ramp (unipolar)',
      'RND - Random sample-and-hold',
    ],
  },
  speed: {
    title: 'Speed',
    description: 'Controls how fast the LFO cycles. Combined with Multiplier, this determines the cycle rate.',
    details: [
      'Range: -64 to +63',
      'Negative values run the waveform backward',
      'Product of |SPD| × MULT = cycles per bar',
    ],
  },
  multiplier: {
    title: 'Multiplier',
    description: 'Tempo multiplier that scales the LFO speed relative to project BPM.',
    details: [
      'Higher values = faster LFO',
      'BPM mode syncs to project tempo',
      '120 mode locks to fixed 120 BPM',
      'Product of 128 = exactly 1 bar per cycle',
    ],
  },
  mode: {
    title: 'Trigger Mode',
    description: 'Controls how the LFO responds to note triggers.',
    details: [
      'FRE - Free running, ignores triggers',
      'TRG - Restarts on each trigger',
      'HLD - Holds value on trigger',
      'ONE - One-shot, single cycle then stops',
      'HLF - Half cycle then stops',
    ],
  },
  depth: {
    title: 'Depth',
    description: 'Controls the intensity and polarity of the modulation.',
    details: [
      'Range: -64 to +63',
      '0 = no modulation output',
      'Negative values invert the waveform',
      '+63 = full positive modulation',
    ],
  },
  fade: {
    title: 'Fade',
    description: 'Gradually introduces or removes the modulation effect over time after a trigger.',
    details: [
      'Range: -64 to +63',
      'Negative = Fade IN (0 → full)',
      'Zero = No fade (immediate full)',
      'Positive = Fade OUT (full → 0)',
      'Note: Has no effect in FRE mode (requires trigger)',
    ],
  },
  startPhase: {
    title: 'Start Phase',
    description: 'Sets where in the waveform cycle the LFO begins when triggered.',
    details: [
      'Range: 0 to 127',
      '0 = Beginning (0°)',
      '32 = Quarter cycle (90°)',
      '64 = Middle (180°)',
      '96 = Three-quarters (270°)',
    ],
  },
  destination: {
    title: 'Destination',
    description: 'Where the LFO output is routed to modulate other parameters.',
    details: [
      'Coming soon in a future update',
      'Will allow routing to filter, pitch, amp, and more',
    ],
  },
};

function formatMultiplier(value: number): string {
  return value >= 1024 ? `${value / 1024}k` : String(value);
}

export default function EditParamScreen() {
  const { param } = useLocalSearchParams<{ param: ParamKey }>();
  const { currentConfig, updateParameter } = usePreset();

  if (!param || !(param in PARAM_INFO)) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Invalid parameter</Text>
      </View>
    );
  }

  const info = PARAM_INFO[param];

  const renderControl = () => {
    switch (param) {
      case 'waveform':
        return (
          <SegmentedControl
            label=""
            options={WAVEFORMS}
            value={currentConfig.waveform}
            onChange={(value) => updateParameter('waveform', value)}
          />
        );

      case 'mode':
        return (
          <SegmentedControl
            label=""
            options={MODES}
            value={currentConfig.mode}
            onChange={(value) => updateParameter('mode', value)}
          />
        );

      case 'multiplier':
        return (
          <View>
            <SegmentedControl
              label=""
              options={MULTIPLIERS}
              value={currentConfig.multiplier}
              onChange={(value) => updateParameter('multiplier', value)}
              formatOption={formatMultiplier}
            />
            <View style={styles.spacer} />
            <SegmentedControl
              label="Tempo Sync"
              options={['BPM', '120'] as const}
              value={currentConfig.useFixedBPM ? '120' : 'BPM'}
              onChange={(value) => updateParameter('useFixedBPM', value === '120')}
            />
          </View>
        );

      case 'speed':
        return (
          <ParameterSlider
            label=""
            min={-64}
            max={63}
            value={currentConfig.speed}
            onChange={(value) => updateParameter('speed', Math.round(value))}
            formatValue={(v) => (v >= 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
          />
        );

      case 'depth':
        return (
          <ParameterSlider
            label=""
            min={-64}
            max={63}
            value={currentConfig.depth}
            onChange={(value) => updateParameter('depth', Math.round(value))}
            formatValue={(v) => (v >= 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
          />
        );

      case 'fade':
        return (
          <View>
            {currentConfig.mode === 'FRE' && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>
                  Fade has no effect in FRE mode. Switch to TRG, ONE, HLD, or HLF to use fade.
                </Text>
              </View>
            )}
            <ParameterSlider
              label=""
              min={-64}
              max={63}
              value={currentConfig.fade}
              onChange={(value) => updateParameter('fade', Math.round(value))}
              formatValue={(v) => (v >= 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
            />
          </View>
        );

      case 'startPhase':
        return (
          <ParameterSlider
            label=""
            min={0}
            max={127}
            value={currentConfig.startPhase}
            onChange={(value) => updateParameter('startPhase', Math.round(value))}
          />
        );

      case 'destination':
        return (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>Coming soon</Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: info.title }} />
      <Text style={styles.description}>{info.description}</Text>

      <View style={styles.controlSection}>
        {renderControl()}
      </View>

      {info.details && (
        <View style={styles.detailsSection}>
          {info.details.map((detail, index) => (
            <Text key={index} style={styles.detailText}>• {detail}</Text>
          ))}
        </View>
      )}
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
    paddingTop: 12,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  description: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  controlSection: {
    marginBottom: 16,
  },
  spacer: {
    height: 16,
  },
  detailsSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
  },
  detailText: {
    color: '#888899',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 2,
  },
  placeholderContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  placeholderText: {
    color: '#555566',
    fontSize: 14,
  },
  warningBanner: {
    backgroundColor: '#3a2a00',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#665500',
  },
  warningText: {
    color: '#ffaa00',
    fontSize: 13,
    lineHeight: 18,
  },
});
