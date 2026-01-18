import React from 'react';
import { View, Text, ScrollView } from 'react-native';

export default function SettingsScreen() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0a0a0a' }}
      contentContainerStyle={{ padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center' }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={{ alignItems: 'center', gap: 12 }}>
        <Text style={{ color: '#888899', fontSize: 48 }}>
          {/* Gear icon placeholder */}
        </Text>
        <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '600' }}>
          Settings
        </Text>
        <Text style={{ color: '#888899', fontSize: 15, textAlign: 'center' }}>
          BPM, MIDI, and other settings will be available here.
        </Text>
      </View>
    </ScrollView>
  );
}
