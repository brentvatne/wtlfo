import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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

export function QuickEditPanel() {
  const { currentConfig, updateParameter } = usePreset();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={styles.header}
      >
        <Text style={styles.title}>Quick Edit</Text>
        <Text style={styles.chevron}>{expanded ? '▼' : '▶'}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.content}>
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
            max={63.99}
            step={0.01}
            value={currentConfig.speed}
            onChange={(value) => updateParameter('speed', value)}
            formatValue={(v) => (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2))}
          />

          <SegmentedControl
            label="Multiplier"
            options={MULTIPLIERS}
            value={currentConfig.multiplier}
            onChange={(value) => updateParameter('multiplier', value)}
            formatOption={formatMultiplier}
          />

          <SegmentedControl
            label="Tempo Sync"
            options={['BPM', '120'] as const}
            value={currentConfig.useFixedBPM ? '120' : 'BPM'}
            onChange={(value) => updateParameter('useFixedBPM', value === '120')}
          />

          <ParameterSlider
            label="Depth"
            min={-128}
            max={127.98}
            step={0.02}
            value={currentConfig.depth * 2}
            onChange={(value) => updateParameter('depth', value / 2)}
            formatValue={(v) => (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2))}
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
      )}
    </View>
  );
}

// Keep the old export name for backwards compatibility
export const ParameterEditor = QuickEditPanel;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  chevron: {
    fontSize: 16,
    color: '#888899',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
