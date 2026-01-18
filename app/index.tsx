import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable } from 'react-native';
import { useSharedValue, withRepeat, withTiming, useDerivedValue, Easing, cancelAnimation } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { LFOVisualizer, sampleWaveformWorklet, ELEKTRON_THEME } from '@/src/components/lfo';
import type { WaveformType, TriggerMode } from '@/src/components/lfo';

// Separate component to properly use hooks for each waveform preview
function WaveformPreview({ waveform, phase }: { waveform: WaveformType; phase: SharedValue<number> }) {
  const output = useDerivedValue(() => {
    'worklet';
    return sampleWaveformWorklet(waveform, phase.value);
  }, [waveform]);

  return (
    <View style={styles.waveformItem}>
      <Text style={styles.waveformLabel}>{waveform}</Text>
      <LFOVisualizer
        phase={phase}
        output={output}
        waveform={waveform}
        width={160}
        height={100}
        theme="dark"
        showParameters={false}
        showTiming={false}
        showOutput={false}
        strokeWidth={2}
      />
    </View>
  );
}

// LFO preset configurations based on Digitakt II presets
const PRESETS = [
  {
    name: 'Wobble Bass',
    waveform: 'SIN' as WaveformType,
    speed: 16,
    multiplier: 8,
    startPhase: 32,
    mode: 'TRG' as TriggerMode,
    depth: 48,
    fade: 0,
    cycleTimeMs: 2000,
    noteValue: '1 bar',
  },
  {
    name: 'Ambient Drift',
    waveform: 'SIN' as WaveformType,
    speed: 1,
    multiplier: 1,
    startPhase: 0,
    mode: 'FRE' as TriggerMode,
    depth: 24,
    fade: 0,
    cycleTimeMs: 256000,
    noteValue: '128 bars',
  },
  {
    name: 'Hi-Hat Humanizer',
    waveform: 'RND' as WaveformType,
    speed: 32,
    multiplier: 64,
    startPhase: 0,
    mode: 'FRE' as TriggerMode,
    depth: 12,
    fade: 0,
    cycleTimeMs: 125,
    noteValue: '1/16',
  },
  {
    name: 'Pumping Sidechain',
    waveform: 'EXP' as WaveformType,
    speed: 32,
    multiplier: 4,
    startPhase: 0,
    mode: 'TRG' as TriggerMode,
    depth: -63,
    fade: 0,
    cycleTimeMs: 2000,
    noteValue: '1 bar',
  },
  {
    name: 'Fade-In One-Shot',
    waveform: 'RMP' as WaveformType,
    speed: 8,
    multiplier: 16,
    startPhase: 0,
    mode: 'ONE' as TriggerMode,
    depth: 63,
    fade: -32,
    cycleTimeMs: 2000,
    noteValue: '1 bar',
  },
];

// All available waveforms for cycling through
const WAVEFORMS: WaveformType[] = ['TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'];

export default function Index() {
  const [activePreset, setActivePreset] = useState(0);
  const preset = PRESETS[activePreset];

  // Animated phase value
  const phase = useSharedValue(0);

  // Calculate derived output based on phase and waveform
  const output = useDerivedValue(() => {
    'worklet';
    return sampleWaveformWorklet(preset.waveform, phase.value);
  }, [preset.waveform]);

  // Animate phase based on preset cycle time
  useEffect(() => {
    // Reset phase
    phase.value = 0;

    // Calculate duration - cap at 5 seconds for demo purposes
    const duration = Math.min(preset.cycleTimeMs, 5000);

    // Start continuous animation
    phase.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.linear,
      }),
      -1, // infinite
      false // don't reverse
    );

    return () => {
      cancelAnimation(phase);
    };
  }, [activePreset, preset.cycleTimeMs, phase]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Main Visualizer with selected preset */}
      <View style={styles.visualizerContainer}>
        <LFOVisualizer
          phase={phase}
          output={output}
          waveform={preset.waveform}
          speed={preset.speed}
          multiplier={preset.multiplier}
          startPhase={preset.startPhase}
          mode={preset.mode}
          depth={preset.depth}
          fade={preset.fade}
          bpm={120}
          cycleTimeMs={preset.cycleTimeMs}
          noteValue={preset.noteValue}
          width={340}
          height={280}
          theme={ELEKTRON_THEME}
          showParameters={true}
          showTiming={true}
          showOutput={true}
          strokeWidth={2.5}
        />
      </View>

      {/* Preset Selector */}
      <Text style={styles.sectionTitle}>Presets</Text>
      <View style={styles.presetContainer}>
        {PRESETS.map((p, index) => (
          <Pressable
            key={p.name}
            style={[
              styles.presetButton,
              activePreset === index && styles.presetButtonActive,
            ]}
            onPress={() => setActivePreset(index)}
          >
            <Text
              style={[
                styles.presetButtonText,
                activePreset === index && styles.presetButtonTextActive,
              ]}
            >
              {p.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Waveform Gallery */}
      <Text style={styles.sectionTitle}>All Waveforms</Text>
      <View style={styles.waveformGrid}>
        {WAVEFORMS.map((waveform) => (
          <WaveformPreview key={waveform} waveform={waveform} phase={phase} />
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
    padding: 20,
  },
  visualizerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    marginTop: 8,
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333344',
  },
  presetButtonActive: {
    backgroundColor: '#ff6600',
    borderColor: '#ff6600',
  },
  presetButtonText: {
    color: '#888899',
    fontSize: 13,
    fontWeight: '600',
  },
  presetButtonTextActive: {
    color: '#ffffff',
  },
  waveformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  waveformItem: {
    alignItems: 'center',
  },
  waveformLabel: {
    color: '#888899',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
});
