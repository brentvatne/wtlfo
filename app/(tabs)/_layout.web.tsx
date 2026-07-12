import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import type { TabTriggerSlotProps } from 'expo-router/ui';

// Web tab layout: NativeTabs' web fallback renders a top bar, so we use the
// headless tabs primitives to put a bottom tab bar in place instead. The bar
// background/border span the full viewport; the triggers sit centered.
type TabButtonProps = TabTriggerSlotProps & { label: string };

function TabButton({ label, isFocused, ...props }: TabButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={[styles.tabButton, isFocused && styles.tabButtonFocused]}
    >
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>{label}</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList style={styles.tabBar}>
        <TabTrigger name="(home)" href="/(tabs)/(home)" asChild>
          <TabButton label="Editor" />
        </TabTrigger>
        <TabTrigger name="(learn)" href="/(tabs)/(learn)" asChild>
          <TabButton label="Learn" />
        </TabTrigger>
        <TabTrigger name="(settings)" href="/(tabs)/(settings)" asChild>
          <TabButton label="Settings" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  slot: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#222222',
  },
  tabButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 18,
  },
  tabButtonFocused: {
    backgroundColor: '#2a2a2a',
  },
  tabLabel: {
    color: '#888899',
    fontSize: 14,
    fontWeight: '600',
  },
  tabLabelFocused: {
    color: '#ff6600',
  },
});
