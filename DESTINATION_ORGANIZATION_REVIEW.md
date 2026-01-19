# Destination Organization Review

**Review Date:** January 2026
**File Analyzed:** `/Users/brent/wtlfo/src/data/destinations.ts`

---

## Executive Summary

The destination organization in WTLFO is well-structured but incomplete. The category system is logical and matches Elektron conventions, but significant gaps exist in destination coverage. The current 17 destinations cover essential parameters but miss many Elektron Digitakt II modulation targets that musicians would expect.

**Organization Score: 78/100**

| Category | Score | Notes |
|----------|-------|-------|
| Category Logic | 90/100 | Categories match Elektron conventions |
| Destination Placement | 95/100 | All destinations in correct categories |
| Completeness | 60/100 | Missing 15+ Elektron destinations |
| Balance | 75/100 | Amp category heavy, Sample light |
| Discoverability | 85/100 | Good for current scope |

---

## 1. Category Organization Analysis

### Current Categories

```typescript
CATEGORY_ORDER: ['filter', 'amp', 'pitch', 'sample', 'fx']
```

### Assessment

| Category | Label | Elektron Match | Intuitive? |
|----------|-------|----------------|------------|
| filter | FILTER | Yes (FLTR) | Yes |
| amp | AMP | Yes | Yes |
| pitch | PITCH | Partial (part of SRC) | Yes |
| sample | SAMPLE | Partial (part of SRC) | Yes |
| fx | FX | Yes | Yes |

### Category Logic: Strengths

1. **Matches Elektron terminology** - Musicians familiar with Digitakt will recognize FILTER, AMP, FX
2. **Logical grouping** - Related parameters are together
3. **Order makes sense** - Signal flow order (source -> filter -> amp -> fx)

### Category Logic: Issues

1. **Missing SRC category** - Elektron groups pitch, sample, and machine parameters under "SRC" (Source)
2. **No LFO category** - Digitakt II supports LFO-to-LFO modulation (LFO1 destinations)
3. **No META category** - Elektron includes "None" in a META category

### Recommendation

**Option A (Minimal change):** Keep current categories. They work well for the current educational scope.

**Option B (Elektron alignment):** Merge pitch and sample into a "SRC" category to match Elektron exactly:
```typescript
CATEGORY_ORDER: ['src', 'filter', 'amp', 'fx']
// Where 'src' contains: tune, fine, sample_start, sample_length, loop, sample_slot
```

**Suggested approach:** Keep current categories but add missing category for LFO cross-modulation when multi-LFO support is added.

---

## 2. Destination Placement Analysis

### Current Destinations by Category

| Category | Count | Destinations |
|----------|-------|--------------|
| filter | 4 | cutoff, resonance, drive, env_depth |
| amp | 6 | volume, pan, attack, decay, sustain, release |
| pitch | 2 | pitch, pitch_fine |
| sample | 2 | sample_start, sample_length |
| fx | 4 | delay_send, reverb_send, overdrive, bit_reduction |

**Total: 18 destinations (including 'none')**

### Placement Assessment: All Correct

Every destination is in its appropriate category:

| Destination | Category | Correct? | Rationale |
|-------------|----------|----------|-----------|
| filter_cutoff | filter | Yes | Primary filter parameter |
| filter_resonance | filter | Yes | Filter characteristic |
| filter_drive | filter | Yes | Filter saturation |
| filter_env_depth | filter | Yes | Filter envelope amount |
| volume | amp | Yes | Output level |
| pan | amp | Yes | Stereo position |
| amp_attack | amp | Yes | ADSR envelope |
| amp_decay | amp | Yes | ADSR envelope |
| amp_sustain | amp | Yes | ADSR envelope |
| amp_release | amp | Yes | ADSR envelope |
| pitch | pitch | Yes | Coarse tuning |
| pitch_fine | pitch | Yes | Fine tuning |
| sample_start | sample | Yes | Playback position |
| sample_length | sample | Yes | Playback length |
| delay_send | fx | Yes | Effect send |
| reverb_send | fx | Yes | Effect send |
| overdrive | fx | Yes | Distortion effect |
| bit_reduction | fx | Yes | Lo-fi effect |

