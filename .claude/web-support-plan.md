# Web Support Plan (Expo SDK 56, rewritten 2026-07-11)

Replaces the SDK-55-era plan. Every claim below was verified against the
installed node_modules and current Expo/Shopify/SWM docs (July 2026), not
assumed. Several of the old plan's items are obsolete — see "No longer
needed" at the bottom.

## Current state in one line

The app is **two import-time/render-time crashes away from booting on web**
(MIDI native module, Skia CanvasKit), has **one fatal UX gap** (Stack.Toolbar
renders null on web → the presets sheet is unreachable), and everything else
is cosmetic or already works.

## What already works on web (verified, no changes needed)

- **Reanimated 4.5 + react-native-worklets 0.10** — full web builds; worklets
  run on the main JS thread; `useFrameCallback` is rAF-based;
  `scheduleOnRN` is `queueMicrotask` on web. All APIs we use exist.
- **react-native-audio-api 0.13** — web build wraps the browser's Web Audio
  API; every node type the test tone uses exists. Context created on user
  toggle satisfies the autoplay gesture rule.
- **expo-observe** — real web module; records events locally but `configure`/
  dispatch are no-ops (EAS Observe officially supports Android/iOS only).
  Nothing crashes, including the module-scope `Observe.logEvent` in
  startup-timing.ts. Web metrics simply don't appear in the dashboard.
- **@sentry/react-native 7.11** — auto-detects web, disables native
  integrations, runs the JS/browser client. `Sentry.wrap` +
  `reactNavigationIntegration` work with expo-router on web. Do NOT guard it
  off (old plan was wrong).
- **NativeTabs** — expo-router 57 ships a real web implementation
  (@radix-ui/react-tabs). No JS `<Tabs>` platform fork needed (old plan
  obsolete). Caveats: `Icon sf=` is ignored (text-only tabs) and default
  styling doesn't match our black/orange theme — cosmetic only.
- **formSheet modals** — expo-router 57 emulates sheets on web incl.
  `sheetAllowedDetents`. presets.tsx / param/[param].tsx need no fork.
- **expo-system-ui** `setBackgroundColorAsync` — works on web (sets body
  background). Old plan's guard unnecessary.
- **expo-haptics / expo-clipboard / react-native-gesture-handler /
  react-native-screens / AppState (settings.ts flush)** — all fine.
- **elektron-lfo** — pure JS.

## Phase 0 — Boot (blockers)

### 0.1 MIDI module web stub (S) — first crash

`modules/midi-controller/src/MidiControllerModule.ts` calls
`requireNativeModule('MidiController')` at module scope → throws in the
browser (with our `inlineRequires: true` the throw moves to first
MidiProvider render; still fatal). `MIDI_FEATURES_ENABLED=false` does NOT
help — the import still evaluates.

Fix: add `modules/midi-controller/src/MidiControllerModule.web.ts` using
`registerWebModule(class extends NativeModule<MidiControllerModuleEvents>
{...})` with inert methods (`getDevices: () => []`, `isConnected: () =>
false`, etc.) so `useEventListener(MidiControllerModule, ...)` keeps
working. Metro resolves `.web.ts` in local modules (verified — old plan's
open question is a yes). Note: during `expo export` prerender (Node,
`window` undefined) `requireNativeModule` returns `{}`, so the crash only
manifests in the browser — don't be fooled by a clean export.

### 0.2 CanvasKit loading + serving (M) — second crash

- Installed skia 2.6.2 ships `lib/module/web` (`LoadSkiaWeb`, `WithSkiaWeb`)
  and pins **canvaskit-wasm 0.41.0**, which HAS `PathBuilder` — our
  PathBuilder migration is web-safe.
- Importing Skia is safe on web; ANY call (`Skia.PathBuilder.Make()`,
  mounting `<Canvas>`) before `LoadSkiaWeb()` resolves throws.
- Setup: `npx setup-skia-web` copies `canvaskit.wasm` (2.9 MB gzipped) into
  `public/` (create it). Add to `postinstall` — must re-run on every skia
  upgrade, and the wasm version must stay pinned to skia's canvaskit dep.
  Serve SAME-ORIGIN (avoids any future COEP conflicts).
