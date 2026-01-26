import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform, View } from 'react-native';

const isLegacyIOS =
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) < 26;

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <NativeTabs
        tintColor="#ff6600"
        {...(isLegacyIOS && {
          backgroundColor: '#000000',
          blurEffect: 'systemChromeMaterialDark',
        })}
      >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon sf={{ default: 'waveform', selected: 'waveform' }} />
        <NativeTabs.Trigger.Label>Editor</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(learn)">
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} />
        <NativeTabs.Trigger.Label>Learn</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)">
        <NativeTabs.Trigger.Icon sf={{ default: 'gear', selected: 'gear' }} />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      </NativeTabs>
    </View>
  );
}
