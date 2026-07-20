import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';

import { preloadSkiaFonts } from './lfo/utils/skiaFont';

/**
 * On web, every Skia API call throws until CanvasKit (wasm) has loaded, so
 * nothing that renders a <Canvas> (or builds paths/fonts) may mount before
 * LoadSkiaWeb() resolves. This gate renders a black splash until CanvasKit
 * and the label typefaces are ready. The native counterpart (SkiaWebGate.tsx)
 * is a passthrough — the Skia web import must stay in this .web file so
 * canvaskit-wasm never enters the native bundle graph.
 */
export function SkiaWebGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    (async () => {
      try {
        const { LoadSkiaWeb } = await import('@shopify/react-native-skia/lib/module/web');
        await LoadSkiaWeb();
        // Fonts must load after CanvasKit (they use Skia.Typeface) and before
        // children mount (components measure text synchronously during render)
        await preloadSkiaFonts();
        if (!cancelled) setReady(true);
      } catch (error) {
        // CanvasKit wasm can fail to load (offline, blocked by a proxy/CSP,
        // unsupported browser). Without this, the gate would sit on a blank
        // black screen forever. Surface it instead so the user isn't stuck.
        console.error('Failed to load CanvasKit for web:', error);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (failed) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}>
          Couldn’t load the visualization engine
        </Text>
        <Text style={{ color: '#888899', fontSize: 14, textAlign: 'center' }}>
          wtlfo needs WebGL/WebAssembly. Check your connection and reload, or try a different browser.
        </Text>
      </View>
    );
  }

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#000000' }} />;
  }
  return <>{children}</>;
}
