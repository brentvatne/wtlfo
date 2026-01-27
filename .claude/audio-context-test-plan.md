# Audio Context Unit Test Plan

## Overview

This document outlines a comprehensive unit testing strategy for `/Users/brent/wtlfo/src/context/audio-context.tsx`. The audio context provides audio preview functionality that plays an oscillator modulated by the LFO output, allowing users to hear the effect of their LFO configuration.

## Testing Framework

**Framework**: Jest (already configured in the project via `jest-expo`)

**Location**: Tests should be created at `/Users/brent/wtlfo/src/context/__tests__/audio-context.test.tsx`

**Running tests**:
```bash
bun test                    # Run all tests
bun test:watch             # Watch mode
bun test:coverage          # With coverage report
```

## Dependencies to Mock

### 1. react-native-audio-api

The core audio API needs comprehensive mocking. All audio nodes should track method calls for assertion.

```typescript
// Mock structure for react-native-audio-api
const mockAudioContext = {
  state: 'running', // 'running' | 'suspended' | 'closed'
  currentTime: 0,
  destination: {},

  createGain: jest.fn(),
  createOscillator: jest.fn(),
  createBiquadFilter: jest.fn(),
  createStereoPanner: jest.fn(),

  resume: jest.fn().mockResolvedValue(undefined),
  suspend: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockOscillatorNode = {
  type: 'sine',
  frequency: { value: 440 },
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
};

const mockGainNode = {
  gain: { value: 1 },
  connect: jest.fn(),
};

const mockBiquadFilterNode = {
  type: 'lowpass',
  frequency: { value: 350 },
  Q: { value: 1 },
  connect: jest.fn(),
};

const mockStereoPannerNode = {
  pan: { value: 0 },
  connect: jest.fn(),
};
```

**Mock factory function** (recommended approach):
```typescript
function createMockAudioContext() {
  const ctx = {
    state: 'running' as 'running' | 'suspended' | 'closed',
    destination: {},
    resume: jest.fn().mockResolvedValue(undefined),
    suspend: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    createGain: jest.fn(() => createMockGainNode()),
    createOscillator: jest.fn(() => createMockOscillatorNode()),
    createBiquadFilter: jest.fn(() => createMockBiquadFilterNode()),
    createStereoPanner: jest.fn(() => createMockStereoPannerNode()),
  };
  return ctx;
}
```

### 2. React Native AppState

```typescript
// Mock AppState for background/foreground testing
const mockAppStateListeners: Array<(state: AppStateStatus) => void> = [];

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn((event, handler) => {
      if (event === 'change') {
        mockAppStateListeners.push(handler);
      }
      return { remove: jest.fn() };
    }),
  },
}));

// Helper to simulate app state changes
function simulateAppStateChange(newState: 'active' | 'inactive' | 'background') {
  mockAppStateListeners.forEach(handler => handler(newState));
}
```

### 3. Preset Context

```typescript
const mockLfoOutput = { value: 0 };
const mockIsPaused = false;

jest.mock('./preset-context', () => ({
  usePreset: () => ({
    lfoOutput: mockLfoOutput,
    isPaused: mockIsPaused,
  }),
}));
```

**Important**: The `lfoOutput` is a Reanimated SharedValue that updates at 60fps. Tests should be able to modify `mockLfoOutput.value` to simulate LFO modulation.

### 4. Modulation Context

```typescript
const mockActiveDestinationId = 'volume';
const mockCenterValues: Record<string, number> = {
  volume: 100,
  filter_freq: 64,
  filter_reso: 64,
  pan: 0,
  pitch: 64,
};

jest.mock('./modulation-context', () => ({
  useModulation: () => ({
    activeDestinationId: mockActiveDestinationId,
    getCenterValue: (id: string) => mockCenterValues[id] ?? 64,
  }),
}));
```

### 5. requestAnimationFrame

