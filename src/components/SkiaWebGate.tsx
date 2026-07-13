import React from 'react';

/**
 * Native passthrough. The real gate lives in SkiaWebGate.web.tsx — it must
 * stay in a .web file so the dynamic import of the Skia web module (and its
 * canvaskit-wasm dependency, which requires 'fs') never enters the native
 * bundle graph. Metro resolves dynamic import() statically per platform.
 */
export function SkiaWebGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
