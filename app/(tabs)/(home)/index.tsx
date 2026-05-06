import { TestTone } from '@/src/components/audio';
import { CenterValueSlider, DestinationMeter } from '@/src/components/destination';
import type { TriggerMode, WaveformType } from '@/src/components/lfo';
import {
  ELEKTRON_THEME,
  isUnipolarWorklet,
  LFOVisualizer,
  sampleWaveformWorklet,
  TimingInfo,
  warmPathCache,
  WAVEFORM_ICON_SIZES,
} from '@/src/components/lfo';
import { ParamGrid } from '@/src/components/params';
import { useModulation } from '@/src/context/modulation-context';
import { usePreset } from '@/src/context/preset-context';
import { getDestination } from '@/src/data/destinations';
import { colors } from '@/src/theme';
import { useNavigation } from "expo-router/react-navigation";
import { calculateTimingInfo } from 'elektron-lfo';
import * as Haptics from 'expo-haptics';
import { AppMetrics } from 'expo-observe';
import { usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedReaction, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaFrame } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

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
    showFillsWhenEditing,
    fadeInOnOpen,
    fadeInDuration,
    tabSwitchFadeOpacity,
    editFadeOutDuration,
    editFadeInDuration,
    showFadeEnvelope,
    depthAnimationDuration,
    lfoPhase,
    lfoOutput,
    lfoFadeMultiplier,
    lfoCycleCount,
    timingInfo,
    triggerLFO,
    startLFO,
    stopLFO,
    resetLFOTiming,
    isLFORunning,
    isPaused,
    setIsPaused,
    isChangingPreset,
    previousConfig,
    crossfadeOpacity,
    finishPresetTransition,
    presetSwitchDuration,
  } = usePreset();

  // Tab switch fade - wraps entire screen content
  // Start at 1 (visible) - useFocusEffect will handle the initial fade if needed
  const screenOpacity = useSharedValue(1);

  const wasInModalRef = useRef(false);
  const isFirstFocusRef = useRef(true);
  // Track whether LFO was paused due to tab switch (vs manual pause)
  const pausedDueToTabSwitchRef = useRef(false);
  // Track whether app is backgrounded to hide phase indicator
  const [isBackgrounded, setIsBackgrounded] = useState(false);
  const pathname = usePathname();
  const navigation = useNavigation();

  // Compute timing info for previous config (used during crossfade)
  const previousTimingInfo = previousConfig
    ? (() => {
        const info = calculateTimingInfo(previousConfig, effectiveBpm);
        const msPerStep = 15000 / effectiveBpm;
        return {
          cycleTimeMs: info.cycleTimeMs,
          noteValue: info.noteValue,
          steps: info.cycleTimeMs / msPerStep,
        };
      })()
    : null;

  // Mark app as interactive immediately (production only)
  // Then pre-warm Skia path cache for modal icons in idle time
  useEffect(() => {
    if (!__DEV__) {
      AppMetrics.markInteractive();
      // Defer path cache warming until browser is idle
      requestIdleCallback(() => {
        warmPathCache([WAVEFORM_ICON_SIZES.PARAM_MODAL]);
      });
    }
  }, []);

  // Track when we're in a modal (pathname changes to param/* or presets)
  useEffect(() => {
    if (pathname.includes('/param/') || pathname.includes('/presets')) {
      wasInModalRef.current = true;
    }
  }, [pathname]);

  // Tab switch - listen to the parent tabs navigator for focus/blur events
  // useFocusEffect doesn't work reliably with NativeTabs when inside a nested Stack
  useEffect(() => {
    // Get the parent navigation (NativeTabs) from the Stack navigator
    const tabsNavigation = navigation.getParent();
    if (!tabsNavigation) return;

    const unsubscribeFocus = tabsNavigation.addListener('focus', () => {
      // Resume LFO if it was paused due to tab switch (not manual pause)
      // This must happen before early returns to ensure we always resume
      if (pausedDueToTabSwitchRef.current) {
        pausedDueToTabSwitchRef.current = false;
        startLFO();
        setIsPaused(false);
      }

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

    const unsubscribeBlur = tabsNavigation.addListener('blur', () => {
      // Pause LFO when switching away from home tab (saves battery/CPU)
      // Only if not already paused (preserve manual pause state)
      if (!isPaused && isLFORunning()) {
        pausedDueToTabSwitchRef.current = true;
        stopLFO();
        setIsPaused(true);
      }
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, fadeInOnOpen, fadeInDuration, tabSwitchFadeOpacity, screenOpacity, isPaused, isLFORunning, startLFO, stopLFO, setIsPaused]);

  // Track app state for background/foreground transitions
  const appStateRef = useRef(AppState.currentState);


  // Animated style for crossfade - the previous (old) visualization fades out
  const previousVisualizerStyle = useAnimatedStyle(() => ({
    opacity: crossfadeOpacity.value,
  }));

  // Watch crossfade animation to clean up when complete
  // finishPresetTransition is idempotent, safe to call multiple times
  useAnimatedReaction(
    () => crossfadeOpacity.value,
    (opacity) => {
      'worklet';
      // Use small threshold instead of exact 0 for floating point safety
      if (opacity < 0.01) {
        // Pass function directly - no closures in worklets
        scheduleOnRN(finishPresetTransition);
      }
    },
    [finishPresetTransition]
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasActive = appStateRef.current === 'active';
      const isNowActive = nextAppState === 'active';
      const isGoingToBackground = wasActive && (nextAppState === 'background' || nextAppState === 'inactive');
      const isComingFromBackground =
        (appStateRef.current === 'background' || appStateRef.current === 'inactive') && isNowActive;

      // Going to background: set values synchronously (no time for animations)
      // LFO pause is handled by preset-context
      if (isGoingToBackground) {
        setIsBackgrounded(true);
        // Fade to tabSwitchFadeOpacity - same as tab switch
        if (fadeInOnOpen) {
          screenOpacity.value = tabSwitchFadeOpacity;
        }
      }

      // Coming back from background: fade screen and visualization back in
      // LFO resume is handled by preset-context
      if (isComingFromBackground) {
        setIsBackgrounded(false);
        // Fade screen back in from tabSwitchFadeOpacity
        if (fadeInOnOpen) {
          screenOpacity.value = withTiming(1, {
            duration: fadeInDuration,
            easing: Easing.out(Easing.ease),
          });
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [
    fadeInOnOpen,
    fadeInDuration,
    tabSwitchFadeOpacity,
    screenOpacity,
  ]);

  const { activeDestinationId, getCenterValue, setCenterValue } = useModulation();
  const { width: screenWidth } = useSafeAreaFrame();

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

  // Derive display output from phase (for destination meter sync)
  const waveformForWorklet = currentConfig.waveform as WaveformType;
  // Pre-compute clamped depth scale (handles asymmetric range -64 to +63)
  const depthScaleForWorklet = Math.max(-1, Math.min(1, currentConfig.depth / 63));
  // Pre-compute speed info for negative speed handling
  const hasNegativeSpeed = currentConfig.speed < 0;
  const isUnipolar = isUnipolarWorklet(waveformForWorklet);
  // Pre-compute fade parameters for worklet
  const fadeValue = currentConfig.fade;
  const modeValue = currentConfig.mode as TriggerMode;
  const startPhaseNormalized = currentConfig.startPhase / 128;
  const fadeApplies = fadeValue !== 0 && modeValue !== 'FRE';

  // Destination bounds for display
  const destMin = activeDestination?.min ?? 0;
  const destMax = activeDestination?.max ?? 127;
  const destRange = destMax - destMin;
  const destMaxModulation = destRange / 2;
  const destCenterValue = hasDestination ? getCenterValue(activeDestinationId) : 64;

  // Use the actual fade multiplier from the LFO engine (time-based, not per-cycle)
  const displayFadeMultiplier = useDerivedValue(() => {
    'worklet';
    if (!fadeApplies) return 1;
    return lfoFadeMultiplier.value;
  }, [fadeApplies, lfoFadeMultiplier]);

  const displayOutput = useDerivedValue(() => {
    'worklet';
    // Sample the waveform at current phase
    let value = sampleWaveformWorklet(waveformForWorklet, displayPhase.value);
    // Apply negative speed transformation (matches visualization and engine)
    // For unipolar waveforms (EXP, RMP), negative speed flips the shape (1-x)
    // For bipolar waveforms, negative speed inverts polarity (*-1)
    if (hasNegativeSpeed) {
      if (isUnipolar) {
        value = 1 - value;
      } else {
        value = -value;
      }
    }
    // Apply depth scaling
    return value * depthScaleForWorklet;
  }, [waveformForWorklet, depthScaleForWorklet, displayPhase, hasNegativeSpeed, isUnipolar]);

  // Destination modulated value for TimingInfo display
  const destinationDisplayValue = useDerivedValue(() => {
    'worklet';
    if (!hasDestination) return 64;
    const fadeMult = displayFadeMultiplier.value;
    const modulationAmount = displayOutput.value * destMaxModulation * fadeMult;
    return Math.max(destMin, Math.min(destMax, destCenterValue + modulationAmount));
  }, [hasDestination, displayOutput, displayFadeMultiplier, destMaxModulation, destMin, destMax, destCenterValue]);

  // Calculate destination bounds (min/max based on depth)
  const destSwing = destMaxModulation * Math.abs(depthScaleForWorklet);
  const destBoundsMin = Math.max(destMin, destCenterValue - destSwing);
  const destBoundsMax = Math.min(destMax, destCenterValue + destSwing);

  // Visual feedback state for gesture interactions
  // Use separate opacity for each icon to avoid re-render flash
  const pauseIconOpacity = useSharedValue(0);
  const playIconOpacity = useSharedValue(0);
  const retriggerIconOpacity = useSharedValue(0);
  const feedbackTranslateY = useSharedValue(0);

  // Use shared value for isPaused so worklets can read current value
  const isPausedShared = useSharedValue(isPaused);
  useEffect(() => {
    isPausedShared.value = isPaused;
  }, [isPaused, isPausedShared]);

  // Overlay background opacity is max of all icon opacities
  const overlayBackgroundStyle = useAnimatedStyle(() => ({
    opacity: Math.max(pauseIconOpacity.value, playIconOpacity.value, retriggerIconOpacity.value),
  }));

  const pauseIconStyle = useAnimatedStyle(() => ({
    opacity: pauseIconOpacity.value,
    transform: [{ translateY: feedbackTranslateY.value }],
  }));

  const playIconStyle = useAnimatedStyle(() => ({
    opacity: playIconOpacity.value,
    transform: [{ translateY: feedbackTranslateY.value }],
  }));

  const retriggerIconStyle = useAnimatedStyle(() => ({
    opacity: retriggerIconOpacity.value,
    transform: [{ translateY: feedbackTranslateY.value }],
  }));

  // Show feedback icon with fade in/out and upward movement
  const showFeedback = useCallback((icon: 'pause' | 'play' | 'retrigger') => {
    // Reset all icons to 0
    pauseIconOpacity.value = 0;
    playIconOpacity.value = 0;
    retriggerIconOpacity.value = 0;

    // Select the right opacity shared value
    const targetOpacity = icon === 'pause' ? pauseIconOpacity : icon === 'play' ? playIconOpacity : retriggerIconOpacity;

    // Reset and animate
    feedbackTranslateY.value = 0;
    targetOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(200, withTiming(0, { duration: 300 }))
    );
    feedbackTranslateY.value = withTiming(-20, { duration: 600, easing: Easing.out(Easing.ease) });
  }, [pauseIconOpacity, playIconOpacity, retriggerIconOpacity, feedbackTranslateY]);

  // Pause handler
  const handlePause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    stopLFO();
    setIsPaused(true);
    showFeedback('pause');
  }, [stopLFO, setIsPaused, showFeedback]);

  // Resume handler
  const handleResume = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetLFOTiming(); // Prevent phase jump on resume
    startLFO();
    setIsPaused(false);
    showFeedback('play');
  }, [resetLFOTiming, startLFO, setIsPaused, showFeedback]);

  // State to trigger mode param shake (for FREE mode retrigger attempt)
  const [shakeMode, setShakeMode] = useState(false);

  // Retrigger handler - resets LFO to start phase (disabled in FREE mode)
  const handleRetrigger = useCallback(() => {
    if (currentConfig.mode === 'FRE') {
      // Can't retrigger in FREE mode - show error feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setShakeMode(true);
      // Reset shake after animation completes
      setTimeout(() => setShakeMode(false), 350);
      return;
    }
    Haptics.selectionAsync();
    triggerLFO();
    showFeedback('retrigger');
  }, [currentConfig.mode, triggerLFO, showFeedback]);

  // Long press toggles pause/play
  const longPressGesture = Gesture.LongPress()
    .minDuration(300)
    .onStart(() => {
      'worklet';
      if (isPausedShared.value) {
        scheduleOnRN(handleResume);
      } else {
        scheduleOnRN(handlePause);
      }
    });

  // Single tap: retrigger when playing, resume when paused
  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      'worklet';
      if (isPausedShared.value) {
        scheduleOnRN(handleResume);
      } else {
        scheduleOnRN(handleRetrigger);
      }
    });

  // Combine gestures - Exclusive gives priority to earlier gestures
  const visualizationGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 20 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Animated.View style={screenFadeStyle}>
        {/* LFO Visualizer + Destination Meter Row - single gesture area */}
        <View>
            <GestureDetector gesture={visualizationGesture}>
              <Animated.View
                style={[styles.visualizerRow, isPaused && styles.paused]}
                accessibilityLabel={`LFO visualization, ${currentConfig.waveform} wave at ${timingInfo.noteValue}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isPaused }}
                accessibilityHint={isPaused ? 'Tap to resume' : 'Tap to retrigger, long press to pause'}
              >
              {/* LFO Visualizer */}
              <View style={styles.visualizerContainer}>
                <View>
                  {/* Current (new) visualization - always rendered */}
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
                      showFillsWhenEditing={showFillsWhenEditing}
                      editFadeOutDuration={editFadeOutDuration}
                      editFadeInDuration={editFadeInDuration}
                      strokeWidth={2.5}
                      showFadeEnvelope={showFadeEnvelope}
                      depthAnimationDuration={depthAnimationDuration}
                      showPhaseIndicator={!isBackgrounded}
                      randomSeed={lfoCycleCount}
                      cycleCount={lfoCycleCount}
                      fadeMultiplier={displayFadeMultiplier}
                    />

                    {/* Previous (old) visualization - rendered during crossfade, fades out */}
                    {previousConfig && previousTimingInfo && (
                      <Animated.View style={[styles.crossfadeOverlay, previousVisualizerStyle]}>
                        <LFOVisualizer
                          phase={displayPhase}
                          output={lfoOutput}
                          waveform={previousConfig.waveform as WaveformType}
                          speed={previousConfig.speed}
                          multiplier={previousConfig.multiplier}
                          startPhase={previousConfig.startPhase}
                          mode={previousConfig.mode as TriggerMode}
                          depth={previousConfig.depth}
                          fade={previousConfig.fade}
                          bpm={effectiveBpm}
                          cycleTimeMs={previousTimingInfo.cycleTimeMs}
                          noteValue={previousTimingInfo.noteValue}
                          steps={previousTimingInfo.steps}
                          width={visualizerWidth}
                          height={METER_HEIGHT}
                          theme={ELEKTRON_THEME}
                          showParameters={false}
                          showTiming={false}
                          showOutput={false}
                          isEditing={false}
                          showFillsWhenEditing={true}
                          editFadeOutDuration={0}
                          editFadeInDuration={0}
                          strokeWidth={2.5}
                          showFadeEnvelope={showFadeEnvelope}
                          depthAnimationDuration={0}
                          showPhaseIndicator={false}
                          randomSeed={lfoCycleCount}
                        />
                      </Animated.View>
                    )}
                </View>
              </View>

              {/* Destination Meter */}
              <View style={styles.meterContainer}>
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
                  showValue={false}
                  isEditing={isEditing}
                  showFillsWhenEditing={showFillsWhenEditing}
                  editFadeOutDuration={editFadeOutDuration}
                  editFadeInDuration={editFadeInDuration}
                  isPaused={isPaused}
                />
              </View>

              {/* Feedback icons overlay - all rendered, visibility controlled by individual opacity */}
              <Animated.View style={[styles.feedbackOverlay, overlayBackgroundStyle]} pointerEvents="none">
                <Animated.View style={[styles.feedbackIcon, pauseIconStyle]}>
                  <SymbolView name="pause.fill" size={48} tintColor="#ffffff" />
                </Animated.View>
                <Animated.View style={[styles.feedbackIcon, playIconStyle]}>
                  <SymbolView name="play.fill" size={48} tintColor="#ffffff" />
                </Animated.View>
                <Animated.View style={[styles.feedbackIcon, retriggerIconStyle]}>
                  <SymbolView name="bolt.fill" size={48} tintColor="#ffffff" />
                </Animated.View>
              </Animated.View>
            </Animated.View>
          </GestureDetector>

            {/* Timing info - spans full width below visualization */}
            <View style={styles.timingContainer}>
              <TimingInfo
                bpm={effectiveBpm}
                cycleTimeMs={timingInfo.cycleTimeMs}
                noteValue={timingInfo.noteValue}
                steps={timingInfo.steps}
                theme={ELEKTRON_THEME}
                phase={lfoPhase}
                startPhase={currentConfig.startPhase}
                destinationValue={destinationDisplayValue}
                destinationMin={destBoundsMin}
                destinationMax={destBoundsMax}
                hasDestination={hasDestination}
              />
            </View>
        </View>

        {/* Content below visualization */}
        <View style={styles.belowVisualization}>
          {/* Parameter Grid - Full width */}
          <View style={styles.gridContainer}>
            <Text style={styles.sectionHeading}>PARAMETERS</Text>
            <ParamGrid shakeMode={shakeMode} />
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
            <TestTone visible={hasDestination} />
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  visualizerRow: {
    flexDirection: 'row',
    paddingTop: 8,
    backgroundColor: '#000000',
  },
  belowVisualization: {
    // Content container
  },
  visualizerContainer: {
    flex: 1,
  },
  timingContainer: {
    backgroundColor: '#000000',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  paused: {
    opacity: 0.5,
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  feedbackIcon: {
    position: 'absolute',
  },
  crossfadeOverlay: {
    ...StyleSheet.absoluteFillObject,
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
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
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