```typescript
// Mock requestAnimationFrame for animation loop testing
let rafCallbacks: Array<(time: number) => void> = [];
let rafId = 0;

global.requestAnimationFrame = jest.fn((callback) => {
  rafCallbacks.push(callback);
  return ++rafId;
});

global.cancelAnimationFrame = jest.fn((id) => {
  // Just track that it was called
});

// Helper to advance animation frames
function advanceAnimationFrames(count: number = 1, timestep: number = 16) {
  let time = performance.now();
  for (let i = 0; i < count; i++) {
    const callbacks = [...rafCallbacks];
    rafCallbacks = [];
    callbacks.forEach(cb => cb(time));
    time += timestep;
  }
}
```

## Test Wrapper Component

Create a test wrapper that provides necessary context:

```typescript
import { renderHook, act } from '@testing-library/react-native';

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MockPresetProvider>
      <MockModulationProvider>
        {children}
      </MockModulationProvider>
    </MockPresetProvider>
  );
}

// Or use a simpler approach with direct mocks
function renderAudioHook() {
  return renderHook(() => useAudio(), {
    wrapper: ({ children }) => (
      <AudioProvider>{children}</AudioProvider>
    ),
  });
}
```

## Test Cases

### 1. Basic Provider Functionality

#### 1.1 Initial State
```typescript
describe('AudioProvider initialization', () => {
  it('should start with isEnabled = false', () => {
    const { result } = renderAudioHook();
    expect(result.current.isEnabled).toBe(false);
  });

  it('should start with isActive = false', () => {
    const { result } = renderAudioHook();
    expect(result.current.isActive).toBe(false);
  });

  it('should start with isSupported = true', () => {
    const { result } = renderAudioHook();
    expect(result.current.isSupported).toBe(true);
  });

  it('should not create AudioContext on mount', () => {
    renderAudioHook();
    expect(AudioContextClass).not.toHaveBeenCalled();
  });
});
```

#### 1.2 Hook Error Handling
```typescript
describe('useAudio hook', () => {
  it('should throw error when used outside AudioProvider', () => {
    expect(() => {
      renderHook(() => useAudio());
    }).toThrow('useAudio must be used within an AudioProvider');
  });
});
```

### 2. Toggle On/Off Behavior

#### 2.1 Start Function
```typescript
describe('start()', () => {
  it('should set isEnabled to true', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    expect(result.current.isEnabled).toBe(true);
  });

  it('should create audio graph when called', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    expect(AudioContextClass).toHaveBeenCalled();
  });

  it('should start oscillator', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    expect(mockOscillatorNode.start).toHaveBeenCalled();
  });

  it('should be no-op if already enabled', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    const callCount = AudioContextClass.mock.calls.length;

    await act(async () => {
      result.current.start();
    });

    // Should not create another context
    expect(AudioContextClass).toHaveBeenCalledTimes(callCount);
  });
});
```

#### 2.2 Stop Function
```typescript
describe('stop()', () => {
  it('should set isEnabled to false', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.start();
      result.current.stop();
    });

    expect(result.current.isEnabled).toBe(false);
  });

  it('should stop oscillator', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    await act(async () => {
      result.current.stop();
    });

    expect(mockOscillatorNode.stop).toHaveBeenCalled();
  });

  it('should suspend audio context', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.start();
      result.current.stop();
    });

    expect(mockAudioContext.suspend).toHaveBeenCalled();
  });

  it('should be no-op if already disabled', async () => {
    const { result } = renderAudioHook();

    // Never started, so stop should be no-op
    await act(async () => {
      result.current.stop();
    });

    expect(mockOscillatorNode.stop).not.toHaveBeenCalled();
  });
});
```

#### 2.3 Toggle Function
```typescript
describe('toggle()', () => {
  it('should toggle from disabled to enabled', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.toggle();
    });

    expect(result.current.isEnabled).toBe(true);
  });

  it('should toggle from enabled to disabled', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.toggle(); // on
      result.current.toggle(); // off
    });

    expect(result.current.isEnabled).toBe(false);
  });
});
```

### 3. isEnabled vs isActive State Separation

This is a critical behavioral distinction: `isEnabled` is the user's intent, `isActive` is the actual audio state.

