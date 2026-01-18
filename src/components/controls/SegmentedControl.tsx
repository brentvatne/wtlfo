import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';

interface SegmentedControlProps<T extends string | number> {
  label: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
  formatOption?: (option: T) => string;
}

export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
  formatOption = (opt) => String(opt),
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.segmentsContainer}
      >
        {options.map((option, index) => {
          const isSelected = option === value;
          const isFirst = index === 0;
          const isLast = index === options.length - 1;

          return (
            <Pressable
              key={String(option)}
              onPress={() => onChange(option)}
              style={[
                styles.segment,
                isFirst && styles.segmentFirst,
                isLast && styles.segmentLast,
                isSelected && styles.segmentSelected,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  isSelected && styles.segmentTextSelected,
                ]}
              >
                {formatOption(option)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: '#888899',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentsContainer: {
    flexDirection: 'row',
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderLeftWidth: 0,
  },
  segmentFirst: {
    borderLeftWidth: 1,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  segmentLast: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  segmentSelected: {
    backgroundColor: '#ff6600',
    borderColor: '#ff6600',
  },
  segmentText: {
    color: '#888899',
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextSelected: {
    color: '#ffffff',
  },
});
