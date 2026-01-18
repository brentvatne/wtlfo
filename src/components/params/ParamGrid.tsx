import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ParamBox } from './ParamBox';
import { usePreset } from '@/src/context/preset-context';

type ParamKey = 'waveform' | 'speed' | 'multiplier' | 'mode' | 'depth' | 'fade' | 'startPhase' | 'destination';

interface ParamGridProps {
  onParamPress?: (param: ParamKey) => void;
  activeParam?: ParamKey | null;
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
      const suffix = useFixedBPM ? '.' : '';
      return mult >= 1024 ? `${mult / 1024}k${suffix}` : `${mult}${suffix}`;
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
  startPhase: 'SPH',
  destination: 'DEST',
};

export function ParamGrid({ onParamPress, activeParam }: ParamGridProps) {
  const { currentConfig } = usePreset();

  const handlePress = (param: ParamKey) => {
    onParamPress?.(param);
  };

  return (
    <View style={styles.container}>
      {/* Row 1: SPD, MULT, FADE, DEST */}
      <View style={styles.row}>
        <ParamBox
          label={PARAM_LABELS.speed}
          value={formatValue('speed', currentConfig.speed)}
          onPress={() => handlePress('speed')}
          isActive={activeParam === 'speed'}
        />
        <ParamBox
          label={PARAM_LABELS.multiplier}
          value={formatValue('multiplier', currentConfig.multiplier, currentConfig.useFixedBPM)}
          onPress={() => handlePress('multiplier')}
          isActive={activeParam === 'multiplier'}
        />
        <ParamBox
          label={PARAM_LABELS.fade}
          value={formatValue('fade', currentConfig.fade)}
          onPress={() => handlePress('fade')}
          isActive={activeParam === 'fade'}
        />
        <ParamBox
          label={PARAM_LABELS.destination}
          value="N/A"
          onPress={() => handlePress('destination')}
          isActive={activeParam === 'destination'}
        />
      </View>

      {/* Row 2: WAVE, SPH, MODE, DEP */}
      <View style={styles.row}>
        <ParamBox
          label={PARAM_LABELS.waveform}
          value={currentConfig.waveform}
          onPress={() => handlePress('waveform')}
          isActive={activeParam === 'waveform'}
        />
        <ParamBox
          label={PARAM_LABELS.startPhase}
          value={formatValue('startPhase', currentConfig.startPhase)}
          onPress={() => handlePress('startPhase')}
          isActive={activeParam === 'startPhase'}
        />
        <ParamBox
          label={PARAM_LABELS.mode}
          value={currentConfig.mode}
          onPress={() => handlePress('mode')}
          isActive={activeParam === 'mode'}
        />
        <ParamBox
          label={PARAM_LABELS.depth}
          value={formatValue('depth', currentConfig.depth)}
          onPress={() => handlePress('depth')}
          isActive={activeParam === 'depth'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
});
