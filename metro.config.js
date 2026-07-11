const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Evaluate modules lazily on first use instead of eagerly at bundle load.
// Expo's default disables this; enabling it defers module-scope evaluation
// of screens and libraries (e.g. the LFO verification test tables and
// react-native-audio-api) until they're actually required, cutting startup
// bundle-eval time. Module side effects still run — just later, on first use.
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: true,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
