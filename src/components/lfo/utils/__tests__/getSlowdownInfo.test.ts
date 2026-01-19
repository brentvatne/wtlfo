import { getSlowdownInfo, getSlowdownFactor, DEFAULT_SLOWDOWN_CONFIG } from '../getSlowdownInfo';

describe('getSlowdownFactor', () => {
  const target = DEFAULT_SLOWDOWN_CONFIG.targetCycleTimeMs; // 250ms

  it('returns correct factor for fast cycles', () => {
    // factor = 250 / cycleTimeMs
    expect(getSlowdownFactor(25)).toBe(10);   // 250 / 25 = 10x
    expect(getSlowdownFactor(50)).toBe(5);    // 250 / 50 = 5x
    expect(getSlowdownFactor(100)).toBe(2.5); // 250 / 100 = 2.5x
    expect(getSlowdownFactor(125)).toBe(2);   // 250 / 125 = 2x
  });

  it('returns 1x for cycles at or above target (250ms)', () => {
    expect(getSlowdownFactor(250)).toBe(1);
    expect(getSlowdownFactor(300)).toBe(1);
    expect(getSlowdownFactor(500)).toBe(1);
    expect(getSlowdownFactor(1000)).toBe(1);
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
  it('returns correct cycle time calculations', () => {
    const info = getSlowdownInfo(100); // 100ms actual
    expect(info.actualCycleTimeMs).toBe(100);
    expect(info.factor).toBe(2.5); // 250 / 100
    expect(info.displayCycleTimeMs).toBe(250); // 100 * 2.5
  });

  it('returns isSlowed: true when factor > 1', () => {
    expect(getSlowdownInfo(100).isSlowed).toBe(true);  // 2.5x
    expect(getSlowdownInfo(200).isSlowed).toBe(true);  // 1.25x
  });

  it('returns isSlowed: false when factor = 1', () => {
    expect(getSlowdownInfo(300).isSlowed).toBe(false);
    expect(getSlowdownInfo(500).isSlowed).toBe(false);
    expect(getSlowdownInfo(1000).isSlowed).toBe(false);
  });

  it('handles zero and negative values gracefully', () => {
    expect(getSlowdownInfo(0).factor).toBe(1);
  });

  describe('hysteresis', () => {
    const margin = DEFAULT_SLOWDOWN_CONFIG.hysteresisMargin; // 0.15
    const target = DEFAULT_SLOWDOWN_CONFIG.targetCycleTimeMs; // 250ms
    // Hysteresis thresholds: 212.5ms (250 * 0.85) and 287.5ms (250 * 1.15)

    it('maintains factor=1 when near threshold but not past hysteresis (getting faster)', () => {
      // At 240ms with previous factor=1, should stay at 1 (within hysteresis margin)
      const info = getSlowdownInfo(240, 1);
      expect(info.factor).toBe(1);
    });

    it('changes factor when well past threshold (getting faster)', () => {
      // At 200ms with previous factor=1, should change to slowdown
      // 200ms < 212.5ms (threshold with margin), so it should apply slowdown
      const info = getSlowdownInfo(200, 1);
      expect(info.factor).toBe(1.25); // 250 / 200
      expect(info.isSlowed).toBe(true);
    });

    it('maintains slowdown when near threshold (getting slower)', () => {
      // At 260ms with previous factor > 1, should stay slowed (within hysteresis margin)
      const info = getSlowdownInfo(260, 1.5);
      expect(info.factor).toBeGreaterThan(1); // Still slowed
    });

    it('removes slowdown when well past threshold (getting slower)', () => {
      // At 300ms with previous factor > 1, should remove slowdown
      // 300ms > 287.5ms (threshold with margin)
      const info = getSlowdownInfo(300, 1.5);
      expect(info.factor).toBe(1);
      expect(info.isSlowed).toBe(false);
    });
  });
});
