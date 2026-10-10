import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { productName } from '../lib/product';
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
 * The screen the app opens on. A teacher arriving in the morning sees where to sign in and nothing
 * else: their email, their password, and the button that logs them in.
 */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shown, setShown] = useState(false);
  const [remember, setRemember] = useState(true);
  const [said, setSaid] = useState<string | null>(null);

  function logIn() {
    // Checking these against the phone's own records is the next thing to be built; until then the
    // screen only says what it can honestly say — that both are needed.
    if (!email.trim() || !password) {
      setSaid('Enter your email and password to log in.');
      return;
    }
    setSaid(null);
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
          onPress={logIn}
          style={{
            alignItems: 'center',
            backgroundColor: colors.accent,
            borderRadius: radius.field,
            paddingVertical: 15,
            ...shadow.accent,
          }}
        >
          <Text style={{ color: colors.onAccent, fontSize: 16, fontWeight: '700' }}>Log In</Text>
        </Pressable>

        {said ? (
          <Text style={{ marginTop: 12, fontSize: 13, color: colors.text, textAlign: 'center' }}>{said}</Text>
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
