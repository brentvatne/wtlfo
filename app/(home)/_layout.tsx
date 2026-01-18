import { Stack, Link } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { usePreset } from '@/src/context/preset-context';

export default function HomeLayout() {
  const { preset, setActivePreset } = usePreset();

  const handleReset = () => {
    setActivePreset(0); // Reset to first preset (default)
  };

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
          title: preset?.name || 'LFO',
          headerLeft: () => (
            <Pressable
              onPress={handleReset}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: '#ff6600', fontSize: 16, fontWeight: '600' }}>
                Reset
              </Text>
            </Pressable>
          ),
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
      <Stack.Screen
        name="param/[param]"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.35, 0.5],
        }}
      />
    </Stack>
  );
}
