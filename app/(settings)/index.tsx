import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Switch, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';
import { useUpdates } from 'expo-updates';
import { usePreset } from '@/src/context/preset-context';
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
  } = usePreset();
  const {
    currentlyRunning,
    isUpdatePending,
    isChecking,
    isDownloading,
  } = useUpdates();

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
      <View
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#ffffff',
            marginBottom: 16,
          }}
        >
          Tempo
        </Text>
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
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Animation Timing</Text>
          <Pressable
            onPress={() => {
              setFadeInDuration(800);
              setEditFadeOutDuration(100);
              setEditFadeInDuration(350);
            }}
            style={styles.resetButton}
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </Pressable>
        </View>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Open fade-in duration</Text>
          <ParameterSlider
            label=""
            min={100}
            max={2000}
            value={fadeInDuration}
            onChange={setFadeInDuration}
            formatValue={(v) => `${Math.round(v)}ms`}
          />
        </View>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Edit start fade-out</Text>
          <ParameterSlider
            label=""
            min={50}
            max={500}
            value={editFadeOutDuration}
            onChange={setEditFadeOutDuration}
            formatValue={(v) => `${Math.round(v)}ms`}
          />
        </View>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Edit end fade-in</Text>
          <ParameterSlider
            label=""
            min={100}
            max={1000}
            value={editFadeInDuration}
            onChange={setEditFadeInDuration}
            formatValue={(v) => `${Math.round(v)}ms`}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coming Soon</Text>
        <Text style={{ color: '#888899', fontSize: 15 }}>
          MIDI settings and more options will be available in future updates.
        </Text>
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
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
