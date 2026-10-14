// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClassroomData } from '../lib/classroom-data';
import { accountsIn, keepAccountsIn, lockAccount } from '../lib/local-accounts';
import { keepOnboardingIn, onboardingIn } from '../lib/onboarding';
import { open, takePictureOf } from '../test/screen';
import TheApp from './index';
import { setLanguage } from '../lib/i18n';
import { keepLanguageIn, languageFileWith } from '../lib/language-file';
import { sourceLanguage } from '../lib/languages';

// This check reads the app in the language its own words are written in, so what it proves is about
// the screen and not about a translation. Which language a screen is in, and that every screen
// follows the one a teacher chose, is proved in app/localise-app.test.tsx.
setLanguage(sourceLanguage);
keepLanguageIn(languageFileWith(null));

// The teacher this phone belongs to, the password that opens their own record, and the separate
// password they choose for a backup. The two are never the same thing: a backup leaves the phone in
// a teacher's own keeping, so what locks it is theirs to choose and theirs alone to remember.
const teacher = { email: 'ms.rivera@riversidehigh.edu', name: 'Ms. Rivera' };
const password = 'Spring-2026-attendance';
const backupPassword = 'Lock-my-June-backup';

// Stretching a password is slow on purpose, so a sign-in record made for a check says its own
// smaller number. A backup is made at the app's own number, because what is measured here is the
// file a teacher actually gets.
const checkIterations = 1_000;

// How long a check may take altogether: it is the browser drawing the picture at the end of one
// that is slow, not anything here waiting. See app/land-on-home.test.tsx, which says the same.
const pictureTakesAWhile = 120_000;

/** A classroom's worth of a term, the shape a backup has to carry all of. */
const theClassroomData: ClassroomData = {
  version: 1,
  classrooms: [
    { id: 'c1', name: 'Mathematics', period: 'Period 1', subject: '📐', colour: '#2F6FED' },
    { id: 'c2', name: 'Science', period: 'Period 3', subject: '🔬', colour: '#1FAE63' },
  ],
  students: [
    { id: 's1', classroomId: 'c1', name: 'Amara Okafor' },
    { id: 's2', classroomId: 'c1', name: 'Jonah Pike' },
    { id: 's3', classroomId: 'c2', name: 'Leila Haddad' },
  ],
  attendance: [
    { studentId: 's1', classroomId: 'c1', day: '2025-04-21', mark: 'Present' },
    { studentId: 's2', classroomId: 'c1', day: '2025-04-21', mark: 'Late' },
    { studentId: 's3', classroomId: 'c2', day: '2025-04-21', mark: 'Absent' },
    { studentId: 's1', classroomId: 'c1', day: '2025-04-22', mark: 'Present' },
    { studentId: 's2', classroomId: 'c1', day: '2025-04-22', mark: 'Present' },
  ],
};

/**
 * The pieces this requirement adds, asked for when a check runs rather than when this file loads.
 * This file was pushed before any of them existed, so every check here had to fail on its own line
 * and name what was missing: a file that cannot even load says nothing about any one criterion.
 */
async function parts() {
  const data = await import('../lib/classroom-data');
  const files = await import('../lib/backup-files');
  const backup = await import('../lib/backup');
  return { ...data, ...files, ...backup };
}

/** This phone: the teacher's own account on it, this classroom data in it, these backups beside it. */
async function aPhoneWith(data: ClassroomData, backupsAlreadySaved: Record<string, string> = {}) {
  const { classroomDataIn, keepClassroomDataIn, backupFilesIn, keepBackupFilesIn } = await parts();
  keepAccountsIn(accountsIn([lockAccount({ email: teacher.email, password }, teacher, checkIterations)]));
  // The teacher of this phone has already been welcomed: the first morning's walkthrough is proved
  // in app/complete-onboarding.test.tsx, and what is being read here is what comes after it.
  keepOnboardingIn(onboardingIn(true));
  keepClassroomDataIn(classroomDataIn(data));
  keepBackupFilesIn(backupFilesIn(backupsAlreadySaved));
}

