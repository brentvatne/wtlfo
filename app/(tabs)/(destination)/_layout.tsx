import { Stack } from 'expo-router';
import { useMidi } from '@/src/context/midi-context';
import { MidiStatusButton } from '@/src/components/navigation/MidiStatusButton';

function useHeaderRightItems() {
  const { autoConnect } = useMidi();
  if (!autoConnect) return () => [];
  return () => [{ type: 'custom' as const, element: <MidiStatusButton /> }];
}

export default function DestinationLayout() {
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
          title: 'Destination',
          unstable_headerRightItems: headerRightItems,
        }}
      />
    </Stack>
  );
}
