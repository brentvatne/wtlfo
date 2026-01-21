import React from 'react';
import { View, Text, ScrollView, Pressable, Switch, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMidi } from '@/src/context/midi-context';
import { DigitaktConnection } from '@/src/components/settings/DigitaktConnection';

export default function MidiScreen() {
  const {
    connected,
    transportRunning,
    externalBpm,
    receiveTransport,
    setReceiveTransport,
    receiveClock,
    setReceiveClock,
  } = useMidi();

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <SymbolView name="xmark" size={20} tintColor="#ff6600" />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Status Banner - only show when connected */}
        {connected && (
          <View style={styles.statusBanner}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, transportRunning && styles.statusDotActive]} />
              <Text style={styles.statusText}>
                {transportRunning ? 'Playing' : 'Stopped'}
              </Text>
            </View>
            {externalBpm > 0 && (
              <Text style={styles.bpmText}>{Math.round(externalBpm)} BPM</Text>
            )}
          </View>
        )}

        {/* Device Connection */}
        <View style={styles.section}>
          <DigitaktConnection />
        </View>

        {/* Sync Options */}
        <View style={styles.section}>
          <View style={styles.optionsContainer}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle}>Sync Options</Text>
            </View>
            <View style={styles.optionsContent}>
              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Receive Transport</Text>
                  <Text style={styles.settingDescription}>
                    Respond to play/stop messages
                  </Text>
                </View>
                <Switch
                  value={receiveTransport}
                  onValueChange={setReceiveTransport}
                  trackColor={{ false: '#3a3a3a', true: '#ff6600' }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={[styles.settingRow, { marginTop: 16 }]}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Receive Clock</Text>
                  <Text style={styles.settingDescription}>
                    Sync tempo to external MIDI clock
                  </Text>
                </View>
                <Switch
                  value={receiveClock}
                  onValueChange={setReceiveClock}
                  trackColor={{ false: '#3a3a3a', true: '#ff6600' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Info */}
        <Text style={styles.infoText}>
          Connect to Elektron Digitakt II to sync LFO timing. Transport messages
          control play/stop state, and clock messages set the tempo.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 20,
  },
  statusBanner: {
    backgroundColor: '#1a2a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#666',
  },
  statusDotActive: {
    backgroundColor: '#00ff00',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  bpmText: {
    color: '#ff6600',
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  section: {
    marginBottom: 16,
  },
  optionsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionsHeader: {
    backgroundColor: '#252525',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionsContent: {
    padding: 16,
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
  infoText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 16,
  },
});
