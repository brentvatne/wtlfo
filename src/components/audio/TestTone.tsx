import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useAudio } from '@/src/context/audio-context';
import { colors } from '@/src/theme';

interface TestToneProps {
  visible?: boolean;
}

export function TestTone({ visible = true }: TestToneProps) {
  const { isEnabled, isActive, isSupported, toggle } = useAudio();

  if (!visible || !isSupported) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.label}>Test Tone</Text>
          {isActive && <View style={styles.playingIndicator} />}
        </View>
        <Text style={styles.subtitle}>Hear LFO modulation on a saw wave</Text>
        <Text style={styles.supported}>Supports: PITCH, AMP VOL, FLTF, FLTR, PAN</Text>
      </View>
      <Switch
        value={isEnabled}
        onValueChange={toggle}
        trackColor={{ false: '#3e3e3e', true: colors.accent }}
        thumbColor="#ffffff"
        ios_backgroundColor="#3e3e3e"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginTop: 8,
  },
  labelContainer: {
    flex: 1,
    marginRight: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    color: '#8888a0',
    fontSize: 12,
    marginTop: 2,
  },
  supported: {
    color: '#666680',
    fontSize: 11,
    marginTop: 2,
  },
  playingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});
