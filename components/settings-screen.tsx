import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { backupFileName, backupMadeAt, makeBackup, openBackup } from '../lib/backup';
import { backupFiles } from '../lib/backup-files';
import { classroomStore } from '../lib/classroom-data';
import { initialsOf, nameOf } from '../lib/greeting';
import { counted, languageNow, rememberLanguage, useDirection, useWords, type WordKey } from '../lib/i18n';
import { defaultLanguage, languages, type Language } from '../lib/languages';
import { phoneLanguage } from '../lib/phone-language';
import type { TeacherProfile } from '../lib/local-accounts';
import { productName } from '../lib/product';
import { colors, radius, shadow, space, useAppearance } from '../lib/theme';

/** The language the app opens in when nobody has pressed anything: the phone's own, where it has it. */
const opensInWithoutAsking = (): Language['tag'] => phoneLanguage() ?? defaultLanguage;

/** What a row says under a language's own name: what it is, which way it reads, and if it is the default. */
type Saying = (key: WordKey, filling?: Record<string, string | number>) => string;

function describe(t: Saying, language: Language, isDefault: boolean): string {
  const name = t(`language.name.${language.tag}` as WordKey);
  const said = language.rtl ? t('language.withRtl', { language: name }) : name;
  return isDefault ? t('language.withDefault', { language: said }) : said;
}

/** The words over a group of cards, as the prototype sets them: small, quiet and in capitals. */
function SectionTitle({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '700',
        color: colors.muted,
        letterSpacing: 0.5,
        // Drawn in capitals, not written in them: a screen reader reads the words as they are.
        textTransform: 'uppercase',
        marginBottom: 8,
        paddingLeft: 4,
      }}
    >
      {children}
    </Text>
  );
}

// Made when a screen is drawn and not when this module loads: the colours in it are the ones the
// app is wearing at that moment, so a teacher flipping Dark Mode redraws this with everything else.
const card = () => ({
  backgroundColor: colors.card,
  borderRadius: radius.card,
  padding: space.step,
  ...shadow.card,
} as const);

/** One fact about where a teacher's data is: the thing on the left, the answer on the right. */
function Fact({ says, answer, colour = colors.text }: { says: string; answer: string; colour?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: space.tight, marginTop: 8 }}>
      <Text style={{ fontSize: 13, color: colors.muted }}>{says}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colour }}>{answer}</Text>
    </View>
  );
}

/** A little round badge with something in it, as the prototype draws beside each row. */
function Mark({ children, tint }: { children: string; tint: string }) {
  return (
    <View style={{ backgroundColor: tint, borderRadius: radius.field, paddingHorizontal: 9, paddingVertical: 7 }}>
      <Text style={{ fontSize: 17 }}>{children}</Text>
    </View>
  );
}

/**
 * A switch, as the prototype draws it. It is drawn here because the prototype draws it: what dark
 * mode and notifications actually do is its own requirement, and until then this flips and says
 * nothing it cannot keep. It is announced as a switch so a screen reader says which way it is.
 */
function Switch({ label, hint, mark, on, flip }: { label: string; hint: string; mark: string; on: boolean; flip: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      onPress={flip}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: space.step }}
    >
      <Mark tint={colors.accentWash}>{mark}</Mark>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{label}</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>{hint}</Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: on ? 'flex-end' : 'flex-start',
          backgroundColor: on ? colors.accent : colors.switchOff,
          borderRadius: 20,
          padding: 3,
          paddingHorizontal: 4,
        }}
      >
        <View style={{ backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 10, ...shadow.soft }} />
      </View>
    </Pressable>
  );
}

/** A row a teacher reads and moves on from. Not announced as a button: nothing is behind it yet. */
function AccountRow({ mark, says, last = false }: { mark: string; says: string; last?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: space.step,
        ...(last ? {} : { borderBottomWidth: 1, borderBottomColor: colors.hairline }),
      }}
    >
      <Mark tint={colors.accentWash}>{mark}</Mark>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text }}>{says}</Text>
      <Text style={{ fontSize: 14, color: colors.chevron }}>›</Text>
    </View>
  );
}

/** The day a backup was made, as a teacher reads it, or nothing when the file will not say. */
function savedOn(file: string): string {
  const madeAt = backupMadeAt(file);
  if (!madeAt) return '';
  const when = new Date(madeAt);
  // The day as this language writes it: the language tags the picker offers are the ones a phone's
  // own date formatter knows, so a date is never read in a language nobody chose.
  return Number.isNaN(when.getTime()) ? '' : when.toLocaleDateString(languageNow());
}

