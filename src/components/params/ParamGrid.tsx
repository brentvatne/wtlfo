import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ParamBox } from './ParamBox';
import { PARAM_ICONS } from './ParamIcons';
import { usePreset } from '@/src/context/preset-context';
import { useModulation } from '@/src/context/modulation-context';
import { getDestination } from '@/src/data/destinations';

type ParamKey = 'waveform' | 'speed' | 'multiplier' | 'mode' | 'depth' | 'fade' | 'startPhase' | 'destination';

interface ParamGridProps {
  onParamPress?: (param: ParamKey) => void;
  activeParam?: ParamKey | null;
  shakeMode?: boolean; // Trigger shake on mode param (e.g., when trying to retrigger in FREE mode)
}

function formatValue(key: ParamKey, value: number | string, useFixedBPM?: boolean): string {
  switch (key) {
    case 'waveform':
    case 'mode':
      return String(value);
    case 'speed':
    case 'depth':
    case 'fade':
      const numVal = Number(value);
      return numVal >= 0 ? `+${numVal}` : String(numVal);
    case 'multiplier':
      const mult = Number(value);
      const base = mult >= 1024 ? `${mult / 1024}k` : String(mult);
      return useFixedBPM ? base : `BPM ${base}`;
    case 'startPhase':
      return String(value);
    default:
      return String(value);
  }
}

const PARAM_LABELS: Record<ParamKey, string> = {
  waveform: 'WAVE',
  speed: 'SPD',
  multiplier: 'MULT',
  mode: 'MODE',
  depth: 'DEP',
  fade: 'FADE',
  startPhase: 'SPH', // Dynamically changed to 'SLEW' for RND waveform
  destination: 'DEST',
};

// Get label for startPhase - changes to SLEW for RND waveform
function getStartPhaseLabel(waveform: string): string {
  return waveform === 'RND' ? 'SLEW' : 'SPH';
}

// All param routes to prefetch
const PARAM_ROUTES: ParamKey[] = ['speed', 'multiplier', 'fade', 'destination', 'waveform', 'startPhase', 'mode', 'depth'];

export function ParamGrid({ onParamPress, activeParam, shakeMode = false }: ParamGridProps) {
  const { currentConfig } = usePreset();
  const { activeDestinationId } = useModulation();
  const router = useRouter();

  // Prefetch all param routes for instant modal opens
  useEffect(() => {
    PARAM_ROUTES.forEach(param => {
      router.prefetch(`/param/${param}`);
    });
  }, [router]);

  // Get the display name for the active destination (show dash for none)
  const destination = getDestination(activeDestinationId);
  const destinationDisplayName = destination?.displayName ?? '—';

  const handlePress = (param: ParamKey) => {
    router.push(`/param/${param}`);
    onParamPress?.(param);
  };

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel="LFO Parameters"
    >
      {/* Row 1: SPD, MULT, FADE, DEST */}
      <View style={styles.row} accessibilityRole="none">
        <ParamBox
          label={PARAM_LABELS.speed}
          value={formatValue('speed', currentConfig.speed)}
          onPress={() => handlePress('speed')}
          isActive={activeParam === 'speed'}
          icon={<PARAM_ICONS.speed />}
        />
        <ParamBox
          label={PARAM_LABELS.multiplier}
          value={formatValue('multiplier', currentConfig.multiplier, currentConfig.useFixedBPM)}
          onPress={() => handlePress('multiplier')}
          isActive={activeParam === 'multiplier'}
          icon={<PARAM_ICONS.multiplier />}
        />
        <ParamBox
          label={PARAM_LABELS.fade}
          value={formatValue('fade', currentConfig.fade)}
          onPress={() => handlePress('fade')}
          isActive={activeParam === 'fade'}
          disabled={currentConfig.mode === 'FRE'}
          icon={<PARAM_ICONS.fade />}
        />
        <ParamBox
          label={PARAM_LABELS.destination}
          value={destinationDisplayName}
          onPress={() => handlePress('destination')}
          isActive={activeParam === 'destination'}
          icon={<PARAM_ICONS.destination />}
        />
      </View>

      {/* Row 2: WAVE, SPH, MODE, DEP */}
      <View style={styles.row} accessibilityRole="none">
        <ParamBox
          label={PARAM_LABELS.waveform}
          value={currentConfig.waveform}
          onPress={() => handlePress('waveform')}
          isActive={activeParam === 'waveform'}
          icon={<PARAM_ICONS.waveform />}
        />
        <ParamBox
          label={getStartPhaseLabel(currentConfig.waveform)}
          value={formatValue('startPhase', currentConfig.startPhase)}
          onPress={() => handlePress('startPhase')}
          isActive={activeParam === 'startPhase'}
          icon={<PARAM_ICONS.startPhase />}
        />
        <ParamBox
          label={PARAM_LABELS.mode}
          value={currentConfig.mode}
          onPress={() => handlePress('mode')}
          isActive={activeParam === 'mode'}
          icon={<PARAM_ICONS.mode />}
          shake={shakeMode}
        />
        <ParamBox
          label={PARAM_LABELS.depth}
          value={formatValue('depth', currentConfig.depth)}
          onPress={() => handlePress('depth')}
          isActive={activeParam === 'depth'}
          icon={<PARAM_ICONS.depth />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
    marginBottom: 8,
    backgroundColor: '#0a0a0a', // Match app background
  },
  row: {
    flexDirection: 'row',
    gap: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1a1a1a',
  },
});
