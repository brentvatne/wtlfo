import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { usePreset } from '@/src/context/preset-context';
import { useMidi } from '@/src/context/midi-context';
import { useFrameRate } from '@/src/context/frame-rate-context';

// Frame rate display for header - custom component needed for dynamic text
function HeaderFrameRateItem() {
  const { showOverlay, setShowOverlay } = useFrameRate();
  const [jsFps, setJsFps] = React.useState(0);
  const frameTimesRef = React.useRef<number[]>([]);
  const lastTimeRef = React.useRef(performance.now());
  const rafIdRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (!showOverlay) return;

    const measureFrame = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 30) {
        frameTimesRef.current.shift();
      }

      if (frameTimesRef.current.length > 0) {
        const avgDelta = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        const fps = Math.round(1000 / avgDelta);
        setJsFps(fps);
      }

      rafIdRef.current = requestAnimationFrame(measureFrame);
    };

    rafIdRef.current = requestAnimationFrame(measureFrame);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      frameTimesRef.current = [];
    };
  }, [showOverlay]);

  if (!showOverlay) return null;

  const color = jsFps >= 55 ? '#4ade80' : jsFps >= 45 ? '#facc15' : '#f87171';

  return (
    <View style={headerStyles.fpsContainer}>
      <Text style={headerStyles.fpsLabel}>JS</Text>
      <Text style={[headerStyles.fpsValue, { color }]}>{jsFps}</Text>
    </View>
  );
}

// Styled wrapper for header buttons with custom background
function HeaderButtonWrapper({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={headerStyles.buttonWrapper}>
      {children}
    </Pressable>
  );
}

function useHeaderRightItems() {
  const { autoConnect, connected, digitaktAvailable, connecting } = useMidi();
  const { showOverlay } = useFrameRate();

  // Determine which items to show
  const showFps = showOverlay;
  const showMidi = autoConnect;

  if (!showFps && !showMidi) {
    return () => [];
  }

  return () => {
    const items = [];

    // Frame rate display (custom - needs dynamic text)
    if (showFps) {
      items.push({
        type: 'custom' as const,
        element: <HeaderFrameRateItem />,
        hidesSharedBackground: true,
      });
    }

    // MIDI status button - always custom with our own styled wrapper
    if (showMidi) {
      const iconName = connected ? 'link' : digitaktAvailable ? 'link' : 'link.badge.plus';
      const color = connected ? '#22c55e' : digitaktAvailable ? '#ff6600' : '#666666';

      items.push({
        type: 'custom' as const,
        element: (
          <HeaderButtonWrapper onPress={() => router.push('/midi')}>
            {connecting ? (
              <ActivityIndicator size="small" color="#ff6600" />
            ) : (
              <SymbolView name={iconName} size={20} tintColor={color} />
            )}
          </HeaderButtonWrapper>
        ),
        hidesSharedBackground: true,
      });
    }

    return items;
  };
}

const headerStyles = StyleSheet.create({
  buttonWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 10,
    minWidth: 38,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fpsLabel: {
    color: '#888899',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Menlo',
  },
  fpsValue: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Menlo',
  },
});

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
            type: 'custom',
            element: (
              <HeaderButtonWrapper onPress={() => router.push('/presets')}>
                <SymbolView name="list.bullet" size={20} tintColor="#ff6600" />
              </HeaderButtonWrapper>
            ),
            hidesSharedBackground: true,
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
