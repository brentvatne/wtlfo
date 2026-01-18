import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { usePreset } from '@/src/context/preset-context';

export default function PresetsScreen() {
  const { presets, activePreset, setActivePreset } = usePreset();

  const handleSelect = (index: number) => {
    setActivePreset(index);
    router.back();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0a0a0a' }}
      contentContainerStyle={{ padding: 20 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={{ gap: 12 }}>
        {presets.map((preset, index) => (
          <Pressable
            key={preset.name}
            onPress={() => handleSelect(index)}
            style={({ pressed }) => ({
              backgroundColor: activePreset === index ? '#ff6600' : '#1a1a2e',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: activePreset === index ? '#ff6600' : '#333344',
              opacity: pressed ? 0.8 : 1,
              borderCurve: 'continuous',
            })}
          >
            <Text
              style={{
                color: activePreset === index ? '#ffffff' : '#ffffff',
                fontSize: 17,
                fontWeight: '600',
                marginBottom: 4,
              }}
            >
              {preset.name}
            </Text>
            <Text
              style={{
                color: activePreset === index ? 'rgba(255,255,255,0.8)' : '#888899',
                fontSize: 13,
              }}
            >
              {preset.config.waveform} | SPD {preset.config.speed} | MULT {preset.config.multiplier} | {preset.config.mode}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
