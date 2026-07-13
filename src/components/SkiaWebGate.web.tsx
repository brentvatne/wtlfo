import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

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

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    (async () => {
      const { LoadSkiaWeb } = await import('@shopify/react-native-skia/lib/module/web');
      await LoadSkiaWeb();
      // Fonts must load after CanvasKit (they use Skia.Typeface) and before
      // children mount (components measure text synchronously during render)
      await preloadSkiaFonts();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#000000' }} />;
  }
  return <>{children}</>;
}
