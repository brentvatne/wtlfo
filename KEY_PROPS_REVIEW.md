# Key Props Review

This document analyzes React key prop usage across the wtlfo React Native app, identifying issues and recommendations for improvement.

## Summary

| Category | Issues Found | Severity |
|----------|--------------|----------|
| Index-based keys | 2 | Medium |
| Missing keys | 0 | - |
| Unstable keys | 0 | - |
| Fragment keys | 0 | - |
| Good patterns | 16+ | - |

**Overall Assessment**: The codebase demonstrates generally excellent key prop practices with a few minor improvements possible.

---

## 1. List Keys Analysis

### Good Patterns Found

The codebase uses meaningful, stable keys throughout most list renderings:

#### `/Users/brent/wtlfo/app/(learn)/parameters.tsx` (Line 127)
```tsx
{PARAMETERS.map((param) => (
  <ParameterRow
    key={param.name}  // Excellent: unique, stable identifier
    param={param}
    ...
  />
))}
```
**Assessment**: Uses `param.name` (e.g., 'WAVE', 'SPD', 'MULT') which is unique and stable.

#### `/Users/brent/wtlfo/app/(learn)/waveforms.tsx` (Lines 136, 178)
```tsx
// Tag mapping
{info.bestFor.map((tag) => (
  <View key={tag} style={styles.tag}>  // Good: tag strings are unique
    <Text style={styles.tagText}>{tag}</Text>
  </View>
))}

// Waveform cards
{WAVEFORMS.map((info) => (
  <WaveformCard key={info.type} info={info} width={cardWidth} />  // Excellent: type is unique
))}
```
**Assessment**: Both use meaningful identifiers. Waveform types ('TRI', 'SIN', etc.) are unique and stable.

#### `/Users/brent/wtlfo/app/(learn)/speed.tsx` (Line 120)
```tsx
{TIMING_EXAMPLES.map((example) => (
  <TimingCard key={example.label} example={example} />  // Good: labels are unique
))}
```
**Assessment**: Uses label strings which are unique timing descriptions.

#### `/Users/brent/wtlfo/app/(learn)/modes.tsx` (Lines 85, 126, 139)
```tsx
// Tags
{info.bestFor.map((tag) => (
  <View key={tag} style={styles.tag}>  // Good
    ...
  </View>
))}

// Mode cards
{MODES.map((info) => (
  <ModeCard key={info.mode} info={info} />  // Excellent: mode code is unique
))}

// Table rows
{MODES.map((info) => (
  <View key={info.mode} style={styles.tableRow}>  // Good: consistent keying
    ...
  </View>
))}
```
**Assessment**: Excellent consistency using `info.mode` ('FRE', 'TRG', etc.).

#### `/Users/brent/wtlfo/app/(learn)/presets.tsx` (Line 139)
```tsx
{PRESETS.map((preset, index) => (
  <PresetCard key={preset.name} preset={preset} index={index} width={cardWidth} />
))}
```
**Assessment**: Uses `preset.name` which should be unique. Note: `index` is passed as a prop (not as key), which is fine.

#### `/Users/brent/wtlfo/app/(learn)/timing.tsx` (Line 80)
```tsx
{TIMING_REFERENCE.map((ref) => (
  <View key={ref.noteValue} style={styles.timingCard}>  // Good: note values are unique
    ...
  </View>
))}
```

#### `/Users/brent/wtlfo/app/(learn)/index.tsx` (Line 127)
```tsx
{TOPICS.map((topic) => (
  <TopicCardComponent
    key={topic.id}  // Excellent: explicit id field
    topic={topic}
    onPress={() => router.push(topic.route as any)}
  />
))}
```
**Assessment**: Best practice - uses dedicated `id` field.

