import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { usePreset } from '@/src/context/preset-context';
import { ParameterSlider } from '@/src/components/controls';

const COMMON_BPMS = [90, 100, 120, 130, 140];

export default function SettingsScreen() {
  const { bpm, setBPM } = usePreset();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0a0a0a' }}
      contentContainerStyle={{ padding: 20 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#ffffff',
            marginBottom: 16,
          }}
        >
          Tempo
        </Text>
        <ParameterSlider
          label="BPM"
          min={30}
          max={300}
          value={bpm}
          onChange={setBPM}
          formatValue={(v) => String(Math.round(v))}
        />
        <View style={styles.segmentedControl}>
          {COMMON_BPMS.map((tempo) => {
            const isSelected = Math.round(bpm) === tempo;
            return (
              <Pressable
                key={tempo}
                style={[
                  styles.segment,
                  isSelected && styles.segmentSelected,
                ]}
                onPress={() => setBPM(tempo)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    isSelected && styles.segmentTextSelected,
                  ]}
                >
                  {tempo}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#ffffff',
            marginBottom: 8,
          }}
        >
          Coming Soon
        </Text>
        <Text style={{ color: '#888899', fontSize: 15 }}>
          MIDI settings and more options will be available in future updates.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 4,
    marginTop: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentSelected: {
    backgroundColor: '#3a3a3a',
  },
  segmentText: {
    color: '#888899',
    fontSize: 14,
    fontWeight: '500',
  },
  segmentTextSelected: {
    color: '#ffffff',
  },
});
