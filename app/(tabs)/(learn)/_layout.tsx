import { Stack } from 'expo-router';

export default function LearnLayout() {
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
          title: 'Learn',
        }}
      />
      <Stack.Screen
        name="about"
        options={{
          title: 'About This App',
        }}
      />
      <Stack.Screen
        name="intro"
        options={{
          title: 'What is an LFO?',
        }}
      />
      <Stack.Screen
        name="parameters"
        options={{
          title: 'The 7 Parameters',
        }}
      />
      <Stack.Screen
        name="waveforms"
        options={{
          title: 'Waveforms',
        }}
      />
      <Stack.Screen
        name="timing"
        options={{
          title: 'Timing',
        }}
      />
      <Stack.Screen
        name="advanced"
        options={{
          title: 'Advanced',
        }}
      />
      <Stack.Screen
        name="depth"
        options={{
          title: 'Depth & Fade',
        }}
      />
      <Stack.Screen
        name="modes"
        options={{
          title: 'Trigger Modes',
        }}
      />
      <Stack.Screen
        name="destinations"
        options={{
          title: 'Destinations',
        }}
      />
    </Stack>
  );
}
