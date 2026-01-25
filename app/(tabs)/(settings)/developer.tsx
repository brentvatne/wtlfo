import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Switch } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMidi } from '@/src/context/midi-context';
import { DigitaktConnection } from '@/src/components/settings/DigitaktConnection';
import { useLfoVerification, TestSuiteKey } from '@/src/hooks/useLfoVerification';
import { useFrameRate } from '@/src/context/frame-rate-context';

type TabType = 'verification' | 'performance';

export default function DeveloperScreen() {
  const { connected } = useMidi();
  const { testSuites } = useLfoVerification();
  const { showOverlay, setShowOverlay } = useFrameRate();
  const [selectedSuite, setSelectedSuite] = useState<TestSuiteKey | 'all'>('all');
  const [activeTab, setActiveTab] = useState<TabType>('verification');

  const runTests = () => {
    if (activeTab === 'verification') {
      router.push({
        pathname: '/(tabs)/(settings)/test-run',
        params: { type: 'verification', suite: selectedSuite },
      });
    } else {
      router.push({
        pathname: '/(tabs)/(settings)/test-run',
        params: { type: 'performance' },
      });
    }
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
              style={[styles.runButton, !connected && styles.runButtonDisabled]}
              onPress={runTests}
              disabled={!connected}
            >
              <Text style={styles.runButtonText}>
                Run {selectedSuite === 'all' ? 'All Tests' : testSuites[selectedSuite].name}
              </Text>
            </Pressable>

            {!connected && (
              <Text style={styles.requiresConnection}>
                Requires MIDI connection
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.testCard}>
            <Text style={styles.testTitle}>Performance Benchmarks</Text>
            <Text style={styles.testDescription}>
              Measures path generation, waveform{'\n'}
              sampling, and slider drag performance
            </Text>

            <Pressable
              style={styles.runButton}
              onPress={runTests}
            >
              <Text style={styles.runButtonText}>Run Benchmarks</Text>
            </Pressable>
          </View>
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
  requiresConnection: {
    color: '#888899',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
