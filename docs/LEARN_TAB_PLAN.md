# Learn Tab Implementation Plan

## Overview

A new "Learn" tab in the app that teaches users everything about Elektron LFOs through a series of focused, digestible screens. The goal is to demystify LFOs for users who have Elektron hardware but don't fully understand how to use their LFOs effectively.

## Navigation Structure

```
Learn (Tab)
├── Index Screen (grid of topic cards)
│   ├── "What is an LFO?" → Intro Screen
│   ├── "The 7 Parameters" → Parameters Screen
│   ├── "Waveforms" → Waveforms Screen (includes All Waveforms gallery)
│   ├── "Speed & Timing" → Speed Screen
│   ├── "Depth & Fade" → Depth Screen
│   ├── "Trigger Modes" → Modes Screen
│   ├── "Modulation Destinations" → Destinations Screen
│   ├── "Timing Math" → Math Screen
│   └── "Preset Recipes" → Presets Screen
```

## File Structure

```
app/
├── (learn)/
│   ├── _layout.tsx          # Stack navigator for learn screens
│   ├── index.tsx             # Topic grid index
│   ├── intro.tsx             # What is an LFO? (conceptual)
│   ├── parameters.tsx        # The 7 Parameters overview
│   ├── waveforms.tsx         # Waveform types + gallery
│   ├── speed.tsx             # Speed & Multiplier
│   ├── depth.tsx             # Depth & Fade (moved before modes)
│   ├── modes.tsx             # Trigger modes
│   ├── destinations.tsx      # Modulation destinations
│   ├── timing.tsx            # Timing math & formulas
│   └── presets.tsx           # Preset recipes
```

---

## Screen Designs

### 1. Index Screen (`index.tsx`)

A grid of tappable cards, each leading to a topic. Visual, inviting, scannable.

**Layout:**
- 2-column grid of cards
- Each card has:
  - Icon or small illustration
  - Title (e.g., "Waveforms")
  - 1-line description
  - Chevron or arrow indicating navigation

**Topics (in order):**

| Card | Title | Description |
|------|-------|-------------|
| 1 | What is an LFO? | The basics of low frequency oscillators |
| 2 | The 7 Parameters | Visual guide to every LFO control |
| 3 | Waveforms | The shapes that define modulation character |
| 4 | Speed & Timing | How SPD and MULT control LFO rate |
| 5 | Depth & Fade | Controlling intensity and envelope |
| 6 | Trigger Modes | FRE, TRG, HLD, ONE, HLF explained |
| 7 | Modulation Destinations | Where LFOs can be routed |
| 8 | Timing Math | Formulas for calculating cycle times |
| 9 | Preset Recipes | Ready-to-use LFO configurations |

---

### 2. Intro Screen (`intro.tsx`)

**Title:** What is an LFO?

**Content Sections:**

1. **The Basics**
   - LFO = Low Frequency Oscillator
   - An invisible hand that automatically moves parameters over time
   - Oscillates (cycles back and forth) at frequencies too slow to hear
   - Creates movement, rhythm, and evolution in your sounds

2. **What Can LFOs Do?**
   - Sweeping filter effects (wah-wah)
   - Tremolo and volume pumping
   - Vibrato and pitch wobble
   - Stereo movement and panning
   - Evolving textures and atmospheres

3. **Digitakt II LFO Architecture**
   - 3 LFOs per audio track (LFO1, LFO2, LFO3)
   - 2 LFOs per MIDI track (LFO1, LFO2)
   - LFOs can modulate each other (LFO3 → LFO2 → LFO1)

**Related Concepts:**
- [The 7 Parameters →](parameters) Learn what each control does
- [Modulation Destinations →](destinations) See where LFOs can go

---

### 3. Parameters Screen (`parameters.tsx`)

**Title:** The 7 Parameters

**Visual Layout:** Vertical list with icons, minimal text per item

| Icon | Parameter | One-Line Description |
|------|-----------|---------------------|
| 〰️ | WAVE | Shape of the modulation curve |
| ⏱️ | SPD | How fast the LFO cycles |
| ✕ | MULT | Tempo-synced speed multiplier |
| ⟳ | SPH | Where in the cycle to start (phase) |
| ▶️ | MODE | How triggers affect the LFO |
| ↕️ | DEP | Intensity and direction of modulation |
| ⤴️ | FADE | Gradual intro or outro of effect |

**Tap-to-Expand Pattern:**
Each row expands to show 2-3 sentences max, then links to the full screen.

