import React from 'react';
import { ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { LFOVisualizer, ELEKTRON_THEME } from '@/src/components/lfo';
import type { WaveformType, TriggerMode } from '@/src/components/lfo';
import { ParamGrid } from '@/src/components/params';
import { usePreset } from '@/src/context/preset-context';
import { colors } from '@/src/theme';

export default function HomeScreen() {
  // TODO: Remove this test throw after verifying ErrorBoundary works
  // throw new Error('Test error to verify ErrorBoundary is working');

  const {
    currentConfig,
    bpm,
    isEditing,
    lfoPhase,
    lfoOutput,
    timingInfo,
    triggerLFO,
    startLFO,
    stopLFO,
    isLFORunning,
    isPaused,
    setIsPaused,
  } = usePreset();
  const { width: screenWidth } = useWindowDimensions();

  // Calculate visualizer width to match ParamGrid (screen width minus padding)
  const visualizerWidth = screenWidth - 40; // 20px padding on each side

  // Tap handler - pause/play/restart logic
  const handleTap = () => {
    if (isPaused) {
      // Resume from manual pause
      startLFO();
      setIsPaused(false);
    } else if (!isLFORunning()) {
      // Stopped (ONE/HLF completed) - restart
      triggerLFO();
    } else {
      // Currently running - pause it
      stopLFO();
      setIsPaused(true);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Main Visualizer - tap to pause/play/restart */}
      <Pressable style={{ marginBottom: 16, opacity: isPaused ? 0.5 : 1 }} onPress={handleTap}>
        <LFOVisualizer
          phase={lfoPhase}
          output={lfoOutput}
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
          isEditing={isEditing}
          strokeWidth={2.5}
        />
      </Pressable>

      {/* Parameter Grid - Elektron style */}
      <ParamGrid />
    </ScrollView>
  );
}
