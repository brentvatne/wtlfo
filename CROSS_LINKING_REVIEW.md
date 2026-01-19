# Cross-Linking Review: Learn Section

## Executive Summary

The Learn section has **partial cross-linking implemented** with a consistent pattern, but lacks bidirectional links and deep integration with the main app. Several high-value connection opportunities are missing.

---

## 1. Current Linking Analysis

### Existing "Related Concepts" Links

| Page | Links To | Link Text |
|------|----------|-----------|
| **intro.tsx** | /parameters | "The 7 Parameters - Learn what each control does" |
| | /destinations | "Modulation Destinations - See where LFOs can go" |
| **parameters.tsx** | /waveforms | (via WAVE param "Learn more") |
| | /speed | (via SPD and MULT params "Learn more") |
| | /modes | (via MODE param "Learn more") |
| | /depth | (via DEP and FADE params "Learn more") |
| **speed.tsx** | /timing | "Timing Math - Full formulas and calculator" |
| | /depth | "Depth & Fade - Another way to invert waveforms" |
| **depth.tsx** | /modes | "Trigger Modes - Use ONE + FADE for envelopes" |
| | /waveforms | "Waveforms - See how shapes respond to inversion" |
| **modes.tsx** | /depth | "Depth & Fade - Use FADE with ONE for envelopes" |
| | /speed | "Speed & Timing - Mode behavior depends on LFO speed" |
| | /presets | "Preset Recipes - See modes in action" |
| **waveforms.tsx** | (none) | No Related section |
| **destinations.tsx** | (none) | No Related section |
| **timing.tsx** | (none) | No Related section |
| **presets.tsx** | (none) | No Related section |

### Bidirectionality Analysis

| Link Pair | A -> B | B -> A | Status |
|-----------|--------|--------|--------|
| intro <-> parameters | Yes | No | **MISSING reverse** |
| intro <-> destinations | Yes | No | **MISSING reverse** |
| parameters <-> waveforms | Yes | No | **MISSING reverse** |
| parameters <-> speed | Yes | No | **MISSING reverse** |
| parameters <-> modes | Yes | No | **MISSING reverse** |
| parameters <-> depth | Yes | No | **MISSING reverse** |
| speed <-> timing | Yes | No | **MISSING reverse** |
| speed <-> depth | Yes | Yes | **Bidirectional** |
| depth <-> modes | Yes | Yes | **Bidirectional** |
| depth <-> waveforms | Yes | No | **MISSING reverse** |
| modes <-> presets | Yes | No | **MISSING reverse** |

**Finding:** Only 2 of 11 link pairs are bidirectional (speed<->depth, depth<->modes).

### Link Quality Assessment

**Good patterns:**
- Parameters page links are contextual ("Learn more" appears inline when parameter is expanded)
- Link descriptions explain *why* you'd want to navigate
- Consistent styling using `RelatedLink` component pattern

**Issues:**
- 4 pages have NO related links at all
- Waveforms page discusses bipolar/unipolar but doesn't link to depth (where polarity matters)
- Destinations doesn't link to intro (which mentions destinations)
- Timing is an advanced topic but doesn't link back to speed (where users would come from)
- Presets page shows techniques but doesn't explain them

---

## 2. Missing Links Analysis

### Pages Missing Outbound Links

#### **waveforms.tsx**
Should link to:
- `/depth` - "Depth & Inversion" (how negative depth affects waveforms)
- `/presets` - "See waveforms in action"
- `/parameters` - "Back to all parameters"

#### **destinations.tsx**
Should link to:
- `/intro` - "What is an LFO?" (context for why modulation matters)
- `/depth` - "Depth controls how much" (intensity explanation)
- `/presets` - "See destination examples"

#### **timing.tsx**
Should link to:
- `/speed` - "Speed & Multiplier basics" (simpler explanation)
- `/presets` - "See timing in practice"

#### **presets.tsx**
Should link to:
- `/waveforms` - "Understand waveform shapes"
- `/modes` - "Learn about trigger modes"
- `/depth` - "Fade and depth explained"
- `/speed` - "Speed and multiplier math"

### Conceptual Cross-References Missing

