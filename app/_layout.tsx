import { useEffect } from 'react';
import { Slot, type ErrorBoundaryProps } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { DonemarkTryStrip } from '../components/donemark-try-strip';
import { installDonemarkTry, sayError, tryMode } from '../lib/donemark-try';

// DoneMark's try mode (template 50): does nothing unless a DoneMark preview set EXPO_PUBLIC_DONEMARK_TRY.
installDonemarkTry();

/** A screen that failed to draw: its words while the app is tried; a plain sentence for everybody else. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => { if (tryMode()) sayError(error); }, [error]);
  return (
    <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>{tryMode() ? 'This screen could not be drawn' : 'Something went wrong on this screen.'}</Text>
      {tryMode() ? <Text>{error.message}</Text> : null}
      <Pressable onPress={retry}><Text style={{ fontWeight: '600' }}>Try again</Text></Pressable>
      {tryMode() ? <DonemarkTryStrip /> : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Slot />
      {tryMode() ? <DonemarkTryStrip /> : null}
    </View>
  );
}
