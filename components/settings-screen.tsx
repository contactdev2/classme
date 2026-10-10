import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { backupFileName, backupMadeAt, makeBackup, openBackup } from '../lib/backup';
import { backupFiles } from '../lib/backup-files';
import { classroomStore } from '../lib/classroom-data';
import { initialsOf, nameOf } from '../lib/greeting';
import type { TeacherProfile } from '../lib/local-accounts';
import { productName } from '../lib/product';
import { colors, radius, shadow, space } from '../lib/theme';

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

const card = {
  backgroundColor: colors.card,
  borderRadius: radius.card,
  padding: space.step,
  ...shadow.card,
} as const;

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
function Switch({ label, hint, on, flip }: { label: string; hint: string; on: boolean; flip: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      onPress={flip}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: space.step }}
    >
      <Mark tint={colors.accentWash}>{label === 'Dark Mode' ? '🌙' : '🔔'}</Mark>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{label}</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>{hint}</Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: on ? 'flex-end' : 'flex-start',
          backgroundColor: on ? colors.accent : '#D7E3F7',
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
        ...(last ? {} : { borderBottomWidth: 1, borderBottomColor: '#F0F3F8' }),
      }}
    >
      <Mark tint={colors.accentWash}>{mark}</Mark>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text }}>{says}</Text>
      <Text style={{ fontSize: 14, color: '#B7C3D1' }}>›</Text>
    </View>
  );
}

/** How many of a thing there are, in the words a person would use for that many. */
const counted = (many: number, thing: string) => `${many} ${thing}${many === 1 ? '' : 's'}`;

