import React, { useEffect, useState } from 'react';
import { useMarkInteractive } from '@/src/hooks/useMarkInteractive';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useNavigation } from "expo-router/react-navigation";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { usePresetStable } from '@/src/context/preset-context';
import {
  AboutIcon,
  QuestionWaveIcon,
  WaveformsIcon,
  SpeedometerIcon,
  EnvelopeIcon,
  TriggersIcon,
  DestinationsIcon,
} from '@/src/components/learn';

interface TopicCard {
  id: string;
  IconComponent: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; backgroundColor?: string }>;
  title: string;
  description: string;
  route: string;
}

const TOPICS: TopicCard[] = [
  {
    id: 'about',
    IconComponent: AboutIcon,
    title: 'About this app',
    description: 'What it does, limitations, and how to use it',
    route: '/about',
  },
  {
    id: 'intro',
    IconComponent: QuestionWaveIcon,
    title: 'What is an LFO?',
    description: 'The basics of low frequency oscillators',
    route: '/intro',
  },
  {
    id: 'waveforms',
    IconComponent: WaveformsIcon,
    title: 'Waveforms',
    description: 'Shapes that define modulation character',
    route: '/waveforms',
  },
  {
    id: 'timing',
    IconComponent: SpeedometerIcon,
    title: 'Timing',
    description: 'How SPD and MULT control LFO rate',
    route: '/timing',
  },
  {
    id: 'depth',
    IconComponent: EnvelopeIcon,
    title: 'Depth & fade',
    description: 'Controlling intensity and envelope',
    route: '/depth',
  },
  {
    id: 'modes',
    IconComponent: TriggersIcon,
    title: 'Trigger modes',
    description: 'FRE, TRG, HLD, ONE, HLF explained',
    route: '/modes',
  },
  {
    id: 'destinations',
    IconComponent: DestinationsIcon,
    title: 'Destinations',
    description: 'Where LFOs can be routed',
    route: '/destinations',
  },
];

function TopicCardComponent({ topic, onPress }: { topic: TopicCard; onPress: () => void }) {
  const { IconComponent } = topic;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <IconComponent
        size={40}
        color="#ff6600"
        strokeWidth={1.5}
        backgroundColor="#2a2a2a"
      />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{topic.title}</Text>
        <Text style={styles.cardDescription}>{topic.description}</Text>
      </View>
      <Text style={styles.chevron}>&rsaquo;</Text>
    </Pressable>
  );
}

export default function LearnIndexScreen() {
  const navigation = useNavigation();
  // NativeTabs mounts every tab screen at cold start, which would render the
  // 7 Skia canvas icons before the home screen's first paint. Defer rendering
  // until this tab has been focused at least once, then render forever after.
  // useFocusEffect doesn't work reliably with NativeTabs when inside a nested
  // Stack, so listen to the parent tabs navigator instead (same pattern as
  // app/(tabs)/(home)/index.tsx).
  const [hasFocused, setHasFocused] = useState(() => {
    const tabsNavigation = navigation.getParent();
    // No parent tabs navigator means no focus events will ever arrive - render
    // immediately. Already-focused (e.g. deep link) also renders immediately.
    return !tabsNavigation || tabsNavigation.isFocused();
  });

  useEffect(() => {
    if (hasFocused) return;
    const tabsNavigation = navigation.getParent();
    if (!tabsNavigation) return;
    const unsubscribe = tabsNavigation.addListener('focus', () => {
      setHasFocused(true);
    });
    return unsubscribe;
  }, [navigation, hasFocused]);

  if (!hasFocused) {
    return <View style={styles.container} />;
  }

  return <LearnIndexContent />;
}

function LearnIndexContent() {
  useMarkInteractive();
  const router = useRouter();
  const navigation = useNavigation();
  // Stable slice only - this screen doesn't need per-drag-tick values
  const { fadeInOnOpen, fadeInDuration, tabSwitchFadeOpacity } = usePresetStable();

  // Tab switch fade
  const screenOpacity = useSharedValue(1);

  const screenFadeStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  useEffect(() => {
    const tabsNavigation = navigation.getParent();
    if (!tabsNavigation) return;

    // This content mounts on the tab's first focus, so this listener is
    // registered after that first focus event has already been dispatched.
    // Every focus event it receives is a subsequent tab switch - no
    // first-focus skip needed (matches the pre-lazy-mount behavior where the
    // first focus was explicitly skipped).
    const unsubscribe = tabsNavigation.addListener('focus', () => {
      if (fadeInOnOpen) {
        screenOpacity.value = tabSwitchFadeOpacity;
        screenOpacity.value = withTiming(1, {
          duration: fadeInDuration,
          easing: Easing.out(Easing.ease),
        });
      }
    });

    return unsubscribe;
  }, [navigation, fadeInOnOpen, fadeInDuration, tabSwitchFadeOpacity, screenOpacity]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Animated.View style={screenFadeStyle}>
        <View style={styles.grid}>
          {TOPICS.map((topic) => (
            <TopicCardComponent
              key={topic.id}
              topic={topic}
              onPress={() => router.push(topic.route as any)}
            />
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 16,
  },
  grid: {
    gap: 10,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardPressed: {
    backgroundColor: '#252525',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardDescription: {
    color: '#888899',
    fontSize: 13,
  },
  chevron: {
    color: '#555566',
    fontSize: 24,
    fontWeight: '300',
  },
});