```typescript
describe('isEnabled vs isActive separation', () => {
  it('should have isEnabled=true, isActive=true when playing normally', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.isActive).toBe(true);
  });

  it('should have isEnabled=true, isActive=false when paused', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    // Simulate isPaused changing to true
    mockIsPaused = true;
    await act(async () => {
      // Trigger re-render (may need to use rerender() or state update)
    });

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.isActive).toBe(false);
  });

  it('should have isEnabled=true, isActive=false when backgrounded', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    // Simulate going to background
    simulateAppStateChange('background');

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.isActive).toBe(false);
  });

  it('should restore isActive=true when returning from background if isEnabled', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    simulateAppStateChange('background');

    await act(async () => {
      simulateAppStateChange('active');
    });

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.isActive).toBe(true);
  });
});
```

### 4. Pause/Unpause Behavior

```typescript
describe('pause behavior (isPaused changes)', () => {
  beforeEach(() => {
    mockIsPaused = false;
  });

  it('should deactivate audio when isPaused becomes true', async () => {
    const { result, rerender } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    expect(result.current.isActive).toBe(true);

    // Change isPaused
    mockIsPaused = true;
    rerender();

    await waitFor(() => {
      expect(result.current.isActive).toBe(false);
    });
  });

  it('should cancel animation frame when paused', async () => {
    const { result, rerender } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    mockIsPaused = true;
    rerender();

    expect(global.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('should reactivate audio when isPaused becomes false', async () => {
    const { result, rerender } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    mockIsPaused = true;
    rerender();

    mockIsPaused = false;
    rerender();

    await waitFor(() => {
      expect(result.current.isActive).toBe(true);
    });
  });

  it('should create new oscillator when resuming (oscillators are one-shot)', async () => {
    const { result, rerender } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    const initialOscCallCount = mockAudioContext.createOscillator.mock.calls.length;

    mockIsPaused = true;
    rerender();

    mockIsPaused = false;
    rerender();

    await waitFor(() => {
      expect(mockAudioContext.createOscillator.mock.calls.length).toBeGreaterThan(initialOscCallCount);
    });
  });

  it('should not start if enabled=false when unpausing', async () => {
    const { result, rerender } = renderAudioHook();

    // Start then stop (sets isEnabled=false)
    await act(async () => {
      result.current.start();
      result.current.stop();
    });

    // Now pause/unpause cycle
    mockIsPaused = true;
    rerender();
    mockIsPaused = false;
    rerender();

    // Should remain inactive because isEnabled is false
    expect(result.current.isActive).toBe(false);
  });
});
```

### 5. Background/Foreground Transitions

```typescript
describe('app background/foreground handling', () => {
  it('should stop audio when app goes to background', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    expect(result.current.isActive).toBe(true);

    await act(async () => {
      simulateAppStateChange('background');
    });

    expect(result.current.isActive).toBe(false);
    expect(mockOscillatorNode.stop).toHaveBeenCalled();
  });

  it('should stop audio when app goes to inactive', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    await act(async () => {
      simulateAppStateChange('inactive');
    });

    expect(result.current.isActive).toBe(false);
  });

  it('should remember enabled state when backgrounding', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    simulateAppStateChange('background');

    // isEnabled should still be true (user intent persists)
    expect(result.current.isEnabled).toBe(true);
  });

  it('should resume audio when returning to foreground if was enabled', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    await act(async () => {
      simulateAppStateChange('background');
      simulateAppStateChange('active');
    });

    expect(result.current.isActive).toBe(true);
  });

  it('should not resume when returning if was disabled before backgrounding', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.start();
      result.current.stop();
    });

    await act(async () => {
      simulateAppStateChange('background');
      simulateAppStateChange('active');
    });

    expect(result.current.isActive).toBe(false);
  });

  it('should not resume when returning if currently paused', async () => {
    const { result, rerender } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    mockIsPaused = true;
    rerender();

    await act(async () => {
      simulateAppStateChange('background');
      simulateAppStateChange('active');
    });

    expect(result.current.isActive).toBe(false);
  });

  it('should handle inactive -> active transition (e.g., control center)', async () => {
    const { result } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    await act(async () => {
      simulateAppStateChange('inactive');
      simulateAppStateChange('active');
    });

    expect(result.current.isActive).toBe(true);
  });
});
```

### 6. Destination Changes

