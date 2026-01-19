import { getSlowdownInfo, getSlowdownFactor } from '../getSlowdownInfo';

describe('getSlowdownFactor', () => {
  it('returns 16x for audio rate cycles (< 67ms / 15+ Hz)', () => {
    expect(getSlowdownFactor(50)).toBe(16);
    expect(getSlowdownFactor(66)).toBe(16);
  });

  it('returns 8x for strobe territory (67-125ms / 8-15 Hz)', () => {
    expect(getSlowdownFactor(67)).toBe(8);
    expect(getSlowdownFactor(100)).toBe(8);
    expect(getSlowdownFactor(124)).toBe(8);
  });

  it('returns 4x for fast cycles (125-250ms / 4-8 Hz)', () => {
    expect(getSlowdownFactor(125)).toBe(4);
    expect(getSlowdownFactor(200)).toBe(4);
    expect(getSlowdownFactor(249)).toBe(4);
  });

  it('returns 2x for medium-fast cycles (250-500ms / 2-4 Hz)', () => {
    expect(getSlowdownFactor(250)).toBe(2);
    expect(getSlowdownFactor(400)).toBe(2);
    expect(getSlowdownFactor(499)).toBe(2);
  });

  it('returns 1x for natural cycles (>= 500ms / < 2 Hz)', () => {
    expect(getSlowdownFactor(500)).toBe(1);
    expect(getSlowdownFactor(1000)).toBe(1);
    expect(getSlowdownFactor(5000)).toBe(1);
  });
});

describe('getSlowdownInfo', () => {
  it('returns correct frequency calculation', () => {
    const info = getSlowdownInfo(100);
    expect(info.frequencyHz).toBe(10); // 1000 / 100 = 10 Hz
  });

  it('returns isSlowed: true when factor > 1', () => {
    expect(getSlowdownInfo(100).isSlowed).toBe(true);
    expect(getSlowdownInfo(200).isSlowed).toBe(true);
    expect(getSlowdownInfo(400).isSlowed).toBe(true);
  });

  it('returns isSlowed: false when factor = 1', () => {
    expect(getSlowdownInfo(500).isSlowed).toBe(false);
    expect(getSlowdownInfo(1000).isSlowed).toBe(false);
  });

  it('handles zero and negative values gracefully', () => {
    expect(getSlowdownInfo(0).frequencyHz).toBe(0);
    expect(getSlowdownInfo(0).factor).toBe(16); // Very fast = max slowdown
  });

  describe('hysteresis', () => {
    it('maintains previous factor when near threshold (increasing speed)', () => {
      // At 130ms with previous factor of 4, should stay at 4 (within hysteresis margin)
      const info = getSlowdownInfo(130, 4);
      expect(info.factor).toBe(4); // Stays at 4, not jumping to 8
    });

    it('maintains previous factor when near threshold (decreasing speed)', () => {
      // At 240ms with previous factor of 2, should stay at 2 (within hysteresis margin)
      const info = getSlowdownInfo(240, 2);
      expect(info.factor).toBe(2); // Stays at 2, not jumping to 4
    });

    it('changes factor when well past threshold', () => {
      // At 100ms with previous factor of 4, should change to 8 (well past 125ms threshold)
      const info = getSlowdownInfo(100, 4);
      expect(info.factor).toBe(8);
    });
  });
});
