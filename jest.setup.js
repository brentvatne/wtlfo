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

// Mock @shopify/react-native-skia
jest.mock('@shopify/react-native-skia', () => {
  // Create a mock path object that tracks calls for testing
  const createMockPath = () => {
    const commands = [];
    return {
      moveTo: (x, y) => commands.push({ type: 'moveTo', x, y }),
      lineTo: (x, y) => commands.push({ type: 'lineTo', x, y }),
      close: () => commands.push({ type: 'close' }),
      getCommands: () => commands,
    };
  };

  return {
    Skia: {
      Path: {
        Make: () => createMockPath(),
      },
    },
  };
});

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