**Finding:** No misplaced destinations. The organization is correct.

---

## 3. Missing Elektron Destinations

Based on the Digitakt II specification, the following destinations are missing:

### High Priority (Common Use)

| Destination | Category | Elektron Name | Priority | Notes |
|-------------|----------|---------------|----------|-------|
| filter_attack | filter | ATK | P1 | Filter envelope attack |
| filter_decay | filter | DEC | P1 | Filter envelope decay |
| filter_sustain | filter | SUS | P2 | Filter envelope sustain |
| filter_release | filter | REL | P2 | Filter envelope release |
| chorus_send | fx | CHO | P1 | Third effect send (Digitakt II) |
| sample_rate_reduction | fx | SRR | P2 | Lo-fi effect |
| loop_position | sample | LOOP | P2 | Loop start point |

### Medium Priority (Advanced Use)

| Destination | Category | Elektron Name | Priority | Notes |
|-------------|----------|---------------|----------|-------|
| filter_base | filter | BASE | P3 | Dual filter base |
| filter_width | filter | WDTH | P3 | Dual filter width |
| amp_hold | amp | HLD | P3 | Amp envelope hold |
| sample_slot | sample | SAMP | P3 | Sample selection |
| play_mode | sample | PLAY | P3 | Playback mode |
| sample_level | sample | LVL | P2 | Pre-filter level |

### Lower Priority (LFO Cross-Modulation)

For Digitakt II parity with multi-LFO support:

| Destination | Category | Elektron Name | Notes |
|-------------|----------|---------------|-------|
| lfo1_speed | lfo | SPD | LFO2/3 -> LFO1 |
| lfo1_depth | lfo | DEP | LFO2/3 -> LFO1 |
| lfo1_phase | lfo | SPH | LFO2/3 -> LFO1 |
| lfo1_fade | lfo | FADE | LFO2/3 -> LFO1 |
| lfo2_speed | lfo | SPD | LFO3 -> LFO2 |
| lfo2_depth | lfo | DEP | LFO3 -> LFO2 |

### Recommendation: Phased Addition

**Phase 1 (Essential):**
- filter_attack, filter_decay (complete filter envelope)
- chorus_send (complete FX sends)

**Phase 2 (Enhanced):**
- filter_sustain, filter_release
- sample_rate_reduction
- loop_position
- sample_level

**Phase 3 (Advanced/Multi-LFO):**
- LFO cross-modulation destinations
- Dual filter parameters

---

## 4. Destination Definitions Review

### Min/Max Values

| Destination | Current Range | Correct? | Notes |
|-------------|--------------|----------|-------|
| filter_cutoff | 0-127 | Yes | Standard MIDI range |
| filter_resonance | 0-127 | Yes | Standard range |
| filter_drive | 0-127 | Yes | Standard range |
| filter_env_depth | -64 to +63 | Yes | Bipolar, matches Elektron |
| volume | 0-127 | Yes | Standard range |
| pan | -64 to +63 | Yes | Bipolar, center=0 |
| amp_attack | 0-127 | Yes | Standard range |
| amp_decay | 0-127 | Yes | Standard range |
| amp_sustain | 0-127 | Yes | Standard range |
| amp_release | 0-127 | Yes | Standard range |
| pitch | -24 to +24 | Yes | 2 octaves each direction |
| pitch_fine | -64 to +63 | Yes | ~1 semitone resolution |
| sample_start | 0-127 | Yes | Position in sample |
| sample_length | 0-127 | Yes | Length from start |
| delay_send | 0-127 | Yes | Send level |
| reverb_send | 0-127 | Yes | Send level |
| overdrive | 0-127 | Yes | Drive amount |
| bit_reduction | 0-127 | Yes | Bit depth |

**Finding:** All min/max values are correct.

### Bipolar Flags

