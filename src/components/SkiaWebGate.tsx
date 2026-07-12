import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { preloadSkiaFonts } from './lfo/utils/skiaFont';

/**
 * On web, every Skia API call throws until CanvasKit (wasm) has loaded, so
 * nothing that renders a <Canvas> (or builds paths/fonts) may mount before
 * LoadSkiaWeb() resolves. This gate renders a black splash until CanvasKit
 * and the label typefaces are ready. On native it renders children
 * immediately and never re-renders.
 */
export function SkiaWebGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(Platform.OS !== 'web');

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
