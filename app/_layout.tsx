import { useEffect } from 'react';
import { Slot, type ErrorBoundaryProps } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { DonemarkTryStrip } from '../components/donemark-try-strip';
import { accountsOnThisPhone } from '../lib/accounts-file';
import { appearanceOnThisPhone, keepAppearanceIn } from '../lib/appearance';
import { keepClassroomDataIn } from '../lib/classroom-data';
import { classroomDataOnThisPhone } from '../lib/classroom-file';
import { installDonemarkTry, sayError, tryMode } from '../lib/donemark-try';
import { useDirection, useWords } from '../lib/i18n';
import { keepAccountsIn } from '../lib/local-accounts';
import { mirrorWithLanguage } from '../lib/mirror';
import { keepOnboardingIn, onboardingOnThisPhone } from '../lib/onboarding';
import { askThisPhone, thisPhoneItself } from '../lib/phone-language';

// DoneMark's try mode (template 50): does nothing unless a DoneMark preview set EXPO_PUBLIC_DONEMARK_TRY.
installDonemarkTry();

// The phone's own text layer, kept with the language the app is in: when a teacher chooses Arabic,
// its keyboard and its alerts are mirrored along with the screens.
mirrorWithLanguage();

// The phone itself, asked which language it is set to — the app opens in that one. Installed here,
// at the app's root, because this is the one file only a real app loads: a check hands over a phone
// of its own instead, and so never reaches a module that can only answer on a real phone.
askThisPhone(thisPhoneItself);

// The teachers' own records, in a file in this app's own documents folder, so a profile made this
// morning is still there tomorrow. Installed here for the same reason the phone's language is: this
// is the one file only a real app loads, and a check hands over records of its own instead.
keepAccountsIn(accountsOnThisPhone());

// Whether somebody has been welcomed on this phone, in a file of its own beside the records, so the
// walkthrough is read once and never again. Installed here for the same reason as everything above
// it: this is the one file only a real app loads, and a check hands over a memory of its own.
keepOnboardingIn(onboardingOnThisPhone());

// A teacher's own teaching — their classrooms, the students in them and every attendance mark — in
// a file in this app's own documents folder, so a classroom made this morning and a register saved
// at nine are still there tomorrow. Installed here for the same reason as everything above it: this
// is the one file only a real app loads, and a check hands over a store of its own.
keepClassroomDataIn(classroomDataOnThisPhone());

// Which of the app's two looks a teacher chose, in a file of its own beside the others, so Dark
// Mode is switched on once and not every morning. Installed here for the same reason as everything
// above it: this is the one file only a real app loads, and a check hands over a memory of its own.
keepAppearanceIn(appearanceOnThisPhone());

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