| Destination | Bipolar | Correct? | Notes |
|-------------|---------|----------|-------|
| filter_cutoff | false | Yes | 0 = closed, 127 = open |
| filter_resonance | false | Yes | 0 = none, 127 = max |
| filter_drive | false | Yes | 0 = none |
| filter_env_depth | true | Yes | Negative = inverted envelope |
| volume | false | Yes | 0 = silent |
| pan | true | Yes | Center = 0, L/R spread |
| pitch | true | Yes | Center = no transpose |
| pitch_fine | true | Yes | Center = no detune |
| sample_start | false | Yes | 0 = beginning |
| sample_length | false | Yes | 0 = shortest |
| delay_send | false | Yes | 0 = no send |
| reverb_send | false | Yes | 0 = no send |
| overdrive | false | Yes | 0 = clean |
| bit_reduction | false | Yes | 0 = clean |
| amp_attack | false | Yes | 0 = instant |
| amp_decay | false | Yes | 0 = instant |
| amp_sustain | false | Yes | 0 = no sustain |
| amp_release | false | Yes | 0 = instant |

**Finding:** All bipolar flags are correct.

### Display Names

| Destination | displayName | Clear? | Alternative? |
|-------------|-------------|--------|--------------|
| filter_cutoff | CUTOFF | Yes | CUT (shorter) |
| filter_resonance | RESO | Yes | - |
| filter_drive | DRIVE | Yes | DRV (shorter) |
| filter_env_depth | F.ENV | Good | ENV (matches Elektron) |
| volume | VOL | Yes | - |
| pan | PAN | Yes | - |
| pitch | TUNE | Yes | Matches Elektron |
| pitch_fine | FINE | Yes | - |
| sample_start | STRT | Yes | - |
| sample_length | LEN | Yes | - |
| delay_send | DLY | Yes | - |
| reverb_send | REV | Yes | - |
| overdrive | OVR | Yes | - |
| bit_reduction | BIT | Yes | - |
| amp_attack | ATK | Yes | - |
| amp_decay | DEC | Yes | - |
| amp_sustain | SUS | Yes | - |
| amp_release | REL | Yes | - |

**Finding:** Display names are clear and consistent. Minor suggestions:
- Consider "ENV" instead of "F.ENV" to match Elektron's filter page
- Consider "CUT" for cutoff (3 chars, more consistent length)

---

## 5. Category Balance Analysis

### Current Distribution

```
filter:  ████ (4)
amp:     ██████ (6)
pitch:   ██ (2)
sample:  ██ (2)
fx:      ████ (4)
```

### Balance Assessment

| Category | Count | Target | Status |
|----------|-------|--------|--------|
| filter | 4 | 6-8 | Under (missing envelope params) |
| amp | 6 | 6-7 | Good |
| pitch | 2 | 2-3 | Good (could add portamento) |
| sample | 2 | 4-5 | Under (missing loop, level, slot) |
| fx | 4 | 5-6 | Under (missing chorus, SRR) |

### Elektron Digitakt II Distribution

For reference, Digitakt II has approximately:
- **SRC (source):** 8+ parameters (tune, play, sample, start, length, loop, level, machine params)
- **FLTR (filter):** 10 parameters (freq, reso, env, atk, dec, sus, rel, base, width, delay)
- **AMP:** 7 parameters (atk, hld, dec, sus, rel, vol, pan)
- **FX:** 7 parameters (dly, rev, cho, bit, srr, srrr, ovr)

### Recommendation

To improve balance without overwhelming users:

**Add to filter (2):** filter_attack, filter_decay
**Add to sample (2):** loop_position, sample_level
**Add to fx (1):** chorus_send

This would yield:
```
filter:  ██████ (6)
amp:     ██████ (6)
pitch:   ██ (2)
sample:  ████ (4)
fx:      █████ (5)
```

---

## 6. User Discovery Analysis

### Positive Factors

1. **Category grouping** - Musicians can browse by familiar categories
2. **Short display names** - Quick scanning possible
3. **Elektron terminology** - RESO, STRT, ATK match hardware labels
4. **Category order** - Follows signal flow (pitch/sample -> filter -> amp -> fx)