| Concept | Mentioned In | Should Link To |
|---------|--------------|----------------|
| "Inversion" | depth.tsx, speed.tsx | Should be consistent |
| "Envelope-like" | modes.tsx (ONE), depth.tsx (FADE) | Cross-link each other |
| "Unipolar waveforms" | waveforms.tsx, depth.tsx | Should link |
| "Sample-and-hold" | modes.tsx (HLD), waveforms.tsx (RND) | Should link |
| "Cycle time" | speed.tsx, timing.tsx | Already linked (good) |
| "Trigger" | modes.tsx, depth.tsx (FADE warning) | Already linked (good) |

---

## 3. Navigation Flow Analysis

### Current Learning Path

The index page presents topics in this order:
1. What is an LFO? (intro)
2. The 7 Parameters (parameters)
3. Waveforms
4. Speed & Timing
5. Depth & Fade
6. Trigger Modes
7. Destinations
8. Timing Math
9. Preset Recipes

**Assessment:** This is a reasonable beginner-to-advanced progression.

### Recommended Order Markers

The Learn index could benefit from:
- "Start Here" badge on intro
- "Fundamentals" grouping for parameters, waveforms, speed, depth, modes
- "Advanced" grouping for timing
- "Reference" grouping for destinations, presets

### Can Advanced Users Skip Around?

**Partially.** The current structure allows jumping to any topic, but:
- No "prerequisites" hints
- No "difficulty level" indicators
- Related links help discovery but aren't comprehensive

### Navigation Gaps

- **No "Next" / "Previous" navigation** within Learn pages
- Users must return to index to continue
- No breadcrumb or progress indicator

---

## 4. Deep Link Opportunities

### Main App -> Learn Section

| App Location | Potential Link | Target | Priority |
|--------------|---------------|--------|----------|
| `/param/[param].tsx` (waveform) | "Learn more about waveforms" | `/waveforms` | **HIGH** |
| `/param/[param].tsx` (speed) | "Understanding speed" | `/speed` | **HIGH** |
| `/param/[param].tsx` (multiplier) | "Timing calculations" | `/timing` | MEDIUM |
| `/param/[param].tsx` (mode) | "Trigger mode guide" | `/modes` | **HIGH** |
| `/param/[param].tsx` (depth) | "Depth explained" | `/depth` | **HIGH** |
| `/param/[param].tsx` (fade) | "How fade works" | `/depth` | **HIGH** |
| `/param/[param].tsx` (startPhase) | "Start phase basics" | `/parameters` | LOW |
| `/param/[param].tsx` (destination) | "Destination options" | `/destinations` | MEDIUM |
| `/(home)/presets.tsx` | "Learn preset techniques" | `/presets` | **HIGH** |
| Destination picker | "What can I modulate?" | `/destinations` | MEDIUM |

**Note:** The param modal already has inline documentation (`PARAM_INFO`) that could include a "Learn more" link.

### Should Parameter Editing Link to Explanations?

**YES.** The `[param].tsx` file already contains:
- `PARAM_INFO` with descriptions and details
- Could easily add a `learnRoute?: string` field
- Example: When editing FADE, show "Note: Has no effect in FRE mode" with link to `/modes`

### Should Presets Link to Technique Explanations?

**YES.** The `presets.tsx` (Learn) page shows presets with badges like "ONE mode", "Fade IN", etc. These could be links:
- "ONE mode" -> `/modes`
- "Fade IN" -> `/depth`
- "Inverted depth" -> `/depth`

The `presets.tsx` (Home) page shows a compact preset list that could have a footer link to Learn presets page.

---

## 5. Link Map: Ideal Connections

```
                              ┌─────────────────┐
                              │     INTRO       │
                              │  (Entry Point)  │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
           ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
           │ PARAMETERS  │◄───│ DESTINATIONS│    │   PRESETS   │
           │  (Hub page) │    │             │    │ (Examples)  │
           └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
                  │                  │                  │
     ┌────────────┼────────────┐     │                  │
     │            │            │     │                  │
     ▼            ▼            ▼     │                  │
┌─────────┐ ┌─────────┐ ┌─────────┐  │     All pages    │
│WAVEFORMS│ │  SPEED  │ │  DEPTH  │◄─┘     link here    │
│         │ │         │ │         │◄───────────────────┘
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     │           │           ▼
     │           │      ┌─────────┐
     │           │      │  MODES  │
     │           │      └────┬────┘
     │           │           │
     │           ▼           │
     │      ┌─────────┐      │
     └─────►│ TIMING  │◄─────┘
            │(Advanced)│
            └─────────┘
```

### Priority Link Additions

#### HIGH PRIORITY (user journey essentials)

