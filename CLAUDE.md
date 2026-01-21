# CLAUDE.md - Project Instructions for Claude Code

## Before Spawning Agents

**ALWAYS** instruct agents to read `.claude/decisions.md` first - it contains architectural decisions that affect recommendations (e.g., React Compiler means no manual memoization).

## Project Overview

wtlfo is an Expo app that visualizes Elektron Digitakt II LFO behavior. It uses the `elektron-lfo` npm package for the LFO engine.

## Related Projects

- `elektron-lfo` package: `/Users/brent/code/elektron-lfo`

## Updating elektron-lfo

When making changes to the `elektron-lfo` package, you must:

1. Make changes in `/Users/brent/code/elektron-lfo`
2. Run tests: `bun test`
3. Build: `bun run build`
4. Bump version in `package.json`
5. Publish to npm: `npm publish --otp=<code>` (requires user's OTP)
6. Install in wtlfo: `cd /Users/brent/wtlfo && bun install elektron-lfo@latest`

**Note**: `bun link` doesn't work with Expo/Metro, so we must publish to npm.

## Project Plans

- `.claude/e2e-verification-plan.md` - Plan for end-to-end LFO verification against real Digitakt II hardware via MIDI CC
