import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { usePreset } from '@/src/context/preset-context';
import {
  QuestionWaveIcon,
  SlidersIcon,
  WaveformsIcon,
  SpeedometerIcon,
  EnvelopeIcon,
  TriggersIcon,
  DestinationsIcon,
  TimingMathIcon,
  PresetsIcon,
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
    id: 'intro',
    IconComponent: QuestionWaveIcon,
    title: 'What is an LFO?',
    description: 'The basics of low frequency oscillators',
    route: '/intro',
  },
  {
    id: 'parameters',
    IconComponent: SlidersIcon,
    title: 'The 7 Parameters',
    description: 'Visual guide to every LFO control',
    route: '/parameters',
  },
  {
    id: 'waveforms',
    IconComponent: WaveformsIcon,
    title: 'Waveforms',
    description: 'Shapes that define modulation character',
    route: '/waveforms',
  },
  {
    id: 'speed',
    IconComponent: SpeedometerIcon,
    title: 'Speed & Timing',
    description: 'How SPD and MULT control LFO rate',
    route: '/speed',
  },
  {
    id: 'depth',
    IconComponent: EnvelopeIcon,
    title: 'Depth & Fade',
    description: 'Controlling intensity and envelope',
    route: '/depth',
  },
  {
    id: 'modes',
    IconComponent: TriggersIcon,
    title: 'Trigger Modes',
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
  {
    id: 'timing',
    IconComponent: TimingMathIcon,
    title: 'Timing Math',
    description: 'Formulas for calculating cycle times',
    route: '/timing',
  },
  {
    id: 'presets',
    IconComponent: PresetsIcon,
    title: 'Preset Recipes',
    description: 'Ready-to-use LFO configurations',
    route: '/presets',
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
  const router = useRouter();
  const navigation = useNavigation();
  const { fadeInOnOpen, fadeInDuration } = usePreset();

  // Tab switch fade
  const screenOpacity = useSharedValue(1);
  const isFirstFocusRef = useRef(true);

  const screenFadeStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  useEffect(() => {
    const tabsNavigation = navigation.getParent();
    if (!tabsNavigation) return;

    const unsubscribe = tabsNavigation.addListener('focus', () => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }

      if (fadeInOnOpen) {
        screenOpacity.value = 0.2;
        screenOpacity.value = withTiming(1, {
          duration: fadeInDuration,
          easing: Easing.out(Easing.ease),
        });
      }
    });

    return unsubscribe;
  }, [navigation, fadeInOnOpen, fadeInDuration, screenOpacity]);

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