```typescript
describe('destination change handling', () => {
  beforeEach(() => {
    mockActiveDestinationId = 'volume';
  });

  it('should reset audio params when destination changes', async () => {
    const { result, rerender } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    // Advance frames to let modulation run
    advanceAnimationFrames(5);

    // Change destination
    mockActiveDestinationId = 'filter_freq';
    rerender();

    // Should reset to defaults
    expect(mockOscillatorNode.frequency.value).toBe(220); // BASE_FREQUENCY
    expect(mockGainNode.gain.value).toBe(0.35); // DEFAULT_GAIN
    expect(mockBiquadFilterNode.frequency.value).toBe(4000); // DEFAULT_FILTER_FREQ
    expect(mockBiquadFilterNode.Q.value).toBe(1); // DEFAULT_FILTER_Q
    expect(mockStereoPannerNode.pan.value).toBe(0);
  });

  it('should not reset params if audio is not active', async () => {
    const { result, rerender } = renderAudioHook();

    // Audio never started
    mockActiveDestinationId = 'filter_freq';
    rerender();

    // No crash, no-op
    expect(true).toBe(true);
  });

  it('should only reset on actual destination change, not same destination', async () => {
    const { result, rerender } = renderAudioHook();

    await act(async () => {
      result.current.start();
    });

    // Modify a param through modulation
    mockLfoOutput.value = 0.5;
    advanceAnimationFrames(1);
    const gainBefore = mockGainNode.gain.value;

    // "Change" to same destination
    mockActiveDestinationId = 'volume';
    rerender();

    // Should NOT reset (no change)
    advanceAnimationFrames(1);
    expect(mockGainNode.gain.value).not.toBe(0.35);
  });
});
```

### 7. Animation Loop Behavior

