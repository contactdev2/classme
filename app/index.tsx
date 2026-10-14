import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ClassAttendanceScreen } from '../components/class-attendance-screen';
import { ClassesScreen } from '../components/classes-screen';
import { HomeScreen } from '../components/home-screen';
import type { Place } from '../components/places-row';
import { OnboardingScreen } from '../components/onboarding-screen';
import { SettingsScreen } from '../components/settings-screen';
import { SignUpScreen } from '../components/sign-up-screen';
import { TakeAttendanceScreen } from '../components/take-attendance-screen';
import { classroomStore, nothingKeptYet, type ClassroomData } from '../lib/classroom-data';
import { openInPhoneLanguage, useDirection, useWords } from '../lib/i18n';
import type { TeacherProfile } from '../lib/local-accounts';
import { finishedOnboarding, rememberOnboardingFinished } from '../lib/onboarding';
import { productName } from '../lib/product';
import { credentialsFrom, missingFrom, submitSignIn } from '../lib/sign-in';
import { colors, radius, shadow, space } from '../lib/theme';
import { versionLabel } from '../lib/version';

/** The words under a field, naming it, so a person knows what goes in it. */
function FieldLabel({ children }: { children: string }) {
  return <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: space.tight }}>{children}</Text>;
}

const fieldRow = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: radius.field,
  paddingHorizontal: 14,
  paddingVertical: 12,
} as const;

/**
 * What the phone keeps about this teacher's teaching, read as they sign in. A phone that will not
 * answer reads as a phone with nothing taught on it: the screens then say so plainly rather than
 * failing in front of a teacher, and nothing of theirs is written to a log on the way past.
 */
async function theirTeaching(): Promise<ClassroomData> {
  try {
    return await classroomStore().read();
  } catch {
    return nothingKeptYet();
  }
}

/**
 * The route the app opens on: the login screen, until a teacher's own record on this phone opens
 * with what they typed — and from then on, Home, greeting them by name, with Settings behind their
 * own avatar. Nobody is signed in when the app starts, so the first thing drawn is always the login
 * screen itself.
 *
 * A teacher with no record on this phone yet goes the other way first: the login screen's own
 * invitation opens the screen where a profile is made, and the profile it makes is signed in from
 * its own last step — nobody is asked to type what they have just finished typing.
 *
 * The first teacher signed in on a phone nobody has been welcomed on meets the walkthrough before
 * Home: a welcome and three slides saying what the app is for. What it is for is read once, so the
 * phone is asked whether it is finished at the moment somebody signs in, and told when it is — from
 * the next morning on they go straight to Home. See lib/onboarding.ts.
 *
 * From Home a teacher goes to their own classes — the list of them, and the attendance of any one
 * they open — and to today's register, where the class they opened, or else the first class of
 * their day, stands with everybody marked Present. What the phone keeps about their teaching is
 * read once, as they sign in, and handed down to those screens, so none of them has anything to
 * wait for when it is drawn.
 *
 * Home, Settings, Classes, a class's attendance, today's register, the walkthrough and the signup
 * are components and not routes of their own on purpose: the app opening on the login screen and
 * nothing else is a requirement of its own, and this keeps '/' the only screen there is.
 */
