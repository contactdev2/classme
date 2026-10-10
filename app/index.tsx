import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { HomeScreen } from '../components/home-screen';
import { SettingsScreen } from '../components/settings-screen';
import type { TeacherProfile } from '../lib/local-accounts';
import { productName } from '../lib/product';
import { credentialsFrom, missingFrom, submitSignIn } from '../lib/sign-in';
import { colors, radius, shadow, space } from '../lib/theme';

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
 * The route the app opens on: the login screen, until a teacher's own record on this phone opens
 * with what they typed — and from then on, Home, greeting them by name, with Settings behind their
 * own avatar. Nobody is signed in when the app starts, so the first thing drawn is always the login
 * screen itself.
 *
 * Home and Settings are components and not routes of their own on purpose: the app opening on the
 * login screen and nothing else is a requirement of its own, and this keeps '/' the only screen
 * there is.
 */
export default function Login() {
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [inSettings, setInSettings] = useState(false);

  if (teacher) {
    const logOut = () => {
      setTeacher(null);
      setInSettings(false);
    };
    return inSettings ? (
      <SettingsScreen teacher={teacher} onBack={() => setInSettings(false)} onLogOut={logOut} />
    ) : (
      <HomeScreen teacher={teacher} onOpenSettings={() => setInSettings(true)} />
    );
  }
  return <LoginScreen onSignedIn={setTeacher} />;
}

/**
 * The screen the app opens on. A teacher arriving in the morning sees where to sign in and nothing
 * else: their email, their password, and the button that logs them in.
 */
function LoginScreen({ onSignedIn }: { onSignedIn: (teacher: TeacherProfile) => void }) {
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
    setSaid('Checking your details…');
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
      setSaid('Your details could not be checked just now. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
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
        <Text style={{ fontSize: 12, color: '#7C8A9E', letterSpacing: 1, marginTop: 2 }}>TEACH · TRACK · INSPIRE</Text>
      </View>

      <View style={{ alignItems: 'center', marginBottom: space.room }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: space.tight, textAlign: 'center' }}>
          Welcome back
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>
          Sign in to manage your classrooms and track attendance securely.
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
          <FieldLabel>Email Address</FieldLabel>
          <View style={fieldRow}>
            <Text style={{ fontSize: 15 }}>✉️</Text>
            <TextInput
              accessibilityLabel="Email Address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="you@school.edu"
              placeholderTextColor={colors.faint}
              value={email}
              onChangeText={setEmail}
              style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 }}
            />
          </View>
        </View>

        <View style={{ marginBottom: space.snug }}>
          <FieldLabel>Password</FieldLabel>
          <View style={fieldRow}>
            <Text style={{ fontSize: 15 }}>🔒</Text>
            <TextInput
              accessibilityLabel="Password"
              secureTextEntry={!shown}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              placeholder="Your password"
              placeholderTextColor={colors.faint}
              value={password}
              onChangeText={setPassword}
              style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={shown ? 'Hide password' : 'Show password'}
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
            <Text style={{ fontSize: 13, color: colors.muted }}>Remember me</Text>
          </Pressable>
          <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '600' }}>Forgot password?</Text>
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
          <Text style={{ color: colors.onAccent, fontSize: 16, fontWeight: '700' }}>Log In</Text>
        </Pressable>

        {said ? (
          <Text accessibilityRole="alert" style={{ marginTop: 12, fontSize: 13, color: colors.text, textAlign: 'center' }}>{said}</Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: space.step }}>
          <Text style={{ fontSize: 13 }}>🔐</Text>
          <Text style={{ fontSize: 12, color: colors.faint, textAlign: 'center' }}>Verified against your encrypted local database</Text>
        </View>
      </View>

      <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: space.snug, marginTop: space.gap, marginBottom: 18 }}>
        <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: colors.line }} />
        <Text style={{ fontSize: 12, color: '#9AA7B8' }}>OR</Text>
        <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: colors.line }} />
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
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Your data stays on this device</Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
            All classroom records are stored in an encrypted on-device database. Nothing is synced externally.
          </Text>
        </View>
      </View>

      <Text style={{ marginTop: space.room, fontSize: 13, color: '#9AA7B8', textAlign: 'center' }}>{productName()} v1.0</Text>
    </ScrollView>
  );
}