```typescript
describe('animation loop modulation', () => {
  describe('volume destination', () => {
    beforeEach(() => {
      mockActiveDestinationId = 'volume';
      mockCenterValues.volume = 100; // Near max
    });

    it('should modulate gain based on LFO output', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      // LFO at 0 (center)
      mockLfoOutput.value = 0;
      advanceAnimationFrames(1);

      const gainAtZero = mockGainNode.gain.value;

      // LFO at +1 (max)
      mockLfoOutput.value = 1;
      advanceAnimationFrames(1);

      const gainAtMax = mockGainNode.gain.value;

      // Gain should be different
      expect(gainAtMax).not.toBe(gainAtZero);
    });

    it('should clamp gain to 0-1 range', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      // Extreme LFO value
      mockLfoOutput.value = 10; // Way beyond normal
      advanceAnimationFrames(1);

      expect(mockGainNode.gain.value).toBeLessThanOrEqual(1);
      expect(mockGainNode.gain.value).toBeGreaterThanOrEqual(0);
    });
  });

  describe('filter_freq destination', () => {
    beforeEach(() => {
      mockActiveDestinationId = 'filter_freq';
      mockCenterValues.filter_freq = 64;
    });

    it('should modulate filter frequency', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      mockLfoOutput.value = 0;
      advanceAnimationFrames(1);
      const freqAtZero = mockBiquadFilterNode.frequency.value;

      mockLfoOutput.value = 1;
      advanceAnimationFrames(1);
      const freqAtMax = mockBiquadFilterNode.frequency.value;

      expect(freqAtMax).toBeGreaterThan(freqAtZero);
    });

    it('should map frequency exponentially (20-20000 Hz)', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      mockActiveDestinationId = 'filter_freq';
      mockCenterValues.filter_freq = 0; // Min
      mockLfoOutput.value = 0;
      advanceAnimationFrames(1);

      // At MIDI 0, frequency should be 20 Hz
      expect(mockBiquadFilterNode.frequency.value).toBeCloseTo(20, 0);
    });
  });

  describe('filter_reso destination', () => {
    beforeEach(() => {
      mockActiveDestinationId = 'filter_reso';
    });

    it('should modulate filter Q', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      mockLfoOutput.value = 0;
      advanceAnimationFrames(1);
      const qAtZero = mockBiquadFilterNode.Q.value;

      mockLfoOutput.value = 1;
      advanceAnimationFrames(1);
      const qAtMax = mockBiquadFilterNode.Q.value;

      expect(qAtMax).not.toBe(qAtZero);
    });
  });

  describe('pan destination', () => {
    beforeEach(() => {
      mockActiveDestinationId = 'pan';
      mockCenterValues.pan = 0;
    });

    it('should modulate stereo pan', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      mockLfoOutput.value = 1; // Should pan right
      advanceAnimationFrames(1);

      expect(mockStereoPannerNode.pan.value).toBeGreaterThan(0);
    });

    it('should clamp pan to -1..+1 range', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      mockLfoOutput.value = 100;
      advanceAnimationFrames(1);

      expect(mockStereoPannerNode.pan.value).toBeLessThanOrEqual(1);
      expect(mockStereoPannerNode.pan.value).toBeGreaterThanOrEqual(-1);
    });
  });

  describe('pitch destination', () => {
    beforeEach(() => {
      mockActiveDestinationId = 'pitch';
      mockCenterValues.pitch = 64; // Center (no transposition)
    });

    it('should modulate oscillator frequency', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      mockLfoOutput.value = 0;
      advanceAnimationFrames(1);
      const pitchAtZero = mockOscillatorNode.frequency.value;

      mockLfoOutput.value = 1;
      advanceAnimationFrames(1);
      const pitchAtMax = mockOscillatorNode.frequency.value;

      expect(pitchAtMax).toBeGreaterThan(pitchAtZero);
    });

    it('should use BASE_FREQUENCY (220 Hz) as reference', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      mockCenterValues.pitch = 64;
      mockLfoOutput.value = 0;
      advanceAnimationFrames(1);

      // At center (64), pitch should be close to base frequency
      expect(mockOscillatorNode.frequency.value).toBeCloseTo(220, 0);
    });
  });

  describe('non-audio destinations', () => {
    beforeEach(() => {
      mockActiveDestinationId = 'delay_time'; // Non-audio destination
    });

    it('should use default audio params for non-audio destinations', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      advanceAnimationFrames(5);

      expect(mockGainNode.gain.value).toBe(0.35);
      expect(mockBiquadFilterNode.frequency.value).toBe(4000);
      expect(mockBiquadFilterNode.Q.value).toBe(1);
      expect(mockStereoPannerNode.pan.value).toBe(0);
    });
  });

  describe('animation loop lifecycle', () => {
    it('should start animation loop when activated', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should cancel animation loop when deactivated', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
        result.current.stop();
      });

      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should continue animation loop while active', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      const callsBefore = (global.requestAnimationFrame as jest.Mock).mock.calls.length;

      advanceAnimationFrames(3);

      const callsAfter = (global.requestAnimationFrame as jest.Mock).mock.calls.length;

      expect(callsAfter).toBeGreaterThan(callsBefore);
    });

    it('should stop animation loop if audio nodes become null', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      // Simulate nodes being cleaned up
      mockOscillatorNode = null;

      // Should gracefully stop without crashing
      advanceAnimationFrames(1);

      expect(true).toBe(true); // No crash
    });
  });
});
```

### 8. Edge Cases