/** The morning the prototype draws, so a backup's own file name is the same one every time. */
function aMondayMorning(): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2025-04-21T08:12:00'));
}

/**
 * A teacher signing in and going to Settings the way they go there: their own avatar opens their
 * profile menu, and Classroom Settings is the option on it that leads here.
 */
async function openSettings() {
  const screen = open(<TheApp />);
  await screen.type(/Email/i, teacher.email);
  await screen.type(/^Password/i, password);
  await screen.press('Log In');
  await screen.press(/Your account/);
  await screen.press('Classroom Settings');
  return screen;
}

afterEach(async () => {
  vi.useRealTimers();
  keepAccountsIn(accountsIn([]));
  try {
    const { classroomDataIn, keepClassroomDataIn, nothingKeptYet, backupFilesIn, keepBackupFilesIn } = await parts();
    keepClassroomDataIn(classroomDataIn(nothingKeptYet()));
    keepBackupFilesIn(backupFilesIn());
  } catch {
    // The pieces are not there yet, so there is nothing of them to put back.
  }
});

describe('Back up data to a file', () => {
  it('Teacher can choose to create an encrypted backup file from Settings.', async () => {
    aMondayMorning();
    await aPhoneWith(theClassroomData);
    const { backupFiles } = await parts();
    const screen = await openSettings();

    // Settings, as the prototype draws it, with what happens to a teacher's data under its own heading.
    const read = screen.text();
    expect(read).toContain('Classroom Settings');
    expect(read).toContain('Data & Privacy');

    // And the choice itself: a password of the teacher's choosing, and the control that makes the file.
    expect(read).toContain('Create Encrypted Backup');
    await screen.type(/Backup password/i, backupPassword);
    await screen.press('Create Encrypted Backup');

    // A file was made on this phone, and the teacher is told which one it is.
    const saved = await backupFiles().saved();
    expect(saved).toEqual(['classme-backup-2025-04-21-081200.classmebackup']);
    expect(screen.text()).toContain('Backup saved');
    expect(screen.text()).toContain(saved[0]);

    // Their backup password went into the file and nowhere else: not left in the field it was typed
    // in, not in the screen's markup, not in any attribute of it.
    expect(screen.field(/Backup password/i).value).toBe('');
    expect(screen.markup()).not.toContain(backupPassword);

    // And Settings works at the phone's largest text size: nothing on it is pinned to a size.
    expect(screen.markup()).not.toMatch(/[;"](height|max-height|line-height)\s*:/);
    expect(screen.markup()).not.toContain('numberOfLines');

    takePictureOf('Back up data to a file > Teacher can choose to create an encrypted backup file from Settings.', screen);
    screen.close();
  }, pictureTakesAWhile);

  it('The backup file contains classroom, student, and attendance data encrypted so it cannot be read without the app.', async () => {
    aMondayMorning();
    await aPhoneWith(theClassroomData);
    const { backupFiles, openBackup } = await parts();

    const screen = await openSettings();
    await screen.type(/Backup password/i, backupPassword);
    await screen.press('Create Encrypted Backup');
    screen.close();

    const [name] = await backupFiles().saved();
    const written = await backupFiles().read(name);

    // Whoever reads the file reads none of it: not a classroom, not a student, not a mark against a
    // student's name, and neither of the two passwords.
    for (const secret of [
      'Mathematics', 'Science', 'Period 1', 'Period 3',
      'Amara Okafor', 'Jonah Pike', 'Leila Haddad',
      'Present', 'Absent', 'Late', '2025-04-22',
      backupPassword, password,
    ]) {
      expect(written, secret).not.toContain(secret);
    }

    // And it is the data itself in there, not a note about it: the app opens it back into every
    // classroom, every student and every attendance record it was made from.
    const opened = openBackup(written, backupPassword);
    expect(opened).toEqual(theClassroomData);
    expect(opened?.classrooms).toHaveLength(2);
    expect(opened?.students).toHaveLength(3);
    expect(opened?.attendance).toHaveLength(5);

    // Without the password that locked it, it opens for nobody — and nor does an edited file.
    expect(openBackup(written, 'Lock-my-June-backu')).toBeNull();
    expect(openBackup(written, '')).toBeNull();
    const edited = written.replace(/("locked":")(.)/, (_all, head, first) => `${head}${first === 'f' ? '0' : 'f'}`);
    expect(edited).not.toBe(written);
    expect(openBackup(edited, backupPassword)).toBeNull();
  }, pictureTakesAWhile);

  it('The backup process does not send data over the internet.', async () => {
    // Nothing on the way from the control to the file has a way off this phone at all.
    for (const file of [
      'app/index.tsx',
      'components/settings-screen.tsx',
      'lib/backup.ts',
      'lib/backup-files.ts',
      'lib/classroom-data.ts',
      'lib/sealed-box.ts',
    ]) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|navigator\.onLine|https?:\/\//);
    }

    // And with every way off this phone taken away, a teacher can still make a backup and read it back.
    aMondayMorning();
    await aPhoneWith(theClassroomData);
    const { backupFiles, openBackup } = await parts();
    const offline = () => {
      throw new Error('a backup must not need the network');
    };
    const plugged = {
      fetch: globalThis.fetch,
      XMLHttpRequest: globalThis.XMLHttpRequest,
      WebSocket: globalThis.WebSocket,
    };
    try {
      Object.assign(globalThis, { fetch: offline, XMLHttpRequest: offline, WebSocket: offline });
      const screen = await openSettings();
      await screen.type(/Backup password/i, backupPassword);
      await screen.press('Create Encrypted Backup');
      expect(screen.text()).toContain('Backup saved');
      screen.close();

      const [name] = await backupFiles().saved();
      expect(openBackup(await backupFiles().read(name), backupPassword)).toEqual(theClassroomData);
    } finally {
      Object.assign(globalThis, plugged);
    }
  }, pictureTakesAWhile);

  it('Teacher can restore data from a previously saved encrypted backup file. — Yes', async () => {
    aMondayMorning();
    const { makeBackup, backupFileName, classroomStore, nothingKeptYet } = await parts();

    // A backup saved weeks ago, and a phone with nothing on it: a replaced phone, or a lost one
    // bought again. All the teacher has is the file and the password they locked it with.
    const savedAt = new Date('2025-03-14T16:45:00');
    const name = backupFileName(savedAt);
    await aPhoneWith(nothingKeptYet(), { [name]: makeBackup(theClassroomData, backupPassword, savedAt) });

    const screen = await openSettings();

    // The backup is there to be chosen, named as it was saved.
    expect(screen.text()).toContain('Restore from a backup');
    expect(screen.text()).toContain(name);

    // The wrong password does not open it, and nothing on the phone is changed by the attempt.
    await screen.type(/Backup password/i, 'Lock-my-July-backup');
    await screen.press(`Restore ${name}`);
    expect(screen.text()).toContain('That password does not open this backup file.');
    expect(await classroomStore().read()).toEqual(nothingKeptYet());

    // The password it was saved with does.
    await screen.type(/Backup password/i, backupPassword);
    await screen.press(`Restore ${name}`);
    const read = screen.text();
    expect(read).toContain('Restored');
    expect(read).toContain('2 classrooms');
    expect(read).toContain('3 students');
    expect(read).toContain('5 attendance records');

    // And the data is back on this phone, every record of it as it was backed up.
    expect(await classroomStore().read()).toEqual(theClassroomData);

    // The password that opened it is not left on the screen either.
    expect(screen.field(/Backup password/i).value).toBe('');
    expect(screen.markup()).not.toContain(backupPassword);

    takePictureOf('Back up data to a file > Teacher can restore data from a previously saved encrypted backup file. — Yes', screen);
    screen.close();
  }, pictureTakesAWhile);
});