- Gating strategy (expo-router-compatible): root-level readiness gate in
  `app/_layout.tsx` — on web, `LoadSkiaWeb()` in an effect, render a black
  splash until resolved, then children. Avoids the docs' awkward
  custom-entry `LoadSkiaWeb` pattern and per-route `WithSkiaWeb` sprawl.
  Route modules may evaluate before ready (safe — imports don't throw);
  no `<Canvas>` mounts until the gate opens.
- `warmPathCache` runs in requestIdleCallback post-mount — safe behind the
  gate. The `typeof Skia === 'undefined'` guard in WaveformIcon.tsx:157 is
  ineffective (Skia is always defined on web) — remove or fix while there.

### 0.3 `matchFont` crashes on web (S–M)

`Skia.FontMgr.System().matchFamilyStyle()` throws "Not implemented on React
Native Web". Crashers: `TimingInfo.tsx:44,50`, `DestinationMeter.tsx:71,77`.
Fix: bundle a .ttf (mono-ish, matches the Elektron aesthetic) and use
`useFont`/`TypefaceFontProvider` (platform fork or unconditional bundled
font — unconditional is simpler and makes native rendering deterministic
too; small visual change, review before shipping).

### 0.4 Output mode: switch `web.output` to `"single"` for phase 1 (S)

`static` (current app.json value) executes route components in Node at build
time — with a Skia-gated root it would just prerender the splash, and it
adds footguns for zero SEO benefit today. `single` (SPA) sidesteps
build-time rendering. Revisit `static` later if SEO matters (Learn pages).

**Exit criteria:** `npx expo start --web` boots to the editor, waveform
renders, dot animates.

## Phase 1 — Usable

### 1.1 Toolbar fallback (M) — presets sheet is unreachable on web

`Stack.Toolbar`/`Stack.Toolbar.Button` render **null** on web. The home
header presets button (home/_layout.tsx:48-53) is the ONLY entry to
`/presets`; the param modal's prev/next buttons and the destination-layout
button also vanish. Fix: web fork using `headerLeft`/`headerRight` screen
options (or on-screen buttons). Keep the native Toolbar path untouched.

### 1.2 Settings persistence: localStorage fork (S)

expo-sqlite kv-store's sync API DOES exist on web (SharedArrayBuffer
spin-wait) but requires COOP/COEP headers + Metro wasm config, is alpha, and
can hang the main thread if SAB exists but the worker breaks. Today it
silently throws → defaults, no persistence.

Fix: platform-fork the storage backend in `src/services/settings.ts` (or a
`storage-backend.web.ts`) onto `window.localStorage` — synchronous, zero
setup, exactly fits `initCache()`. Our data is tiny (20 keys). Skip the
whole sqlite-wasm/COOP/COEP path unless data outgrows localStorage. (Also:
`expo-sqlite/localStorage/install` exists for the inverse direction —
not needed here.)

### 1.3 Icons: SymbolView renders nothing on web (M)

Non-iOS SymbolView renders null for string SF names (no crash). Fix: object
names (`{ default: 'gear', web: 'settings' }` — web uses Material Symbols)
or `fallback` props. Visible-on-web files only: home/index,
settings/index, learn/about, DestinationPickerInline (midi.tsx is hidden;
developer/test-run are dev-only). ~4 files.

### 1.4 Small stuff (S)

- Settings version row: `expo-application` returns null on web → fallback
  string; hide the update-check row (`useUpdates` works but is inert).
- `requestIdleCallback` (settings flush, path-cache warm): Safari < 18
  lacks it → tiny `setTimeout` fallback guard.
- Dark `<body>` before JS loads: add `public/`-served splash styling or
  `+html.tsx` with `background:#000` to kill the white flash (SystemUI sets
  it only after JS boots).

## Phase 2 — Polish

- Theme the web NativeTabs (labelStyle/backgroundColor → black/orange), add
  web label icons if desired.
- Keyboard/hover affordances on sliders (RNGH web supports mouse; verify
  drag feel), cursor styles on Pressables.
- Verify reduced-motion (`useReducedMotion` → prefers-reduced-motion works
  on web).
- Sentry web sanity check (events arrive tagged browser).
- Smoke-test Safari specifically: no SAB (moot after 1.2), no
  requestIdleCallback (<18), Web Audio quirks on the test tone.

## Phase 3 — Later / optional

- **Responsive/desktop layout** — the app is phone-shaped; a max-width
  centered column is the cheap first step.
- **`static` output + SEO** for Learn pages (needs the Skia gate to be
  prerender-aware; `generateStaticParams` for `param/[param]`).
- **Web MIDI** — browser `navigator.requestMIDIAccess()` (Chromium-only)
  behind `MIDI_FEATURES_ENABLED`; the flag stays off for now anyway.
