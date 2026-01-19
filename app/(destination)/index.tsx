import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useNavigation } from 'expo-router';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { usePreset } from '@/src/context/preset-context';
import { useModulation } from '@/src/context/modulation-context';
import { getDestination } from '@/src/data/destinations';
import { LFOVisualizer, ELEKTRON_THEME } from '@/src/components/lfo';
import type { WaveformType, TriggerMode } from '@/src/components/lfo';
import { DestinationMeter } from '@/src/components/destination/DestinationMeter';
import { CenterValueSlider } from '@/src/components/destination/CenterValueSlider';
import { colors } from '@/src/theme';

export default function DestinationScreen() {
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const visualizerWidth = screenWidth - 40;

  const {
    currentConfig,
    bpm,
    lfoPhase,
    lfoOutput,
    timingInfo,
    isEditing,
  } = usePreset();

  const {
    activeDestinationId,
    getCenterValue,
    setCenterValue,
  } = useModulation();

  const destination = getDestination(activeDestinationId);
  const centerValue = getCenterValue(activeDestinationId);

  // State for the live computed value
  const [computedValue, setComputedValue] = useState(centerValue);

  // Handle null destination (none selected)
  const destMin = destination?.min ?? 0;
  const destMax = destination?.max ?? 127;
  const destName = destination?.name ?? 'None';
  const destDisplayName = destination?.displayName ?? '—';
  const destBipolar = destination?.bipolar ?? false;

  // Update navigation title when destination changes
  useEffect(() => {
    navigation.setOptions({
      title: destination ? `${destName} (${destDisplayName})` : 'No Destination',
    });
  }, [navigation, destination, destName, destDisplayName]);

  // Calculate modulation range
  const range = destMax - destMin;
  const maxModulation = range / 2;
  const depthScale = Math.abs(currentConfig.depth / 63);
  const depthSign = Math.sign(currentConfig.depth) || 1;
  const swing = maxModulation * depthScale;
  const minValue = Math.max(destMin, Math.round(centerValue - swing));
  const maxValue = Math.min(destMax, Math.round(centerValue + swing));

  // React to LFO output changes and compute the actual value
  useAnimatedReaction(
    () => lfoOutput.value,
    (output) => {
      // lfoOutput ranges from -1 to 1, apply to swing with depth direction
      const modulation = output * swing * depthSign;
      const newValue = Math.round(
        Math.max(destMin, Math.min(destMax, centerValue + modulation))
      );
      runOnJS(setComputedValue)(newValue);
    },
    [centerValue, swing, depthSign, destMin, destMax]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Dual visualization: LFO + Meter side by side */}
      <View style={styles.visualizationRow}>
        {/* LFO Waveform */}
        <View style={styles.lfoContainer}>
          <LFOVisualizer
            phase={lfoPhase}
            output={lfoOutput}
            waveform={currentConfig.waveform as WaveformType}
            speed={currentConfig.speed}
            multiplier={currentConfig.multiplier}
            startPhase={currentConfig.startPhase}
            mode={currentConfig.mode as TriggerMode}
            depth={currentConfig.depth}
            fade={currentConfig.fade}
            bpm={bpm}
            cycleTimeMs={timingInfo.cycleTimeMs}
            noteValue={timingInfo.noteValue}
            width={visualizerWidth - 80}
            height={200}
            theme={ELEKTRON_THEME}
            showParameters={false}
            showTiming={false}
            showOutput={false}
            isEditing={isEditing}
            strokeWidth={2}
          />
        </View>

        {/* Destination Meter */}
        <DestinationMeter
          lfoOutput={lfoOutput}
          destination={destination}
          centerValue={centerValue}
          depth={currentConfig.depth}
          width={60}
          height={200}
        />
      </View>

      {/* Current Values Display */}
      <View style={styles.valuesRow}>
        <View style={styles.valueBox}>
          <Text style={styles.valueLabel}>CENTER</Text>
          <Text style={styles.valueNumber}>{Math.round(centerValue)}</Text>
        </View>
        <View style={[styles.valueBox, styles.valueBoxHighlight]}>
          <Text style={styles.valueLabel}>VALUE</Text>
          <Text style={styles.valueNumberLive}>{computedValue}</Text>
        </View>
        <View style={styles.valueBox}>
          <Text style={styles.valueLabel}>RANGE</Text>
          <Text style={styles.valueNumber}>{minValue} — {maxValue}</Text>
        </View>
      </View>

      {/* Center Value Slider */}
      <View style={styles.sliderContainer}>
        <CenterValueSlider
          value={centerValue}
          onChange={(v) => setCenterValue(activeDestinationId, v)}
          min={destMin}
          max={destMax}
          label="CENTER VALUE"
          bipolar={destBipolar}
        />
      </View>

      {/* Modulation Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Modulation</Text>
        <Text style={styles.infoText}>
          The LFO modulates {destName.toLowerCase()} around the center value.
          {destBipolar
            ? ' This is a bipolar parameter that can go positive or negative from center.'
            : ' This parameter ranges from minimum to maximum.'}
        </Text>
        <Text style={styles.infoText}>
          With depth at {currentConfig.depth >= 0 ? '+' : ''}{currentConfig.depth},
          the value will swing between {minValue} and {maxValue}.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  visualizationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  lfoContainer: {
    flex: 1,
  },
  valuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  valueBox: {
    alignItems: 'center',
  },
  valueBoxHighlight: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  valueLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  valueNumber: {
    fontSize: 18,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  valueNumberLive: {
    fontSize: 24,
    color: colors.accent,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  sliderContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
});
