import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { useMidi } from '@/src/context/midi-context';

export default function MidiScreen() {
  const {
    devices,
    refreshDevices,
    connected,
    connectedDeviceName,
    connecting,
    connect,
    disconnect,
    transportRunning,
    externalBpm,
    receiveTransport,
    setReceiveTransport,
    receiveClock,
    setReceiveClock,
  } = useMidi();

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  const handleDevicePress = async (deviceName: string) => {
    if (connected && connectedDeviceName === deviceName) {
      disconnect();
    } else {
      await connect(deviceName);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Status Banner */}
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

      {/* Device List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>Devices</Text>
          <Pressable onPress={refreshDevices} style={styles.refreshButton}>
            <Text style={styles.refreshButtonText}>Scan</Text>
          </Pressable>
        </View>
        {devices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No MIDI devices found</Text>
            <Text style={styles.emptyStateHint}>
              Connect a USB MIDI device and tap Scan
            </Text>
          </View>
        ) : (
          devices.map((device) => {
            const isConnected = connected && connectedDeviceName === device.name;
            const isConnecting = connecting && !connected;
            return (
              <Pressable
                key={device.id}
                style={[styles.deviceRow, isConnected && styles.deviceRowConnected]}
                onPress={() => handleDevicePress(device.name)}
                disabled={connecting}
              >
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceStatus}>
                    {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Tap to connect'}
                  </Text>
                </View>
                {isConnecting && <ActivityIndicator size="small" color="#ff6600" />}
                {isConnected && <View style={styles.connectedIndicator} />}
              </Pressable>
            );
          })
        )}
      </View>

      {/* Sync Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sync Options</Text>
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

      {/* Info */}
      <Text style={styles.infoText}>
        Connect to a MIDI device to sync LFO timing with external gear. Transport
        messages control play/stop state, and clock messages set the tempo.
      </Text>
    </ScrollView>
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
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
    marginBottom: 16,
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
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
  },
  refreshButtonText: {
    color: '#ff6600',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#888899',
    fontSize: 15,
    fontWeight: '500',
  },
  emptyStateHint: {
    color: '#666',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  deviceRowConnected: {
    backgroundColor: '#1a2a1a',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderBottomColor: '#2a3a2a',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  deviceStatus: {
    color: '#888899',
    fontSize: 13,
    marginTop: 2,
  },
  connectedIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00cc00',
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
