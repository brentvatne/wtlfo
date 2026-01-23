import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { usePreset } from '@/src/context/preset-context';
import { useMidi } from '@/src/context/midi-context';
import { useFrameRate } from '@/src/context/frame-rate-context';
import { MidiStatusButton } from '@/src/components/navigation/MidiStatusButton';
import { HeaderFrameRate } from '@/src/components/FrameRateOverlay';

function HeaderRightItems() {
  const { autoConnect } = useMidi();
  const { showOverlay } = useFrameRate();

  // Don't render anything if neither button should show
  if (!autoConnect && !showOverlay) {
    return null;
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <HeaderFrameRate />
      <MidiStatusButton />
    </View>
  );
}

function useHeaderRightItems() {
  const { autoConnect } = useMidi();
  const { showOverlay } = useFrameRate();
  const hasContent = autoConnect || showOverlay;

  if (!hasContent) {
    return () => [];
  }

  return () => [{
    type: 'custom' as const,
    element: <HeaderRightItems />,
    separateBackground: true,
  }];
}

export default function HomeLayout() {
  const { preset } = usePreset();
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
          title: preset?.name || 'LFO',
          unstable_headerLeftItems: () => [{
            type: 'button',
            label: 'Presets',
            icon: { type: 'sfSymbol', name: 'list.bullet' },
            tintColor: '#ff6600',
            onPress: () => router.push('/presets'),
            separateBackground: true,
          }],
          unstable_headerRightItems: headerRightItems,
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
