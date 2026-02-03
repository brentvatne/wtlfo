import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { AudioProvider } from '@/src/context/audio-context';
import { MidiProvider } from '@/src/context/midi-context';
import { ModulationProvider } from '@/src/context/modulation-context';
import { PresetProvider } from '@/src/context/preset-context';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import AppMetrics from 'expo-eas-observe';
import { Stack } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

// Set native root view background color to prevent white flash during navigation
SystemUI.setBackgroundColorAsync('#000000');

Sentry.init({
  dsn: 'https://1397d1c25ba952f620723abd186c27ac@o85374.ingest.us.sentry.io/4510763027464192',
  sendDefaultPii: true,
  enableLogs: true,
  tracesSampleRate: 1.0,
  enableAppStartTracking: true,
});

// TODO: Fix underlying Reanimated strict mode violations and re-enable warnings
// See background investigation for details on what's causing the warnings
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

export default Sentry.wrap(function RootLayout() {
  useEffect(() => {
    if (!__DEV__) {
      AppMetrics.markFirstRender();
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
      <ErrorBoundary>
        <MidiProvider>
          <PresetProvider>
            <ModulationProvider>
              <AudioProvider>
                <ThemeProvider value={DarkTheme}>
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
                </ThemeProvider>
              </AudioProvider>
            </ModulationProvider>
          </PresetProvider>
        </MidiProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
});