export default function Login() {
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [place, setPlace] = useState<Place | 'settings'>('home');
  // Where a teacher was standing when they went to take attendance, so the way out of a register is
  // the way they came into it.
  const [before, setBefore] = useState<Place>('home');
  const [openClass, setOpenClass] = useState<string | null>(null);
  const [teaching, setTeaching] = useState<ClassroomData>(nothingKeptYet());
  const [signingUp, setSigningUp] = useState(false);
  const [welcomed, setWelcomed] = useState(false);

  // The language this app opens in, settled before a teacher reads anything on it: the one their
  // phone is set to, or the one they chose themselves on a phone still set the way it was. It is
  // read from the phone itself and nowhere else — see lib/i18n.ts.
  useEffect(() => {
    void openInPhoneLanguage();
  }, []);

  /**
   * Somebody signed in, by whichever of the two ways in they came. The phone is asked whether the
   * walkthrough has been finished on it before the screen behind this changes, so a teacher who has
   * seen it never sees it flash past them on the way to Home.
   */
  async function signedIn(made: TeacherProfile) {
    setWelcomed(await finishedOnboarding());
    setTeaching(await theirTeaching());
    setTeacher(made);
  }

  if (teacher) {
    const logOut = () => {
      setTeacher(null);
      setPlace('home');
      setBefore('home');
      setOpenClass(null);
      setTeaching(nothingKeptYet());
    };
    /** A teacher pressing one of the app's own places in the row along the bottom. */
    const goTo = (going: Place) => {
      if (going === 'attendance' && place !== 'attendance') setBefore(place === 'classes' ? 'classes' : 'home');
      setPlace(going);
    };
    if (!welcomed) {
      return (
        <OnboardingScreen
          onDone={() => {
            // Onward to Home, and remembered on the phone so tomorrow morning opens on Home. A
            // phone that would not write it down says so to nobody: the teacher is on their way,
            // and the honest cost is being welcomed once more.
            setWelcomed(true);
            void rememberOnboardingFinished();
          }}
        />
      );
    }
    if (place === 'settings') {
      return <SettingsScreen teacher={teacher} onBack={() => setPlace('home')} onLogOut={logOut} />;
    }
    if (place === 'attendance') {
      // Today's register, for the class the teacher opened or else the first of their own day.
      return (
        <TakeAttendanceScreen data={teaching} classroomId={openClass} onBack={() => setPlace(before)} />
      );
    }
    if (place === 'classes') {
      // A class the teacher has opened is in front of the list it was opened from; the way back out
      // of it is to that same list.
      return openClass ? (
        <ClassAttendanceScreen data={teaching} classroomId={openClass} onBack={() => setOpenClass(null)} />
      ) : (
        <ClassesScreen data={teaching} onOpenClass={setOpenClass} onGo={goTo} />
      );
    }
    return <HomeScreen teacher={teacher} onOpenSettings={() => setPlace('settings')} onGo={goTo} />;
  }
  if (signingUp) {
    return (
      <SignUpScreen
        onBack={() => setSigningUp(false)}
        onDone={(made) => {
          // Their profile is made and it is theirs: they are signed in with it, which is where the
          // last step of the signup says it is taking them.
          setSigningUp(false);
          void signedIn(made);
        }}
      />
    );
  }
  return (
    <LoginScreen onSignedIn={(made) => void signedIn(made)} onSignUp={() => setSigningUp(true)} />
  );
}

/**
 * The screen the app opens on. A teacher arriving in the morning sees where to sign in and nothing
 * else: their email, their password, and the button that logs them in — and, under it, the way to
 * make a profile for a teacher who has not got one yet.
 */
