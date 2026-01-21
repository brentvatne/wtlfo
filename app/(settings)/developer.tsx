import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMidi } from '@/src/context/midi-context';

interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error';
}

export default function DeveloperScreen() {
  const { connected, connectedDeviceName } = useMidi();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const log = (message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = { timestamp: Date.now(), message, type };
    console.log(`[LFO Test] ${message}`);
    setLogs((prev) => [...prev, entry]);
    // Auto-scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const runTimingTest = async () => {
    if (!connected) {
      log('Error: No MIDI device connected', 'error');
      return;
    }

    setIsRunning(true);
    log('Starting timing verification test...');
    log(`Connected to: ${connectedDeviceName}`);

    // TODO: Implement the actual test
    // For now, just log placeholder messages
    log('Test configuration:');
    log('  Waveform: TRI');
    log('  Speed: 16, Multiplier: 8');
    log('  Depth: 63, Fade: 0, StartPhase: 0');
    log('  Mode: TRG');
    log('  Expected cycle time: 2000ms at 120 BPM');

    log('');
    log('Configuring Digitakt LFO via MIDI CCs...');

    // Simulate test delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    log('Sending trigger...');
    log('Capturing CC values for 3 seconds...');

    await new Promise((resolve) => setTimeout(resolve, 1000));

    log('');
    log('Test not yet implemented - CC send/receive ready', 'info');
    log('Next: Implement CC capture and comparison logic', 'info');

    setIsRunning(false);
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
      {/* MIDI Status */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, connected ? styles.statusConnected : styles.statusDisconnected]} />
        <Text style={styles.statusText}>
          {connected ? `Connected: ${connectedDeviceName}` : 'No MIDI device connected'}
        </Text>
      </View>

      {/* Test Card */}
      <View style={styles.testCard}>
        <Text style={styles.testTitle}>Timing Verification</Text>
        <Text style={styles.testDescription}>
          TRI | SPD=16 | MULT=8 | 120 BPM{'\n'}
          Expected: 2000ms cycle
        </Text>
        <Pressable
          style={[styles.runButton, (!connected || isRunning) && styles.runButtonDisabled]}
          onPress={runTimingTest}
          disabled={!connected || isRunning}
        >
          <Text style={styles.runButtonText}>
            {isRunning ? 'Running...' : 'Run Test'}
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
        >
          {logs.length === 0 ? (
            <Text style={styles.logPlaceholder}>
              Logs will appear here when you run a test.
            </Text>
          ) : (
            logs.map((entry, index) => (
              <Text
                key={index}
                style={[
                  styles.logEntry,
                  entry.type === 'success' && styles.logSuccess,
                  entry.type === 'error' && styles.logError,
                ]}
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
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusConnected: {
    backgroundColor: '#4ade80',
  },
  statusDisconnected: {
    backgroundColor: '#666',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
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
    fontStyle: 'italic',
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
});
