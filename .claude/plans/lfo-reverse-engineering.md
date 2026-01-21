# Plan: LFO Parameter Reverse Engineering Algorithm

## Goal
Given captured CC values from a Digitakt II LFO, determine the most likely LFO parameters by comparing against our engine simulations.

## Approach: Forward Model Fitting
Since we have a complete LFO engine, we treat this as an optimization problem:
1. Capture real CC data
2. Generate candidate parameter sets
3. Score each by running our engine and comparing output
4. Return best-matching parameters

## Algorithm Design

### Phase 1: Quick Analysis (Narrow Search Space)

```typescript
interface QuickAnalysis {
  depthMagnitude: number;     // From CC range
  cycleTimeMs: number;        // From autocorrelation/zero-crossings
  isUnipolar: boolean;        // Values only on one side of 64
  isBinary: boolean;          // Only 2 distinct value clusters (SQR)
  isStaircase: boolean;       // Step changes (RND)
}

function quickAnalyze(captured: CCCapture): QuickAnalysis {
  const values = captured.values;
  const ccMin = Math.min(...values);
  const ccMax = Math.max(...values);

  return {
    depthMagnitude: Math.round((ccMax - ccMin) / 2),
    cycleTimeMs: estimatePeriodAutocorrelation(values, captured.timestamps),
    isUnipolar: ccMin >= 60 || ccMax <= 68,  // All above or below center
    isBinary: countDistinctClusters(values) === 2,
    isStaircase: detectStaircasePattern(values),
  };
}
```

### Phase 2: Waveform Classification

Narrow down waveform candidates based on quick analysis:

| Condition | Likely Waveforms |
|-----------|------------------|
| `isBinary` | SQR only |
| `isStaircase` | RND only |
| `isUnipolar && rising` | RMP |
| `isUnipolar && falling` | EXP |
| Otherwise | TRI, SIN, SAW |

### Phase 3: Speed/Multiplier Factorization

Given estimated `cycleTimeMs` and known `bpm`:

```typescript
function getSpeedMultCandidates(cycleTimeMs: number, bpm: number) {
  // product = (60000/bpm) * 4 * 128 / cycleTimeMs
  const product = (60000 / bpm) * 4 * 128 / cycleTimeMs;

  const candidates = [];
  const multipliers = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

  for (const mult of multipliers) {
    const speed = Math.round(product / mult);
    if (speed >= 1 && speed <= 63) {
      candidates.push({ speed, multiplier: mult });
      // Also try negative speed (inverts output)
      candidates.push({ speed: -speed, multiplier: mult });
    }
  }
  return candidates;
}
```

### Phase 4: Grid Search with Scoring

```typescript
function findBestParams(captured: CCCapture, analysis: QuickAnalysis): LFOConfig {
  const waveformCandidates = getWaveformCandidates(analysis);
  const speedMultCandidates = getSpeedMultCandidates(analysis.cycleTimeMs, captured.bpm);
  const depthCandidates = [analysis.depthMagnitude, -analysis.depthMagnitude];
  const phaseCandidates = [0, 16, 32, 48, 64, 80, 96, 112];

  let bestScore = Infinity;
  let bestConfig = null;

  for (const waveform of waveformCandidates) {
    for (const { speed, multiplier } of speedMultCandidates) {
      for (const depth of depthCandidates) {
        for (const startPhase of phaseCandidates) {
          const config = { waveform, speed, multiplier, depth, startPhase, mode: 'TRG' };
          const score = computeMatchScore(config, captured);

          if (score < bestScore) {
            bestScore = score;
            bestConfig = config;
          }
        }
      }
    }
  }

  return bestConfig;
}
```

### Phase 5: Scoring Function

```typescript
function computeMatchScore(config: LFOConfig, captured: CCCapture): number {
  const lfo = new LFO(config, captured.bpm);
  const baseTime = captured.timestamps[0];

  let totalError = 0;

  for (let i = 0; i < captured.values.length; i++) {
    const t = captured.timestamps[i] - baseTime;
    const state = lfo.update(t);

    const predictedCC = Math.round(Math.max(0, Math.min(127, 64 + state.output * 63)));
    const actualCC = captured.values[i];

    // Allow ±1 for quantization noise
    const error = Math.max(0, Math.abs(predictedCC - actualCC) - 1);
    totalError += error * error;
  }

  return totalError / captured.values.length;
}
```

### Phase 6: RND Waveform Special Handling

For RND, we can't match exact values. Instead verify:
1. Values stay within expected range (64 ± depth)
2. Step changes occur at expected intervals (16 steps per cycle)
3. Distribution is roughly uniform

```typescript
function scoreRNDWaveform(config: LFOConfig, captured: CCCapture): number {
  const expectedMin = 64 - Math.abs(config.depth);
  const expectedMax = 64 + Math.abs(config.depth);

  let score = 0;

  // Penalty for values outside expected range
  for (const value of captured.values) {
    if (value < expectedMin - 2) score += (expectedMin - value) ** 2;
    if (value > expectedMax + 2) score += (value - expectedMax) ** 2;
  }

  // Check step timing matches expected
  const expectedStepMs = (config.cycleTimeMs / 16);
  const stepChanges = detectStepChanges(captured);
  const stepIntervals = stepChanges.map((t, i) => i > 0 ? t - stepChanges[i-1] : 0).slice(1);
  const avgStepInterval = mean(stepIntervals);

  score += Math.abs(avgStepInterval - expectedStepMs) * 10;

  return score;
}
```

## Search Space Size

| Parameter | Options | Notes |
|-----------|---------|-------|
| Waveform | 2-6 | Narrowed by quick analysis |
| Speed×Mult | ~20 | Factorizations of estimated product |
| Depth sign | 2 | + or - |
| StartPhase | 8 | Coarse grid |

**Total: ~640 candidates** (worst case)
**Expected: ~100 candidates** (with good narrowing)

At 1000 evaluations/second = **< 1 second**

## Output

```typescript
interface InferenceResult {
  params: LFOConfig;
  confidence: number;      // 0-1, based on match score
  alternatives: LFOConfig[]; // Other close matches (speed/mult degeneracy)
  matchScore: number;      // Lower is better
  rangeMatch: boolean;     // Did range match expected?
  timingMatch: boolean;    // Did frequency match?
}
```

## Implementation Location

Add to `/Users/brent/wtlfo/src/hooks/useLfoVerification.ts` or create new hook:
- `useLfoInference.ts` - Hook for parameter inference
- Could run inference on captured data after each test
- Display inferred params vs actual params for validation

## Next Steps

1. Implement `quickAnalyze()` function
2. Implement `computeMatchScore()` using existing LFO engine
3. Add RND special handling
4. Add UI to show inferred parameters
5. Validate against known LFO configurations
