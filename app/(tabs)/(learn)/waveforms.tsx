import React, { useEffect } from 'react';
import { useMarkInteractive } from '@/src/hooks/useMarkInteractive';
import { View, Text, StyleSheet, useWindowDimensions, AppState } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from 'expo-router/react-navigation';
import { useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { LFO } from 'elektron-lfo';
import { LFOVisualizer } from '@/src/components/lfo';
import type { WaveformType } from '@/src/components/lfo';

interface WaveformInfo {
  type: WaveformType;
  name: string;
  polarity: 'Bipolar' | 'Unipolar';
  character: string;
  bestFor: string[];
}

const WAVEFORMS: WaveformInfo[] = [
  {
    type: 'TRI',
    name: 'Triangle',
    polarity: 'Bipolar',
    character: 'Smooth, symmetrical rise and fall',
    bestFor: ['Classic vibrato', 'Gentle sweeps'],
  },
  {
    type: 'SIN',
    name: 'Sine',
    polarity: 'Bipolar',
    character: 'Rounded, natural movement',
    bestFor: ['Natural modulation', 'Smooth transitions'],
  },
  {
    type: 'SQR',
    name: 'Square',
    polarity: 'Bipolar',
    character: 'Instant on/off switching',
    bestFor: ['Rhythmic gating', 'Trills'],
  },
  {
    type: 'SAW',
    name: 'Sawtooth',
    polarity: 'Bipolar',
    character: 'Falling ramp, instant reset',
    bestFor: ['Decay effects', 'Filter sweeps'],
  },
  {
    type: 'EXP',
    name: 'Exponential',
    polarity: 'Unipolar',
    character: 'Accelerating curve',
    bestFor: ['Percussive attacks', 'Swells'],
  },
  {
    type: 'RMP',
    name: 'Ramp',
    polarity: 'Unipolar',
    character: 'Rising ramp, instant reset',
    bestFor: ['Build-up effects', 'Fade-ins', 'Rising sweeps'],
  },
  {
    type: 'RND',
    name: 'Random',
    polarity: 'Bipolar',
    character: 'Sample-and-hold random',
    bestFor: ['Humanization', 'Chaos', 'Variation'],
  },
];

// Animated waveform preview component. All seven previews share a single phase
// SharedValue driven by one LFO engine in the screen component (identical
// speed/multiplier/mode/BPM config for every card - only the waveform differs,
// and phase progression is waveform-independent). PhaseIndicator derives the
// dot's Y position from phase + waveform itself, and showOutput={false} means
// the output value is never displayed, so a static 0 suffices for the prop.
function WaveformPreview({
  waveform,
  phase,
  width,
}: {
  waveform: WaveformType;
  phase: SharedValue<number>;
  width: number;
}) {
  return (
    <LFOVisualizer
      phase={phase}
      output={0}
      waveform={waveform}
      width={width}
      height={100}
      theme="dark"
      showParameters={false}
      showTiming={false}
      showOutput={false}
      strokeWidth={2}
    />
  );
}

function WaveformCard({
  info,
  phase,
  width,
}: {
  info: WaveformInfo;
  phase: SharedValue<number>;
  width: number;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.nameRow}>
          <Text style={styles.waveType}>{info.type}</Text>
          <Text style={styles.waveName}>{info.name}</Text>
        </View>
        <View style={[styles.polarityBadge, info.polarity === 'Unipolar' && styles.unipolarBadge]}>
          <Text style={styles.polarityIcon}>{info.polarity === 'Bipolar' ? '±' : '+'}</Text>
          <Text style={[styles.polarityText, info.polarity === 'Unipolar' && styles.unipolarText]}>
            {info.polarity}
          </Text>
        </View>
      </View>

      <WaveformPreview waveform={info.type} phase={phase} width={width - 32} />

      <Text style={styles.character}>{info.character}</Text>

      <View style={styles.tagsRow}>
        {info.bestFor.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function WaveformsScreen() {
  useMarkInteractive();
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 32;

  // Single phase SharedValue driving all seven waveform previews
  const phase = useSharedValue(0);

  useEffect(() => {
    // One engine for all previews - only phase is consumed, and phase
    // progression doesn't depend on the waveform, so any waveform works here.
    const lfo = new LFO(
      {
        waveform: 'TRI',
        speed: 24,
        multiplier: 8,
        mode: 'FRE',
        depth: 63,
        fade: 0,
      },
      120
    );

    let animationId = 0;

    const animate = (timestamp: number) => {
      const state = lfo.update(timestamp);
      phase.value = state.phase;
      animationId = requestAnimationFrame(animate);
    };

    const start = () => {
      if (animationId === 0) {
        // Avoid a large phase jump from time elapsed while stopped
        lfo.resetTiming();
        animationId = requestAnimationFrame(animate);
      }
    };

    const stop = () => {
      if (animationId !== 0) {
        cancelAnimationFrame(animationId);
        animationId = 0;
      }
    };

    // Run the loop only while this screen is focused, its tab is focused, and
    // the app is active. useFocusEffect doesn't work reliably with NativeTabs
    // when inside a nested Stack, so listen to both this screen's navigator
    // (push/pop within the Learn stack) and the parent tabs navigator (tab
    // switches) - same pattern as app/(tabs)/(home)/index.tsx. AppState
    // handling mirrors preset-context's background pause.
    const tabsNavigation = navigation.getParent();
    let screenFocused = navigation.isFocused();
    let tabFocused = tabsNavigation?.isFocused() ?? true;
    let appActive = AppState.currentState === 'active';

    const update = () => {
      if (screenFocused && tabFocused && appActive) {
        start();
      } else {
        stop();
      }
    };

    const unsubscribers = [
      navigation.addListener('focus', () => {
        screenFocused = true;
        update();
      }),
      navigation.addListener('blur', () => {
        screenFocused = false;
        update();
      }),
    ];
    if (tabsNavigation) {
      unsubscribers.push(
        tabsNavigation.addListener('focus', () => {
          tabFocused = true;
          update();
        }),
        tabsNavigation.addListener('blur', () => {
          tabFocused = false;
          update();
        })
      );
    }
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      appActive = nextAppState === 'active';
      update();
    });

    update();

    return () => {
      stop();
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
      appStateSubscription.remove();
    };
  }, [navigation, phase]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.intro}>
        The waveform determines the shape of modulation over time. Each creates a different character of movement.
      </Text>

      <View style={styles.polaritySection}>
        <Text style={styles.polaritySectionTitle}>Bipolar vs unipolar</Text>
        <View style={styles.polarityRow}>
          <View style={[styles.polarityBadgeLarge, styles.bipolarBadgeLarge]}>
            <Text style={styles.polarityIconLarge}>±</Text>
          </View>
          <View style={styles.polarityInfo}>
            <Text style={styles.polarityLabel}>Bipolar</Text>
            <Text style={styles.polarityDesc}>Swings above and below center (-1 to +1)</Text>
          </View>
        </View>
        <View style={styles.polarityRow}>
          <View style={[styles.polarityBadgeLarge, styles.unipolarBadgeLarge]}>
            <Text style={styles.polarityIconLarge}>+</Text>
          </View>
          <View style={styles.polarityInfo}>
            <Text style={styles.polarityLabel}>Unipolar</Text>
            <Text style={styles.polarityDesc}>Only positive values (0 to +1). EXP and RMP.</Text>
          </View>
        </View>
        <Text style={styles.polarityNote}>
          This matters with negative depth—inverting a unipolar waveform keeps it positive but reverses direction.
        </Text>
      </View>

      <View style={styles.cardList}>
        {WAVEFORMS.map((info) => (
          <WaveformCard key={info.type} info={info} phase={phase} width={cardWidth} />
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
  intro: {
    color: '#888899',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  cardList: {
    gap: 12,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waveType: {
    color: '#ff6600',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  waveName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  polarityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a4a2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  unipolarBadge: {
    backgroundColor: '#4a3a2a',
  },
  polarityIcon: {
    color: '#88cc88',
    fontSize: 12,
    fontWeight: '700',
  },
  polarityText: {
    color: '#88cc88',
    fontSize: 11,
    fontWeight: '500',
  },
  unipolarText: {
    color: '#ccaa88',
  },
  polaritySection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  polaritySectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  polarityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  polarityBadgeLarge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bipolarBadgeLarge: {
    backgroundColor: '#2a4a2a',
  },
  unipolarBadgeLarge: {
    backgroundColor: '#4a3a2a',
  },
  polarityIconLarge: {
    fontSize: 16,
    fontWeight: '700',
    color: '#88cc88',
  },
  polarityInfo: {
    flex: 1,
  },
  polarityLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  polarityDesc: {
    color: '#888899',
    fontSize: 13,
    marginTop: 2,
  },
  polarityNote: {
    color: '#666680',
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  character: {
    color: '#cccccc',
    fontSize: 14,
    marginTop: 12,
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    color: '#888899',
    fontSize: 12,
  },
  sectionText: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: '#ffffff',
  },
});
