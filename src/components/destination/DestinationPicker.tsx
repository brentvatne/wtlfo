import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useModulation } from '@/src/context/modulation-context';
import {
  DESTINATIONS,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getDestinationsByCategory,
} from '@/src/data/destinations';
import type { DestinationId } from '@/src/types/destination';

export function DestinationPicker() {
  const [isOpen, setIsOpen] = useState(false);
  const { activeDestinationId, setActiveDestinationId } = useModulation();

  const currentDestination = DESTINATIONS.find(d => d.id === activeDestinationId);

  const handleSelect = (id: DestinationId) => {
    Haptics.selectionAsync();
    setActiveDestinationId(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* Picker Row - shows current destination */}
      <Pressable
        style={styles.pickerRow}
        onPress={() => {
          Haptics.selectionAsync();
          setIsOpen(true);
        }}
      >
        <Text style={styles.pickerLabel}>DEST</Text>
        <View style={styles.pickerValue}>
          <Text style={styles.pickerValueText}>
            {currentDestination?.displayName ?? 'CUTOFF'}
          </Text>
          <Text style={styles.chevron}>▼</Text>
        </View>
      </Pressable>

      {/* Selection Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Destination</Text>
            <Pressable
              style={styles.closeButton}
              onPress={() => setIsOpen(false)}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
          >
            {CATEGORY_ORDER.map(category => {
              const destinations = getDestinationsByCategory(category);
              return (
                <View key={category} style={styles.categorySection}>
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
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Picker Row
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  pickerLabel: {
    color: '#888899',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  pickerValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerValueText: {
    color: '#ff6600',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  chevron: {
    color: '#666677',
    fontSize: 10,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeButtonText: {
    color: '#ff6600',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
  },

  // Category
  categorySection: {
    marginBottom: 24,
  },
  categoryLabel: {
    color: '#666677',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  categoryItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // Destination Item
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
