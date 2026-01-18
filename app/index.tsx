import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { LFO, type Waveform, type TriggerMode } from 'elektron-lfo';
import { LFOVisualizer, ELEKTRON_THEME } from '@/src/components/lfo';
import type { WaveformType } from '@/src/components/lfo';

// LFO preset configurations based on Digitakt II presets
const PRESETS: Array<{
  name: string;
  config: Partial<LFOConfig>;
}> = [
  {
    name: 'Wobble Bass',
    config: {
      waveform: 'SIN',
      speed: 16,
      multiplier: 8,
      startPhase: 32,
      mode: 'TRG',
      depth: 48,
      fade: 0,
    },
  },
  {
    name: 'Ambient Drift',
    config: {
      waveform: 'SIN',
      speed: 1,
      multiplier: 1,
      startPhase: 0,
      mode: 'FRE',
      depth: 24,
      fade: 0,
    },
  },
  {
    name: 'Hi-Hat Humanizer',
    config: {
      waveform: 'RND',
      speed: 32,
      multiplier: 64,
      startPhase: 0,
      mode: 'FRE',
      depth: 12,
      fade: 0,
    },
  },
  {
    name: 'Pumping Sidechain',
    config: {
      waveform: 'EXP',
      speed: 32,
      multiplier: 4,
      startPhase: 0,
      mode: 'TRG',
      depth: -63,
      fade: 0,
    },
  },
  {
    name: 'Fade-In One-Shot',
    config: {
      waveform: 'RMP',
      speed: 8,
      multiplier: 16,
      startPhase: 0,
      mode: 'ONE',
      depth: 63,
      fade: -32,
    },
  },
];

// All available waveforms for the gallery
const WAVEFORMS: WaveformType[] = ['TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'];

const BPM = 120;

// Separate component for waveform preview in the gallery
function WaveformPreview({ waveform, bpm }: { waveform: WaveformType; bpm: number }) {
  const phase = useSharedValue(0);
  const output = useSharedValue(0);
  const lfoRef = useRef<LFO | null>(null);

  // Create LFO instance and start animation loop
  useEffect(() => {
    lfoRef.current = new LFO(
      {
        waveform: waveform as Waveform,
        speed: 16,
        multiplier: 8,
        mode: 'FRE',
        depth: 63,
        fade: 0,
      },
      bpm
    );

    let animationId: number;
    const animate = (timestamp: number) => {
      if (lfoRef.current) {
        const state = lfoRef.current.update(timestamp);
        phase.value = state.phase;
        output.value = state.output;
      }
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [waveform, bpm, phase, output]);

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

export default function Index() {
  const [activePreset, setActivePreset] = useState(0);
  const preset = PRESETS[activePreset];

  // Shared values for animation
  const phase = useSharedValue(0);
  const output = useSharedValue(0);


  // LFO instance ref
  const lfoRef = useRef<LFO | null>(null);

  // Timing info state
  const [timingInfo, setTimingInfo] = useState({
    cycleTimeMs: 0,
    noteValue: '',
  });

  // Animation frame ref for cleanup
  const animationRef = useRef<number>(0);

  // Create/recreate LFO when preset changes
  useEffect(() => {
    lfoRef.current = new LFO(preset.config, BPM);

    // Get timing info
    const info = lfoRef.current.getTimingInfo();
    setTimingInfo({
      cycleTimeMs: info.cycleTimeMs,
      noteValue: info.noteValue,
    });

    // Auto-trigger for modes that need it
    if (preset.config.mode === 'TRG' || preset.config.mode === 'ONE' || preset.config.mode === 'HLF') {
      lfoRef.current.trigger();
    }
  }, [activePreset, preset.config]);

  // Animation loop
  useEffect(() => {
    const animate = (timestamp: number) => {
      if (lfoRef.current) {
        const state = lfoRef.current.update(timestamp);
        phase.value = state.phase;
        output.value = state.output;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [phase, output]);

  // Trigger handler
  const handleTrigger = () => {
    if (lfoRef.current) {
      lfoRef.current.trigger();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Main Visualizer with selected preset */}
      <View style={styles.visualizerContainer}>
        <LFOVisualizer
          phase={phase}
          output={output}
          waveform={preset.config.waveform as WaveformType}
          speed={preset.config.speed}
          multiplier={preset.config.multiplier}
          startPhase={preset.config.startPhase}
          mode={preset.config.mode as TriggerMode}
          depth={preset.config.depth}
          fade={preset.config.fade}
          bpm={BPM}
          cycleTimeMs={timingInfo.cycleTimeMs}
          noteValue={timingInfo.noteValue}
          width={340}
          height={280}
          theme={ELEKTRON_THEME}
          showParameters={true}
          showTiming={true}
          showOutput={true}
          strokeWidth={2.5}
        />
      </View>

      {/* Trigger Button */}
      <View style={styles.triggerContainer}>
        <Pressable style={styles.triggerButton} onPress={handleTrigger}>
          <Text style={styles.triggerButtonText}>TRIGGER</Text>
        </Pressable>
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
          <WaveformPreview key={waveform} waveform={waveform} bpm={BPM} />
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
    marginBottom: 16,
  },
  triggerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  triggerButton: {
    backgroundColor: '#ff6600',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  triggerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
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
