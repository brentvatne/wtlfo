import React from 'react';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';

// On web every regular Skia <Canvas> holds a WebGL context, and browsers cap
// contexts at ~16 per page - the param grid alone renders 8 icon canvases,
// which exhausts the pool and crashes surface creation elsewhere. This
// wrapper opts static (rarely-redrawn) content into Skia's
// render-to-temp-context-and-release path on web (verified in
// SkiaPictureView.web.js: __destroyWebGLContextAfterRender selects
// StaticWebGLRenderer). No-op on native.
const webStaticProps =
  Platform.OS === 'web'
    ? ({ __destroyWebGLContextAfterRender: true } as Record<string, unknown>)
    : {};

export function StaticCanvas(props: ComponentProps<typeof Canvas>) {
  return <Canvas {...webStaticProps} {...props} />;
}
