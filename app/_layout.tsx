import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { PresetProvider } from '@/src/context/preset-context';

export default function RootLayout() {
  return (
    <PresetProvider>
      <NativeTabs>
        <NativeTabs.Trigger name="(home)">
          <Icon sf={{ default: 'waveform', selected: 'waveform' }} />
          <Label>LFO</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(settings)">
          <Icon sf={{ default: 'gear', selected: 'gear' }} />
          <Label>Settings</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </PresetProvider>
  );
}
