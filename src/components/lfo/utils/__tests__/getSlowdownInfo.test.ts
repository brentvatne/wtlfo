import { getSlowdownInfo, getSlowdownFactor, DEFAULT_SLOWDOWN_CONFIG } from '../getSlowdownInfo';

describe('getSlowdownFactor', () => {
  const target = DEFAULT_SLOWDOWN_CONFIG.targetCycleTimeMs; // 500ms

  it('returns correct factor for fast cycles', () => {
    // factor = 500 / cycleTimeMs
    expect(getSlowdownFactor(50)).toBe(10);   // 500 / 50 = 10x
    expect(getSlowdownFactor(100)).toBe(5);   // 500 / 100 = 5x
    expect(getSlowdownFactor(250)).toBe(2);   // 500 / 250 = 2x
    expect(getSlowdownFactor(500)).toBe(1);   // 500 / 500 = 1x
  });

  it('returns 1x for cycles at or above target (500ms)', () => {
    expect(getSlowdownFactor(500)).toBe(1);
    expect(getSlowdownFactor(600)).toBe(1);
    expect(getSlowdownFactor(1000)).toBe(1);
    expect(getSlowdownFactor(2000)).toBe(1);
  });

  it('handles custom target cycle time', () => {
    expect(getSlowdownFactor(100, 200)).toBe(2); // 200 / 100 = 2x
    expect(getSlowdownFactor(100, 500)).toBe(5); // 500 / 100 = 5x
  });

  it('handles zero and negative values', () => {
    expect(getSlowdownFactor(0)).toBe(1);
    expect(getSlowdownFactor(-10)).toBe(1);
  });
});

describe('getSlowdownInfo', () => {
  // NOTE: Slowdown feature is currently disabled (ENABLE_SLOWDOWN = false)
  // These tests verify the passthrough behavior when disabled

  it('returns passthrough values when feature is disabled', () => {
    const info = getSlowdownInfo(100); // 100ms actual
    expect(info.actualCycleTimeMs).toBe(100);
    expect(info.factor).toBe(1); // Always 1 when disabled
    expect(info.displayCycleTimeMs).toBe(100); // Same as actual when disabled
    expect(info.isSlowed).toBe(false);
  });

  it('returns factor=1 for all cycle times when disabled', () => {
    expect(getSlowdownInfo(50).factor).toBe(1);
    expect(getSlowdownInfo(100).factor).toBe(1);
    expect(getSlowdownInfo(500).factor).toBe(1);
    expect(getSlowdownInfo(2000).factor).toBe(1);
  });

  it('handles zero and negative values gracefully', () => {
    expect(getSlowdownInfo(0).factor).toBe(1);
    expect(getSlowdownInfo(-10).factor).toBe(1);
  });
});
