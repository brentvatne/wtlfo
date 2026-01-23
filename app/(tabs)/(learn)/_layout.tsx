import { Stack } from 'expo-router';
import { useMidi } from '@/src/context/midi-context';
import { MidiStatusButton } from '@/src/components/navigation/MidiStatusButton';

function useHeaderRightItems() {
  const { autoConnect } = useMidi();
  if (!autoConnect) return () => [];
  return () => [{ type: 'custom' as const, element: <MidiStatusButton /> }];
}

export default function LearnLayout() {
  const headerRightItems = useHeaderRightItems();

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
          title: 'Learn',
          unstable_headerRightItems: headerRightItems,
        }}
      />
      <Stack.Screen
        name="intro"
        options={{
          title: 'What is an LFO?',
        }}
      />
      <Stack.Screen
        name="parameters"
        options={{
          title: 'The 7 Parameters',
        }}
      />
      <Stack.Screen
        name="waveforms"
        options={{
          title: 'Waveforms',
        }}
      />
      <Stack.Screen
        name="speed"
        options={{
          title: 'Speed & Timing',
        }}
      />
      <Stack.Screen
        name="depth"
        options={{
          title: 'Depth & Fade',
        }}
      />
      <Stack.Screen
        name="modes"
        options={{
          title: 'Trigger Modes',
        }}
      />
      <Stack.Screen
        name="destinations"
        options={{
          title: 'Destinations',
        }}
      />
      <Stack.Screen
        name="timing"
        options={{
          title: 'Timing Math',
        }}
      />
      <Stack.Screen
        name="presets"
        options={{
          title: 'Preset Recipes',
        }}
      />
    </Stack>
  );
}