#### `/Users/brent/wtlfo/app/(settings)/index.tsx` (Line 100)
```tsx
{COMMON_BPMS.map((tempo) => {
  return (
    <Pressable
      key={tempo}  // Good: tempo values are unique numbers
      style={[...]}
      onPress={() => setBPM(tempo)}
    >
      ...
    </Pressable>
  );
})}
```
**Assessment**: Uses the BPM value itself which is unique in the array.

#### `/Users/brent/wtlfo/app/(home)/presets.tsx` (Line 38)
```tsx
{presets.map((preset, index) => {
  return (
    <Pressable
      key={preset.name}  // Good: preset names are unique
      onPress={() => handleSelect(index)}
      ...
    >
      ...
    </Pressable>
  );
})}
```

#### `/Users/brent/wtlfo/src/components/controls/SegmentedControl.tsx` (Line 40)
```tsx
{options.map((option, index) => {
  return (
    <Pressable
      key={String(option)}  // Good: converts to string for consistent keys
      onPress={() => onChange(option)}
      ...
    >
      ...
    </Pressable>
  );
})}
```
**Assessment**: Properly converts to string to handle both string and number options.

#### `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx` (Lines 80-91)
```tsx
{CATEGORY_ORDER.map(category => {
  return (
    <View key={category} style={styles.categorySection}>  // Good
      ...
      {destinations.map(dest => {
        return (
          <Pressable
            key={dest.id}  // Excellent: uses id
            ...
          >
            ...
          </Pressable>
        );
      })}
    </View>
  );
})}
```
**Assessment**: Nested mapping with proper keys at both levels.

#### `/Users/brent/wtlfo/src/components/destination/DestinationPickerInline.tsx` (Lines 31-47)
```tsx
{CATEGORY_ORDER.map(category => {
  return (
    <View key={category} style={styles.categorySection}>  // Good
      ...
      {destinations.map(dest => {
        return (
          <Pressable key={dest.id} ...>  // Good
            ...
          </Pressable>
        );
      })}
    </View>
  );
})}
```

#### `/Users/brent/wtlfo/src/components/destination/DestinationMeter.tsx` (Line 177)
```tsx
{gridLines.push(
  <Line
    key={`grid-${i}`}  // Acceptable: index-based but static content
    ...
  />
)}
```
**Assessment**: Uses index but this is acceptable because grid lines are static and never reorder.

---

## 2. Issues Found

### Issue #1: Index-Based Keys in Dynamic Content

#### `/Users/brent/wtlfo/src/components/lfo/ParameterBadges.tsx` (Line 28)
```tsx
{badges.map((badge, index) => (
  <View key={index} style={[styles.badge, { backgroundColor: theme.accent + '30' }]}>
    ...
  </View>
))}
```

**Problem**: Uses array index as key for badges that are dynamically filtered.

**Why it matters**: The badges array is created dynamically by filtering out undefined values. While the order is stable, if the parent component re-renders with different props, badges could be added/removed, causing React to potentially misassociate DOM nodes.

**Recommendation**: Use the badge label as the key:
```tsx
{badges.map((badge) => (
  <View key={badge.label} style={[styles.badge, { backgroundColor: theme.accent + '30' }]}>
```

**Severity**: Low - badges are small, simple components and the current implementation works correctly in practice.

---

### Issue #2: Index-Based Keys in Generated Items

#### `/Users/brent/wtlfo/app/(home)/param/[param].tsx` (Line 377)
```tsx
{info.details.map((detail, index) => (
  <Text key={index} style={styles.detailText}>- {detail}</Text>
))}
```

**Problem**: Uses array index for detail text items.

**Context**: The `details` array contains static strings that never change order. However, using the content itself would be more semantically correct.

**Recommendation**: Use the detail text or a hash:
```tsx
{info.details.map((detail) => (
  <Text key={detail} style={styles.detailText}>- {detail}</Text>
))}
```

**Severity**: Very Low - the items are static text and never reorder or change.

---

## 3. Dynamic Children Analysis

### Properly Keyed Dynamic Children

All mapped children in the codebase are properly keyed. Notable patterns:

