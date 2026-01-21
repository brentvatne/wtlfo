import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { PresetProvider } from '@/src/context/preset-context';
import { ModulationProvider } from '@/src/context/modulation-context';
import { MidiProvider } from '@/src/context/midi-context';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { Platform } from 'react-native';

// TODO: Fix underlying Reanimated strict mode violations and re-enable warnings
// See background investigation for details on what's causing the warnings
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

const isLegacyIOS =
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) < 26;

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <MidiProvider>
        <PresetProvider>
          <ModulationProvider>
            <NativeTabs
            tintColor="#ff6600"
            {...(isLegacyIOS && {
              backgroundColor: '#000000',
              blurEffect: 'systemChromeMaterialDark',
            })}
          >
            <NativeTabs.Trigger name="(home)">
              <Icon sf={{ default: 'waveform', selected: 'waveform' }} />
              <Label>Editor</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(learn)">
              <Icon sf={{ default: 'book', selected: 'book.fill' }} />
              <Label>Learn</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(settings)">
              <Icon sf={{ default: 'gear', selected: 'gear' }} />
              <Label>Settings</Label>
            </NativeTabs.Trigger>
            </NativeTabs>
          </ModulationProvider>
        </PresetProvider>
      </MidiProvider>
    </ErrorBoundary>
  );
}