- **PWA-ish**: manifest, icons.

## Deployment

```
npx expo export --platform web   # dist/
eas deploy                       # EAS Hosting
```

`public/canvaskit.wasm` ships as a static asset (any output mode). Re-export
before each deploy. CI: consider adding `expo export -p web` to
.eas/workflows/ci.yml once phase 0 lands so web stays green.

## Performance notes

Everything runs on the main thread on web (no UI-thread worklets). The 2026-07
perf work is load-bearing here: deduped reactions, single rAF loops,
pause-on-blur, derived fill path — all directly reduce main-thread load.
CanvasKit is 2.9 MB gz, deferred behind the splash. If web feels heavy,
first lever is lowering waveform resolution (128 samples) on web.

## Test checklist (per phase)

Boot → all three tabs → param sheet (each param) → presets sheet (via the
1.1 fallback) → RND + fade rendering → crossfade preset switch → test tone
(user gesture) → settings persistence across reload → Safari + Firefox +
Chromium → `expo export -p web && npx serve dist` production smoke.

## No longer needed (from the old plan)

- JS `<Tabs>` platform fork (NativeTabs has a web impl now)
- Sentry web guard (works out of the box)
- SystemUI guard (works on web)
- "Skia may already work" (it does not — needs 0.2/0.3)

## Open questions to settle by testing (not research)

1. Does the root Skia gate + `single` output produce a clean prod export?
2. matchFont replacement: bundled font on all platforms vs web-only fork?
3. Do formSheet detents feel acceptable on desktop, or should param editing
   render inline on wide viewports (phase 3)?

## Implementation status (2026-07-11)

Phases 0 and 1 are IMPLEMENTED and browser-verified with agent-browser
(boot, editor + animated waveform, param sheet + prev/next fallbacks,
waveform edit, presets sheet via ☰ fallback, preset load with visible
fade-in, Learn tab with 7 animated previews, Settings, localStorage
persistence across reload; console clean of errors).

Discoveries beyond the plan, found only by running it:
1. `font.measureText()` also throws on web (not just matchFont) —
   TimingInfo/DestinationMeter now use `getTextWidth()` (advance width,
   works on both platforms).
2. **WebGL context limit is the real Skia-on-web constraint**: every
   <Canvas> holds a context, browsers cap ~16/page, and the home screen
   alone mounts 14 canvases. Fix: `src/components/StaticCanvas.tsx` opts
   static icon canvases (ParamIcons, WaveformIcon, learn SkiaIcons) into
   Skia's render-and-release path (`__destroyWebGLContextAfterRender`).
   Any new always-mounted <Canvas> must either be animated-and-few or use
   StaticCanvas.
3. StaticWebGLRenderer crashes on momentarily-0-sized canvases during
   sheet animations — patched via `bun patch` (patches/
   @shopify%2Freact-native-skia@2.6.2.patch, one zero-size guard in draw()).
   Re-check on every skia upgrade; consider upstreaming.

## Phase 2/3 layout work (2026-07-11, later)

- Bottom tabs on web: app/(tabs)/_layout.web.tsx uses headless tabs
  (expo-router/ui) — full-width bar, centered triggers, orange active pill.
  Typed routes want group hrefs as "/(tabs)/(home)" form.
- Max content width: src/theme/webLayout.ts (WEB_MAX_CONTENT_WIDTH=1100,
  webContentContainerStyle for ScrollView content containers — full-bleed
  bg preserved — and useWebContentInset() for full-width bars). Applied
  across all tab screens; screen-width-derived component sizes clamp via
  Math.min(width, WEB_MAX_CONTENT_WIDTH).
- Header: bar/bg full-bleed; the home header's web headerLeft takes
  marginLeft = useWebContentInset() so ☰ + title align with the column.
- Web modals: EXPO_UNSTABLE_WEB_MODAL=1 in .env makes expo-router's Stack
  render formSheet screens as modal drawers on web (param editor + presets
  open over the editor; Escape/backdrop dismiss; URL routing intact).
  EXPERIMENTAL — re-verify on expo-router upgrades, and the env var must
  also be set wherever `expo export -p web` runs (CI/EAS Hosting deploys).
  Known gap: the modal drawer renders no header, so the param prev/next
  header-button fallbacks don't show inside the web modal — param switching
  is via dismiss + tap. Revisit with in-sheet nav buttons if it matters.
