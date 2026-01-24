import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
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

// Connecting state needs custom component for ActivityIndicator
function ConnectingIndicator() {
  return (
    <View style={headerStyles.connectingContainer}>
      <ActivityIndicator size="small" color="#ff6600" />
    </View>
  );
}

import React from 'react';

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
        separateBackground: true,
      });
    }

    // MIDI status button
    if (showMidi) {
      if (connecting) {
        // Connecting: activity indicator (custom)
        items.push({
          type: 'custom' as const,
          element: <ConnectingIndicator />,
          separateBackground: true,
        });
      } else if (connected) {
        // Connected: green link icon (native button)
        items.push({
          type: 'button' as const,
          label: 'MIDI',
          icon: { type: 'sfSymbol' as const, name: 'link' as const },
          tintColor: '#22c55e',
          onPress: () => router.push('/midi'),
          separateBackground: true,
        });
      } else if (digitaktAvailable) {
        // Available: orange link icon (native button)
        items.push({
          type: 'button' as const,
          label: 'MIDI',
          icon: { type: 'sfSymbol' as const, name: 'link' as const },
          tintColor: '#ff6600',
          onPress: () => router.push('/midi'),
          separateBackground: true,
        });
      } else {
        // Not available: gray link.badge.plus icon (native button)
        items.push({
          type: 'button' as const,
          label: 'MIDI',
          icon: { type: 'sfSymbol' as const, name: 'link.badge.plus' as const },
          tintColor: '#666666',
          onPress: () => router.push('/midi'),
          separateBackground: true,
        });
      }
    }

    return items;
  };
}

const headerStyles = StyleSheet.create({
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
  connectingContainer: {
    padding: 4,
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
