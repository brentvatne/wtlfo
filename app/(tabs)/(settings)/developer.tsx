import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Switch } from 'react-native';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMidi } from '@/src/context/midi-context';
import { DigitaktConnection } from '@/src/components/settings/DigitaktConnection';
import { useLfoVerification, TestSuiteKey } from '@/src/hooks/useLfoVerification';
import { usePerformanceBenchmark } from '@/src/hooks/usePerformanceBenchmark';
import { useFrameRate } from '@/src/context/frame-rate-context';

type TabType = 'verification' | 'performance';

export default function DeveloperScreen() {
  const { connected } = useMidi();
  const { logs, isRunning, testSuites, runSuiteByKey, runAllSuites, clearLogs } = useLfoVerification();
  const {
    logs: perfLogs,
    isRunning: perfRunning,
    results: perfResults,
    runAllBenchmarks,
    clearLogs: clearPerfLogs,
  } = usePerformanceBenchmark();
  const { showOverlay, setShowOverlay } = useFrameRate();
  const [selectedSuite, setSelectedSuite] = useState<TestSuiteKey | 'all'>('all');
  const [activeTab, setActiveTab] = useState<TabType>('verification');
  const scrollViewRef = useRef<ScrollView>(null);
  const perfScrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll when logs update
  const handleContentSizeChange = () => {
    if (activeTab === 'verification') {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    } else {
      perfScrollViewRef.current?.scrollToEnd({ animated: true });
    }
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

        {/* Frame Rate Overlay Toggle */}
        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text style={styles.settingTitle}>Frame Rate Overlay</Text>
            <Text style={styles.settingDescription}>Show JS/UI thread fps</Text>
          </View>
          <Switch
            value={showOverlay}
            onValueChange={setShowOverlay}
            trackColor={{ false: '#3a3a3a', true: '#ff6600' }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'verification' && styles.tabActive]}
            onPress={() => setActiveTab('verification')}
          >
            <Text style={[styles.tabText, activeTab === 'verification' && styles.tabTextActive]}>
              Verification
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'performance' && styles.tabActive]}
            onPress={() => setActiveTab('performance')}
          >
            <Text style={[styles.tabText, activeTab === 'performance' && styles.tabTextActive]}>
              Performance
            </Text>
          </Pressable>
        </View>

        {activeTab === 'verification' ? (
          <>
            {/* Verification Test Card */}
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
                    All (75)
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

            {/* Verification Log Output */}
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
          </>
        ) : (
          <>
            {/* Performance Test Card */}
            <View style={styles.testCard}>
              <Text style={styles.testTitle}>Performance Benchmarks</Text>
              <Text style={styles.testDescription}>
                Measures path generation, waveform{'\n'}
                sampling, and slider drag performance
              </Text>

              <Pressable
                style={[styles.runButton, perfRunning && styles.runButtonDisabled]}
                onPress={runAllBenchmarks}
                disabled={perfRunning}
              >
                <Text style={styles.runButtonText}>
                  {perfRunning ? 'Running...' : 'Run Benchmarks'}
                </Text>
              </Pressable>
            </View>

            {/* Results Summary */}
            {perfResults.length > 0 && (
              <View style={styles.resultsCard}>
                <Text style={styles.resultsTitle}>Results</Text>
                <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsScrollContent} nestedScrollEnabled>
                  {perfResults.map((result, index) => (
                    <View key={index} style={styles.resultRow}>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultName}>{result.name}</Text>
                        <Text style={styles.resultDetails}>
                          {result.avgMs.toFixed(2)}ms avg, {result.maxMs.toFixed(2)}ms max
                        </Text>
                      </View>
                      <View style={[styles.resultBadge, result.passed ? styles.resultPass : styles.resultFail]}>
                        <Text style={styles.resultBadgeText}>{result.passed ? 'PASS' : 'FAIL'}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Performance Log Output */}
            <View style={styles.logSection}>
              <View style={styles.logHeader}>
                <Text style={styles.logTitle}>Log Output</Text>
                <Pressable onPress={clearPerfLogs} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>Clear</Text>
                </Pressable>
              </View>
              <ScrollView
                ref={perfScrollViewRef}
                style={styles.logContainer}
                contentContainerStyle={styles.logContent}
                onContentSizeChange={handleContentSizeChange}
              >
                {perfLogs.length === 0 ? (
                  <Text style={styles.logPlaceholder}>
                    Tap "Run Benchmarks" to measure{'\n'}
                    visualization performance.{'\n\n'}
                    Tests include:{'\n'}
                    • Waveform path generation{'\n'}
                    • Per-waveform comparison{'\n'}
                    • Throttle efficiency{'\n'}
                    • Slider drag simulation
                  </Text>
                ) : (
                  perfLogs.map((entry, index) => (
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
          </>
        )}
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
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  settingLabel: {
    flex: 1,
  },
  settingTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  settingDescription: {
    color: '#888899',
    fontSize: 12,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#ff6600',
  },
  tabText: {
    color: '#888899',
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#ffffff',
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
  resultsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  resultsTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultsScroll: {
    maxHeight: 250,
  },
  resultsScrollContent: {
    paddingBottom: 40,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  resultDetails: {
    color: '#888899',
    fontSize: 11,
    marginTop: 2,
  },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  resultPass: {
    backgroundColor: '#166534',
  },
  resultFail: {
    backgroundColor: '#991b1b',
  },
  resultBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
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
