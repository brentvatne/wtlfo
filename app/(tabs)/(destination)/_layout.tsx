import { Stack, router } from 'expo-router';
import { useMidi } from '@/src/context/midi-context';

export default function DestinationLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Destination' }}>
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
    </Stack>
  );
}
