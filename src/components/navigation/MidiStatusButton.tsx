import React from 'react';
import { Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMidi } from '@/src/context/midi-context';

/**
 * MIDI connection status button for navigation headers.
 * Only renders when autoConnect is enabled.
 *
 * States:
 * - Connected: Green link icon
 * - Available but not connected: Orange link icon (connecting soon)
 * - Not available: Gray link.badge.plus icon
 * - Working: Activity indicator
 */
export function MidiStatusButton() {
  const {
    autoConnect,
    connected,
    digitaktAvailable,
    connecting,
  } = useMidi();

  // Only show when auto-connect is enabled
  if (!autoConnect) {
    return null;
  }

  const handlePress = () => {
    router.push('/midi');
  };

  // Working state (connecting)
  if (connecting) {
    return (
      <Pressable
        onPress={handlePress}
        style={styles.button}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ActivityIndicator size="small" color="#ff6600" />
      </Pressable>
    );
  }

  // Connected state
  if (connected) {
    return (
      <Pressable
        onPress={handlePress}
        style={styles.button}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <SymbolView
          name="link"
          size={18}
          tintColor="#22c55e"
        />
      </Pressable>
    );
  }

  // Available but not yet connected (will connect shortly)
  if (digitaktAvailable) {
    return (
      <Pressable
        onPress={handlePress}
        style={styles.button}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <SymbolView
          name="link"
          size={18}
          tintColor="#ff6600"
        />
      </Pressable>
    );
  }

  // Not available
  return (
    <Pressable
      onPress={handlePress}
      style={styles.button}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <SymbolView
        name="link.badge.plus"
        size={18}
        tintColor="#666"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
