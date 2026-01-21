import React, { useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMidi } from '@/src/context/midi-context';
import { DigitaktConnection } from '@/src/components/settings/DigitaktConnection';
import { useLfoVerification } from '@/src/hooks/useLfoVerification';

export default function DeveloperScreen() {
  const { connected, connectedDeviceName } = useMidi();
  const { logs, isRunning, runTimingTest, clearLogs } = useLfoVerification();
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll when logs update
  const handleContentSizeChange = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Developer Tools',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <SymbolView name="xmark" size={20} tintColor="#ff6600" />
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        {/* MIDI Connection */}
        <View style={styles.midiSection}>
          <DigitaktConnection />
          {connected && connectedDeviceName && (
            <Text style={styles.connectedText}>
              Connected: {connectedDeviceName}
            </Text>
          )}
        </View>

        {/* Test Card */}
        <View style={styles.testCard}>
          <Text style={styles.testTitle}>LFO Timing Verification</Text>
          <Text style={styles.testDescription}>
            Compares Digitakt LFO output with elektron-lfo engine.{'\n'}
            TRI | SPD=16 | MULT=8 | 120 BPM{'\n'}
            Monitors CC 1 output for 3 seconds.
          </Text>
          <Pressable
            style={[styles.runButton, (!connected || isRunning) && styles.runButtonDisabled]}
            onPress={runTimingTest}
            disabled={!connected || isRunning}
          >
            <Text style={styles.runButtonText}>
              {isRunning ? 'Running...' : connected ? 'Run Test' : 'Connect MIDI First'}
            </Text>
          </Pressable>
        </View>

        {/* Log Output */}
        <View style={styles.logSection}>
          <View style={styles.logHeader}>
            <Text style={styles.logTitle}>Log Output</Text>
            <Pressable onPress={clearLogs} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
          </View>
          <ScrollView
            ref={scrollViewRef}
            style={styles.logContainer}
            contentContainerStyle={styles.logContent}
            onContentSizeChange={handleContentSizeChange}
          >
            {logs.length === 0 ? (
              <Text style={styles.logPlaceholder}>
                Connect to Digitakt and run the test.{'\n\n'}
                The test will:{'\n'}
                1. Configure LFO 1 on MIDI track{'\n'}
                2. Send a trigger note{'\n'}
                3. Capture CC output for 3 seconds{'\n'}
                4. Compare with engine simulation
              </Text>
            ) : (
              logs.map((entry, index) => (
                <Text
                  key={index}
                  style={[
                    styles.logEntry,
                    entry.type === 'success' && styles.logSuccess,
                    entry.type === 'error' && styles.logError,
                    entry.type === 'data' && styles.logData,
                  ]}
                  selectable
                >
                  <Text style={styles.logTime}>[{formatTime(entry.timestamp)}]</Text> {entry.message}
                </Text>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 16,
  },
  midiSection: {
    marginBottom: 16,
  },
  connectedText: {
    color: '#4ade80',
    fontSize: 12,
    marginTop: 8,
    fontFamily: 'Menlo',
  },
  testCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  testTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  testDescription: {
    color: '#888899',
    fontSize: 13,
    fontFamily: 'Menlo',
    lineHeight: 20,
    marginBottom: 16,
  },
  runButton: {
    backgroundColor: '#ff6600',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  runButtonDisabled: {
    backgroundColor: '#4a4a4a',
  },
  runButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  logSection: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#252525',
  },
  logTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  clearButtonText: {
    color: '#888899',
    fontSize: 13,
  },
  logContainer: {
    flex: 1,
  },
  logContent: {
    padding: 12,
  },
  logPlaceholder: {
    color: '#555',
    fontSize: 13,
    lineHeight: 20,
  },
  logEntry: {
    color: '#cccccc',
    fontSize: 12,
    fontFamily: 'Menlo',
    lineHeight: 18,
  },
  logTime: {
    color: '#666',
  },
  logSuccess: {
    color: '#4ade80',
  },
  logError: {
    color: '#f87171',
  },
  logData: {
    color: '#60a5fa',
  },
});
