import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Switch, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { useUpdates } from 'expo-updates';
import { usePreset } from '@/src/context/preset-context';
import { useMidi } from '@/src/context/midi-context';
import { ParameterSlider } from '@/src/components/controls';

const APP_VERSION = '1.0.0';
const COMMON_BPMS = [90, 100, 120, 130, 140];

export default function SettingsScreen() {
  const {
    bpm, setBPM,
    hideValuesWhileEditing, setHideValuesWhileEditing,
    fadeInOnOpen, setFadeInOnOpen,
    resetLFOOnChange, setResetLFOOnChange,
    fadeInDuration, setFadeInDuration,
    editFadeOutDuration, setEditFadeOutDuration,
    editFadeInDuration, setEditFadeInDuration,
    showFadeEnvelope, setShowFadeEnvelope,
  } = usePreset();
  const {
    currentlyRunning,
    isUpdatePending,
    isChecking,
    isDownloading,
  } = useUpdates();
  const { connected, connectedDeviceName, externalBpm } = useMidi();

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
        <Text style={styles.sectionTitle}>Tempo</Text>
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
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Visualization</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Fade in on open</Text>
            <Text style={styles.settingDescription}>
              Fade in visualization when opening app or switching tabs
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
              Display fade envelope curves on the waveform visualization
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
          <Pressable
            onPress={() => {
              setFadeInDuration(800);
              setEditFadeOutDuration(50);
              setEditFadeInDuration(100);
            }}
            style={styles.resetButton}
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </Pressable>
        </View>
        <ParameterSlider
          label="Open fade-in duration"
          min={100}
          max={2000}
          value={fadeInDuration}
          onChange={setFadeInDuration}
          formatValue={(v) => `${Math.round(v)}ms`}
        />
        <ParameterSlider
          label="Edit start fade-out"
          min={50}
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
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Experimental</Text>
        <Pressable
          style={styles.linkRow}
          onPress={() => router.push('./midi')}
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
});
