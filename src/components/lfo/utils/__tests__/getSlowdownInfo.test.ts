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
  it('returns correct cycle time calculations', () => {
    const info = getSlowdownInfo(100); // 100ms actual
    expect(info.actualCycleTimeMs).toBe(100);
    expect(info.factor).toBe(5); // 500 / 100
    expect(info.displayCycleTimeMs).toBe(500); // 100 * 5
  });

  it('returns isSlowed: true when factor > 1', () => {
    expect(getSlowdownInfo(100).isSlowed).toBe(true);  // 5x
    expect(getSlowdownInfo(250).isSlowed).toBe(true);  // 2x
  });

  it('returns isSlowed: false when factor = 1', () => {
    expect(getSlowdownInfo(600).isSlowed).toBe(false);
    expect(getSlowdownInfo(1000).isSlowed).toBe(false);
    expect(getSlowdownInfo(2000).isSlowed).toBe(false);
  });

  it('handles zero and negative values gracefully', () => {
    expect(getSlowdownInfo(0).factor).toBe(1);
  });

  describe('hysteresis', () => {
    const margin = DEFAULT_SLOWDOWN_CONFIG.hysteresisMargin; // 0.15
    const target = DEFAULT_SLOWDOWN_CONFIG.targetCycleTimeMs; // 500ms
    // Hysteresis thresholds: 425ms (500 * 0.85) and 575ms (500 * 1.15)

    it('maintains factor=1 when near threshold but not past hysteresis (getting faster)', () => {
      // At 480ms with previous factor=1, should stay at 1 (within hysteresis margin)
      const info = getSlowdownInfo(480, 1);
      expect(info.factor).toBe(1);
    });

    it('changes factor when well past threshold (getting faster)', () => {
      // At 400ms with previous factor=1, should change to slowdown
      // 400ms < 425ms (threshold with margin), so it should apply slowdown
      const info = getSlowdownInfo(400, 1);
      expect(info.factor).toBe(1.25); // 500 / 400
      expect(info.isSlowed).toBe(true);
    });

    it('maintains slowdown when near threshold (getting slower)', () => {
      // At 520ms with previous factor > 1, should stay slowed (within hysteresis margin)
      const info = getSlowdownInfo(520, 1.5);
      expect(info.factor).toBeGreaterThan(1); // Still slowed
    });

    it('removes slowdown when well past threshold (getting slower)', () => {
      // At 600ms with previous factor > 1, should remove slowdown
      // 600ms > 575ms (threshold with margin)
      const info = getSlowdownInfo(600, 1.5);
      expect(info.factor).toBe(1);
      expect(info.isSlowed).toBe(false);
    });
  });
});
