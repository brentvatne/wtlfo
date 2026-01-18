import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Text, Pressable } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { LFO } from 'elektron-lfo';
import { LFOVisualizer, ELEKTRON_THEME } from '@/src/components/lfo';
import type { WaveformType, TriggerMode } from '@/src/components/lfo';
import { usePreset } from '@/src/context/preset-context';
import { BPM } from '@/src/data/presets';

// All available waveforms for the gallery
const WAVEFORMS: WaveformType[] = ['TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'];

// Separate component for waveform preview in the gallery
function WaveformPreview({ waveform, bpm }: { waveform: WaveformType; bpm: number }) {
  const phase = useSharedValue(0);
  const output = useSharedValue(0);
  const lfoRef = useRef<LFO | null>(null);

  useEffect(() => {
    lfoRef.current = new LFO(
      {
        waveform: waveform,
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
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: '#888899', fontSize: 12, fontWeight: '600', marginBottom: 4 }}>
        {waveform}
      </Text>
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

export default function HomeScreen() {
  const { preset, activePreset } = usePreset();

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
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0a0a0a' }}
      contentContainerStyle={{ padding: 20 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Current Preset Name */}
      <Text style={{ color: '#888899', fontSize: 14, textAlign: 'center', marginBottom: 8 }}>
        {preset.name}
      </Text>

      {/* Main Visualizer with selected preset */}
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
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
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Pressable
          style={{
            backgroundColor: '#ff6600',
            paddingHorizontal: 32,
            paddingVertical: 12,
            borderRadius: 8,
          }}
          onPress={handleTrigger}
        >
          <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>
            TRIGGER
          </Text>
        </Pressable>
      </View>

      {/* Waveform Gallery */}
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 12, marginTop: 8 }}>
        All Waveforms
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        {WAVEFORMS.map((waveform) => (
          <WaveformPreview key={waveform} waveform={waveform} bpm={BPM} />
        ))}
      </View>
    </ScrollView>
  );
}
