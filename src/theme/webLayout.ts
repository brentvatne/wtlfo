import { Platform, useWindowDimensions } from 'react-native';

/**
 * Web layout constants: content is constrained to a centered column while
 * full-width bars (headers, tab bar) keep their background/border edge to
 * edge and inset their content to align with the column.
 *
 * Note: a global CSS zoom (Chrome-125% style) was tried for larger web type
 * and reverted - it breaks pointer coordinate math in the slider's web
 * implementation. If larger web type comes back, it needs per-style font
 * scaling, not zoom.
 */
export const WEB_MAX_CONTENT_WIDTH = 1200;

/**
 * Spread into a ScrollView's contentContainerStyle. The ScrollView itself
 * stays full-bleed (background continues to the viewport edges); only the
 * content column is constrained and centered. Null on native.
 */
export const webContentContainerStyle =
  Platform.OS === 'web'
    ? ({ maxWidth: WEB_MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' } as const)
    : null;

/**
 * Horizontal inset that aligns content inside full-width bars (e.g. the
 * header's leading button + title) with the centered content column.
 * Returns 0 on native and on viewports narrower than the max width.
 */
export function useWebContentInset(): number {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web') return 0;
  return Math.max(0, (width - WEB_MAX_CONTENT_WIDTH) / 2);
}
