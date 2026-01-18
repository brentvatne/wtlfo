import { Stack, Link } from 'expo-router';
import { Pressable, Text } from 'react-native';

export default function HomeLayout() {
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
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'LFO Visualizer',
          headerRight: () => (
            <Link href="/presets" asChild>
              <Pressable
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: '#ff6600', fontSize: 16, fontWeight: '600' }}>
                  Load
                </Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <Stack.Screen
        name="presets"
        options={{
          title: 'Load Preset',
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.5, 0.75],
        }}
      />
    </Stack>
  );
}