**Related Concepts:**
- [Waveforms →](waveforms) Deep dive into WAVE shapes
- [Speed & Timing →](speed) Master SPD and MULT
- [Depth & Fade →](depth) Control intensity with DEP and FADE
- [Trigger Modes →](modes) Understand MODE behavior

---

### 4. Waveforms Screen (`waveforms.tsx`)

**Title:** Waveforms

**Content Sections:**

1. **Introduction**
   - The waveform determines the *shape* of modulation over time
   - Each creates a different character of movement
   - 5 bipolar (-1 to +1) and 2 unipolar (0 to +1)

2. **The 7 Waveforms** (horizontal scrollable cards)

   Each card shows:
   - Animated waveform preview
   - Name and polarity badge
   - 2-line description
   - Best uses (tags)

   **Card Contents:**

   | Wave | Polarity | Character | Best For |
   |------|----------|-----------|----------|
   | TRI | Bipolar | Smooth, symmetrical rise and fall | Classic vibrato, gentle sweeps |
   | SIN | Bipolar | Rounded, natural movement | Natural-sounding modulation |
   | SQR | Bipolar | Instant on/off switching | Rhythmic gating, trills |
   | SAW | Bipolar | Rising ramp, instant reset | "Building" effects, risers |
   | EXP | Unipolar | Accelerating curve | Percussive attacks, swells |
   | RMP | Unipolar | Falling ramp | Decay effects, "falling" character |
   | RND | Bipolar | Sample-and-hold random | Humanization, chaos, variation |

3. **Bipolar vs Unipolar** (collapsible "Deep Dive" section)
   - Bipolar: swings above AND below center (±)
   - Unipolar: only positive values (0 to max)
   - Important for understanding how depth inversion works

4. **All Waveforms Gallery**
   - Shows all 7 waveforms animating simultaneously
   - Helps users visualize differences at a glance

**Related Concepts:**
- [Depth & Fade →](depth) How negative depth inverts SAW and other shapes
- [Trigger Modes →](modes) How ONE/HLF modes turn waveforms into envelopes

---

### 5. Speed & Timing Screen (`speed.tsx`)

**Title:** Speed & Timing

**Content Sections:**

1. **SPD (Speed) Parameter**
   - Range: -64 to +63
   - Controls how fast the LFO cycles
   - Positive = forward, Negative = backward
   - The value represents "phase steps" combined with MULT

2. **MULT (Multiplier) Parameter**
   - Values: 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1k, 2k
   - Multiplies the speed relative to project tempo
   - Higher values = faster LFO
   - "Dot" variants (1., 2., etc.) lock to 120 BPM

3. **How They Work Together**
   - Interactive example showing SPD × MULT relationship
   - Product determines cycles per bar
   - Product of 128 = exactly 1 bar per cycle

4. **Quick Reference** (horizontal scrollable cards instead of table)

   Cards showing common settings:
   - **1 bar** → SPD=16, MULT=8
   - **1/2 note** → SPD=16, MULT=16
   - **1/4 note** → SPD=16, MULT=32
   - **1/8 note** → SPD=32, MULT=32
   - **1/16 note** → SPD=32, MULT=64
   - **Glacial (128 bars)** → SPD=1, MULT=1

5. **Negative Speed** (collapsible "Deep Dive" section)
   - LFO runs backward through the waveform
   - SAW becomes falling instead of rising
   - Useful for inverted modulation shapes

**Related Concepts:**
- [Timing Math →](timing) Full formulas and calculator
- [Depth & Fade →](depth) Another way to invert waveforms (negative DEP)

---

### 6. Depth & Fade Screen (`depth.tsx`)

**Title:** Depth & Fade

**Content Sections:**

1. **DEP (Depth) Parameter**
   - Range: -64 to +63
   - Controls intensity AND polarity of modulation
   - 0 = no modulation (LFO still runs internally)
   - Positive = normal direction
   - Negative = inverted direction

2. **Depth Explorer** (interactive visual)
   - Slider showing how depth affects output amplitude
   - Live waveform visualization that scales with depth
   - Toggle between positive/negative to see inversion

3. **Inversion Explained** (with animated comparison)
   - With positive depth: SAW rises from -1 to +1
   - With negative depth: SAW falls from +1 to -1
   - Shape stays the same, direction reverses
   - Particularly important for unipolar waveforms (EXP, RMP)

4. **FADE Parameter**
   - Range: -64 to +63
   - Controls gradual introduction/removal of modulation
   - Negative = Fade IN (0 → full)
   - Zero = No fade (immediate full)
   - Positive = Fade OUT (full → 0)

