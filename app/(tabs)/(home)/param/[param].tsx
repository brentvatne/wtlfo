import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import type { Waveform, TriggerMode, Multiplier } from 'elektron-lfo';
import { SegmentedControl, ParameterSlider } from '@/src/components/controls';
import { usePreset } from '@/src/context/preset-context';
import { WaveformIcon, type WaveformType } from '@/src/components/lfo';
import { DestinationPickerInline } from '@/src/components/destination';
import { colors } from '@/src/theme';

type ParamKey = 'waveform' | 'speed' | 'multiplier' | 'mode' | 'depth' | 'fade' | 'startPhase' | 'destination';

// Parameter order matching the grid layout (row 1 then row 2)
const PARAM_ORDER: ParamKey[] = ['speed', 'multiplier', 'fade', 'destination', 'waveform', 'startPhase', 'mode', 'depth'];

// Short labels for navigation buttons (startPhase is dynamic based on waveform)
const PARAM_LABELS: Record<ParamKey, string> = {
  speed: 'SPD',
  multiplier: 'MULT',
  fade: 'FADE',
  destination: 'DEST',
  waveform: 'WAVE',
  startPhase: 'SPH', // Dynamically changed to 'SLEW' for RND
  mode: 'MODE',
  depth: 'DEP',
};

// Get dynamic label for startPhase based on waveform
function getStartPhaseLabel(waveform: string): string {
  return waveform === 'RND' ? 'SLEW' : 'SPH';
}

const WAVEFORMS: Waveform[] = ['TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'];
const MODES: TriggerMode[] = ['FRE', 'TRG', 'HLD', 'ONE', 'HLF'];
const MULTIPLIERS: Multiplier[] = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

interface WaveformDetail {
  type: WaveformType;
  desc: string;
}

interface ParamInfo {
  title: string;
  description: string;
  details?: string[];
  waveformDetails?: WaveformDetail[];
}

const PARAM_INFO: Record<ParamKey, ParamInfo> = {
  waveform: {
    title: 'Waveform',
    description: 'The shape of the modulation over time. Each waveform creates a different character of movement.',
    waveformDetails: [
      { type: 'TRI' as WaveformType, desc: 'Smooth triangle wave, classic vibrato' },
      { type: 'SIN' as WaveformType, desc: 'Rounded sine wave, natural movement' },
      { type: 'SQR' as WaveformType, desc: 'Instant on/off, rhythmic gating' },
      { type: 'SAW' as WaveformType, desc: 'Rising ramp, building effects' },
      { type: 'EXP' as WaveformType, desc: 'Accelerating curve (unipolar)' },
      { type: 'RMP' as WaveformType, desc: 'Falling ramp (unipolar)' },
      { type: 'RND' as WaveformType, desc: 'Random sample-and-hold' },
    ],
  },
  speed: {
    title: 'Speed',
    description: 'Controls how fast the LFO cycles. Combined with Multiplier, this determines the cycle rate.',
    details: [
      'Range: -64 to +63',
      'Negative values run the waveform backward',
      'Product of |SPD| × MULT = cycles per bar',
    ],
  },
  multiplier: {
    title: 'Multiplier',
    description: 'Tempo multiplier that scales the LFO speed relative to project BPM.',
    details: [
      'Higher values = faster LFO',
      'BPM mode syncs to project tempo',
      '120 mode locks to fixed 120 BPM',
      'Product of 128 = exactly 1 bar per cycle',
    ],
  },
  mode: {
    title: 'Trigger Mode',
    description: 'Controls how the LFO responds to note triggers.',
    details: [
      'FRE - Free running, ignores triggers',
      'TRG - Restarts on each trigger',
      'HLD - Holds value on trigger',
      'ONE - One-shot, single cycle then stops',
      'HLF - Half cycle then stops',
    ],
  },
  depth: {
    title: 'Depth',
    description: 'Controls the intensity and polarity of the modulation.',
    details: [
      'Range: -64 to +63',
      '0 = no modulation output',
      'Negative values invert the waveform',
      '+63 = full positive modulation',
    ],
  },
  fade: {
    title: 'Fade',
    description: 'Gradually introduces or removes the modulation effect over time after a trigger.',
    details: [
      'Range: -64 to +63',
      'Negative = Fade IN (0 → full)',
      'Zero = No fade (immediate full)',
      'Positive = Fade OUT (full → 0)',
      'Note: Has no effect in FRE mode (requires trigger)',
    ],
  },
  startPhase: {
    title: 'Start Phase',
    description: 'Sets where in the waveform cycle the LFO begins when triggered.',
    details: [
      'Range: 0 to 127',
      '0 = Beginning (0°)',
      '32 = Quarter cycle (90°)',
      '64 = Middle (180°)',
      '96 = Three-quarters (270°)',
    ],
  },
  destination: {
    title: 'Destination',
    description: 'Select which parameter the LFO will modulate.',
    details: [
      'SRC: Sample, Bank, Tune, Mode, Start, Length, Loop, Level',
      'FILTER: Freq, Reso, Type, Env ADSR, Env Depth',
      'AMP: Attack, Hold, Decay, Sustain, Release, Pan, Volume',
      'FX: Chorus, Delay, Reverb, Bit, SRR, Overdrive',
    ],
  },
};

