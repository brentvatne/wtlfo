import { Stack } from 'expo-router';
import { MidiStatusButton } from '@/src/components/navigation/MidiStatusButton';

export default function DestinationLayout() {
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
          unstable_headerRightItems: () => [{
            type: 'custom',
            element: <MidiStatusButton />,
            hidesSharedBackground: true,
          }],
        }}
      />
    </Stack>
  );
}