function LoginScreen({ onSignedIn, onSignUp }: { onSignedIn: (teacher: TeacherProfile) => void; onSignUp: () => void }) {
  const t = useWords();
  const dir = useDirection();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shown, setShown] = useState(false);
  const [remember, setRemember] = useState(true);
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * The Log In button: what the teacher typed, handed in to be checked, and the answer said back.
   * A field left empty is named here, before anything is submitted — nobody has to wait to be told
   * they have not finished typing.
   */
  async function logIn() {
    // One press is one submission: a second one while the first is still being answered is ignored.
    if (busy) return;
    const missing = missingFrom({ email, password });
    if (missing) {
      setSaid(missing);
      return;
    }
    setBusy(true);
    setSaid(t('login.checking'));
    try {
      const outcome = await submitSignIn(credentialsFrom({ email, password }));
      if (outcome.signedIn && outcome.teacher) {
        // Their record opened. Nothing more to say here: this screen is done, and the app takes over.
        setBusy(false);
        onSignedIn(outcome.teacher);
        return;
      }
      setSaid(outcome.said);
    } catch {
      // What went wrong is never said in the words of the thing that failed, and never with any of
      // what was typed in it: a teacher reads what to do next, and nothing else.
      setSaid(t('login.couldNotCheck'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, direction: dir, backgroundColor: colors.background }}>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ alignItems: 'center', paddingTop: 56, paddingBottom: space.gap, paddingHorizontal: space.gap }}
    >
      {/* The app, saying who it is. */}
      <View style={{ alignItems: 'center', marginBottom: 18 }}>
        <View
          style={{
            backgroundColor: colors.accent,
            borderRadius: radius.card,
            paddingHorizontal: 15,
            paddingVertical: 13,
            marginBottom: 12,
            ...shadow.accent,
          }}
        >
          <Text style={{ fontSize: 30 }}>🎓</Text>
        </View>
        <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: 0.3 }}>
          {productName()}
        </Text>
        <Text style={{ fontSize: 12, color: '#7C8A9E', letterSpacing: 1, marginTop: 2 }}>{t('login.tagline')}</Text>
      </View>

      <View style={{ alignItems: 'center', marginBottom: space.room }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: space.tight, textAlign: 'center' }}>
          {t('login.welcome')}
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>
          {t('login.invite')}
        </Text>
      </View>

      {/* Where a teacher signs in. */}
      <View
        style={{
          alignSelf: 'stretch',
          backgroundColor: colors.card,
          borderRadius: radius.card,
          paddingHorizontal: 20,
          paddingVertical: space.gap,
          ...shadow.card,
        }}
      >
        <View style={{ marginBottom: space.step }}>
          <FieldLabel>{t('login.email')}</FieldLabel>
          <View style={fieldRow}>
            <Text style={{ fontSize: 15 }}>✉️</Text>
            <TextInput
              accessibilityLabel={t('login.email')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              placeholder={t('login.emailPlaceholder')}
              placeholderTextColor={colors.faint}
              value={email}
              onChangeText={setEmail}
              style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 }}
            />
          </View>
        </View>

        <View style={{ marginBottom: space.snug }}>
          <FieldLabel>{t('login.password')}</FieldLabel>
          <View style={fieldRow}>
            <Text style={{ fontSize: 15 }}>🔒</Text>
            <TextInput
              accessibilityLabel={t('login.password')}
              secureTextEntry={!shown}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              placeholder={t('login.passwordPlaceholder')}
              placeholderTextColor={colors.faint}
              value={password}
              onChangeText={setPassword}
              style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={shown ? t('login.hidePassword') : t('login.showPassword')}
              onPress={() => setShown(!shown)}
            >
              <Text style={{ fontSize: 13 }}>👁️</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.snug, marginBottom: 20 }}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: remember }}
            onPress={() => setRemember(!remember)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}
          >
            <View
              style={{
                paddingHorizontal: 3,
                borderRadius: 5,
                borderWidth: 1,
                borderColor: remember ? colors.accent : colors.line,
                backgroundColor: remember ? colors.accent : colors.card,
              }}
            >
              <Text style={{ color: remember ? colors.onAccent : 'transparent', fontSize: 11, fontWeight: '700' }}>✓</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.muted }}>{t('login.remember')}</Text>
          </Pressable>
          <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '600' }}>{t('login.forgot')}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={logIn}
          style={{
            alignItems: 'center',
            backgroundColor: colors.accent,
            borderRadius: radius.field,
            paddingVertical: 15,
            opacity: busy ? 0.7 : 1,
            ...shadow.accent,
          }}
        >
          <Text style={{ color: colors.onAccent, fontSize: 16, fontWeight: '700' }}>{t('login.logIn')}</Text>
        </Pressable>

        {said ? (
          <Text accessibilityRole="alert" style={{ marginTop: 12, fontSize: 13, color: colors.text, textAlign: 'center' }}>{said}</Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: space.step }}>
          <Text style={{ fontSize: 13 }}>🔐</Text>
          <Text style={{ fontSize: 12, color: colors.faint, textAlign: 'center' }}>{t('login.verified')}</Text>
        </View>
      </View>

      <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: space.snug, marginTop: space.gap, marginBottom: 18 }}>
        <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: colors.line }} />
        <Text style={{ fontSize: 12, color: '#9AA7B8' }}>{t('login.or')}</Text>
        <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: colors.line }} />
      </View>

      {/* For a teacher holding a phone with no profile on it yet: the way to make one. */}
      <View
        style={{
          alignSelf: 'stretch',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: 18,
        }}
      >
        <Text style={{ fontSize: 13, color: colors.faint }}>{t('login.noProfile')}</Text>
        <Pressable accessibilityRole="button" onPress={onSignUp}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>{t('login.signUp')}</Text>
        </Pressable>
      </View>

      {/* What the app promises about a teacher's data, where they can read it before signing in. */}
      <View
        style={{
          alignSelf: 'stretch',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: colors.accentWash,
          borderRadius: 14,
          paddingHorizontal: space.step,
          paddingVertical: 14,
          ...shadow.soft,
        }}
      >
        <View style={{ backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 7 }}>
          <Text style={{ fontSize: 18 }}>🛡️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{t('login.promiseTitle')}</Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
            {t('login.promiseWords')}
          </Text>
        </View>
      </View>

    </ScrollView>

    {/*
      The foot of the screen, outside everything that scrolls, so the version is readable the moment
      the screen opens however long the login card above it grows — at the phone's largest text size
      the card slides under this strip and never past it.
    */}
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.line,
        paddingTop: space.step,
        paddingBottom: 22,
        paddingHorizontal: space.gap,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#9AA7B8', letterSpacing: 0.5, textAlign: 'center' }}>
        {versionLabel()}
      </Text>
    </View>
    </View>
  );
}