// SLEW-specific info (used when waveform is RND instead of Start Phase)
const SLEW_INFO: ParamInfo = {
  title: 'Slew',
  description: 'Smooths transitions between random values. Higher values create more gradual, organic movements instead of sharp steps.',
  details: [
    'Range: 0 to 127',
    '0 = No smoothing (sharp S&H steps)',
    '64 = Moderate smoothing',
    '127 = Maximum smoothing (very gradual)',
    'Creates glide between random values',
  ],
};

function formatMultiplier(value: number): string {
  return value >= 1024 ? `${value / 1024}k` : String(value);
}

function NavButton({ direction, label, onPress }: { direction: 'prev' | 'next'; label: string; onPress: () => void }) {
  const isPrev = direction === 'prev';
  return (
    <Pressable
      onPress={onPress}
      style={styles.navButton}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={styles.navButtonText}>
        {isPrev ? `‹ ${label}` : `${label} ›`}
      </Text>
    </Pressable>
  );
}

export default function EditParamScreen() {
  const { param: urlParam } = useLocalSearchParams<{ param: ParamKey }>();
  const { currentConfig, updateParameter, setIsEditing, editFadeOutDuration } = usePreset();
  const router = useRouter();
  const editTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Callbacks for slider interaction tracking
  const handleSlidingStart = () => setIsEditing(true);
  const handleSlidingEnd = () => setIsEditing(false);

  // Brief editing pulse for non-slider controls (segmented controls, pickers)
  // Sets isEditing true, then false after fade-out duration to trigger fade-in
  const triggerEditPulse = useCallback(() => {
    // Clear any pending timeout
    if (editTimeoutRef.current) {
      clearTimeout(editTimeoutRef.current);
    }
    setIsEditing(true);
    editTimeoutRef.current = setTimeout(() => {
      setIsEditing(false);
      editTimeoutRef.current = null;
    }, editFadeOutDuration);
  }, [setIsEditing, editFadeOutDuration]);

  // Reset isEditing on unmount to prevent stuck state if user navigates while sliding
  useEffect(() => {
    return () => {
      if (editTimeoutRef.current) {
        clearTimeout(editTimeoutRef.current);
      }
      setIsEditing(false);
    };
  }, [setIsEditing]);

  // Use internal state for instant switching (no animation)
  const [activeParam, setActiveParam] = useState<ParamKey>(urlParam as ParamKey);

  // Sync with URL param on mount or if URL changes externally
  useEffect(() => {
    if (urlParam && urlParam !== activeParam) {
      setActiveParam(urlParam as ParamKey);
    }
  }, [urlParam]);

  // Navigation between parameters
  const currentIndex = PARAM_ORDER.indexOf(activeParam);
  const prevParam = PARAM_ORDER[(currentIndex - 1 + PARAM_ORDER.length) % PARAM_ORDER.length];
  const nextParam = PARAM_ORDER[(currentIndex + 1) % PARAM_ORDER.length];

  const goToPrev = () => {
    setActiveParam(prevParam);
    router.setParams({ param: prevParam }); // No navigation = no animation
  };
  const goToNext = () => {
    setActiveParam(nextParam);
    router.setParams({ param: nextParam }); // No navigation = no animation
  };

  if (!activeParam || !(activeParam in PARAM_INFO)) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Invalid parameter</Text>
      </View>
    );
  }

  // Use SLEW_INFO when startPhase is selected and waveform is RND
  const info = (activeParam === 'startPhase' && currentConfig.waveform === 'RND')
    ? SLEW_INFO
    : PARAM_INFO[activeParam];

  const renderControl = () => {
    switch (activeParam) {
      case 'waveform':
        return (
          <SegmentedControl
            label=""
            options={WAVEFORMS}
            value={currentConfig.waveform}
            onChange={(value) => {
              triggerEditPulse();
              updateParameter('waveform', value);
            }}
          />
        );

      case 'mode':
        return (
          <SegmentedControl
            label=""
            options={MODES}
            value={currentConfig.mode}
            onChange={(value) => {
              triggerEditPulse();
              updateParameter('mode', value);
            }}
          />
        );

      case 'multiplier':
        return (
          <View>
            <SegmentedControl
              label=""
              options={MULTIPLIERS}
              value={currentConfig.multiplier}
              onChange={(value) => {
                triggerEditPulse();
                updateParameter('multiplier', value);
              }}
              formatOption={formatMultiplier}
            />
            <View style={styles.spacer} />
            <SegmentedControl
              label="Tempo Sync"
              options={['BPM', '120'] as const}
              value={currentConfig.useFixedBPM ? '120' : 'BPM'}
              onChange={(value) => {
                triggerEditPulse();
                updateParameter('useFixedBPM', value === '120');
              }}
            />
          </View>
        );

      case 'speed':
        return (
          <ParameterSlider
            label=""
            min={-64}
            max={63}
            value={currentConfig.speed}
            onChange={(value) => updateParameter('speed', Math.round(value))}
            formatValue={(v) => (v >= 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
            onSlidingStart={handleSlidingStart}
            onSlidingEnd={handleSlidingEnd}
          />
        );

      case 'depth':
        return (
          <ParameterSlider
            label=""
            min={-64}
            max={63}
            value={currentConfig.depth}
            onChange={(value) => updateParameter('depth', Math.round(value))}
            formatValue={(v) => (v >= 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
            onSlidingStart={handleSlidingStart}
            onSlidingEnd={handleSlidingEnd}
          />
        );

      case 'fade':
        return (
          <View>
            {currentConfig.mode === 'FRE' && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>
                  Fade has no effect in FRE mode. Switch to TRG, ONE, HLD, or HLF to use fade.
                </Text>
              </View>
            )}
            <ParameterSlider
              label=""
              min={-64}
              max={63}
              value={currentConfig.fade}
              onChange={(value) => updateParameter('fade', Math.round(value))}
              formatValue={(v) => (v >= 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
              onSlidingStart={handleSlidingStart}
              onSlidingEnd={handleSlidingEnd}
            />
          </View>
        );

      case 'startPhase':
        return (
          <ParameterSlider
            label=""
            min={0}
            max={127}
            value={currentConfig.startPhase}
            onChange={(value) => updateParameter('startPhase', Math.round(value))}
            onSlidingStart={handleSlidingStart}
            onSlidingEnd={handleSlidingEnd}
          />
        );

      case 'destination':
        return <DestinationPickerInline onSelectionChange={triggerEditPulse} />;

      default:
        return null;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      bounces={false}
    >
      <Stack.Screen
        options={{
          title: info.title,
          headerLeft: () => (
            <NavButton
              direction="prev"
              label={prevParam === 'startPhase' ? getStartPhaseLabel(currentConfig.waveform) : PARAM_LABELS[prevParam]}
              onPress={goToPrev}
            />
          ),
          headerRight: () => (
            <NavButton
              direction="next"
              label={nextParam === 'startPhase' ? getStartPhaseLabel(currentConfig.waveform) : PARAM_LABELS[nextParam]}
              onPress={goToNext}
            />
          ),
        }}
      />
      <Text style={styles.description}>{info.description}</Text>

      <View style={styles.controlSection}>
        {renderControl()}
      </View>

      {info.waveformDetails && (
        <View style={styles.detailsSection}>
          {info.waveformDetails.map((item) => (
            <View key={item.type} style={styles.waveformDetailRow}>
              <WaveformIcon waveform={item.type} size={18} color={colors.accent} />
              <Text style={styles.waveformLabel}>{item.type}</Text>
              <Text style={styles.waveformDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>
      )}

      {info.details && (
        <View style={styles.detailsSection}>
          {info.details.map((detail, index) => (
            <Text key={index} style={styles.detailText}>• {detail}</Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 70,
  },
  navButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  description: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  controlSection: {
    marginBottom: 16,
  },
  spacer: {
    height: 16,
  },
  detailsSection: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
  },
  detailText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 2,
  },
  waveformDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  waveformLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    width: 30,
  },
  waveformDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  warningBanner: {
    backgroundColor: colors.warningBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  warningText: {
    color: colors.warning,
    fontSize: 13,
    lineHeight: 18,
  },
});
