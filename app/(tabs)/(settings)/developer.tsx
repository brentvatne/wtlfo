import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMidi } from '@/src/context/midi-context';
import { DigitaktConnection } from '@/src/components/settings/DigitaktConnection';
import { useLfoVerification, TestSuiteKey } from '@/src/hooks/useLfoVerification';

export default function DeveloperScreen() {
  const { connected } = useMidi();
  const { logs, isRunning, testSuites, runSuiteByKey, runAllSuites, clearLogs } = useLfoVerification();
  const [selectedSuite, setSelectedSuite] = useState<TestSuiteKey | 'all'>('all');
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
        <View style={styles.section}>
          <DigitaktConnection />
        </View>

        {/* Test Card */}
        <View style={styles.testCard}>
          <Text style={styles.testTitle}>LFO Verification</Text>
          <Text style={styles.testDescription}>
            Setup: Digitakt at 120 BPM{'\n'}
            MIDI track, LFO DEST=CC1, VAL1=64
          </Text>

          {/* Test Suite Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suiteScroller}>
            <Pressable
              style={[styles.suiteChip, selectedSuite === 'all' && styles.suiteChipSelected]}
              onPress={() => setSelectedSuite('all')}
            >
              <Text style={[styles.suiteChipText, selectedSuite === 'all' && styles.suiteChipTextSelected]}>
                All (56)
              </Text>
            </Pressable>
            {(Object.entries(testSuites) as [TestSuiteKey, { name: string; tests: unknown[] }][]).map(([key, suite]) => (
              <Pressable
                key={key}
                style={[styles.suiteChip, selectedSuite === key && styles.suiteChipSelected]}
                onPress={() => setSelectedSuite(key)}
              >
                <Text style={[styles.suiteChipText, selectedSuite === key && styles.suiteChipTextSelected]}>
                  {suite.name.replace(' Tests', '')} ({suite.tests.length})
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            style={[styles.runButton, (!connected || isRunning) && styles.runButtonDisabled]}
            onPress={() => {
              if (selectedSuite === 'all') {
                runAllSuites();
              } else {
                runSuiteByKey(selectedSuite);
              }
            }}
            disabled={!connected || isRunning}
          >
            <Text style={styles.runButtonText}>
              {isRunning ? 'Running...' : `Run ${selectedSuite === 'all' ? 'All Tests' : testSuites[selectedSuite].name}`}
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
                Digitakt setup required:{'\n'}
                • Set tempo to 120 BPM{'\n'}
                • Select a track, set to MIDI machine{'\n'}
                • CC SEL page: SEL1 = 1{'\n'}
                • CC VAL page: VAL1 = 64{'\n'}
                • LFO page: DEST = CC1{'\n\n'}
                Test will configure LFO, send trigger,{'\n'}
                and compare CC output with engine.
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
  section: {
    marginBottom: 16,
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
  suiteScroller: {
    marginBottom: 12,
    marginHorizontal: -4,
  },
  suiteChip: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
  },
  suiteChipSelected: {
    backgroundColor: '#ff6600',
  },
  suiteChipText: {
    color: '#888899',
    fontSize: 12,
    fontWeight: '500',
  },
  suiteChipTextSelected: {
    color: '#ffffff',
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
    fontSize: 14,
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