```typescript
describe('edge cases', () => {
  describe('rapid toggling', () => {
    it('should handle rapid toggle calls without crashing', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        for (let i = 0; i < 20; i++) {
          result.current.toggle();
        }
      });

      // Should end up in a consistent state
      expect(typeof result.current.isEnabled).toBe('boolean');
    });

    it('should handle rapid start/stop without resource leaks', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        for (let i = 0; i < 10; i++) {
          result.current.start();
          result.current.stop();
        }
      });

      // Each stop should call oscillator.stop()
      expect(mockOscillatorNode.stop).toHaveBeenCalled();
    });
  });

  describe('context closed state', () => {
    it('should rebuild context if state is closed', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      // Simulate context being closed externally
      mockAudioContext.state = 'closed';

      await act(async () => {
        result.current.stop();
        result.current.start();
      });

      // Should have created a new context
      expect(AudioContextClass.mock.calls.length).toBeGreaterThan(1);
    });

    it('should handle activateAudio when context is closed', async () => {
      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      mockAudioContext.state = 'closed';
      mockIsPaused = true;
      await act(async () => {});

      mockIsPaused = false;
      await act(async () => {});

      // Should have rebuilt the audio graph
      expect(result.current.isActive).toBe(true);
    });
  });

  describe('suspended context', () => {
    it('should resume suspended context when activating', async () => {
      const { result } = renderAudioHook();

      mockAudioContext.state = 'suspended';

      await act(async () => {
        result.current.start();
      });

      expect(mockAudioContext.resume).toHaveBeenCalled();
    });
  });

  describe('audio graph build failure', () => {
    it('should set isSupported=false if AudioContext throws', async () => {
      // Make AudioContext constructor throw
      (AudioContextClass as jest.Mock).mockImplementationOnce(() => {
        throw new Error('AudioContext not available');
      });

      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      expect(result.current.isSupported).toBe(false);
    });

    it('should not set isActive=true if graph build fails', async () => {
      (AudioContextClass as jest.Mock).mockImplementationOnce(() => {
        throw new Error('AudioContext not available');
      });

      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      expect(result.current.isActive).toBe(false);
    });
  });

  describe('oscillator stop error handling', () => {
    it('should handle oscillator.stop() throwing', async () => {
      mockOscillatorNode.stop.mockImplementationOnce(() => {
        throw new Error('InvalidStateError');
      });

      const { result } = renderAudioHook();

      await act(async () => {
        result.current.start();
        result.current.stop();
      });

      // Should not crash
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('cleanup on unmount', () => {
    it('should stop oscillator on unmount', async () => {
      const { result, unmount } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      unmount();

      expect(mockOscillatorNode.stop).toHaveBeenCalled();
    });

    it('should close AudioContext on unmount', async () => {
      const { result, unmount } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      unmount();

      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should cancel animation frame on unmount', async () => {
      const { result, unmount } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      unmount();

      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('ref synchronization', () => {
    it('should keep activeDestinationIdRef in sync', async () => {
      const { result, rerender } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      mockActiveDestinationId = 'pan';
      rerender();

      // The animation loop should use the new destination
      mockLfoOutput.value = 1;
      advanceAnimationFrames(1);

      expect(mockStereoPannerNode.pan.value).toBeGreaterThan(0);
    });

    it('should keep getCenterValueRef in sync', async () => {
      const { result, rerender } = renderAudioHook();

      await act(async () => {
        result.current.start();
      });

      // Change center value
      mockCenterValues.volume = 50;
      rerender();

      mockLfoOutput.value = 0;
      advanceAnimationFrames(1);

      // Gain should reflect new center value
      // At center=50, MIDI value ~50, gain should be ~0.39
      expect(mockGainNode.gain.value).toBeCloseTo(50/127, 1);
    });
  });
});
```

### 9. MIDI-to-Audio Mapping Functions (Unit Tests)

These can be tested in isolation without the full provider:

