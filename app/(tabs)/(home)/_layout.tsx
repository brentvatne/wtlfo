import { Stack, router, useGlobalSearchParams } from 'expo-router';
import { Platform, Pressable, Text } from 'react-native';
import { useWebContentInset } from '@/src/theme/webLayout';
import { usePresetStable } from '@/src/context/preset-context';
import { useMidi } from '@/src/context/midi-context';
import { MIDI_FEATURES_ENABLED } from '@/src/config/features';
import { PARAM_ORDER, PARAM_LABELS, getStartPhaseLabel, type ParamKey } from '@/src/components/params/constants';

function getParamLabel(param: ParamKey, waveform: string): string {
  return param === 'startPhase' ? getStartPhaseLabel(waveform) : PARAM_LABELS[param];
}

export default function HomeLayout() {
  // Stable slice: waveform is a primitive that only changes identity when the
  // waveform actually changes, so this layout skips per-drag-tick renders
  const { preset, waveform } = usePresetStable();
  const { autoConnect, connected, digitaktAvailable } = useMidi();
  // On web the header bar spans the full viewport but its content should
  // align with the centered max-width content column
  const webInset = useWebContentInset();

  const midiIcon = connected ? 'link' : digitaktAvailable ? 'link' : 'link.badge.plus';
  const midiColor = connected ? '#22c55e' : digitaktAvailable ? '#ff6600' : '#666666';

  // Get the current param from global search params for toolbar labels
  const { param: globalParam } = useGlobalSearchParams<{ param?: string }>();
  const currentParam = globalParam as ParamKey | undefined;

  const currentIndex = currentParam ? PARAM_ORDER.indexOf(currentParam) : -1;
  const prevParam = currentIndex >= 0
    ? PARAM_ORDER[(currentIndex - 1 + PARAM_ORDER.length) % PARAM_ORDER.length]
    : undefined;
  const nextParam = currentIndex >= 0
    ? PARAM_ORDER[(currentIndex + 1) % PARAM_ORDER.length]
    : undefined;

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0a0a0a',
        },
        headerTintColor: '#ff6600',
        headerTitleStyle: {
          fontWeight: '600',
          color: '#ffffff',
        },
        contentStyle: {
          backgroundColor: '#000000',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: preset?.name || 'LFO',
          // Stack.Toolbar renders nothing on web, and this button is the only
          // entry point to the presets sheet - fall back to a header button
          ...(Platform.OS === 'web' && {
            headerLeft: () => (
              <Pressable
                onPress={() => router.push('/presets')}
                accessibilityRole="button"
                accessibilityLabel="Load preset"
                style={{ paddingHorizontal: 12, paddingVertical: 4, marginLeft: webInset }}
              >
                <Text style={{ color: '#ff6600', fontSize: 20 }}>☰</Text>
              </Pressable>
            ),
          }),
        }}
      >
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon="list.bullet"
            onPress={() => router.push('/presets')}
          />
        </Stack.Toolbar>
        {MIDI_FEATURES_ENABLED && autoConnect && (
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              icon={midiIcon}
              tintColor={midiColor}
              onPress={() => router.push('/midi')}
            />
          </Stack.Toolbar>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="presets"
        options={{
          title: 'Load Preset',
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.5, 0.75],
          contentStyle: { backgroundColor: '#0a0a0a' },
        }}
      />
      <Stack.Screen
        name="param/[param]"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.35, 0.5],
          sheetInitialDetentIndex: 1,
          headerStyle: { backgroundColor: '#1a1a1a' },
          contentStyle: { backgroundColor: '#0a0a0a' },
          // Note: on web the modal drawer renders no stack header - the
          // param screen draws its own in-sheet header with prev/next nav
        }}
      >
        {prevParam && (
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              onPress={() => router.setParams({ param: prevParam })}
              style={{ fontSize: 15 }}
            >
              ‹ {getParamLabel(prevParam, waveform)}
            </Stack.Toolbar.Button>
          </Stack.Toolbar>
        )}
        {nextParam && (
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              onPress={() => router.setParams({ param: nextParam })}
              style={{ fontSize: 15 }}
            >
              {getParamLabel(nextParam, waveform)} ›
            </Stack.Toolbar.Button>
          </Stack.Toolbar>
        )}
      </Stack.Screen>
    </Stack>
  );
}
