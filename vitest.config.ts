import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// The checks draw the app's screens on a plain DOM, the way the real web build does: the phone's
// own primitives come from test/react-native-dom.tsx so a check can read a screen and photograph it.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { 'react-native': resolve(__dirname, 'test/react-native-dom.tsx') },
  },
});
