import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useModulation } from '@/src/context/modulation-context';
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getDestinationsByCategory,
} from '@/src/data/destinations';
import type { DestinationId } from '@/src/types/destination';

export function DestinationPickerInline() {
  const { activeDestinationId, setActiveDestinationId } = useModulation();

  const handleSelect = (id: DestinationId) => {
    Haptics.selectionAsync();
    setActiveDestinationId(id);
  };

  const isNoneSelected = activeDestinationId === 'none';

  return (
    <View
      style={styles.container}
      accessibilityLabel="Modulation destination selector"
      accessibilityRole="radiogroup"
    >
      {/* None option at the top */}
      <Pressable
        style={[
          styles.noneItem,
          isNoneSelected && styles.noneItemSelected,
        ]}
        onPress={() => handleSelect('none')}
        accessibilityLabel="None, no destination"
        accessibilityRole="radio"
        accessibilityHint="Clear modulation destination"
        accessibilityState={{ checked: isNoneSelected }}
      >
        <Text
          style={[
            styles.noneText,
            isNoneSelected && styles.noneTextSelected,
          ]}
        >
          — NONE —
        </Text>
      </Pressable>

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
                return (
                  <Pressable
                    key={dest.id}
                    style={[
                      styles.destinationItem,
                      isSelected && styles.destinationItemSelected,
                    ]}
                    onPress={() => handleSelect(dest.id)}
                    accessibilityLabel={`${dest.displayName}, ${dest.name}`}
                    accessibilityRole="radio"
                    accessibilityHint={`Select ${dest.name} as modulation destination`}
                    accessibilityState={{ checked: isSelected }}
                  >
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
  noneItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333344',
    borderStyle: 'dashed',
  },
  noneItemSelected: {
    backgroundColor: '#333344',
    borderColor: '#666677',
  },
  noneText: {
    color: '#666677',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  noneTextSelected: {
    color: '#ffffff',
  },
  categorySection: {
    gap: 10,
  },
  categoryLabel: {
    color: '#666677',
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
  },
  destinationItemSelected: {
    backgroundColor: '#ff6600',
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
    color: '#666677',
    fontSize: 10,
  },
  destinationNameSelected: {
    color: 'rgba(0,0,0,0.6)',
  },
});
