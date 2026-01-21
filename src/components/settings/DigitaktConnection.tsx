import React from 'react';
import { View, Text, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { useMidi } from '@/src/context/midi-context';

export function DigitaktConnection() {
  const {
    digitaktAvailable,
    connected,
    connectedDeviceName,
    connecting,
    autoConnect,
    setAutoConnect,
  } = useMidi();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Elektron Digitakt II</Text>
        {connecting && <ActivityIndicator size="small" color="#ff6600" />}
      </View>

      <View style={styles.content}>
        {/* Connection status */}
        <View style={styles.statusRow}>
          <View style={[
            styles.statusDot,
            connected ? styles.statusConnected :
            digitaktAvailable ? styles.statusAvailable :
            styles.statusUnavailable
          ]} />
          <Text style={styles.statusText}>
            {connected
              ? `Connected${connectedDeviceName ? ` to ${connectedDeviceName}` : ''}`
              : digitaktAvailable
                ? 'Available'
                : 'Not detected'}
          </Text>
        </View>

        {/* Auto-connect toggle */}
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Auto-connect</Text>
            <Text style={styles.settingDescription}>
              {connected
                ? 'Connected and syncing'
                : digitaktAvailable
                  ? 'Will connect when enabled'
                  : 'Will connect when device is available'}
            </Text>
          </View>
          <Switch
            value={autoConnect}
            onValueChange={setAutoConnect}
            trackColor={{ false: '#3a3a3a', true: '#ff6600' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#252525',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusConnected: {
    backgroundColor: '#22c55e',
  },
  statusAvailable: {
    backgroundColor: '#ff6600',
  },
  statusUnavailable: {
    backgroundColor: '#666',
  },
  statusText: {
    color: '#888899',
    fontSize: 14,
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
});
