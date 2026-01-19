import { Stack, Link } from 'expo-router';
import { Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { usePreset } from '@/src/context/preset-context';

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
          headerLeft: () => (
            <Link href="/presets" asChild>
              <Pressable
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <SymbolView
                  name="list.bullet"
                  size={22}
                  tintColor="#ff6600"
                />
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
          contentStyle: { backgroundColor: '#0a0a0a' },
        }}
      />
      <Stack.Screen
        name="param/[param]"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.35, 0.5],
          contentStyle: { backgroundColor: '#0a0a0a' },
        }}
      />
    </Stack>
  );
}
