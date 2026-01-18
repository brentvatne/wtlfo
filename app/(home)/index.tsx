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
        width={145}
        height={90}
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

  // Collapsible section state
  const [waveformsExpanded, setWaveformsExpanded] = useState(false);

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
      {/* Main Visualizer - tap to trigger */}
      <Pressable style={{ alignItems: 'center', marginBottom: 24 }} onPress={handleTrigger}>
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
      </Pressable>

      {/* Waveform Gallery - Collapsible */}
      <View
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: 12,
          marginTop: 8,
          overflow: 'hidden',
        }}
      >
        <Pressable
          onPress={() => setWaveformsExpanded(!waveformsExpanded)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#ffffff' }}>
            All Waveforms
          </Text>
          <Text style={{ fontSize: 16, color: '#888899' }}>
            {waveformsExpanded ? '▼' : '▶'}
          </Text>
        </Pressable>
        {waveformsExpanded && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 16 }}>
            {WAVEFORMS.map((waveform) => (
              <WaveformPreview key={waveform} waveform={waveform} bpm={BPM} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