5. **Fade Timing** (collapsible "Deep Dive" section)
   - Fade speed is relative to LFO cycle time
   - Higher |value| = faster fade
   - Useful for swells, buildups, dying effects

6. **Combining Depth & Fade** (collapsible "Deep Dive" section)
   - Fade IN with positive depth = modulation builds up
   - Fade OUT with negative depth = inverted modulation fades away
   - ONE mode + Fade = envelope-like behavior

**Related Concepts:**
- [Trigger Modes →](modes) How ONE + FADE creates envelopes
- [Waveforms →](waveforms) See how different shapes respond to inversion

---

### 7. Trigger Modes Screen (`modes.tsx`)

**Title:** Trigger Modes

**Content Sections:**

1. **What Are Trigger Modes?**
   - Controls how the LFO responds to note triggers
   - Critical for musical, rhythmic modulation
   - 5 modes, each for different use cases

2. **The 5 Modes** (horizontal scrollable cards with timeline diagrams)

   Each card shows:
   - Mode name and icon
   - Timeline diagram showing trigger behavior
   - 2-line description
   - Best uses (tags)

   **FRE (Free)**
   - Timeline: Continuous wave, trigger marker has no effect
   - LFO runs continuously, ignoring triggers
   - Best for: Ambient textures, evolving pads

   **TRG (Trigger)**
   - Timeline: Wave restarts at trigger marker
   - LFO restarts from start phase on each trigger
   - Best for: Rhythmic effects, synced modulation

   **HLD (Hold)**
   - Timeline: Wave runs in background, output freezes at trigger
   - LFO runs in background; trigger samples and holds current value
   - Best for: Sample-and-hold effects, frozen modulation

   **ONE (One-Shot)**
   - Timeline: Single complete cycle from trigger, then flatline
   - LFO runs one complete cycle from trigger, then stops
   - Best for: Envelope-like effects, one-time sweeps

   **HLF (Half)**
   - Timeline: Half cycle from trigger, then flatline
   - LFO runs half a cycle from trigger, then stops
   - Best for: Attack-only envelopes, single-direction sweeps

3. **Mode Comparison** (collapsible "Deep Dive" section)

   | Mode | Runs Continuously? | Responds to Trigger? | Stops? |
   |------|-------------------|---------------------|--------|
   | FRE | Yes | No | Never |
   | TRG | Yes | Restarts | Never |
   | HLD | Yes (hidden) | Freezes output | Never |
   | ONE | No | Starts | After 1 cycle |
   | HLF | No | Starts | After 1/2 cycle |

**Visual Specifications - Timeline Diagrams:**
- Show time axis (horizontal) with trigger marker(s)
- Show LFO output (vertical) as waveform line
- Highlight the moment of trigger with vertical dashed line
- For ONE/HLF: show clear "stop" point with flatline

**Related Concepts:**
- [Depth & Fade →](depth) Use FADE with ONE mode for envelope shapes
- [Speed & Timing →](speed) Mode behavior depends on LFO speed
- [Preset Recipes →](presets) See modes in action with real presets

---

### 8. Modulation Destinations Screen (`destinations.tsx`)

**Title:** Modulation Destinations

**Content Sections:**

1. **Where Can LFOs Go?**
   - LFOs can modulate almost any parameter on Digitakt II
   - Each LFO has its own DEST (destination) setting
   - Understanding destinations unlocks creative sound design

2. **Audio Track Destinations** (horizontal scrollable cards by category)

   **Sample/Source:**
   - Sample Slot, Sample Start, Sample Length
   - Sample Loop Position, Sample Bit Reduction

   **Filter:**
   - Filter Frequency (classic sweeping effects)
   - Filter Resonance, Filter Envelope Depth
   - Base/Width (for multimode filter)

   **Amplifier:**
   - Level (tremolo, ducking)
   - Pan (stereo movement)
   - Amp Envelope Depth

   **Pitch:**
   - Tune (vibrato, pitch wobble)
   - Detune

   **Effects:**
   - Delay Send, Reverb Send
   - Overdrive Amount
   - Chorus/Flanger parameters
   - Bit Crusher parameters

   **LFO Cross-Modulation:**
   - LFO2 Speed, LFO2 Depth (from LFO3)
   - LFO1 Speed, LFO1 Depth (from LFO2/LFO3)
   - Creates complex, evolving modulation

