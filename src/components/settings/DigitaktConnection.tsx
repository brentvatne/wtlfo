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

  const statusLabel = connected
    ? 'Connected'
    : digitaktAvailable
      ? 'Available'
      : 'Not detected';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Digitakt II</Text>
        <View style={styles.headerRight}>
          {connecting ? (
            <ActivityIndicator size="small" color="#ff6600" />
          ) : (
            <View style={styles.statusBadge}>
              <View style={[
                styles.statusDot,
                connected ? styles.statusConnected :
                digitaktAvailable ? styles.statusAvailable :
                styles.statusUnavailable
              ]} />
              <Text style={styles.statusBadgeText}>{statusLabel}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        {/* Auto-connect toggle */}
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Auto-connect</Text>
            <Text style={styles.settingDescription}>
              {connected
                ? 'Syncing transport and clock'
                : autoConnect
                  ? 'Waiting for device...'
                  : 'Enable to connect automatically'}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#888899',
  },
  content: {
    padding: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
