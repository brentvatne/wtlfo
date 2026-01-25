import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Switch, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  LinearTransition,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import * as Updates from 'expo-updates';
import { useUpdates } from 'expo-updates';
import { SymbolView } from 'expo-symbols';
import {
  usePreset,
  DEFAULT_FADE_IN_DURATION,
  DEFAULT_VISUALIZATION_FADE_DURATION,
  DEFAULT_EDIT_FADE_OUT,
  DEFAULT_EDIT_FADE_IN,
  DEFAULT_DEPTH_ANIM_DURATION,
  DEFAULT_SPLASH_FADE_DURATION,
  DEFAULT_PHASE_ANIMATION_DURATION,
  DEFAULT_TAB_SWITCH_FADE_OPACITY,
} from '@/src/context/preset-context';
import { useMidi } from '@/src/context/midi-context';
import { ParameterSlider } from '@/src/components/controls';

const APP_VERSION = '1.0.0';
const COMMON_BPMS = [90, 100, 120, 130, 140];

// Collapsible section component with animated expand/collapse
function CollapsibleSection({
  title,
  children,
  defaultCollapsed = false,
  headerRight,
}: {
  title: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  headerRight?: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const chevronRotation = useSharedValue(defaultCollapsed ? 0 : 1);
  const bottomRadius = useSharedValue(defaultCollapsed ? 12 : 0);

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
    chevronRotation.value = withTiming(isCollapsed ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });
    bottomRadius.value = withTiming(isCollapsed ? 0 : 12, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value * 90}deg` }],
  }));

  const headerStyle = useAnimatedStyle(() => ({
    borderBottomLeftRadius: bottomRadius.value,
    borderBottomRightRadius: bottomRadius.value,
  }));

  return (
    <Animated.View
      style={[styles.collapsibleSection, isCollapsed && styles.collapsibleSectionCollapsed]}
      layout={LinearTransition.duration(250)}
    >
      <Animated.View style={[styles.collapsibleHeader, headerStyle]}>
        <Pressable
          onPress={toggleCollapsed}
          hitSlop={{ left: 16, right: 24, top: 8, bottom: 8 }}
          style={styles.collapsibleTitlePressable}
        >
          <Text style={styles.sectionHeaderTitle}>{title}</Text>
        </Pressable>
        <View style={styles.collapsibleHeaderRight}>
          {headerRight}
          <Pressable
            onPress={toggleCollapsed}
            hitSlop={{ left: 24, right: 16, top: 8, bottom: 8 }}
            style={styles.collapsibleChevronPressable}
          >
            <Animated.Text style={[styles.collapsibleChevron, chevronStyle]}>
              ›
            </Animated.Text>
          </Pressable>
        </View>
      </Animated.View>
      {!isCollapsed && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.collapsibleContent}
        >
          {children}
        </Animated.View>
      )}
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const {
    bpm, setBPM,
    hideValuesWhileEditing, setHideValuesWhileEditing,
    showFillsWhenEditing, setShowFillsWhenEditing,
    fadeInOnOpen, setFadeInOnOpen,
    fadeInVisualization, setFadeInVisualization,
    resetLFOOnChange, setResetLFOOnChange,
    fadeInDuration, setFadeInDuration,
    visualizationFadeDuration, setVisualizationFadeDuration,
    editFadeOutDuration, setEditFadeOutDuration,
    editFadeInDuration, setEditFadeInDuration,
    showFadeEnvelope, setShowFadeEnvelope,
    depthAnimationDuration, setDepthAnimationDuration,
    splashFadeDuration, setSplashFadeDuration,
    smoothPhaseAnimation, setSmoothPhaseAnimation,
    phaseAnimationDuration, setPhaseAnimationDuration,
    tabSwitchFadeOpacity, setTabSwitchFadeOpacity,
  } = usePreset();

  // Tab switch fade
  const screenOpacity = useSharedValue(1);
  const isFirstFocusRef = useRef(true);

  const screenFadeStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  useEffect(() => {
    const tabsNavigation = navigation.getParent();
    if (!tabsNavigation) return;

    const unsubscribe = tabsNavigation.addListener('focus', () => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }

      if (fadeInOnOpen) {
        screenOpacity.value = tabSwitchFadeOpacity;
        screenOpacity.value = withTiming(1, {
          duration: fadeInDuration,
          easing: Easing.out(Easing.ease),
        });
      }
    });

    return unsubscribe;
  }, [navigation, fadeInOnOpen, fadeInDuration, tabSwitchFadeOpacity, screenOpacity]);
  const {
    currentlyRunning,
    isUpdatePending,
    isChecking,
    isDownloading,
  } = useUpdates();
  const { connected, connectedDeviceName, externalBpm, receiveClock } = useMidi();

  // When MIDI clock sync is active, tempo is controlled externally
  const midiClockActive = connected && receiveClock && externalBpm > 0;

  const getUpdateId = () => {
    if (!Updates.isEnabled) return '-';
    return currentlyRunning?.updateId?.slice(0, 8) ?? 'embedded';
  };

  const handleCheckUpdate = async () => {
    if (!Updates.isEnabled) {
      Alert.alert('Updates Disabled', 'OTA updates are not enabled in this build.');
      return;
    }

    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        // Automatically download and prompt for restart
        await Updates.fetchUpdateAsync();
      } else {
        Alert.alert('Up to Date', "You're running the latest version.");
      }
    } catch (e) {
      Alert.alert('Error', `Failed to check for updates: ${e}`);
    }
  };

  useEffect(() => {
    if (isUpdatePending) {
      Alert.alert(
        'Update Ready',
        'A new version has been downloaded. Restart to apply?',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Restart', onPress: () => Updates.reloadAsync() },
        ]
      );
    }
  }, [isUpdatePending]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0a0a0a' }}
      contentContainerStyle={{ padding: 20 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Animated.View style={screenFadeStyle}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>Tempo</Text>
          {midiClockActive && (
            <View style={styles.midiClockBadge}>
              <SymbolView name="link" size={12} tintColor="#ff6600" />
              <Text style={styles.midiClockText}>MIDI</Text>
            </View>
          )}
        </View>
        {midiClockActive ? (
          <View style={styles.midiClockInfo}>
            <Text style={styles.midiClockBpm}>{Math.round(externalBpm)}</Text>
            <Text style={styles.midiClockLabel}>BPM from {connectedDeviceName}</Text>
          </View>
        ) : (
          <>
            <ParameterSlider
              label="BPM"
              min={30}
              max={300}
              value={bpm}
              onChange={setBPM}
              formatValue={(v) => String(Math.round(v))}
            />
            <View style={styles.segmentedControl}>
              {COMMON_BPMS.map((tempo) => {
                const isSelected = Math.round(bpm) === tempo;
                return (
                  <Pressable
                    key={tempo}
                    style={[
                      styles.segment,
                      isSelected && styles.segmentSelected,
                    ]}
                    onPress={() => setBPM(tempo)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        isSelected && styles.segmentTextSelected,
                      ]}
                    >
                      {tempo}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </View>

      <CollapsibleSection title="Visualization" defaultCollapsed>
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Fade in on tab switch</Text>
            <Text style={styles.settingDescription}>
              Fade in entire screen when switching tabs
            </Text>
          </View>
          <Switch
            value={fadeInOnOpen}
            onValueChange={setFadeInOnOpen}
            trackColor={{ false: '#3a3a3a', true: '#ff6600' }}
            thumbColor="#ffffff"
          />
        </View>
        <View style={[styles.settingRow, { marginTop: 16 }]}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Fade in visualization</Text>
            <Text style={styles.settingDescription}>
              Fade in visualization on Editor when opening app or returning from background
            </Text>
          </View>
          <Switch
            value={fadeInVisualization}
            onValueChange={setFadeInVisualization}
            trackColor={{ false: '#3a3a3a', true: '#ff6600' }}
            thumbColor="#ffffff"
          />
        </View>
        <View style={[styles.settingRow, { marginTop: 16 }]}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Hide values while editing</Text>
            <Text style={styles.settingDescription}>
              Fade out current value indicators when adjusting parameters
            </Text>
          </View>
          <Switch
            value={hideValuesWhileEditing}
            onValueChange={setHideValuesWhileEditing}
            trackColor={{ false: '#3a3a3a', true: '#ff6600' }}
            thumbColor="#ffffff"
          />
        </View>
        <View style={[styles.settingRow, { marginTop: 16 }]}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Show fills when editing</Text>
            <Text style={styles.settingDescription}>
              Keep waveform fill areas visible when adjusting depth
            </Text>
          </View>
          <Switch
            value={showFillsWhenEditing}
            onValueChange={setShowFillsWhenEditing}
            trackColor={{ false: '#3a3a3a', true: '#ff6600' }}
            thumbColor="#ffffff"
          />
        </View>
        <View style={[styles.settingRow, { marginTop: 16 }]}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Reset LFO on change</Text>
            <Text style={styles.settingDescription}>
              Restart LFO from beginning when parameters change
            </Text>
          </View>
          <Switch
            value={resetLFOOnChange}
            onValueChange={setResetLFOOnChange}
            trackColor={{ false: '#3a3a3a', true: '#ff6600' }}
            thumbColor="#ffffff"
          />
        </View>
        <View style={[styles.settingRow, { marginTop: 16 }]}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Show fade envelope</Text>
            <Text style={styles.settingDescription}>
              Display dashed fade envelope curve on the visualization
            </Text>
          </View>
          <Switch
            value={showFadeEnvelope}
            onValueChange={setShowFadeEnvelope}
            trackColor={{ false: '#3a3a3a', true: '#ff6600' }}
            thumbColor="#ffffff"
          />
        </View>
        <View style={[styles.settingRow, { marginTop: 16 }]}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Smooth phase animation</Text>
            <Text style={styles.settingDescription}>
              Interpolate phase for dropped frame compensation
            </Text>
          </View>
          <Switch
            value={smoothPhaseAnimation}
            onValueChange={setSmoothPhaseAnimation}
            trackColor={{ false: '#3a3a3a', true: '#ff6600' }}
            thumbColor="#ffffff"
          />
        </View>
      </CollapsibleSection>

      <CollapsibleSection title="Animation timing" defaultCollapsed>
        <ParameterSlider
          label="Tab switch fade-in"
          min={100}
          max={2000}
          value={fadeInDuration}
          onChange={setFadeInDuration}
          formatValue={(v) => `${Math.round(v)}ms`}
        />
        <ParameterSlider
          label="Tab switch start opacity"
          min={0}
          max={100}
          value={tabSwitchFadeOpacity * 100}
          onChange={(v) => setTabSwitchFadeOpacity(v / 100)}
          formatValue={(v) => `${Math.round(v)}%`}
        />
        <ParameterSlider
          label="Visualization fade-in"
          min={100}
          max={2000}
          value={visualizationFadeDuration}
          onChange={setVisualizationFadeDuration}
          formatValue={(v) => `${Math.round(v)}ms`}
        />
        <ParameterSlider
          label="Edit start fade-out"
          min={0}
          max={500}
          value={editFadeOutDuration}
          onChange={setEditFadeOutDuration}
          formatValue={(v) => `${Math.round(v)}ms`}
        />
        <ParameterSlider
          label="Edit end fade-in"
          min={100}
          max={1000}
          value={editFadeInDuration}
          onChange={setEditFadeInDuration}
          formatValue={(v) => `${Math.round(v)}ms`}
        />
        <ParameterSlider
          label="Depth animation"
          min={0}
          max={200}
          value={depthAnimationDuration}
          onChange={setDepthAnimationDuration}
          formatValue={(v) => Math.round(v) === 0 ? 'Instant' : `${Math.round(v)}ms`}
        />
        {smoothPhaseAnimation && (
          <ParameterSlider
            label="Phase interpolation"
            min={0}
            max={100}
            value={phaseAnimationDuration}
            onChange={setPhaseAnimationDuration}
            formatValue={(v) => Math.round(v) === 0 ? 'Instant' : `${Math.round(v)}ms`}
          />
        )}
        <ParameterSlider
          label="Splash screen fade"
          min={0}
          max={1000}
          value={splashFadeDuration}
          onChange={setSplashFadeDuration}
          formatValue={(v) => Math.round(v) === 0 ? 'Instant' : `${Math.round(v)}ms`}
        />
        {(() => {
          const hasNonDefaultTiming =
            Math.round(fadeInDuration) !== DEFAULT_FADE_IN_DURATION ||
            Math.round(visualizationFadeDuration) !== DEFAULT_VISUALIZATION_FADE_DURATION ||
            Math.round(editFadeOutDuration) !== DEFAULT_EDIT_FADE_OUT ||
            Math.round(editFadeInDuration) !== DEFAULT_EDIT_FADE_IN ||
            Math.round(depthAnimationDuration) !== DEFAULT_DEPTH_ANIM_DURATION ||
            Math.round(phaseAnimationDuration) !== DEFAULT_PHASE_ANIMATION_DURATION ||
            Math.round(tabSwitchFadeOpacity * 100) !== Math.round(DEFAULT_TAB_SWITCH_FADE_OPACITY * 100) ||
            Math.round(splashFadeDuration) !== DEFAULT_SPLASH_FADE_DURATION;
          return (
            <Pressable
              onPress={() => {
                setFadeInDuration(DEFAULT_FADE_IN_DURATION);
                setVisualizationFadeDuration(DEFAULT_VISUALIZATION_FADE_DURATION);
                setEditFadeOutDuration(DEFAULT_EDIT_FADE_OUT);
                setEditFadeInDuration(DEFAULT_EDIT_FADE_IN);
                setDepthAnimationDuration(DEFAULT_DEPTH_ANIM_DURATION);
                setPhaseAnimationDuration(DEFAULT_PHASE_ANIMATION_DURATION);
                setTabSwitchFadeOpacity(DEFAULT_TAB_SWITCH_FADE_OPACITY);
                setSplashFadeDuration(DEFAULT_SPLASH_FADE_DURATION);
              }}
              style={styles.resetTimingButton}
            >
              <Text style={[styles.resetTimingButtonText, hasNonDefaultTiming && styles.resetTimingButtonTextActive]}>
                Reset to defaults
              </Text>
            </Pressable>
          );
        })()}
      </CollapsibleSection>

      <CollapsibleSection title="Experimental" defaultCollapsed>
        <Pressable
          style={styles.linkRow}
          onPress={() => router.push('/midi')}
        >
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>MIDI Sync</Text>
            <Text style={styles.settingDescription}>
              {connected
                ? `${connectedDeviceName}${externalBpm > 0 ? ` • ${Math.round(externalBpm)} BPM` : ''}`
                : 'Connect to external MIDI device'}
            </Text>
          </View>
          <Text style={styles.linkChevron}>›</Text>
        </Pressable>
        <View style={styles.divider} />
        <Pressable
          style={styles.linkRow}
          onPress={() => router.push('./developer')}
        >
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Developer Tools</Text>
            <Text style={styles.settingDescription}>
              Frame rate monitor, performance tests, MIDI verification
            </Text>
          </View>
          <Text style={styles.linkChevron}>›</Text>
        </Pressable>
      </CollapsibleSection>

      {/* Version and Update Info */}
      <Pressable
        style={styles.versionContainer}
        onPress={handleCheckUpdate}
        disabled={isChecking || isDownloading}
        hitSlop={{ top: 16, bottom: 16, left: 32, right: 32 }}
      >
        <Text style={styles.versionText}>
          v{APP_VERSION}{currentlyRunning?.channel ? ` • ${currentlyRunning.channel}` : ''}
        </Text>
        {isChecking || isDownloading ? (
          <View style={styles.updateRow}>
            <ActivityIndicator size="small" color="#888" />
            <Text style={styles.updateCheckingText}>
              {isDownloading ? 'Downloading...' : 'Checking...'}
            </Text>
          </View>
        ) : (
          <Text style={styles.updateIdText}>
            {getUpdateId()}
          </Text>
        )}
      </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
    backgroundColor: '#252525',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#252525',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
  },
  resetButtonText: {
    color: '#888899',
    fontSize: 12,
    fontWeight: '500',
  },
  resetButtonTextActive: {
    color: '#ff6600',
  },
  resetTimingButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: '#252525',
    borderRadius: 8,
  },
  resetTimingButtonText: {
    color: '#888899',
    fontSize: 14,
    fontWeight: '500',
  },
  resetTimingButtonTextActive: {
    color: '#ff6600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  linkChevron: {
    color: '#888899',
    fontSize: 24,
    fontWeight: '300',
  },
  collapsibleSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  collapsibleSectionCollapsed: {
    backgroundColor: 'transparent',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#252525',
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  collapsibleTitlePressable: {
    paddingVertical: 4,
  },
  collapsibleHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapsibleChevronPressable: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  collapsibleChevron: {
    color: '#888899',
    fontSize: 24,
    fontWeight: '300',
  },
  collapsibleContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  settingDescription: {
    color: '#888899',
    fontSize: 13,
    marginTop: 2,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 4,
    marginTop: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentSelected: {
    backgroundColor: '#3a3a3a',
  },
  segmentText: {
    color: '#888899',
    fontSize: 14,
    fontWeight: '500',
  },
  segmentTextSelected: {
    color: '#ffffff',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    gap: 6,
  },
  versionText: {
    fontSize: 13,
    color: '#888',
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  updateCheckingText: {
    fontSize: 12,
    color: '#888',
  },
  updateIdText: {
    fontSize: 12,
    color: '#888',
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 8,
  },
  midiClockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  midiClockText: {
    color: '#ff6600',
    fontSize: 11,
    fontWeight: '600',
  },
  midiClockInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  midiClockBpm: {
    color: '#ff6600',
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  midiClockLabel: {
    color: '#888899',
    fontSize: 13,
    marginTop: 4,
  },
});
