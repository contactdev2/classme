import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useDirection, useWords } from '../lib/i18n';
import { notReadyFor, nameMissingFrom, shortestPassword, submitSignUp } from '../lib/sign-up';
import { colors, radius, shadow, space } from '../lib/theme';

/** The words above a field, naming it, so a person knows what goes in it. */
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
 * One of the two steps, along the top: the step a teacher is on, the one they have finished, and
 * the one still ahead of them, told apart the way the prototype tells them apart — a tick for
 * what is done, the accent for where they are, and quieter for what has not been asked yet.
 */
function Step({ mark, words, reached }: { mark: string; words: string; reached: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: reached ? colors.accent : colors.accentSoft,
          borderRadius: radius.pill,
          paddingHorizontal: 8,
          paddingVertical: 4,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: reached ? colors.onAccent : colors.muted }}>{mark}</Text>
      </View>
      <Text style={{ fontSize: 12, fontWeight: '700', color: reached ? colors.accent : colors.muted }}>{words}</Text>
    </View>
  );
}

/**
 * Where a teacher with no profile yet makes one: their name first, then the email and password
 * they will sign in with, as the prototype lays it out (mockup 3, "Progressive Steps").
 *
 * Nothing here reaches off the phone. The profile is locked with the password they choose and kept
 * on this phone, which is the only place it is ever kept — so this screen works with no connection
 * exactly as it works with one, and there is no waiting on anything but the phone's own arithmetic.
 *
 * What they type is held here while they are typing it and nowhere else: not in a log, not in a
 * message, and never said back out of a field that is not asking for it.
 */
export function SignUpScreen({ onBack, onCreated }: { onBack: () => void; onCreated: (said: string) => void }) {
  const t = useWords();
  const dir = useDirection();
  const [onAccount, setOnAccount] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shown, setShown] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** The way back: to the first step from the second, and out to the login screen from the first. */
  function goBack() {
    if (!onAccount) {
      onBack();
      return;
    }
    setSaid(null);
    setOnAccount(false);
  }

  /** The first step's button: on to the second, once they have given a name to be greeted by. */
  function carryOn() {
    const missing = nameMissingFrom({ name });
    if (missing) {
      setSaid(missing);
      return;
    }
    setSaid(null);
    setOnAccount(true);
  }

  /**
   * The Create Profile button: what the teacher filled in, handed in to be made into their own
   * record, and the answer said back. What is not yet right is named here, before anything is
   * submitted — nobody has to wait to be told they have not finished typing.
   */
  async function createProfile() {
    // One press is one submission: a second one while the first is still being answered is ignored.
    if (busy) return;
    const details = { name, email, password };
    const notReady = notReadyFor(details);
    if (notReady) {
      setSaid(notReady);
      return;
    }
    setBusy(true);
    setSaid(t('signUp.making'));
    try {
      const outcome = await submitSignUp(details);
      if (outcome.created) {
        // Made. Nothing more to say here: this screen is done, and the app takes over — the
        // sentence it says next belongs to the screen they are about to log in on.
        setBusy(false);
        onCreated(outcome.said);
        return;
      }
      setSaid(outcome.said);
    } catch {
      // What went wrong is never said in the words of the thing that failed, and never with any of
      // what was typed in it: a teacher reads what to do next, and nothing else.
      setSaid(t('signUp.couldNotCreate'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, direction: dir, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: space.gap, paddingHorizontal: space.gap }}
      >
        {/* The screen, and the way back to where the teacher came from. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={onAccount ? t('signUp.backToName') : t('signUp.backToLogin')}
            onPress={goBack}
            style={{ backgroundColor: '#DCE8FB', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 7 }}
          >
            <Text style={{ fontSize: 17, color: colors.accent }}>{dir === 'rtl' ? '→' : '←'}</Text>
          </Pressable>
          <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
            {t('signUp.title')}
          </Text>
        </View>

        {/* The two steps, and which of them a teacher is standing on. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 4,
            marginBottom: 20,
          }}
        >
          <Step mark={onAccount ? '✓' : '1'} words={t('signUp.stepName')} reached />
          <View style={{ minWidth: 36, borderTopWidth: 2, borderTopColor: onAccount ? colors.accent : colors.line }} />
          <Step mark="2" words={t('signUp.stepAccount')} reached={onAccount} />
        </View>

        {/* What this step is for, in a sentence — greeting them by the name they just gave, once
            they have given it. */}
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: space.tight, textAlign: 'center' }}>
            {onAccount ? t('signUp.greeting', { name: name.trim() }) : t('signUp.nameTitle')}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>
            {onAccount ? t('signUp.accountWords') : t('signUp.nameWords')}
          </Text>
        </View>

        {/* What this step asks for. */}
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
          {onAccount ? (
            <>
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

              <View style={{ marginBottom: space.tight }}>
                <FieldLabel>{t('login.password')}</FieldLabel>
                <View style={fieldRow}>
                  <Text style={{ fontSize: 15 }}>🔒</Text>
                  <TextInput
                    accessibilityLabel={t('login.password')}
                    secureTextEntry={!shown}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    textContentType="newPassword"
                    placeholder={t('signUp.passwordPlaceholder', { least: shortestPassword })}
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

              {/* The rule, where a person reads it as they choose their password and not after. */}
              <Text style={{ fontSize: 12, color: colors.faint, marginBottom: 18, marginHorizontal: 2 }}>
                {t('signUp.passwordHint', { least: shortestPassword })}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={createProfile}
                style={{
                  alignItems: 'center',
                  backgroundColor: colors.accent,
                  borderRadius: radius.field,
                  paddingVertical: 14,
                  opacity: busy ? 0.7 : 1,
                  ...shadow.accent,
                }}
              >
                <Text style={{ color: colors.onAccent, fontSize: 15, fontWeight: '700' }}>{t('signUp.create')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={{ marginBottom: space.step }}>
                <FieldLabel>{t('signUp.name')}</FieldLabel>
                <View style={fieldRow}>
                  <TextInput
                    accessibilityLabel={t('signUp.name')}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoComplete="name"
                    textContentType="name"
                    placeholder={t('signUp.namePlaceholder')}
                    placeholderTextColor={colors.faint}
                    value={name}
                    onChangeText={setName}
                    style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 }}
                  />
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={carryOn}
                style={{
                  alignItems: 'center',
                  backgroundColor: colors.accent,
                  borderRadius: radius.field,
                  paddingVertical: 14,
                  ...shadow.accent,
                }}
              >
                <Text style={{ color: colors.onAccent, fontSize: 15, fontWeight: '700' }}>{t('signUp.continue')}</Text>
              </Pressable>
            </>
          )}

          {said ? (
            <Text accessibilityRole="alert" style={{ marginTop: 12, fontSize: 13, color: colors.text, textAlign: 'center' }}>
              {said}
            </Text>
          ) : null}
        </View>

        {/* Where a teacher who already has a profile goes instead. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginTop: space.step }}>
          <Text style={{ fontSize: 13, color: colors.faint }}>{t('signUp.haveProfile')}</Text>
          <Pressable accessibilityRole="button" onPress={onBack}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>{t('signUp.signIn')}</Text>
          </Pressable>
        </View>

        {/* What the app promises about a profile before one is made: made here, kept here, and
            needing nothing of a network — said on the first step, where there is room to read it. */}
        {onAccount ? null : (
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
              marginTop: space.gap,
              ...shadow.soft,
            }}
          >
            <View style={{ backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 7 }}>
              <Text style={{ fontSize: 18 }}>🛡️</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 12, color: colors.muted }}>{t('signUp.onThisPhone')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
