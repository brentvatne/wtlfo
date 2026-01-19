import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';
import { useUpdates } from 'expo-updates';
import { usePreset } from '@/src/context/preset-context';
import { ParameterSlider } from '@/src/components/controls';

const APP_VERSION = '1.0.0';
const COMMON_BPMS = [90, 100, 120, 130, 140];

export default function SettingsScreen() {
  const { bpm, setBPM } = usePreset();
  const {
    currentlyRunning,
    isUpdateAvailable,
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
      if (!result.isAvailable) {
        Alert.alert('Up to Date', "You're running the latest version.");
      }
    } catch (e) {
      Alert.alert('Error', `Failed to check for updates: ${e}`);
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      await Updates.fetchUpdateAsync();
    } catch (e) {
      Alert.alert('Error', `Failed to download update: ${e}`);
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

      <View
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#ffffff',
            marginBottom: 8,
          }}
        >
          Coming Soon
        </Text>
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
          onPress={isUpdateAvailable ? handleDownloadUpdate : handleCheckUpdate}
          disabled={isChecking || isDownloading}
        >
          {isChecking || isDownloading ? (
            <View style={styles.updateRow}>
              <ActivityIndicator size="small" color="#888" />
              <Text style={styles.updateCheckingText}>
                {isDownloading ? 'Downloading...' : 'Checking...'}
              </Text>
            </View>
          ) : isUpdateAvailable ? (
            <Text style={styles.updateAvailableText}>
              Update available - tap to download
            </Text>
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
  updateAvailableText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
  updateIdText: {
    fontSize: 12,
    color: '#888',
  },
});
