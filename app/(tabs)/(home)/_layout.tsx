import { Stack, router } from 'expo-router';
import { usePreset } from '@/src/context/preset-context';
import { MidiStatusButton } from '@/src/components/navigation/MidiStatusButton';

export default function HomeLayout() {
  const { preset } = usePreset();

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
          unstable_headerLeftItems: () => [{
            type: 'button',
            label: 'Presets',
            icon: { type: 'sfSymbol', name: 'list.bullet' },
            tintColor: '#ff6600',
            onPress: () => router.push('/presets'),
          }],
          unstable_headerRightItems: () => [{
            type: 'custom',
            element: <MidiStatusButton />,
          }],
        }}
      />
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
          sheetLargestUndimmedDetentIndex: 'last',
          contentStyle: { backgroundColor: '#0a0a0a' },
        }}
      />
    </Stack>
  );
}
