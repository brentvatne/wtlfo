// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // Disabled: this rule false-positives on Reanimated SharedValue `.value`
      // writes (e.g. `sharedValue.value = x` inside worklets, frame callbacks,
      // and rAF loops). SharedValues are mutable by design - mutating `.value`
      // is the documented Reanimated API, not a React immutability violation.
      'react-hooks/immutability': 'off',
      // Downgraded to warn: midi-context.tsx and modulation-context.tsx have
      // known set-state-in-effect patterns that are pending a dedicated
      // refactor (owned by that effort - do not "fix" them piecemeal here).
      // Treat these warnings as TODOs; do not add new occurrences.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
