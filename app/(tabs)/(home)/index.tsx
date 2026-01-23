import React, { useRef, useCallback, useEffect } from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useFocusEffect, usePathname } from 'expo-router';
import Animated, { useDerivedValue, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import {
  LFOVisualizer,
  ELEKTRON_THEME,
  SlowMotionBadge,
  useSlowMotionPhase,
  getSlowdownInfo,
  sampleWaveformWorklet,
  TimingInfo,
} from '@/src/components/lfo';
import type { WaveformType, TriggerMode } from '@/src/components/lfo';
import { ParamGrid } from '@/src/components/params';
import { DestinationMeter, CenterValueSlider } from '@/src/components/destination';
import { usePreset } from '@/src/context/preset-context';
import { useModulation } from '@/src/context/modulation-context';
import { getDestination } from '@/src/data/destinations';
import { colors } from '@/src/theme';

// Visualizer height and timing info height
const VISUALIZER_HEIGHT = 240;
const TIMING_HEIGHT = 40;
const METER_HEIGHT = VISUALIZER_HEIGHT - TIMING_HEIGHT; // Match canvas height

// Meter width - fixed
const METER_WIDTH = 52;

export default function HomeScreen() {
  const {
    currentConfig,
    effectiveBpm,
    isEditing,
    hideValuesWhileEditing,
    showFillsWhenEditing,
    fadeInOnOpen,
    fadeInDuration,
    editFadeOutDuration,
    editFadeInDuration,
    showFadeEnvelope,
    depthAnimationDuration,
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

  // Fade-in animation when tab is focused (but not when returning from modal)
  const visualizerOpacity = useSharedValue(fadeInOnOpen ? 0 : 1);
  const wasInModalRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const pathname = usePathname();

  // Track when we're in a modal (pathname changes to param/* or presets)
  useEffect(() => {
    if (pathname.includes('/param/') || pathname.includes('/presets')) {
      wasInModalRef.current = true;
    }
  }, [pathname]);

  useFocusEffect(
    useCallback(() => {
      // Skip fade-in if returning from a modal within the same stack
      if (wasInModalRef.current) {
        wasInModalRef.current = false;
        return;
      }

      if (fadeInOnOpen) {
        // Reset to transparent and fade in
        visualizerOpacity.value = 0;
        visualizerOpacity.value = withTiming(1, {
          duration: fadeInDuration,
          easing: Easing.out(Easing.ease),
        });
      } else {
        visualizerOpacity.value = 1;
      }
      hasInitializedRef.current = true;
    }, [fadeInOnOpen, fadeInDuration, visualizerOpacity])
  );

  const { activeDestinationId, getCenterValue, setCenterValue } = useModulation();
  const { width: screenWidth } = useWindowDimensions();

  // Get the active destination (null if 'none')
  const activeDestination = getDestination(activeDestinationId);
  const hasDestination = activeDestination !== null;

  // Calculate visualizer width - screen minus meter
  const visualizerWidth = screenWidth - METER_WIDTH;

  // Slow-motion preview for fast LFOs
  // Track previous factor for hysteresis calculations
  const previousFactorRef = useRef(1);
  const slowdownInfo = getSlowdownInfo(
    timingInfo.cycleTimeMs,
    previousFactorRef.current
  );
  previousFactorRef.current = slowdownInfo.factor;

  // Create slowed display phase using the fixed hook
  const displayPhase = useSlowMotionPhase(lfoPhase, slowdownInfo.factor);

  // Derive display output from display phase (for destination meter sync)
  const waveformForWorklet = currentConfig.waveform as WaveformType;
  // Pre-compute clamped depth scale (handles asymmetric range -64 to +63)
  const depthScaleForWorklet = Math.max(-1, Math.min(1, currentConfig.depth / 63));
  // Pre-compute fade parameters for worklet
  const fadeValue = currentConfig.fade;
  const modeValue = currentConfig.mode as TriggerMode;
  const startPhaseNormalized = currentConfig.startPhase / 128;
  const fadeApplies = fadeValue !== 0 && modeValue !== 'FRE';

  // Compute display fade multiplier based on slowed display phase
  // This ensures the meter's fade bounds match the slowed visualization
  const displayFadeMultiplier = useDerivedValue(() => {
    'worklet';
    if (!fadeApplies) return 1;

    // Calculate display phase (shifted for visualization)
    const displayPhaseNormalized = ((displayPhase.value - startPhaseNormalized) % 1 + 1) % 1;

    // Calculate fade envelope using same formula as PhaseIndicator
    const absFade = Math.abs(fadeValue);
    const fadeDuration = (64 - absFade) / 64;

    if (fadeValue < 0) {
      // Fade-in: envelope goes from 0 to 1 over fadeDuration
      return fadeDuration > 0 ? Math.min(1, displayPhaseNormalized / fadeDuration) : 1;
    } else {
      // Fade-out: envelope goes from 1 to 0 over fadeDuration
      return fadeDuration > 0 ? Math.max(0, 1 - displayPhaseNormalized / fadeDuration) : 0;
    }
  }, [fadeApplies, fadeValue, startPhaseNormalized]);

  const displayOutput = useDerivedValue(() => {
    'worklet';
    // Sample the waveform at the slowed display phase
    const rawOutput = sampleWaveformWorklet(waveformForWorklet, displayPhase.value);
    // Apply depth scaling
    return rawOutput * depthScaleForWorklet;
  }, [waveformForWorklet, depthScaleForWorklet]);

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
      contentContainerStyle={{ paddingBottom: 20 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* LFO Visualizer + Destination Meter Row */}
      <Animated.View style={[styles.visualizerRow, { opacity: visualizerOpacity }]}>
        {/* LFO Visualizer column - canvas is tappable, timing info is not */}
        <View style={styles.visualizerColumn}>
          <Pressable
            style={[styles.visualizerContainer, isPaused && styles.paused]}
            onPress={handleTap}
            accessibilityLabel={`LFO waveform visualizer, ${currentConfig.waveform} wave at ${timingInfo.noteValue}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isPaused }}
            accessibilityHint={isPaused ? 'Double tap to resume animation' : 'Double tap to pause animation'}
          >
            <View>
              <LFOVisualizer
                phase={displayPhase}
                output={lfoOutput}
                waveform={currentConfig.waveform as WaveformType}
                speed={currentConfig.speed}
                multiplier={currentConfig.multiplier}
                startPhase={currentConfig.startPhase}
                mode={currentConfig.mode as TriggerMode}
                depth={currentConfig.depth}
                fade={currentConfig.fade}
                bpm={effectiveBpm}
                cycleTimeMs={timingInfo.cycleTimeMs}
                noteValue={timingInfo.noteValue}
                steps={timingInfo.steps}
                width={visualizerWidth}
                height={METER_HEIGHT}
                theme={ELEKTRON_THEME}
                showParameters={false}
                showTiming={false}
                showOutput={false}
                isEditing={isEditing}
                hideValuesWhileEditing={hideValuesWhileEditing}
                showFillsWhenEditing={showFillsWhenEditing}
                editFadeOutDuration={editFadeOutDuration}
                editFadeInDuration={editFadeInDuration}
                strokeWidth={2.5}
                showFadeEnvelope={showFadeEnvelope}
                depthAnimationDuration={depthAnimationDuration}
              />
              <SlowMotionBadge
                factor={slowdownInfo.factor}
                visible={slowdownInfo.isSlowed}
              />
            </View>
          </Pressable>
          {/* Timing info outside pressable - tapping here won't pause */}
          <View style={[styles.timingContainer, { width: visualizerWidth }]}>
            <TimingInfo
              bpm={effectiveBpm}
              cycleTimeMs={timingInfo.cycleTimeMs}
              noteValue={timingInfo.noteValue}
              steps={timingInfo.steps}
              theme={ELEKTRON_THEME}
              phase={lfoPhase}
              startPhase={currentConfig.startPhase}
            />
          </View>
        </View>

        {/* Destination Meter - same height as canvas */}
        <Pressable
          style={styles.meterContainer}
          onPress={handleTap}
          accessibilityLabel={hasDestination
            ? `Destination meter for ${activeDestination?.name || 'parameter'}, center value ${getCenterValue(activeDestinationId)}`
            : 'Destination meter, no destination selected'}
          accessibilityRole="button"
          accessibilityState={{ selected: isPaused, disabled: !hasDestination }}
          accessibilityHint={isPaused ? 'Double tap to resume animation' : 'Double tap to pause animation'}
        >
          <DestinationMeter
            lfoOutput={displayOutput}
            destination={activeDestination}
            centerValue={hasDestination ? getCenterValue(activeDestinationId) : 64}
            depth={currentConfig.depth}
            fade={currentConfig.fade}
            mode={currentConfig.mode as TriggerMode}
            fadeMultiplier={displayFadeMultiplier}
            waveform={currentConfig.waveform as WaveformType}
            startPhase={currentConfig.startPhase}
            width={METER_WIDTH}
            height={METER_HEIGHT}
            showValue
            isEditing={isEditing}
            hideValuesWhileEditing={hideValuesWhileEditing}
            showFillsWhenEditing={showFillsWhenEditing}
            editFadeOutDuration={editFadeOutDuration}
            editFadeInDuration={editFadeInDuration}
            isPaused={isPaused}
          />
        </Pressable>
      </Animated.View>

      {/* Parameter Grid - Full width */}
      <View style={styles.gridContainer}>
        <Text style={styles.sectionHeading}>PARAMETERS</Text>
        <ParamGrid />
      </View>

      {/* Destination Info - always rendered to prevent layout shift */}
      <View style={[styles.destinationSection, !hasDestination && styles.destinationHidden]}>
        <Text style={styles.destinationName}>
          {hasDestination ? activeDestination.name : 'No Destination'}
        </Text>
        <CenterValueSlider
          value={hasDestination ? getCenterValue(activeDestinationId) : 64}
          onChange={(value) => hasDestination && setCenterValue(activeDestinationId, value)}
          min={activeDestination?.min ?? 0}
          max={activeDestination?.max ?? 127}
          label="Center Value"
          bipolar={activeDestination?.bipolar ?? false}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  visualizerRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
  },
  visualizerColumn: {
    flex: 1,
  },
  visualizerContainer: {
    // Canvas area only
  },
  timingContainer: {
    backgroundColor: '#000000',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  paused: {
    opacity: 0.5,
  },
  gridContainer: {
    // Full width
  },
  sectionHeading: {
    color: '#ff6600',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  meterContainer: {
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  destinationSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  destinationHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  destinationName: {
    color: '#ff6600',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
