import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Text, Pressable, useWindowDimensions } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { LFO } from 'elektron-lfo';
import { LFOVisualizer, ELEKTRON_THEME } from '@/src/components/lfo';
import type { WaveformType, TriggerMode } from '@/src/components/lfo';
import { QuickEditPanel } from '@/src/components/ParameterEditor';
import { ParamGrid } from '@/src/components/params';
import { usePreset } from '@/src/context/preset-context';

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
  const { currentConfig, bpm } = usePreset();
  const { width: screenWidth } = useWindowDimensions();

  // Calculate visualizer width to match ParamGrid (screen width minus padding)
  const visualizerWidth = screenWidth - 40; // 20px padding on each side

  // Collapsible section state
  const [waveformsExpanded, setWaveformsExpanded] = useState(false);

  // Manual pause state for tap-to-pause functionality
  const [isPaused, setIsPaused] = useState(false);

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

  // Create/recreate LFO when config changes
  useEffect(() => {
    lfoRef.current = new LFO(currentConfig, bpm);

    // Reset pause state when config changes
    setIsPaused(false);

    // Get timing info
    const info = lfoRef.current.getTimingInfo();
    setTimingInfo({
      cycleTimeMs: info.cycleTimeMs,
      noteValue: info.noteValue,
    });

    // Auto-trigger for modes that need it
    if (currentConfig.mode === 'TRG' || currentConfig.mode === 'ONE' || currentConfig.mode === 'HLF') {
      lfoRef.current.trigger();
    }
  }, [currentConfig, bpm]);

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

  // Tap handler - pause/play/restart logic
  const handleTap = () => {
    if (!lfoRef.current) return;

    const isRunning = lfoRef.current.isRunning();

    if (isPaused) {
      // Resume from manual pause
      lfoRef.current.start();
      setIsPaused(false);
    } else if (!isRunning) {
      // Stopped (ONE/HLF completed) - restart
      lfoRef.current.trigger();
    } else {
      // Currently running - pause it
      lfoRef.current.stop();
      setIsPaused(true);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0a0a0a' }}
      contentContainerStyle={{ padding: 20 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Parameter Grid - Elektron style */}
      <ParamGrid />

      {/* Main Visualizer - tap to pause/play/restart */}
      <Pressable style={{ marginTop: 8, marginBottom: 24 }} onPress={handleTap}>
        <LFOVisualizer
          phase={phase}
          output={output}
          waveform={currentConfig.waveform as WaveformType}
          speed={currentConfig.speed}
          multiplier={currentConfig.multiplier}
          startPhase={currentConfig.startPhase}
          mode={currentConfig.mode as TriggerMode}
          depth={currentConfig.depth}
          fade={currentConfig.fade}
          bpm={bpm}
          cycleTimeMs={timingInfo.cycleTimeMs}
          noteValue={timingInfo.noteValue}
          width={visualizerWidth}
          height={280}
          theme={ELEKTRON_THEME}
          showParameters={false}
          showTiming={true}
          showOutput={true}
          strokeWidth={2.5}
        />
      </Pressable>

      {/* Quick Edit Panel */}
      <QuickEditPanel />

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
              <WaveformPreview key={waveform} waveform={waveform} bpm={bpm} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