1. **waveforms.tsx -> depth.tsx**
   - Context: "Bipolar vs Unipolar" section
   - Text: "See how depth affects waveform polarity"

2. **destinations.tsx -> depth.tsx**
   - Context: "How Modulation Works" section
   - Text: "Learn about depth and intensity"

3. **presets.tsx -> multiple pages**
   - Add Related section linking to modes, depth, waveforms

4. **timing.tsx -> speed.tsx**
   - Text: "Speed & Multiplier basics"

5. **All pages without Related sections** need them added

#### MEDIUM PRIORITY (completeness)

6. **Bidirectional links** - Add reverse links for all existing one-way connections

7. **waveforms.tsx -> presets.tsx**
   - Text: "See waveforms in action"

8. **destinations.tsx -> presets.tsx**
   - Text: "See destination examples"

#### LOWER PRIORITY (app integration)

9. **[param].tsx -> Learn pages**
   - Add "Learn more" links in param editor modals

10. **presets.tsx (home) -> presets.tsx (learn)**
    - Add "Learn about these presets" link

---

## 6. Implementation Recommendations

### Quick Wins (Add Related sections)

Add to **waveforms.tsx**:
```tsx
<View style={styles.relatedSection}>
  <Text style={styles.relatedTitle}>Related Concepts</Text>
  <RelatedLink
    title="Depth & Fade"
    description="How negative depth inverts waveforms"
    route="/depth"
  />
  <RelatedLink
    title="Preset Recipes"
    description="See waveforms in action"
    route="/presets"
  />
</View>
```

Add to **destinations.tsx**:
```tsx
<View style={styles.relatedSection}>
  <Text style={styles.relatedTitle}>Related Concepts</Text>
  <RelatedLink
    title="What is an LFO?"
    description="Modulation fundamentals"
    route="/intro"
  />
  <RelatedLink
    title="Depth"
    description="Control modulation intensity"
    route="/depth"
  />
</View>
```

Add to **timing.tsx**:
```tsx
<View style={styles.relatedSection}>
  <Text style={styles.relatedTitle}>Related Concepts</Text>
  <RelatedLink
    title="Speed & Timing"
    description="Simpler overview of SPD and MULT"
    route="/speed"
  />
</View>
```

Add to **presets.tsx** (Learn):
```tsx
<View style={styles.relatedSection}>
  <Text style={styles.relatedTitle}>Learn the Techniques</Text>
  <RelatedLink
    title="Trigger Modes"
    description="Understanding ONE, TRG, and HLF"
    route="/modes"
  />
  <RelatedLink
    title="Depth & Fade"
    description="Fade in/out effects explained"
    route="/depth"
  />
  <RelatedLink
    title="Waveforms"
    description="Why each shape sounds different"
    route="/waveforms"
  />
</View>
```

### Structural Improvement (Next/Previous Navigation)

Consider adding sequential navigation to all Learn pages:
```tsx
// In _layout.tsx or each page
<View style={styles.navFooter}>
  <Pressable onPress={() => router.push(prevRoute)}>
    <Text>← Previous: {prevTitle}</Text>
  </Pressable>
  <Pressable onPress={() => router.push(nextRoute)}>
    <Text>Next: {nextTitle} →</Text>
  </Pressable>
</View>
```

### App Integration (Deep Links)

Update `PARAM_INFO` in `[param].tsx`:
```tsx
const PARAM_INFO: Record<ParamKey, ParamInfo & { learnRoute?: string }> = {
  waveform: {
    title: 'Waveform',
    description: '...',
    learnRoute: '/waveforms', // Add this
  },
  // ...
};
```

Then render:
```tsx
{info.learnRoute && (
  <Pressable onPress={() => router.push(info.learnRoute)}>
    <Text style={styles.learnMoreLink}>Learn more about {info.title.toLowerCase()} →</Text>
  </Pressable>
)}
```

---

## Summary: Action Items

| Priority | Action | Pages Affected |
|----------|--------|----------------|
| **P0** | Add Related sections to pages missing them | waveforms, destinations, timing, presets (learn) |
| **P1** | Add reverse links for bidirectional navigation | intro, parameters, waveforms, timing |
| **P2** | Add "Learn more" links in param editor | [param].tsx |
| **P3** | Add Next/Previous navigation | All Learn pages |
| **P4** | Add "difficulty" or "category" badges to index | index.tsx |
