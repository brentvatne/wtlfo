import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { FrameRateProvider } from '@/src/context/frame-rate-context';
import { MidiProvider } from '@/src/context/midi-context';
import { ModulationProvider } from '@/src/context/modulation-context';
import { PresetProvider } from '@/src/context/preset-context';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

SplashScreen.setOptions({
  duration: 150,
  fade: true,
});

// TODO: Fix underlying Reanimated strict mode violations and re-enable warnings
// See background investigation for details on what's causing the warnings
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <FrameRateProvider>
        <MidiProvider>
          <PresetProvider>
            <ModulationProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="midi"
                  options={{
                    title: 'MIDI Sync',
                    presentation: 'modal',
                    headerShown: true,
                    headerStyle: { backgroundColor: '#0a0a0a' },
                    headerTintColor: '#ff6600',
                    headerTitleStyle: { fontWeight: '600', color: '#ffffff' },
                    contentStyle: { backgroundColor: '#0a0a0a' },
                  }}
                />
              </Stack>
            </ModulationProvider>
          </PresetProvider>
        </MidiProvider>
      </FrameRateProvider>
    </ErrorBoundary>
  );
}
