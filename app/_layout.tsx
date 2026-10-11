import { useEffect } from 'react';
import { Slot, type ErrorBoundaryProps } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { DonemarkTryStrip } from '../components/donemark-try-strip';
import { installDonemarkTry, sayError, tryMode } from '../lib/donemark-try';
import { useDirection, useWords } from '../lib/i18n';
import { mirrorWithLanguage } from '../lib/mirror';

// DoneMark's try mode (template 50): does nothing unless a DoneMark preview set EXPO_PUBLIC_DONEMARK_TRY.
installDonemarkTry();

// The phone's own text layer, kept with the language the app is in: when a teacher chooses Arabic,
// its keyboard and its alerts are mirrored along with the screens.
mirrorWithLanguage();

/** A screen that failed to draw: its words while the app is tried; a plain sentence for everybody else. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const t = useWords();
  const dir = useDirection();
  useEffect(() => { if (tryMode()) sayError(error); }, [error]);
  // What a teacher reads is in their own language; what DoneMark is shown while the app is tried is
  // in the words its own strip is written in, and never on a store build.
  return (
    <View style={{ flex: 1, direction: dir, padding: 24, gap: 12, justifyContent: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>{tryMode() ? 'This screen could not be drawn' : t('error.wrong')}</Text>
      {tryMode() ? <Text>{error.message}</Text> : null}
      <Pressable onPress={retry}><Text style={{ fontWeight: '600' }}>{t('error.retry')}</Text></Pressable>
      {tryMode() ? <DonemarkTryStrip /> : null}
    </View>
  );
}

export default function RootLayout() {
  const dir = useDirection();
  return (
    <View style={{ flex: 1, direction: dir }}>
      <Slot />
      {tryMode() ? <DonemarkTryStrip /> : null}
    </View>
  );
}
