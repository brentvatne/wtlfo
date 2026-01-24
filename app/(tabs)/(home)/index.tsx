import React, { useRef, useCallback, useEffect } from 'react';
import { View, Pressable, Text, StyleSheet, useWindowDimensions, AppState } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { usePathname } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import Animated, { useDerivedValue, useSharedValue, useAnimatedReaction, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import {
  LFOVisualizer,
  ELEKTRON_THEME,
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
    fadeInVisualization,
    fadeInDuration,
    tabSwitchFadeOpacity,
    visualizationFadeDuration,
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

  // Tab switch fade - wraps entire screen content
  // Start at 1 (visible) - useFocusEffect will handle the initial fade if needed
  const screenOpacity = useSharedValue(1);
  // Visualization fade - wraps just the visualizer row
  const visualizerOpacity = useSharedValue(fadeInVisualization ? 0 : 1);

  const wasInModalRef = useRef(false);
  const isFirstFocusRef = useRef(true);
  const pathname = usePathname();
  const navigation = useNavigation();

  // Track when we're in a modal (pathname changes to param/* or presets)
  useEffect(() => {
    if (pathname.includes('/param/') || pathname.includes('/presets')) {
      wasInModalRef.current = true;
    }
  }, [pathname]);

  // Tab switch fade - listen to the parent tabs navigator for focus events
  // useFocusEffect doesn't work reliably with NativeTabs when inside a nested Stack
  useEffect(() => {
    // Get the parent navigation (NativeTabs) from the Stack navigator
    const tabsNavigation = navigation.getParent();
    if (!tabsNavigation) return;

    const unsubscribe = tabsNavigation.addListener('focus', () => {
      // Skip fade-in if returning from a modal within the same stack
      if (wasInModalRef.current) {
        wasInModalRef.current = false;
        return;
      }

      // Skip fade on first focus (app launch) - let visualization fade handle that
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }

      // Tab switch: fade in entire screen
      if (fadeInOnOpen) {
        screenOpacity.value = tabSwitchFadeOpacity;
        screenOpacity.value = withTiming(1, {
          duration: fadeInDuration,
          easing: Easing.out(Easing.ease),
        });
      } else {
        screenOpacity.value = 1;
      }
    });

    return unsubscribe;
  }, [navigation, fadeInOnOpen, fadeInDuration, tabSwitchFadeOpacity, screenOpacity]);

  // Visualization fade - triggers on app open and returning from background
  const appStateRef = useRef(AppState.currentState);
  const hasInitializedVisualization = useRef(false);

  useEffect(() => {
    // Initial fade-in on app open
    if (!hasInitializedVisualization.current && fadeInVisualization) {
      visualizerOpacity.value = 0;
      visualizerOpacity.value = withTiming(1, {
        duration: visualizationFadeDuration,
        easing: Easing.out(Easing.ease),
      });
      hasInitializedVisualization.current = true;
    } else if (!fadeInVisualization) {
      visualizerOpacity.value = 1;
      hasInitializedVisualization.current = true;
    }
  }, [fadeInVisualization, visualizationFadeDuration, visualizerOpacity]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasActive = appStateRef.current === 'active';
      const isNowActive = nextAppState === 'active';
      const isGoingToBackground = wasActive && (nextAppState === 'background' || nextAppState === 'inactive');
      const isComingFromBackground =
        (appStateRef.current === 'background' || appStateRef.current === 'inactive') && isNowActive;

      // Going to background: immediately hide content (no time for animations)
      // LFO pause is handled by preset-context
      if (isGoingToBackground) {
        // Set values synchronously - app suspension gives no time for animations
        if (fadeInVisualization) {
          visualizerOpacity.value = 0;
        }
        if (fadeInOnOpen) {
          screenOpacity.value = tabSwitchFadeOpacity;
        }
      }

      // Coming back from background: fade screen and visualization back in
      // LFO resume is handled by preset-context
      if (isComingFromBackground) {
        // Fade screen back in
        if (fadeInOnOpen) {
          screenOpacity.value = withTiming(1, {
            duration: fadeInDuration,
            easing: Easing.out(Easing.ease),
          });
        }

        // Visualization fade-in (hides any position discontinuity)
        if (fadeInVisualization) {
          visualizerOpacity.value = 0;
          visualizerOpacity.value = withTiming(1, {
            duration: visualizationFadeDuration,
            easing: Easing.out(Easing.ease),
          });
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [
    fadeInVisualization,
    visualizationFadeDuration,
    visualizerOpacity,
    fadeInOnOpen,
    fadeInDuration,
    tabSwitchFadeOpacity,
    screenOpacity,
  ]);

  const { activeDestinationId, getCenterValue, setCenterValue } = useModulation();
  const { width: screenWidth } = useWindowDimensions();

  // Get the active destination (null if 'none')
  const activeDestination = getDestination(activeDestinationId);
  const hasDestination = activeDestination !== null;

  // Calculate visualizer width - screen minus meter
  const visualizerWidth = screenWidth - METER_WIDTH;

  // Create local phase SharedValue that tracks the context's lfoPhase
  // This ensures Skia properly reacts to phase changes from the context
  // Initialize with 0, useAnimatedReaction will set the correct value immediately
  const displayPhase = useSharedValue(0);
  useAnimatedReaction(
    () => lfoPhase.value,
    (currentPhase) => {
      'worklet';
      displayPhase.value = currentPhase;
    },
    []
  );

  // Animated styles for fade effects
  const screenFadeStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const visualizerFadeStyle = useAnimatedStyle(() => ({
    opacity: visualizerOpacity.value,
  }));

  // Derive display output from phase (for destination meter sync)
  const waveformForWorklet = currentConfig.waveform as WaveformType;
  // Pre-compute clamped depth scale (handles asymmetric range -64 to +63)
  const depthScaleForWorklet = Math.max(-1, Math.min(1, currentConfig.depth / 63));
  // Pre-compute fade parameters for worklet
  const fadeValue = currentConfig.fade;
  const modeValue = currentConfig.mode as TriggerMode;
  const startPhaseNormalized = currentConfig.startPhase / 128;
  const fadeApplies = fadeValue !== 0 && modeValue !== 'FRE';

  // Compute fade multiplier based on current phase
  const displayFadeMultiplier = useDerivedValue(() => {
    'worklet';
    if (!fadeApplies) return 1;

    // Calculate phase (shifted for visualization)
    const phaseNormalized = ((displayPhase.value - startPhaseNormalized) % 1 + 1) % 1;

    // Calculate fade envelope using same formula as PhaseIndicator
    const absFade = Math.abs(fadeValue);
    const fadeDuration = (64 - absFade) / 64;

    if (fadeValue < 0) {
      // Fade-in: envelope goes from 0 to 1 over fadeDuration
      return fadeDuration > 0 ? Math.min(1, phaseNormalized / fadeDuration) : 1;
    } else {
      // Fade-out: envelope goes from 1 to 0 over fadeDuration
      return fadeDuration > 0 ? Math.max(0, 1 - phaseNormalized / fadeDuration) : 0;
    }
  }, [fadeApplies, fadeValue, startPhaseNormalized, displayPhase]);

  const displayOutput = useDerivedValue(() => {
    'worklet';
    // Sample the waveform at current phase
    const rawOutput = sampleWaveformWorklet(waveformForWorklet, displayPhase.value);
    // Apply depth scaling
    return rawOutput * depthScaleForWorklet;
  }, [waveformForWorklet, depthScaleForWorklet, displayPhase]);

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
      <Animated.View style={screenFadeStyle}>
        {/* LFO Visualizer + Destination Meter Row */}
        <Animated.View style={[styles.visualizerRow, visualizerFadeStyle]}>
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
      </Animated.View>
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
