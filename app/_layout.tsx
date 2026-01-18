import { Stack } from "expo-router";

export default function RootLayout() {
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
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Elektron LFO Visualizer",
        }}
      />
    </Stack>
  );
}
