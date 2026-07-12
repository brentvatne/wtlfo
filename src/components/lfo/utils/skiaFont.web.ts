import { Skia } from '@shopify/react-native-skia';
import type { SkFont, SkTypeface } from '@shopify/react-native-skia';

/**
 * Web Skia label fonts. matchFont relies on FontMgr.System(), which throws
 * "Not implemented on React Native Web", so we load bundled typefaces
 * (served from public/fonts/) once CanvasKit is up. SkiaWebGate awaits
 * preloadSkiaFonts() before mounting the app, so the getters are
 * synchronous by the time any component renders.
 */

let valueTypeface: SkTypeface | null = null;
let labelTypeface: SkTypeface | null = null;

async function loadTypeface(url: string): Promise<SkTypeface | null> {
  try {
    const buffer = await fetch(url).then((res) => res.arrayBuffer());
    return Skia.Typeface.MakeFreeTypeFaceFromData(Skia.Data.fromBytes(new Uint8Array(buffer)));
  } catch (e) {
    console.warn(`Failed to load Skia typeface ${url}:`, e);
    return null;
  }
}

export async function preloadSkiaFonts(): Promise<void> {
  [valueTypeface, labelTypeface] = await Promise.all([
    loadTypeface('/fonts/JetBrainsMono-Bold.ttf'),
    loadTypeface('/fonts/JetBrainsMono-Medium.ttf'),
  ]);
}

/** Monospace bold font for numeric values. */
export function getValueFont(fontSize: number): SkFont {
  return Skia.Font(valueTypeface ?? undefined, fontSize);
}

/** Sans-serif(ish) medium font for small labels. */
export function getLabelFont(fontSize: number): SkFont {
  return Skia.Font(labelTypeface ?? undefined, fontSize);
}
