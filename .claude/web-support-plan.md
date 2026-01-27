# Web Support Implementation Plan

## Overview

This plan outlines the changes needed to run wtlfo on web. The approach is minimal - only fix what's broken, preserve the native experience.

## Changes Required

### 1. Tab Layout (`app/(tabs)/_layout.tsx`)

**Problem**: `NativeTabs` from `expo-router/unstable-native-tabs` doesn't render on web.

**Solution**: Platform-specific branching - use JS `Tabs` on web, keep `NativeTabs` on native.

```typescript
import { Platform } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  if (Platform.OS === 'web') {
    return (
      <Tabs screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ff6600',
        tabBarStyle: { backgroundColor: '#000000' }
      }}>
        <Tabs.Screen name="(home)" options={{
          title: 'Editor',
          tabBarIcon: ({ color }) => <Ionicons name="pulse" size={24} color={color} />
        }} />
        <Tabs.Screen name="(learn)" options={{
          title: 'Learn',
          tabBarIcon: ({ color }) => <Ionicons name="book" size={24} color={color} />
        }} />
        <Tabs.Screen name="(settings)" options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />
        }} />
      </Tabs>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <NativeTabs ...>
        {/* existing native code */}
      </NativeTabs>
    </View>
  );
}
```

**Trade-offs**:
- Pro: Simple, keeps native experience intact
- Con: Duplicated tab config (two places to update when adding tabs)
- Con: SF Symbol icons don't match Ionicons exactly

---

### 2. MIDI Module Web Stub

**Problem**: Native MIDI module crashes on web - no iOS/Android implementation available.

**Solution**: Add web stub file `modules/midi-controller/src/MidiControllerModule.web.ts`:

```typescript
// Web stub - returns empty/false for all methods
export default {
  getDevices: () => [],
  getTransportState: () => ({ running: false, clockTick: 0, bpm: 0 }),
  isConnected: () => false,
  connect: async () => false,
  disconnect: () => {},
  sendCC: () => {},
  sendNoteOn: () => {},
  sendNoteOff: () => {},
  addListener: () => ({ remove: () => {} }),
  removeAllListeners: () => {},
};

export type MidiDevice = { name: string; id: string };
export type TransportState = { running: boolean; clockTick: number; bpm: number };
export type TransportMessage = 'start' | 'continue' | 'stop';
```

**Trade-offs**:
- Pro: No changes needed to consumers - hooks just return empty/false
- Con: Metro may not auto-pick `.web.ts` for local modules - needs testing
- Risk: `useEventListener` from `expo` may throw if module doesn't support events

**Alternative**: Add Platform check in `midi-context.tsx` to return dummy provider on web (more explicit, less elegant).

---

### 3. Skia Web Setup

**Problem**: Skia needs CanvasKit (WebAssembly) loaded on web.

**Solution**: May already work with Expo 55. Test first before adding complexity.

If needed, add to `app/_layout.tsx`:
```typescript
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

// Wrap with async Skia loader on web
if (Platform.OS === 'web') {
  return (
    <WithSkiaWeb
      getComponent={() => import('./AppContent')}
      fallback={<LoadingSpinner />}
    />
  );
}
```

**Trade-offs**:
- Con: Adds code-splitting complexity
- Con: Flash of loading state on web
- Con: CanvasKit version must match react-native-skia exactly

---

### 4. Sentry Web Compatibility

**Problem**: `@sentry/react-native` may not work on web.

**Solution**: Guard Sentry initialization:
```typescript
if (Platform.OS !== 'web') {
  Sentry.init({ dsn: '...' });
}

export default Platform.OS === 'web'
  ? RootLayout
  : Sentry.wrap(RootLayout);
```

**Trade-offs**:
- Con: Loses error tracking on web entirely
- Alternative: Use `@sentry/browser` on web via conditional import

---

### 5. SystemUI Web Compatibility

**Problem**: `SystemUI.setBackgroundColorAsync()` called at module level may crash on web.

**Solution**: Guard the call:
```typescript
if (Platform.OS !== 'web') {
  SystemUI.setBackgroundColorAsync('#000000');
}
```

**Note**: Web may flash white - consider adding CSS to `web/index.html` or using `app.json` web config.

---

### 6. expo-haptics

**Non-issue**: expo-haptics is already a no-op on web. No changes needed.

---

## Implementation Order

1. **MIDI stub** - Unblocks app from crashing on import
2. **Tab layout** - Unblocks navigation
3. **SystemUI guard** - Prevents crash
4. **Sentry guard** - Prevents crash
5. **Skia setup** - Test first, may already work
6. **Test everything**

---

## Not In Scope (Future Work)

- **Responsive layout** - Desktop will show phone-sized UI
- **Web MIDI API** - Real MIDI support on web (Chromium browsers)
- **Sentry browser SDK** - Error monitoring on web
- **Performance optimization** - Reanimated runs in JS thread on web

---

## Open Questions

1. Does Metro pick up `.web.ts` for local Expo modules?
2. Does Skia work out-of-box with Expo 55 on web?
3. Does `useEventListener` from `expo` work with stub modules?
