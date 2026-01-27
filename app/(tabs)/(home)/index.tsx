import React, { useRef, useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import AppMetrics from 'expo-eas-observe';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { usePathname } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import Animated, { useDerivedValue, useSharedValue, useAnimatedReaction, useAnimatedStyle, withTiming, withSequence, withDelay, Easing, FadeIn, runOnJS } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SymbolView } from 'expo-symbols';
import { Canvas, Image as SkiaImage, makeImageFromView, type SkImage } from '@shopify/react-native-skia';
import {
  LFOVisualizer,
  ELEKTRON_THEME,
  sampleWaveformWorklet,
  TimingInfo,
  VisualizationPlaceholder,
} from '@/src/components/lfo';
import type { WaveformType, TriggerMode } from '@/src/components/lfo';
import { ParamGrid } from '@/src/components/params';
import { DestinationMeter, CenterValueSlider, MeterPlaceholder } from '@/src/components/destination';
import { TestTone } from '@/src/components/audio';
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
    resetLFOTiming,
    isLFORunning,
    isPaused,
    setIsPaused,
    splashFadeDuration,
    isChangingPreset,
    pendingPresetIndex,
    commitPresetChange,
    finishPresetTransition,
    presetSwitchDuration,
  } = usePreset();

  // Tab switch fade - wraps entire screen content
  // Start at 1 (visible) - useFocusEffect will handle the initial fade if needed
  const screenOpacity = useSharedValue(1);
  // Visualization fade - wraps just the visualizer row
  // Start at 1 - initial fade-in is handled by FadeIn on Skia components
  // This is only used for background/foreground transitions now
  const visualizerOpacity = useSharedValue(1);

  const wasInModalRef = useRef(false);
  const isFirstFocusRef = useRef(true);
  // Track whether LFO was paused due to tab switch (vs manual pause)
  const pausedDueToTabSwitchRef = useRef(false);
  // Track whether app is backgrounded to hide phase indicator
  const [isBackgrounded, setIsBackgrounded] = useState(false);
  const pathname = usePathname();
  const navigation = useNavigation();

  // Crossfade state for preset transitions
  const visualizerRowRef = useRef<View>(null);
  const [presetSnapshot, setPresetSnapshot] = useState<SkImage | null>(null);
  const snapshotOpacity = useSharedValue(0);

  // Track when splash fade completes to defer expensive Skia rendering
  const [visualizationsReady, setVisualizationsReady] = useState(!fadeInVisualization);
  useEffect(() => {
    if (!fadeInVisualization) {
      setVisualizationsReady(true);
      return;
    }
    const timer = setTimeout(() => setVisualizationsReady(true), splashFadeDuration);
    return () => clearTimeout(timer);
  }, [fadeInVisualization, splashFadeDuration]);

  // Mark app as interactive after splash fade completes (production only)
  useEffect(() => {
    if (visualizationsReady && !__DEV__) {
      AppMetrics.markInteractive();
    }
  }, [visualizationsReady]);

  // DEBUG: Log when this component re-renders due to context changes
  // Remove this after verifying render frequency during slider drags
  const renderCountRef = useRef(0);
  useLayoutEffect(() => {
    renderCountRef.current += 1;
    console.log(`[PERF] HomeScreen render #${renderCountRef.current}`);
  });

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

  // Visualization fade - triggers on app open and returning from background
  const appStateRef = useRef(AppState.currentState);
  const hasInitializedVisualization = useRef(false);
  const prevIsPausedRef = useRef(isPaused);

  useEffect(() => {
    // Mark as initialized - initial fade-in is handled by FadeIn on Skia components
    hasInitializedVisualization.current = true;
  }, []);

  // Fade in visualization when user unpauses (taps to resume)
  useEffect(() => {
    const wasPaused = prevIsPausedRef.current;
    prevIsPausedRef.current = isPaused;

    // Only fade in when transitioning from paused to playing
    if (wasPaused && !isPaused && fadeInVisualization && hasInitializedVisualization.current) {
      visualizerOpacity.value = withTiming(1, {
        duration: visualizationFadeDuration,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [isPaused, fadeInVisualization, visualizationFadeDuration, visualizerOpacity]);

  // Crossfade visualization during preset change
  // When pendingPresetIndex is set, capture snapshot, then commit preset change
  useEffect(() => {
    if (pendingPresetIndex !== null && visualizerRowRef.current) {
      const startTime = performance.now();
      let didTimeout = false;
      let didComplete = false;

      // Timeout fallback - if snapshot takes too long, skip crossfade
      const timeoutId = setTimeout(() => {
        if (!didComplete) {
          didTimeout = true;
          if (__DEV__) {
            console.log('[Crossfade] Snapshot timed out, falling back to instant switch');
          }
          commitPresetChange();
          finishPresetTransition();
        }
      }, 100); // 100ms timeout

      // Capture snapshot of current visualization
      makeImageFromView(visualizerRowRef).then((image) => {
        if (didTimeout) return; // Already timed out
        didComplete = true;
        clearTimeout(timeoutId);

        const captureTime = performance.now() - startTime;
        if (__DEV__) {
          console.log(`[Crossfade] Snapshot captured in ${captureTime.toFixed(1)}ms`);
        }

        if (image) {
          setPresetSnapshot(image);
          snapshotOpacity.value = 1;

          // Commit the preset change (this changes the actual preset state)
          commitPresetChange();

          // Fade out the snapshot to reveal new preset underneath
          snapshotOpacity.value = withTiming(0, {
            duration: presetSwitchDuration,
            easing: Easing.out(Easing.ease),
          }, () => {
            // Animation complete - clean up
            runOnJS(setPresetSnapshot)(null);
            runOnJS(finishPresetTransition)();
          });
        } else {
          // Snapshot failed - fall back to immediate change
          commitPresetChange();
          finishPresetTransition();
        }
      }).catch(() => {
        if (didTimeout) return;
        didComplete = true;
        clearTimeout(timeoutId);
        // Snapshot failed - fall back to immediate change
        commitPresetChange();
        finishPresetTransition();
      });
    }
  }, [pendingPresetIndex, commitPresetChange, finishPresetTransition, presetSwitchDuration, snapshotOpacity]);

  // Animated style for snapshot overlay
  const snapshotStyle = useAnimatedStyle(() => ({
    opacity: snapshotOpacity.value,
  }));

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
        if (fadeInVisualization) {
          visualizerOpacity.value = tabSwitchFadeOpacity;
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
        // Fade visualization back in from tabSwitchFadeOpacity
        if (fadeInVisualization) {
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

  // Destination bounds for display
  const destMin = activeDestination?.min ?? 0;
  const destMax = activeDestination?.max ?? 127;
  const destRange = destMax - destMin;
  const destMaxModulation = destRange / 2;
  const destCenterValue = hasDestination ? getCenterValue(activeDestinationId) : 64;

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
        <Animated.View style={visualizerFadeStyle}>
          {/* Wrapper View for snapshot capture - collapsable={false} required for makeImageFromView */}
          <View ref={visualizerRowRef} collapsable={false}>
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
                {visualizationsReady ? (
                  <Animated.View entering={FadeIn.duration(visualizationFadeDuration)}>
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
                      showPhaseIndicator={!isBackgrounded}
                    />
                  </Animated.View>
                ) : (
                  <VisualizationPlaceholder width={visualizerWidth} height={METER_HEIGHT} />
                )}
              </View>

              {/* Destination Meter */}
              <View style={styles.meterContainer}>
                {visualizationsReady ? (
                  <Animated.View entering={FadeIn.duration(visualizationFadeDuration)}>
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
                      hideValuesWhileEditing={hideValuesWhileEditing}
                      showFillsWhenEditing={showFillsWhenEditing}
                      editFadeOutDuration={editFadeOutDuration}
                      editFadeInDuration={editFadeInDuration}
                      isPaused={isPaused}
                    />
                  </Animated.View>
                ) : (
                  <MeterPlaceholder width={METER_WIDTH} height={METER_HEIGHT} />
                )}
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

          {/* Snapshot overlay for crossfade during preset switch */}
          {presetSnapshot && (
            <Animated.View style={[styles.snapshotOverlay, snapshotStyle]} pointerEvents="none">
              <Canvas style={StyleSheet.absoluteFill}>
                <SkiaImage
                  image={presetSnapshot}
                  x={0}
                  y={0}
                  width={presetSnapshot.width()}
                  height={presetSnapshot.height()}
                  fit="cover"
                />
              </Canvas>
            </Animated.View>
          )}
        </Animated.View>

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
  snapshotOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
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
