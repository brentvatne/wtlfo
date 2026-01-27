import { Stack, router } from 'expo-router';
import { usePreset } from '@/src/context/preset-context';
import { useMidi } from '@/src/context/midi-context';

export default function HomeLayout() {
  const { preset } = usePreset();
  const { autoConnect, connected, digitaktAvailable } = useMidi();

  const midiIcon = connected ? 'link' : digitaktAvailable ? 'link' : 'link.badge.plus';
  const midiColor = connected ? '#22c55e' : digitaktAvailable ? '#ff6600' : '#666666';

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
      <Stack.Screen name="index" options={{ title: preset?.name || 'LFO' }}>
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon="list.bullet"
            onPress={() => router.push('/presets')}
          />
        </Stack.Toolbar>
        {autoConnect && (
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
        }}
      />
    </Stack>
  );
}