1. **Conditional rendering**: The app uses conditional rendering (`{condition && <Component />}`) correctly without needing keys on single conditional elements.

2. **Nested maps**: Both `/Users/brent/wtlfo/src/components/destination/DestinationPicker.tsx` and `DestinationPickerInline.tsx` correctly key both outer and inner mapped elements.

3. **Generated grid lines**: `/Users/brent/wtlfo/src/components/lfo/GridLines.tsx` uses `key={\`v-${i}\`}` and `key={\`h-${i}\`}` which is acceptable for static grid generation.

### No Missing Keys Found

All `map()` calls include key props. The codebase has no missing key warnings.

---

## 4. Key Stability Analysis

### Stable Keys
All keys in the codebase are stable across re-renders:
- String identifiers (waveform types, mode codes, preset names)
- Numeric values that don't change (BPM values, timing products)
- Explicit id fields

### No Unnecessary Re-mounts Detected
No patterns were found that would cause unnecessary component re-mounts due to key changes.

---

## 5. Key Uniqueness Analysis

### Unique Within Lists
All keys are unique within their respective lists:
- Waveform types: 'TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND' - all unique
- Mode codes: 'FRE', 'TRG', 'HLD', 'ONE', 'HLF' - all unique
- Parameter names: 'WAVE', 'SPD', 'MULT', etc. - all unique
- Destination IDs: Use explicit unique identifiers

### No Potential Collisions Found
No patterns exist where keys could collide (e.g., no `id` + `name` combinations that could produce duplicates).

---

## 6. Fragment Keys Analysis

### No Fragment Key Issues
The codebase uses:
- `<></>` shorthand only for simple, static groupings
- No dynamic children inside fragments that would require keyed fragments

### Correct Usage Examples

#### `/Users/brent/wtlfo/src/components/lfo/WaveformDisplay.tsx`
```tsx
return (
  <>
    {/* Optional fill */}
    {fillColor && (
      <Path path={fillPath} ... />
    )}
    {/* Stroke */}
    <Path path={strokePath} ... />
  </>
);
```
**Assessment**: Correct - these are static, conditional children, not mapped.

#### `/Users/brent/wtlfo/src/components/lfo/RandomWaveform.tsx`
```tsx
return (
  <>
    {fillColor && (
      <Path path={fillPath} ... />
    )}
    <Path path={strokePath} ... />
  </>
);
```
**Assessment**: Correct - same pattern, static children.

---

## 7. Performance Considerations

### Good Patterns

1. **Stable Keys Enable Efficient Reconciliation**
   - Using `param.name`, `info.type`, `dest.id` etc. allows React to correctly identify which items changed, added, or removed.

2. **No Key Changes During Normal Operation**
   - Keys are derived from stable data properties, not runtime calculations that could change.

3. **Appropriate Use of Index Keys**
   - Grid lines in `GridLines.tsx` and `DestinationMeter.tsx` use index keys appropriately for static, non-reorderable content.

### Minor Optimization Opportunities

1. **ParameterBadges.tsx**: Switching from index to `badge.label` would improve reconciliation when badges are added/removed, though the performance impact is minimal given the small component size.

---

## Recommendations Summary

### High Priority
None - the codebase has no critical key prop issues.

### Medium Priority
1. **ParameterBadges.tsx**: Change `key={index}` to `key={badge.label}` for semantic correctness.

### Low Priority
1. **param/[param].tsx**: Consider using `key={detail}` instead of `key={index}` for detail text items.

---

## Conclusion

The wtlfo codebase demonstrates excellent React key prop practices:

- **16+ correct key implementations** using meaningful, stable identifiers
- **2 minor index-based key usages** that could be improved but don't cause bugs
- **No missing keys** in any mapped content
- **No unstable keys** that would cause performance issues
- **Proper handling of nested maps** with keys at all levels
- **Correct fragment usage** without needing keyed fragments

The development team has clearly followed React best practices for key props throughout the application.
