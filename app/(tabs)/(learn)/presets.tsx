import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LFO } from 'elektron-lfo';
import { LFOVisualizer } from '@/src/components/lfo';
import { PRESETS } from '@/src/data/presets';
import { usePreset } from '@/src/context/preset-context';
import type { WaveformType, TriggerMode } from '@/src/components/lfo';

function PresetPreview({ config, bpm, width }: { config: typeof PRESETS[0]['config']; bpm: number; width: number }) {
  const phase = useSharedValue(0);
  const output = useSharedValue(0);
  const lfoRef = useRef<LFO | null>(null);

  useEffect(() => {
    lfoRef.current = new LFO(config, bpm);

    // Auto-trigger for modes that need it
    if (config.mode === 'TRG' || config.mode === 'ONE' || config.mode === 'HLF') {
      lfoRef.current.trigger();
    }

    let animationId: number;
    let lastTrigger = 0;

    const animate = (timestamp: number) => {
      if (lfoRef.current) {
        const state = lfoRef.current.update(timestamp);
        phase.value = state.phase;
        output.value = state.output;

        // Re-trigger ONE/HLF modes periodically for preview
        if ((config.mode === 'ONE' || config.mode === 'HLF') && !lfoRef.current.isRunning()) {
          if (timestamp - lastTrigger > 2000) {
            lfoRef.current.trigger();
            lastTrigger = timestamp;
          }
        }
      }
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [config, bpm, phase, output]);

  return (
    <LFOVisualizer
      phase={phase}
      output={output}
      waveform={config.waveform as WaveformType}
      mode={config.mode as TriggerMode}
      depth={config.depth}
      fade={config.fade}
      width={width}
      height={80}
      theme="dark"
      showParameters={false}
      showTiming={false}
      showOutput={false}
      strokeWidth={2}
    />
  );
}

function PresetCard({ preset, index, width }: { preset: typeof PRESETS[0]; index: number; width: number }) {
  const router = useRouter();
  const { setActivePreset, bpm } = usePreset();

  const handleUsePreset = () => {
    setActivePreset(index);
  };

  const getKeyInsight = () => {
    const { config } = preset;
    const insights: string[] = [];

    if (config.mode === 'ONE') insights.push('ONE mode');
    if (config.mode === 'HLF') insights.push('HLF mode');
    if (config.fade < 0) insights.push('Fade IN');
    if (config.fade > 0) insights.push('Fade OUT');
    if (config.depth < 0) insights.push('Inverted depth');
    if (config.waveform === 'RND') insights.push('Random S&H');
    if (config.speed < 0) insights.push('Reverse speed');

    return insights.join(' + ') || `${config.waveform} waveform`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.presetName}>{preset.name}</Text>
        <View style={styles.paramBadges}>
          <Text style={styles.paramBadge}>{preset.config.waveform}</Text>
          <Text style={styles.paramBadge}>{preset.config.mode}</Text>
        </View>
      </View>

      <PresetPreview config={preset.config} bpm={bpm} width={width - 32} />

      <Text style={styles.insight}>{getKeyInsight()}</Text>

      <View style={styles.paramsRow}>
        <Text style={styles.paramText}>SPD: {preset.config.speed >= 0 ? '+' : ''}{preset.config.speed}</Text>
        <Text style={styles.paramText}>MULT: {preset.config.multiplier}</Text>
        <Text style={styles.paramText}>DEP: {preset.config.depth >= 0 ? '+' : ''}{preset.config.depth}</Text>
        {preset.config.fade !== 0 && (
          <Text style={styles.paramText}>FADE: {preset.config.fade >= 0 ? '+' : ''}{preset.config.fade}</Text>
        )}
      </View>

      <Pressable
        onPress={handleUsePreset}
        style={({ pressed }) => [styles.useButton, pressed && styles.useButtonPressed]}
      >
        <Text style={styles.useButtonText}>Use This Preset</Text>
      </Pressable>
    </View>
  );
}

export default function PresetsScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 32;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.intro}>
        Ready-to-use LFO configurations. Each preset demonstrates a specific technique or effect.
      </Text>

      <View style={styles.presetList}>
        {PRESETS.map((preset, index) => (
          <PresetCard key={preset.name} preset={preset} index={index} width={cardWidth} />
        ))}
      </View>

      <View style={styles.tipBox}>
        <Text style={styles.tipTitle}>Creating Your Own</Text>
        <Text style={styles.tipText}>
          Start with a preset that's close to what you want, then tweak parameters in the Editor tab. The visualization updates in real-time as you adjust.
        </Text>
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
  presetList: {
    gap: 14,
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
  presetName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  paramBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  paramBadge: {
    backgroundColor: '#2a2a2a',
    color: '#ff6600',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  insight: {
    color: '#88cc88',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 10,
    marginBottom: 8,
  },
  paramsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  paramText: {
    color: '#888899',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  useButton: {
    backgroundColor: '#ff6600',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  useButtonPressed: {
    backgroundColor: '#cc5500',
  },
  useButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  tipBox: {
    backgroundColor: '#1a2a3a',
    borderRadius: 10,
    padding: 14,
    marginTop: 20,
  },
  tipTitle: {
    color: '#66aaff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  tipText: {
    color: '#aaccee',
    fontSize: 14,
    lineHeight: 20,
  },
});