```typescript
describe('MIDI mapping functions', () => {
  describe('midiToGain', () => {
    it('should map 0 to 0', () => {
      expect(midiToGain(0)).toBe(0);
    });

    it('should map 127 to 1', () => {
      expect(midiToGain(127)).toBe(1);
    });

    it('should map 64 to ~0.5', () => {
      expect(midiToGain(64)).toBeCloseTo(64/127, 2);
    });

    it('should clamp negative values to 0', () => {
      expect(midiToGain(-10)).toBe(0);
    });

    it('should clamp values > 127 to 1', () => {
      expect(midiToGain(200)).toBe(1);
    });
  });

  describe('midiToFilterFreq', () => {
    it('should map 0 to 20 Hz', () => {
      expect(midiToFilterFreq(0)).toBeCloseTo(20, 0);
    });

    it('should map 127 to 20000 Hz', () => {
      expect(midiToFilterFreq(127)).toBeCloseTo(20000, 0);
    });

    it('should use exponential scaling', () => {
      const mid = midiToFilterFreq(64);
      // Should be geometric mean of 20 and 20000
      const expected = Math.sqrt(20 * 20000);
      expect(mid).toBeCloseTo(expected, -1); // Within 10%
    });
  });

  describe('midiToFilterQ', () => {
    it('should map 0 to 0.5', () => {
      expect(midiToFilterQ(0)).toBeCloseTo(0.5, 1);
    });

    it('should map 127 to 30', () => {
      expect(midiToFilterQ(127)).toBeCloseTo(30, 0);
    });
  });

  describe('midiToPan', () => {
    it('should map 0 to ~-1', () => {
      expect(midiToPan(0)).toBeCloseTo(-1, 1);
    });

    it('should map 63 to ~1', () => {
      expect(midiToPan(63)).toBeCloseTo(1, 1);
    });

    it('should map -64 to ~-1', () => {
      expect(midiToPan(-64)).toBe(-1);
    });

    it('should clamp values', () => {
      expect(midiToPan(100)).toBe(1);
      expect(midiToPan(-100)).toBe(-1);
    });
  });

  describe('midiToPitch', () => {
    it('should return base frequency at MIDI 64', () => {
      expect(midiToPitch(64)).toBeCloseTo(220, 0);
    });

    it('should return higher frequency at MIDI 127', () => {
      expect(midiToPitch(127)).toBeGreaterThan(220);
    });

    it('should return lower frequency at MIDI 0', () => {
      expect(midiToPitch(0)).toBeLessThan(220);
    });

    it('should span approximately 4 octaves', () => {
      const low = midiToPitch(0);
      const high = midiToPitch(127);
      const octaves = Math.log2(high / low);
      expect(octaves).toBeCloseTo(4, 0);
    });
  });
});
```

## Test Setup File Updates

Add to `/Users/brent/wtlfo/jest.setup.js`:

```typescript
// Mock react-native-audio-api
jest.mock('react-native-audio-api', () => {
  const createMockAudioParam = (initialValue: number) => ({
    value: initialValue,
  });

  const createMockOscillatorNode = () => ({
    type: 'sine',
    frequency: createMockAudioParam(440),
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  });

  const createMockGainNode = () => ({
    gain: createMockAudioParam(1),
    connect: jest.fn(),
  });

  const createMockBiquadFilterNode = () => ({
    type: 'lowpass',
    frequency: createMockAudioParam(350),
    Q: createMockAudioParam(1),
    connect: jest.fn(),
  });

  const createMockStereoPannerNode = () => ({
    pan: createMockAudioParam(0),
    connect: jest.fn(),
  });

  return {
    AudioContext: jest.fn(() => ({
      state: 'running',
      destination: {},
      resume: jest.fn().mockResolvedValue(undefined),
      suspend: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      createGain: jest.fn(createMockGainNode),
      createOscillator: jest.fn(createMockOscillatorNode),
      createBiquadFilter: jest.fn(createMockBiquadFilterNode),
      createStereoPanner: jest.fn(createMockStereoPannerNode),
    })),
    OscillatorNode: jest.fn(),
    GainNode: jest.fn(),
    BiquadFilterNode: jest.fn(),
    StereoPannerNode: jest.fn(),
  };
});
```

## Coverage Goals

Aim for the following coverage targets:

| Metric     | Target |
|------------|--------|
| Statements | 90%    |
| Branches   | 85%    |
| Functions  | 90%    |
| Lines      | 90%    |

## Testing Priority Order

1. **Critical**: Toggle on/off, isEnabled vs isActive separation
2. **High**: Pause/unpause, background/foreground transitions
3. **Medium**: Animation loop modulation by destination
4. **Medium**: Destination change handling
5. **Lower**: Edge cases, MIDI mapping functions

## Notes

1. **SharedValue Access**: The LFO output is a Reanimated SharedValue. In tests, accessing `.value` directly works because the mock returns a simple object with a `value` property.

2. **Async Nature**: Some operations like `activateAudio` are async. Use `await act(async () => ...)` and `waitFor` from `@testing-library/react-native`.

3. **State Updates**: React state updates are batched. Multiple state changes in one `act()` block may not result in multiple re-renders.

4. **Ref Updates**: The component uses refs to avoid stale closures in the animation loop. Tests should verify that ref updates are reflected in the animation behavior.

5. **oscillators Are One-Shot**: Web Audio oscillators cannot be restarted after `stop()`. A new oscillator must be created each time. Tests should verify new oscillator creation on resume.
