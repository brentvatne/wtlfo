import React, { useEffect } from 'react';
import { View, Text, Pressable, Switch, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { useUpdates } from 'expo-updates';
import { SymbolView } from 'expo-symbols';
import { usePreset } from '@/src/context/preset-context';
import { useMidi } from '@/src/context/midi-context';
import { ParameterSlider } from '@/src/components/controls';

const APP_VERSION = '1.0.0';
const COMMON_BPMS = [90, 100, 120, 130, 140];

export default function SettingsScreen() {
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
  } = usePreset();
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

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Visualization</Text>
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
        <View style={[styles.settingRow, { marginTop: 16, marginBottom: 8 }]}>
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
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>Animation Timing</Text>
          {(() => {
            const hasNonDefaultTiming =
              Math.round(fadeInDuration) !== 800 ||
              Math.round(visualizationFadeDuration) !== 400 ||
              Math.round(editFadeOutDuration) !== 0 ||
              Math.round(editFadeInDuration) !== 100 ||
              Math.round(depthAnimationDuration) !== 60 ||
              Math.round(splashFadeDuration) !== 150;
            return (
              <Pressable
                onPress={() => {
                  setFadeInDuration(800);
                  setVisualizationFadeDuration(400);
                  setEditFadeOutDuration(0);
                  setEditFadeInDuration(100);
                  setDepthAnimationDuration(60);
                  setSplashFadeDuration(150);
                }}
                style={styles.resetButton}
              >
                <Text style={[styles.resetButtonText, hasNonDefaultTiming && styles.resetButtonTextActive]}>
                  Reset
                </Text>
              </Pressable>
            );
          })()}
        </View>
        <ParameterSlider
          label="Tab switch fade-in"
          min={100}
          max={2000}
          value={fadeInDuration}
          onChange={setFadeInDuration}
          formatValue={(v) => `${Math.round(v)}ms`}
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
        <ParameterSlider
          label="Splash screen fade"
          min={0}
          max={1000}
          value={splashFadeDuration}
          onChange={setSplashFadeDuration}
          formatValue={(v) => Math.round(v) === 0 ? 'Instant' : `${Math.round(v)}ms`}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Experimental</Text>
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
          <Text style={styles.chevron}>›</Text>
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
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      {/* Version and Update Info */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText} selectable>
          v{APP_VERSION}
        </Text>
        <Pressable
          onPress={handleCheckUpdate}
          disabled={isChecking || isDownloading}
        >
          {isChecking || isDownloading ? (
            <View style={styles.updateRow}>
              <ActivityIndicator size="small" color="#888" />
              <Text style={styles.updateCheckingText}>
                {isDownloading ? 'Downloading...' : 'Checking...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.updateIdText} selectable>
              {getUpdateId()}
            </Text>
          )}
        </Pressable>
      </View>
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
  chevron: {
    color: '#888899',
    fontSize: 24,
    fontWeight: '300',
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
    marginTop: 32,
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
