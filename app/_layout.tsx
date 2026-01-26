import { useEffect } from 'react';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { FrameRateProvider } from '@/src/context/frame-rate-context';
import { MidiProvider } from '@/src/context/midi-context';
import { ModulationProvider } from '@/src/context/modulation-context';
import { AudioProvider } from '@/src/context/audio-context';
import { PresetProvider } from '@/src/context/preset-context';
import { warmPathCache, WAVEFORM_ICON_SIZES } from '@/src/components/lfo';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { Storage } from 'expo-sqlite/kv-store';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import AppMetrics from 'expo-eas-observe';

// Pre-warm Skia path cache for WaveformIcon to prevent frame drop on first modal open
warmPathCache([WAVEFORM_ICON_SIZES.PARAM_MODAL]);

// Set native root view background color to prevent white flash during navigation
SystemUI.setBackgroundColorAsync('#000000');

Sentry.init({
  dsn: 'https://1397d1c25ba952f620723abd186c27ac@o85374.ingest.us.sentry.io/4510763027464192',
  sendDefaultPii: true,
  enableLogs: true,
});

// Read splash fade duration from storage before React renders
function getSplashFadeDuration(): number {
  try {
    const saved = Storage.getItemSync('splashFadeDuration');
    if (saved !== null) {
      const value = parseInt(saved, 10);
      if (!isNaN(value) && value >= 0 && value <= 1000) {
        return value;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return 150; // Default
}

SplashScreen.setOptions({
  duration: getSplashFadeDuration(),
  fade: true,
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
        <FrameRateProvider>
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
        </FrameRateProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
});