/**
 * One language in the picker, as the mockup draws it: the name the language calls itself, its own
 * mark in a little square, what it is in the language on the screen — and a filled circle on the
 * one chosen. Announced as a radio, so a screen reader says which of the four is on.
 */
function LanguageRow({
  language,
  words,
  chosen,
  choose,
}: {
  language: Language;
  words: string;
  chosen: boolean;
  choose: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: chosen }}
      onPress={choose}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 14,
        borderRadius: radius.field,
        backgroundColor: chosen ? colors.accentWash : colors.card,
      }}
    >
      <Mark tint={chosen ? colors.accentEdge : colors.background}>{language.mark}</Mark>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: chosen ? '700' : '600', color: colors.text }}>{language.native}</Text>
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{words}</Text>
      </View>
      {/* The circle at the end of the row: filled with a tick on the language in use, an empty ring
          on the others. Drawn from padding and a corner, never a fixed size, so the phone's largest
          text grows it with everything else. */}
      <View
        style={{
          borderRadius: radius.pill,
          borderWidth: 1.5,
          borderColor: chosen ? colors.accent : colors.ring,
          backgroundColor: chosen ? colors.accent : colors.card,
          paddingHorizontal: 4,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: chosen ? colors.onAccent : 'transparent' }}>✓</Text>
      </View>
    </Pressable>
  );
}

/**
 * Classroom Settings: where a teacher sees what is being done with their data, and does something
 * about it. The one thing on this screen that is not simply told to them is the backup: a file of
 * their own classrooms, students and attendance, locked with a password they choose, written to
 * this phone and sent nowhere.
 */
