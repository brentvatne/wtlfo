import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { PresetProvider } from '@/src/context/preset-context';
import { ModulationProvider } from '@/src/context/modulation-context';
import { Platform } from 'react-native';

const isLegacyIOS =
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) < 26;

export default function RootLayout() {
  return (
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
          <NativeTabs.Trigger name="(destination)">
            <Icon sf={{ default: 'target', selected: 'target' }} />
            <Label>Destination</Label>
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
  );
}
