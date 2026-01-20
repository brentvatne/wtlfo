// Jest setup file

// Mock expo-sqlite/kv-store for storage operations
jest.mock('expo-sqlite/kv-store', () => ({
  Storage: {
    getItemSync: jest.fn(() => null),
    setItemSync: jest.fn(),
  },
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');

  // Override useSharedValue to work in tests
  Reanimated.useSharedValue = (initialValue) => ({
    value: initialValue,
  });

  return Reanimated;
});

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