export function SettingsScreen({
  teacher,
  onBack,
  onLogOut,
}: {
  teacher: TeacherProfile;
  onBack: () => void;
  onLogOut: () => void;
}) {
  const t = useWords();
  const dir = useDirection();
  // Redrawn the moment a teacher flips Dark Mode in their own profile menu: the colours below are
  // whichever of the two looks the app is wearing. See lib/theme.ts.
  useAppearance();
  const [backupPassword, setBackupPassword] = useState('');
  const [shown, setShown] = useState(false);
  const [said, setSaid] = useState<{ words: string; file?: string } | null>(null);
  const [backups, setBackups] = useState<{ name: string; when: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  /** The backups already on this phone, read off it so a teacher restores by choosing one. */
  const readTheFolder = useCallback(async () => {
    try {
      const names = await backupFiles().saved();
      const found = [];
      for (const name of names) found.push({ name, when: savedOn(await backupFiles().read(name)) });
      setBackups(found);
    } catch {
      // A folder that cannot be read is a folder with no backups to offer. Nothing is said about
      // why: a teacher can still make one, and that is the answer they need from this screen.
      setBackups([]);
    }
  }, []);

  useEffect(() => {
    void readTheFolder();
  }, [readTheFolder]);

  /** Makes the backup file: the phone's own data, locked with the teacher's own password. */
  async function createBackup() {
    if (busy) return;
    if (backupPassword.length < 8) {
      setSaid({ words: t('backup.chooseLonger') });
      return;
    }
    setBusy(true);
    setSaid({ words: t('backup.making') });
    try {
      const data = await classroomStore().read();
      const madeAt = new Date();
      const name = await backupFiles().save(backupFileName(madeAt), makeBackup(data, backupPassword, madeAt));
      // Typed once and not left on the screen: nobody reading over a shoulder reads it back.
      setBackupPassword('');
      setSaid({
        words: t('backup.saved', {
          where: backupFiles().where(),
          classrooms: counted(data.classrooms.length, 'classroom'),
          students: counted(data.students.length, 'student'),
          attendance: counted(data.attendance.length, 'record'),
        }),
        file: name,
      });
      await readTheFolder();
    } catch {
      // Never in the words of the thing that failed, and never with any of what was typed in it.
      setSaid({ words: t('backup.failed') });
    } finally {
      setBusy(false);
    }
  }

  /** Puts a backup saved before back on this phone, if the password given opens it. */
  async function restoreBackup(name: string) {
    if (busy) return;
    if (!backupPassword) {
      setSaid({ words: t('backup.needPassword') });
      return;
    }
    setBusy(true);
    setSaid({ words: t('backup.opening') });
    try {
      const data = openBackup(await backupFiles().read(name), backupPassword);
      if (!data) {
        setSaid({ words: t('backup.wrongPassword') });
        return;
      }
      await classroomStore().write(data);
      setBackupPassword('');
      setSaid({
        words: t('backup.restored', {
          classrooms: counted(data.classrooms.length, 'classroom'),
          students: counted(data.students.length, 'student'),
          attendance: counted(data.attendance.length, 'record'),
        }),
        file: name,
      });
    } catch {
      setSaid({ words: t('backup.unreadable') });
    } finally {
      setBusy(false);
    }
  }

  const newest = backups[0];

  return (
    <ScrollView
      style={{ flex: 1, direction: dir, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: 20, paddingBottom: space.gap }}
    >
      {/* The screen, and the way back to where the teacher came from. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.gap, paddingBottom: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.back')}
          onPress={onBack}
          style={{ backgroundColor: colors.accentEdge, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 7 }}
        >
          <Text style={{ fontSize: 17, color: colors.accent }}>{dir === 'rtl' ? '→' : '←'}</Text>
        </Pressable>
        <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
          {t('settings.title')}
        </Text>
      </View>

      {/* Whose settings these are. The name is their own record's, read out of it at sign-in. */}
      <View style={{ marginHorizontal: space.gap, marginBottom: space.step, flexDirection: 'row', alignItems: 'center', gap: 12, ...card() }}>
        <View style={{ backgroundColor: colors.accent, borderRadius: 30, paddingHorizontal: 12, paddingVertical: 13 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.onAccent }}>{initialsOf(teacher)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{nameOf(teacher)}</Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>{t('settings.teacher')}</Text>
        </View>
      </View>

      {/* The language the app is in. Pressing one is the whole of it: every screen is redrawn in it
          at once, and the choice is kept on this phone for the next morning. The one marked as the
          default is the one the app opens in when nothing has been pressed here: the phone's own
          language, and none of these four on a phone set to some other language, where the app
          falls back to the English its own words are written in. */}
      <View style={{ marginHorizontal: space.gap, marginBottom: space.step }}>
        <SectionTitle>{t('language.title')}</SectionTitle>
        <View accessibilityRole="radiogroup" style={{ backgroundColor: colors.card, borderRadius: radius.card, padding: 8, ...shadow.card }}>
          {languages.map((language, after) => (
            <View key={language.tag}>
              {after === 0 ? null : <View style={{ borderTopWidth: 1, borderTopColor: colors.hairline, marginHorizontal: 4, marginVertical: 6 }} />}
              <LanguageRow
                language={language}
                words={describe(t, language, language.tag === opensInWithoutAsking())}
                chosen={languageNow() === language.tag}
                choose={() => {
                  void rememberLanguage(language.tag);
                }}
              />
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 12, color: colors.faintest, marginTop: 10, paddingLeft: 4 }}>{t('language.note')}</Text>
      </View>

      <View style={{ marginHorizontal: space.gap, marginBottom: space.step }}>
        <SectionTitle>{t('settings.dataPrivacy')}</SectionTitle>

        {/* What is already true of a teacher's data, in plain facts they can check. */}
        <View style={{ ...card(), marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Mark tint={colors.goodWash}>🔒</Mark>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{t('settings.localStorage')}</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{t('settings.localStorageWords')}</Text>
            </View>
            <View style={{ backgroundColor: colors.goodWash, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.good }}>{t('settings.active')}</Text>
            </View>
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: colors.hairline, marginTop: 14 }} />
          {/* The app's own arithmetic, named as it is: PBKDF2 stretches the password, HMAC-SHA256
              locks and seals what it keeps. It does not say AES, because it does not use AES. */}
          <Fact says={t('settings.standard')} answer={t('privacy.standardValue')} />
          <Fact says={t('settings.externalSync')} answer={t('settings.disabled')} colour={colors.alarm} />
          <Fact
            says={t('settings.lastBackup')}
            answer={newest ? t('settings.backupOn', { when: newest.when || t('settings.saved') }) : t('settings.noBackupYet')}
          />
        </View>

        {/* The backup itself: a file of their own, locked with a password of their own. */}
        <View style={{ ...card(), marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: space.snug }}>
            <Mark tint={colors.accentWash}>💾</Mark>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{t('settings.backupTitle')}</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{t('settings.backupWords')}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 12, color: colors.muted, marginBottom: space.snug }}>{t('settings.backupChoose')}</Text>

          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: space.tight }}>
            {t('settings.backupPassword')}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: radius.field,
              paddingHorizontal: 14,
              paddingVertical: 12,
              marginBottom: space.snug,
            }}
          >
            <Text style={{ fontSize: 15 }}>🔑</Text>
            <TextInput
              accessibilityLabel={t('settings.backupPassword')}
              secureTextEntry={!shown}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={t('settings.backupPasswordPlaceholder')}
              placeholderTextColor={colors.faint}
              value={backupPassword}
              onChangeText={setBackupPassword}
              style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={shown ? t('settings.hideBackupPassword') : t('settings.showBackupPassword')}
              onPress={() => setShown(!shown)}
            >
              <Text style={{ fontSize: 13 }}>👁️</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={createBackup}
            style={{
              alignItems: 'center',
              backgroundColor: colors.accent,
              borderRadius: radius.field,
              paddingVertical: 14,
              opacity: busy ? 0.7 : 1,
              ...shadow.accent,
            }}
          >
            <Text style={{ color: colors.onAccent, fontSize: 15, fontWeight: '700' }}>{t('settings.createBackup')}</Text>
          </Pressable>

          {said ? (
            <View accessibilityRole="alert" style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, color: colors.text }}>{said.words}</Text>
              {said.file ? <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{said.file}</Text> : null}
            </View>
          ) : null}

          <View style={{ borderTopWidth: 1, borderTopColor: colors.hairline, marginTop: space.step, marginBottom: space.snug }} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: space.tight }}>{t('settings.restoreTitle')}</Text>
          {backups.length ? (
            <>
              <Text style={{ fontSize: 12, color: colors.muted, marginBottom: space.snug }}>{t('settings.restoreWords')}</Text>
              {backups.map((backup) => (
                <View
                  key={backup.name}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: space.snug,
                    backgroundColor: colors.background,
                    borderRadius: radius.field,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{backup.name}</Text>
                    {backup.when ? (
                      <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{t('settings.savedWhen', { when: backup.when })}</Text>
                    ) : null}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.restoreNamed', { name: backup.name })}
                    accessibilityState={{ disabled: busy }}
                    disabled={busy}
                    onPress={() => restoreBackup(backup.name)}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.accent,
                      borderRadius: radius.pill,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      opacity: busy ? 0.7 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>{t('settings.restore')}</Text>
                  </Pressable>
                </View>
              ))}
            </>
          ) : (
            <Text style={{ fontSize: 12, color: colors.muted }}>{t('settings.noBackups')}</Text>
          )}
        </View>

        {/* What the app promises about this data, where a teacher can read it. */}
        <View style={{ flexDirection: 'row', gap: 10, backgroundColor: colors.accentWash, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={{ fontSize: 16 }}>💡</Text>
          <Text style={{ flex: 1, fontSize: 12, color: colors.onWash }}>{t('settings.promise')}</Text>
        </View>
      </View>

      <View style={{ marginHorizontal: space.gap, marginBottom: space.step }}>
        <SectionTitle>{t('settings.preferences')}</SectionTitle>
        <View style={{ backgroundColor: colors.card, borderRadius: radius.card, ...shadow.card }}>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
            <Switch
              label={t('settings.darkMode')}
              hint={t('settings.darkModeHint')}
              mark="🌙"
              on={darkMode}
              flip={() => setDarkMode(!darkMode)}
            />
          </View>
          <Switch
            label={t('settings.notifications')}
            hint={t('settings.notificationsHint')}
            mark="🔔"
            on={notifications}
            flip={() => setNotifications(!notifications)}
          />
        </View>
      </View>

      <View style={{ marginHorizontal: space.gap }}>
        <SectionTitle>{t('settings.account')}</SectionTitle>
        <View style={{ backgroundColor: colors.card, borderRadius: radius.card, marginBottom: space.step, ...shadow.card }}>
          <AccountRow mark="👤" says={t('settings.editProfile')} />
          <AccountRow mark="❓" says={t('settings.help')} last />
        </View>

        {/* Logging out, where the prototype puts it: this screen, and no longer Home's avatar. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.logout')}
          onPress={onLogOut}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.alarmEdge,
            borderRadius: radius.card,
            padding: space.step,
            ...shadow.soft,
          }}
        >
          <Text style={{ fontSize: 17, color: colors.alarm }}>⏻</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.alarm }}>{t('settings.logout')}</Text>
        </Pressable>

        <Text style={{ textAlign: 'center', fontSize: 11, color: colors.faintest, marginTop: 18 }}>
          {t('settings.foot', { product: productName() })}
        </Text>
      </View>
    </ScrollView>
  );
}