/** The day a backup was made, as a teacher reads it, or nothing when the file will not say. */
function savedOn(file: string): string {
  const madeAt = backupMadeAt(file);
  if (!madeAt) return '';
  const when = new Date(madeAt);
  return Number.isNaN(when.getTime()) ? '' : when.toDateString();
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
      setSaid({ words: 'Choose a backup password of at least 8 characters. Only this password opens the file.' });
      return;
    }
    setBusy(true);
    setSaid({ words: 'Making your backup…' });
    try {
      const data = await classroomStore().read();
      const madeAt = new Date();
      const name = await backupFiles().save(backupFileName(madeAt), makeBackup(data, backupPassword, madeAt));
      // Typed once and not left on the screen: nobody reading over a shoulder reads it back.
      setBackupPassword('');
      setSaid({
        words: `Backup saved to ${backupFiles().where()}. It holds ${counted(data.classrooms.length, 'classroom')}, ${counted(
          data.students.length,
          'student',
        )} and ${counted(data.attendance.length, 'attendance record')}.`,
        file: name,
      });
      await readTheFolder();
    } catch {
      // Never in the words of the thing that failed, and never with any of what was typed in it.
      setSaid({ words: 'That backup could not be saved just now. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  /** Puts a backup saved before back on this phone, if the password given opens it. */
  async function restoreBackup(name: string) {
    if (busy) return;
    if (!backupPassword) {
      setSaid({ words: 'Enter the password this backup was saved with.' });
      return;
    }
    setBusy(true);
    setSaid({ words: 'Opening your backup…' });
    try {
      const data = openBackup(await backupFiles().read(name), backupPassword);
      if (!data) {
        setSaid({ words: 'That password does not open this backup file.' });
        return;
      }
      await classroomStore().write(data);
      setBackupPassword('');
      setSaid({
        words: `Restored ${counted(data.classrooms.length, 'classroom')}, ${counted(data.students.length, 'student')} and ${counted(
          data.attendance.length,
          'attendance record',
        )} from this backup.`,
        file: name,
      });
    } catch {
      setSaid({ words: 'That backup file could not be read. Try another one.' });
    } finally {
      setBusy(false);
    }
  }

  const newest = backups[0];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: 20, paddingBottom: space.gap }}>
      {/* The screen, and the way back to where the teacher came from. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.gap, paddingBottom: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
          onPress={onBack}
          style={{ backgroundColor: '#DCE8FB', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 7 }}
        >
          <Text style={{ fontSize: 17, color: colors.accent }}>←</Text>
        </Pressable>
        <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
          Classroom Settings
        </Text>
      </View>

      {/* Whose settings these are. The name is their own record's, read out of it at sign-in. */}
      <View style={{ marginHorizontal: space.gap, marginBottom: space.step, flexDirection: 'row', alignItems: 'center', gap: 12, ...card }}>
        <View style={{ backgroundColor: colors.accent, borderRadius: 30, paddingHorizontal: 12, paddingVertical: 13 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.onAccent }}>{initialsOf(teacher)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{nameOf(teacher)}</Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>Teacher</Text>
        </View>
      </View>

      <View style={{ marginHorizontal: space.gap, marginBottom: space.step }}>
        <SectionTitle>Data &amp; Privacy</SectionTitle>

        {/* What is already true of a teacher's data, in plain facts they can check. */}
        <View style={{ ...card, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Mark tint="#E4F8ED">🔒</Mark>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Local Encrypted Storage</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>All classroom data is encrypted on-device</Text>
            </View>
            <View style={{ backgroundColor: '#E4F8ED', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1FAE63' }}>Active</Text>
            </View>
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: '#F0F3F8', marginTop: 14 }} />
          {/* The app's own arithmetic, named as it is: PBKDF2 stretches the password, HMAC-SHA256
              locks and seals what it keeps. It does not say AES, because it does not use AES. */}
          <Fact says="Encryption Standard" answer="PBKDF2 · HMAC-SHA256" />
          <Fact says="External Sync" answer="Disabled" colour="#E0574A" />
          <Fact says="Last Backup" answer={newest ? `${newest.when || 'Saved'} · on this device` : 'None yet · on device only'} />
        </View>

        {/* The backup itself: a file of their own, locked with a password of their own. */}
        <View style={{ ...card, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: space.snug }}>
            <Mark tint={colors.accentWash}>💾</Mark>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Encrypted Backup File</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                Keeps your classrooms, students and attendance if this phone is lost or replaced
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 12, color: colors.muted, marginBottom: space.snug }}>
            Choose a password for the file. Only that password opens it — the app keeps no copy of it, and the
            backup is written to this phone and sent nowhere.
          </Text>

          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: space.tight }}>Backup password</Text>
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
              accessibilityLabel="Backup password"
              secureTextEntry={!shown}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="A password only you know"
              placeholderTextColor={colors.faint}
              value={backupPassword}
              onChangeText={setBackupPassword}
              style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={shown ? 'Hide backup password' : 'Show backup password'}
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
            <Text style={{ color: colors.onAccent, fontSize: 15, fontWeight: '700' }}>Create Encrypted Backup</Text>
          </Pressable>

          {said ? (
            <View accessibilityRole="alert" style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, color: colors.text }}>{said.words}</Text>
              {said.file ? <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{said.file}</Text> : null}
            </View>
          ) : null}

          <View style={{ borderTopWidth: 1, borderTopColor: '#F0F3F8', marginTop: space.step, marginBottom: space.snug }} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: space.tight }}>Restore from a backup</Text>
          {backups.length ? (
            <>
              <Text style={{ fontSize: 12, color: colors.muted, marginBottom: space.snug }}>
                Enter the password a backup was saved with, then restore it. What is on this phone now is replaced
                by what is in the file.
              </Text>
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
                    {backup.when ? <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>Saved {backup.when}</Text> : null}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Restore ${backup.name}`}
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
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>Restore</Text>
                  </Pressable>
                </View>
              ))}
            </>
          ) : (
            <Text style={{ fontSize: 12, color: colors.muted }}>
              No backup files on this phone yet. The ones you make show here, ready to restore.
            </Text>
          )}
        </View>

        {/* What the app promises about this data, where a teacher can read it. */}
        <View style={{ flexDirection: 'row', gap: 10, backgroundColor: colors.accentWash, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={{ fontSize: 16 }}>💡</Text>
          <Text style={{ flex: 1, fontSize: 12, color: '#3E536B' }}>
            Your student and attendance data never leaves this device. Everything is stored in a secure local database.
          </Text>
        </View>
      </View>

      <View style={{ marginHorizontal: space.gap, marginBottom: space.step }}>
        <SectionTitle>Preferences</SectionTitle>
        <View style={{ backgroundColor: colors.card, borderRadius: radius.card, ...shadow.card }}>
          <View style={{ borderBottomWidth: 1, borderBottomColor: '#F0F3F8' }}>
            <Switch label="Dark Mode" hint="Easier viewing in low light" on={darkMode} flip={() => setDarkMode(!darkMode)} />
          </View>
          <Switch
            label="Notifications"
            hint="Attendance reminders &amp; alerts"
            on={notifications}
            flip={() => setNotifications(!notifications)}
          />
        </View>
      </View>

      <View style={{ marginHorizontal: space.gap }}>
        <SectionTitle>Account</SectionTitle>
        <View style={{ backgroundColor: colors.card, borderRadius: radius.card, marginBottom: space.step, ...shadow.card }}>
          <AccountRow mark="👤" says="Edit Profile" />
          <AccountRow mark="❓" says="Help &amp; Support" last />
        </View>

        {/* Logging out, where the prototype puts it: this screen, and no longer Home's avatar. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Logout"
          onPress={onLogOut}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: '#FCE1DE',
            borderRadius: radius.card,
            padding: space.step,
            ...shadow.soft,
          }}
        >
          <Text style={{ fontSize: 17, color: '#E0574A' }}>⏻</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#E0574A' }}>Logout</Text>
        </Pressable>

        <Text style={{ textAlign: 'center', fontSize: 11, color: '#9AA8B8', marginTop: 18 }}>
          {productName()} v1.0 · Data stored securely on this device
        </Text>
      </View>
    </ScrollView>
  );
}