3. **MIDI Track Destinations** (collapsible "Deep Dive" section)
   - CC values (any MIDI CC number)
   - Pitch bend
   - Aftertouch
   - Note parameters

4. **Popular Destination Combinations** (cards with animated previews)
   - LFO → Filter Cutoff: Classic synth sweep
   - LFO → Level: Tremolo effect
   - LFO → Pan: Auto-panner
   - LFO → Pitch: Vibrato
   - LFO → Reverb Send: Evolving space
   - LFO → Another LFO: Complex movement

**Related Concepts:**
- [Preset Recipes →](presets) See destinations used in context
- [Trigger Modes →](modes) Match mode to destination for best results

---

### 9. Timing Math Screen (`timing.tsx`)

**Title:** Timing Math

**Content Sections:**

1. **The Core Concept**
   - Product of SPD × MULT determines cycle length
   - 128 = exactly 1 bar per cycle
   - Higher product = faster LFO

2. **Interactive Calculator**
   - Input: BPM, SPD, MULT
   - Output: Cycle time in ms, musical note value
   - Visual representation of cycle length

3. **Common Timing Reference** (horizontal scrollable cards)

   Cards showing musical values:
   - **1/16 note** → Product: 2048
   - **1/8 note** → Product: 1024
   - **1/4 note** → Product: 512
   - **1/2 note** → Product: 256
   - **1 bar** → Product: 128
   - **2 bars** → Product: 64
   - **4 bars** → Product: 32

4. **The Formulas** (collapsible "Deep Dive" section)

   **Calculating Cycle Length:**
   ```
   product = |SPD| × MULT
   ```

   If product > 128:
   ```
   cycle = product / 128 (fraction of whole note)
   ```

   If product < 128:
   ```
   whole_notes = 128 / product
   ```

   **Time in Milliseconds:**
   ```
   cycle_ms = (60000 / BPM) × 4 × (128 / product)
   ```

   **Phase to Degrees:**
   ```
   degrees = (SPH / 128) × 360
   ```
   - 0 = 0°, 32 = 90°, 64 = 180°, 96 = 270°, 127 ≈ 360°

5. **Asymmetry Note** (collapsible "Deep Dive" section)
   - Range is -64 to +63 (not symmetric)
   - At SPD=-64, magnitude is slightly > 1.0
   - Workaround: SPD=-64 with SPH=127 for perfect sync

**Related Concepts:**
- [Speed & Timing →](speed) Practical guide to SPD and MULT
- [Trigger Modes →](modes) Timing interacts with mode behavior

---

### 10. Presets Screen (`presets.tsx`)

**Title:** Preset Recipes

**Content Sections:**

1. **Introduction**
   - Ready-to-use LFO configurations
   - Each solves a specific musical problem
   - Preview and apply without leaving Learn

2. **Preset Cards** (tappable, with animated preview)

   Each preset card shows:
   - Name and icon
   - Animated waveform preview (small)
   - One-line description
   - Use case tags
   - "Preview" button → opens modal

**The Presets:**

| Preset | Description | Key Insight |
|--------|-------------|-------------|
| Fade-In One-Shot | One-time modulation that fades in | ONE mode + negative FADE |
| Ambient Drift | Ultra-slow evolving modulation | SPD=1, MULT=1, FRE mode |
| Hi-Hat Humanizer | Random subtle variations | RND waveform, low depth |
| Pumping Sidechain | Classic EDM ducking effect | EXP waveform, negative depth |
| Wobble Bass | Dubstep filter wobble | SIN waveform, TRG mode |

3. **Preset Preview Modal** (bottom sheet)
   - Full-size live visualization
   - All 7 parameters displayed
   - Why it works explanation
   - Suggested destinations
   - Tips and variations
   - **"Use This Preset" button** → Saves to Home, stays in Learn
   - **"Open in Home" button** → Optional full navigation

**Modal Behavior:**
- Opens as bottom sheet (70% screen height)
- Visualization animates live
- Swiping down dismisses
- "Use This Preset" applies settings silently with toast confirmation
- User can continue exploring Learn without interruption

**Related Concepts:**
- Links within each preset to relevant parameter screens
- Example: "This uses SAW with negative depth" → [Depth & Fade →](depth)

---

## Visual Specifications

### Timeline Diagrams (Trigger Modes)
- Canvas-based or SVG diagrams
- Horizontal time axis with tick marks
- Vertical trigger markers (dashed line, orange)
- Waveform line showing LFO output
- Labels for key moments (trigger, restart, freeze, stop)

