import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useLfoVerification, TestSuiteKey } from '@/src/hooks/useLfoVerification';
import { usePerformanceBenchmark } from '@/src/hooks/usePerformanceBenchmark';

type TestType = 'verification' | 'performance';

export default function TestRunScreen() {
  const params = useLocalSearchParams<{ type: TestType; suite?: TestSuiteKey | 'all' }>();
  const testType = params.type || 'verification';
  const selectedSuite = (params.suite || 'all') as TestSuiteKey | 'all';

  const {
    logs: verificationLogs,
    isRunning: verificationRunning,
    testSuites,
    runSuiteByKey,
    runAllSuites,
    clearLogs: clearVerificationLogs,
  } = useLfoVerification();

  const {
    logs: perfLogs,
    isRunning: perfRunning,
    results: perfResults,
    runAllBenchmarks,
    clearLogs: clearPerfLogs,
  } = usePerformanceBenchmark();

  const scrollViewRef = useRef<ScrollView>(null);
  const hasStartedRef = useRef(false);

  const isRunning = testType === 'verification' ? verificationRunning : perfRunning;
  const logs = testType === 'verification' ? verificationLogs : perfLogs;

  // Get test info for header
  const getTestTitle = () => {
    if (testType === 'performance') {
      return 'Performance Benchmarks';
    }
    if (selectedSuite === 'all') {
      return 'All Verification Tests';
    }
    return testSuites[selectedSuite]?.name || 'Verification Tests';
  };

  const getTestCount = () => {
    if (testType === 'performance') {
      return '4 benchmarks';
    }
    if (selectedSuite === 'all') {
      return '75 tests';
    }
    return `${testSuites[selectedSuite]?.tests.length || 0} tests`;
  };

  // Start tests when screen opens
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    // Clear previous logs
    if (testType === 'verification') {
      clearVerificationLogs();
    } else {
      clearPerfLogs();
    }

    // Small delay to let screen render first
    const timer = setTimeout(() => {
      if (testType === 'verification') {
        if (selectedSuite === 'all') {
          runAllSuites();
        } else {
          runSuiteByKey(selectedSuite);
        }
      } else {
        runAllBenchmarks();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [testType, selectedSuite]);

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
          title: 'Test Run',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <SymbolView name="chevron.left" size={20} tintColor="#ff6600" />
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        {/* Test Info Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{getTestTitle()}</Text>
            <Text style={styles.headerSubtitle}>{getTestCount()}</Text>
          </View>
          <View style={[styles.statusBadge, isRunning ? styles.statusRunning : styles.statusComplete]}>
            <Text style={styles.statusText}>{isRunning ? 'Running' : 'Complete'}</Text>
          </View>
        </View>

        {/* Performance Results Summary */}
        {testType === 'performance' && perfResults.length > 0 && !perfRunning && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Results</Text>
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
          </View>
        )}

        {/* Log Output */}
        <View style={styles.logSection}>
          <View style={styles.logHeader}>
            <Text style={styles.logTitle}>Log Output</Text>
          </View>
          <ScrollView
            ref={scrollViewRef}
            style={styles.logContainer}
            contentContainerStyle={styles.logContent}
            onContentSizeChange={handleContentSizeChange}
          >
            {logs.length === 0 ? (
              <Text style={styles.logPlaceholder}>
                {isRunning ? 'Starting tests...' : 'No logs yet'}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#888899',
    fontSize: 13,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusRunning: {
    backgroundColor: '#ff6600',
  },
  statusComplete: {
    backgroundColor: '#166534',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
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
