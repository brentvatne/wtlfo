import { matchFont } from '@shopify/react-native-skia';
import type { SkFont } from '@shopify/react-native-skia';
import { Platform } from 'react-native';

/**
 * Synchronous Skia label fonts for the value/label text in TimingInfo and
 * DestinationMeter. Native uses system fonts via matchFont; the web
 * implementation (skiaFont.web.ts) uses bundled typefaces preloaded by
 * SkiaWebGate, because FontMgr.System().matchFamilyStyle() throws on web.
 */

/** No-op on native; web preloads bundled typefaces. */
export async function preloadSkiaFonts(): Promise<void> {}

/** Monospace bold font for numeric values. */
export function getValueFont(fontSize: number): SkFont {
  return matchFont({
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize,
    fontWeight: '700',
  });
}

/** Sans-serif medium font for small labels. */
export function getLabelFont(fontSize: number): SkFont {
  return matchFont({
    fontFamily: Platform.select({ ios: 'Helvetica Neue', default: 'sans-serif' }),
    fontSize,
    fontWeight: '500',
  });
}
