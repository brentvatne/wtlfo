import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { useModulation } from '@/src/context/modulation-context';
import { useAudio } from '@/src/context/audio-context';
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getDestinationsByCategory,
} from '@/src/data/destinations';
import type { DestinationId } from '@/src/types/destination';

// Destinations that can be heard with the test tone
const AUDIO_SUPPORTED_DESTINATIONS: Set<DestinationId> = new Set([
  'volume',
  'filter_freq',
  'filter_reso',
  'pan',
  'pitch',
]);

interface DestinationPickerInlineProps {
  // Callback that wraps the change - receives a function to execute after fade-out
  onSelectionChange?: (applyChange: () => void) => void;
}

export function DestinationPickerInline({ onSelectionChange }: DestinationPickerInlineProps) {
  const { activeDestinationId, setActiveDestinationId } = useModulation();
  const { isEnabled: isToneEnabled } = useAudio();

  const handleSelect = (id: DestinationId) => {
    Haptics.selectionAsync();
    // Toggle: if already selected, deselect (set to 'none')
    const newId = id === activeDestinationId ? 'none' : id;

    if (onSelectionChange) {
      // Wrap the change in the fade animation
      onSelectionChange(() => setActiveDestinationId(newId));
    } else {
      // No animation wrapper, apply immediately
      setActiveDestinationId(newId);
    }
  };

  return (
    <View
      style={styles.container}
      accessibilityLabel="Modulation destination selector"
      accessibilityRole="radiogroup"
    >
      {isToneEnabled && (
        <View style={styles.hintContainer}>
          <SymbolView name="speaker.wave.2.fill" size={12} tintColor="#8888a0" />
          <Text style={styles.hintText}>can be heard with test tone</Text>
        </View>
      )}
      {CATEGORY_ORDER.map(category => {
        const destinations = getDestinationsByCategory(category);
        return (
          <View
            key={category}
            style={styles.categorySection}
            accessible={true}
            accessibilityLabel={`${CATEGORY_LABELS[category]} destinations`}
          >
            <Text style={styles.categoryLabel}>
              {CATEGORY_LABELS[category]}
            </Text>
            <View style={styles.categoryItems}>
              {destinations.map(dest => {
                const isSelected = dest.id === activeDestinationId;
                const supportsAudio = AUDIO_SUPPORTED_DESTINATIONS.has(dest.id);
                const showAudioIcon = isToneEnabled && supportsAudio;
                return (
                  <Pressable
                    key={dest.id}
                    style={[
                      styles.destinationItem,
                      isSelected && styles.destinationItemSelected,
                    ]}
                    onPress={() => handleSelect(dest.id)}
                    accessibilityLabel={`${dest.displayName}, ${dest.name}${showAudioIcon ? ', audio preview available' : ''}`}
                    accessibilityRole="radio"
                    accessibilityHint={`Select ${dest.name} as modulation destination`}
                    accessibilityState={{ checked: isSelected }}
                  >
                    {showAudioIcon && (
                      <View style={styles.audioIconContainer}>
                        <SymbolView
                          name="speaker.wave.2.fill"
                          size={9}
                          tintColor={isSelected ? '#000000' : '#ff6600'}
                        />
                      </View>
                    )}
                    <Text
                      style={[
                        styles.destinationDisplay,
                        isSelected && styles.destinationDisplaySelected,
                      ]}
                    >
                      {dest.displayName}
                    </Text>
                    <Text
                      style={[
                        styles.destinationName,
                        isSelected && styles.destinationNameSelected,
                      ]}
                    >
                      {dest.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
    marginBottom: 4,
  },
  hintText: {
    color: '#8888a0',
    fontSize: 11,
  },
  categorySection: {
    gap: 10,
  },
  categoryLabel: {
    color: '#8888a0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  categoryItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  destinationItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 80,
    alignItems: 'center',
    position: 'relative',
  },
  destinationItemSelected: {
    backgroundColor: '#ff6600',
  },
  audioIconContainer: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  destinationDisplay: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  destinationDisplaySelected: {
    color: '#000000',
  },
  destinationName: {
    color: '#8888a0',
    fontSize: 10,
  },
  destinationNameSelected: {
    color: 'rgba(0,0,0,0.6)',
  },
});