### Depth Explorer (Interactive)
- Horizontal slider for depth value (-64 to +63)
- Live waveform that scales vertically with depth
- Flip animation when crossing zero (inversion)
- Numeric display of current depth value

### Animated Preset Previews
- Thumbnail-size waveform animations on cards
- Full-size animation in preview modal
- Use existing LFOVisualization component
- Auto-trigger at regular intervals for ONE/HLF modes

---

## Cross-Linking System

### Implementation
Each screen includes a "Related Concepts" section at the bottom:
- 2-4 relevant links maximum
- Brief description of why the link is relevant
- Styled as tappable pills or cards

### Deep Links Within Content
- Inline links in explanatory text
- Example: "SAW with negative depth" links to depth.tsx#inversion
- Use React Navigation deep linking

### Link Examples
- Waveforms → Depth ("how negative depth inverts shapes")
- Speed → Timing Math ("see the full formulas")
- Modes → Depth ("ONE + FADE for envelopes")
- Destinations → Presets ("see destinations in action")
- Parameters → Each individual parameter screen

---

## Component Reuse

### Move from Home Screen
- `WaveformPreview` component → Use in Waveforms screen gallery
- `WAVEFORMS` array → Share via constants file
- `LFOVisualization` → Use in preset preview modal

### New Components Needed
- `LearnCard` - Tappable card for index grid
- `ExpandableSection` - Collapsible "Deep Dive" sections
- `HorizontalCardScroll` - Scrollable card carousel
- `ParameterRow` - Icon + name + description row
- `TimelineDiagram` - SVG/Canvas trigger mode visualization
- `DepthExplorer` - Interactive depth slider with live preview
- `PresetPreviewModal` - Bottom sheet with visualization
- `RelatedConceptsSection` - Links to other screens
- `FormulaBlock` - Styled code/formula display (collapsible)
- `InteractiveCalculator` - BPM/timing calculator widget

---

## Design Guidelines

### Visual Style
- Dark background consistent with rest of app (#0a0a0a)
- Cards with #1a1a1a background
- Orange accent color for interactive elements (#ff6600)
- Consistent with Elektron aesthetic

### Typography
- Section headers: 18px, semibold, white
- Body text: 15px, regular, #cccccc
- Labels/captions: 13px, regular, #888899
- Code/formulas: monospace, #00d4ff

### Navigation
- Stack navigator for drill-down screens
- Back button in header
- Smooth transitions
- Modal/bottom sheet for preset preview

### Scrolling Fatigue Reduction
- Horizontal scrolling cards for comparisons (not tables)
- Collapsible "Deep Dive" sections for advanced content
- Keep primary content above the fold
- Progressive disclosure pattern throughout

### Content Principles
- Concise but complete
- Visual examples over walls of text
- Interactive where possible
- Always explain the "why" not just the "what"
- Cross-link related concepts

---

## Implementation Order

1. **Phase 1: Structure**
   - Create `(learn)` route group
   - Set up stack navigator layout
   - Build index screen with placeholder cards
   - Implement basic navigation

2. **Phase 2: Core Screens**
   - Intro screen (conceptual only)
   - Parameters screen (visual list)
   - Waveforms screen (move gallery here)
   - Speed & Timing screen

3. **Phase 3: Depth & Modes**
   - Depth & Fade screen (with interactive explorer)
   - Trigger Modes screen (with timeline diagrams)
   - HorizontalCardScroll component
   - ExpandableSection component

4. **Phase 4: Destinations & Math**
   - Modulation Destinations screen
   - Timing Math screen
   - Interactive calculator widget
   - FormulaBlock component

5. **Phase 5: Presets & Modal**
   - Presets screen with animated previews
   - PresetPreviewModal bottom sheet
   - "Use This Preset" functionality
   - Toast notifications

6. **Phase 6: Cross-Linking**
   - RelatedConceptsSection component
   - Add links to all screens
   - Deep linking within content
   - Navigation testing

7. **Phase 7: Polish**
   - Timeline diagram visualizations
   - Depth explorer interactivity
   - Animations and transitions
   - Final content review

---

## Tab Bar Update

Add Learn tab to the tab bar:

```typescript
// app/_layout.tsx or app/(tabs)/_layout.tsx
<Tabs.Screen
  name="(learn)"
  options={{
    title: "Learn",
    tabBarIcon: ({ color }) => <BookOpenIcon color={color} />,
  }}
/>
```

Tab order: Home | Learn | Settings
