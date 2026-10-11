// The app's bundle never includes its tests (11 October 2026): Expo Router treats every file under
// app/ as a screen, and a test beside its screen imports Node-only modules a phone cannot load, so
// `eas update` failed to export the preview. The tests stay where they are; vitest still runs them.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.blockList = [/\.test\.[jt]sx?$/];

module.exports = config;