### Potential Confusion Points

1. **Filter Envelope vs Amp Envelope** - Both have ATK, DEC, SUS, REL. Users might select wrong one.
   - **Solution:** Consider "F.ATK" vs "A.ATK" or rely on category context

2. **Pitch vs Fine** - Difference not immediately clear
   - **Solution:** Add units display (st = semitones, ct = cents)

3. **Drive locations** - Filter Drive vs Overdrive
   - **Solution:** Current names are clear enough (DRIVE vs OVR)

### Search Path Analysis

**Finding Filter Cutoff:**
1. User opens destination picker
2. Sees FILTER category first (good - signal flow order)
3. CUTOFF is first item (good - most common filter param)
4. **Path:** 2 taps (open picker -> select)

**Finding Pan:**
1. User opens destination picker
2. Scrolls past FILTER
3. Finds AMP category
4. PAN is second item after VOL
5. **Path:** 2-3 taps (open -> scroll -> select)

**Finding Sample Start:**
1. User opens destination picker
2. Scrolls past FILTER, AMP, PITCH
3. Finds SAMPLE category
4. STRT is first item
5. **Path:** 2-3 taps with scrolling

### Recommendation for Discovery

1. **Add "Recent" section** - Shows last 3-5 used destinations at top
2. **Consider favorites** - Let users star frequent destinations
3. **Add descriptions** - Tooltip or subtitle explaining each destination

---

## 7. Suggested Improvements

### Immediate (No Code Changes)

1. Document the rationale for current category choices
2. Create a destination reference guide for users

### Short-term (Minor Code Changes)

1. Add description field to DestinationDefinition:
   ```typescript
   interface DestinationDefinition {
     // ...existing fields
     description?: string;  // "Controls filter brightness"
   }
   ```

2. Add missing filter envelope parameters:
   ```typescript
   { id: 'filter_attack', name: 'Filter Attack', displayName: 'F.ATK', ... },
   { id: 'filter_decay', name: 'Filter Decay', displayName: 'F.DEC', ... },
   ```

3. Add chorus send for FX completeness:
   ```typescript
   { id: 'chorus_send', name: 'Chorus Send', displayName: 'CHO', ... },
   ```

### Medium-term (Feature Addition)

1. Add remaining Elektron parity destinations (Phase 2 list)
2. Implement destination search/filter for growing list
3. Add "Recent Destinations" feature

### Long-term (Architecture)

1. Add LFO category for multi-LFO cross-modulation
2. Consider sub-categories if list grows large (Filter: Cutoff | Envelope)

---

## 8. Proposed Updated Destination List

### Phase 1 Target (23 destinations)

**Filter (6):**
- filter_cutoff (existing)
- filter_resonance (existing)
- filter_drive (existing)
- filter_env_depth (existing)
- filter_attack (new)
- filter_decay (new)

**Amp (6):**
- volume (existing)
- pan (existing)
- amp_attack (existing)
- amp_decay (existing)
- amp_sustain (existing)
- amp_release (existing)

**Pitch (2):**
- pitch (existing)
- pitch_fine (existing)

**Sample (4):**
- sample_start (existing)
- sample_length (existing)
- loop_position (new)
- sample_level (new)

**FX (5):**
- delay_send (existing)
- reverb_send (existing)
- chorus_send (new)
- overdrive (existing)
- bit_reduction (existing)

---

## Conclusion

The destination organization is fundamentally sound:
- Categories are logical and match Elektron conventions
- All current destinations are correctly placed
- Min/max values and bipolar flags are accurate
- Display names are clear and consistent

The main gap is **completeness** - missing approximately 40% of Elektron Digitakt II destinations. The recommended approach is phased addition:

1. **Immediate:** Add filter envelope (attack, decay) and chorus send
2. **Near-term:** Add sample parameters (loop, level) and remaining filter envelope
3. **Future:** Add LFO cross-modulation when multi-LFO support is implemented

The category structure should remain stable unless multi-LFO support requires adding an LFO category.
