import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { usePreset } from '@/src/context/preset-context';
import { useModulation } from '@/src/context/modulation-context';
import { colors } from '@/src/theme';

export default function PresetsScreen() {
  const { presets, activePreset, setActivePreset } = usePreset();
  const { setActiveDestinationId, setCenterValue } = useModulation();

  const handleSelect = (index: number) => {
    const preset = presets[index];
    setActivePreset(index);

    // Also load destination settings from preset
    if (preset.destination) {
      setActiveDestinationId(preset.destination);
      if (preset.centerValue !== undefined) {
        setCenterValue(preset.destination, preset.centerValue);
      }
    }

    router.back();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.list}>
        {presets.map((preset, index) => {
          const isActive = activePreset === index;
          return (
            <Pressable
              key={preset.name}
              onPress={() => handleSelect(index)}
              style={({ pressed }) => [
                styles.item,
                isActive && styles.itemActive,
                pressed && styles.itemPressed,
              ]}
            >
              <Text style={[styles.name, isActive && styles.nameActive]}>
                {preset.name}
              </Text>
              <Text style={[styles.details, isActive && styles.detailsActive]}>
                {preset.config.waveform} | SPD {preset.config.speed} | MULT {preset.config.multiplier} | {preset.config.mode}
              </Text>
            </Pressable>
          );
        })}
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
  list: {
    gap: 10,
  },
  item: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
  },
  itemActive: {
    backgroundColor: colors.accent,
  },
  itemPressed: {
    opacity: 0.8,
  },
  name: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  nameActive: {
    color: '#000000',
  },
  details: {
    color: '#8888a0',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  detailsActive: {
    color: 'rgba(0, 0, 0, 0.6)',
  },
});
