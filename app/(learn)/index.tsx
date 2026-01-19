import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface TopicCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  route: string;
}

const TOPICS: TopicCard[] = [
  {
    id: 'intro',
    icon: '?',
    title: 'What is an LFO?',
    description: 'The basics of low frequency oscillators',
    route: '/intro',
  },
  {
    id: 'parameters',
    icon: '7',
    title: 'The 7 Parameters',
    description: 'Visual guide to every LFO control',
    route: '/parameters',
  },
  {
    id: 'waveforms',
    icon: '~',
    title: 'Waveforms',
    description: 'Shapes that define modulation character',
    route: '/waveforms',
  },
  {
    id: 'speed',
    icon: '>',
    title: 'Speed & Timing',
    description: 'How SPD and MULT control LFO rate',
    route: '/speed',
  },
  {
    id: 'depth',
    icon: '+',
    title: 'Depth & Fade',
    description: 'Controlling intensity and envelope',
    route: '/depth',
  },
  {
    id: 'modes',
    icon: 'M',
    title: 'Trigger Modes',
    description: 'FRE, TRG, HLD, ONE, HLF explained',
    route: '/modes',
  },
  {
    id: 'destinations',
    icon: '@',
    title: 'Destinations',
    description: 'Where LFOs can be routed',
    route: '/destinations',
  },
  {
    id: 'timing',
    icon: '=',
    title: 'Timing Math',
    description: 'Formulas for calculating cycle times',
    route: '/timing',
  },
  {
    id: 'presets',
    icon: '*',
    title: 'Preset Recipes',
    description: 'Ready-to-use LFO configurations',
    route: '/presets',
  },
];

function TopicCardComponent({ topic, onPress }: { topic: TopicCard; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{topic.icon}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{topic.title}</Text>
        <Text style={styles.cardDescription}>{topic.description}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function LearnIndexScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.grid}>
        {TOPICS.map((topic) => (
          <TopicCardComponent
            key={topic.id}
            topic={topic}
            onPress={() => router.push(topic.route as any)}
          />
        ))}
      </View>
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
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ff6600',
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
