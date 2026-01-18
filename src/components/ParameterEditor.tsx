import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Waveform, TriggerMode, Multiplier } from 'elektron-lfo';
import { SegmentedControl, ParameterSlider } from './controls';
import { usePreset } from '@/src/context/preset-context';

const WAVEFORMS: Waveform[] = ['TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'];
const MODES: TriggerMode[] = ['FRE', 'TRG', 'HLD', 'ONE', 'HLF'];
const MULTIPLIERS: Multiplier[] = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

function formatMultiplier(value: number): string {
  if (value >= 1024) {
    return `${value / 1024}k`;
  }
  return String(value);
}

export function ParameterEditor() {
  const { currentConfig, updateParameter } = usePreset();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Parameters</Text>

      <SegmentedControl
        label="Waveform"
        options={WAVEFORMS}
        value={currentConfig.waveform}
        onChange={(value) => updateParameter('waveform', value)}
      />

      <SegmentedControl
        label="Mode"
        options={MODES}
        value={currentConfig.mode}
        onChange={(value) => updateParameter('mode', value)}
      />

      <ParameterSlider
        label="Speed"
        min={-64}
        max={63}
        value={currentConfig.speed}
        onChange={(value) => updateParameter('speed', Math.round(value))}
        formatValue={(v) => (v >= 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
      />

      <SegmentedControl
        label="Multiplier"
        options={MULTIPLIERS}
        value={currentConfig.multiplier}
        onChange={(value) => updateParameter('multiplier', value)}
        formatOption={formatMultiplier}
      />

      <ParameterSlider
        label="Depth"
        min={-64}
        max={63}
        value={currentConfig.depth}
        onChange={(value) => updateParameter('depth', Math.round(value))}
        formatValue={(v) => (v >= 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
      />

      <ParameterSlider
        label="Fade"
        min={-64}
        max={63}
        value={currentConfig.fade}
        onChange={(value) => updateParameter('fade', Math.round(value))}
        formatValue={(v) => (v >= 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
      />

      <ParameterSlider
        label="Start Phase"
        min={0}
        max={127}
        value={currentConfig.startPhase}
        onChange={(value) => updateParameter('startPhase', Math.round(value))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
});
