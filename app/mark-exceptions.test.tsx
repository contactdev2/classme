// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AttendanceMark, AttendanceRecord, Classroom, ClassroomData, Student } from '../lib/classroom-data';
import { setLanguage } from '../lib/i18n';
import { keepLanguageIn, languageFileWith } from '../lib/language-file';
import { sourceLanguage } from '../lib/languages';
import { accountsIn, keepAccountsIn, lockAccount } from '../lib/local-accounts';
import { keepOnboardingIn, onboardingIn } from '../lib/onboarding';
import { open, settle, takePictureOf, visibleText, type Screen } from '../test/screen';
import TheApp from './index';

// This check reads the app in the language its own words are written in, so what it proves is about
// the screen and not about a translation. Which language a screen is in, and that every screen
// follows the one a teacher chose, is proved in app/localise-app.test.tsx.
setLanguage(sourceLanguage);
keepLanguageIn(languageFileWith(null));

// The teacher this phone belongs to, and the password that opens their own record.
const teacher = { email: 'ms.rivera@riversidehigh.edu', name: 'Ms. Rivera' };
const password = 'Spring-2026-attendance';

// Stretching a password is slow on purpose, so a record made for a check says its own smaller
// number. A record carries the number it was made with, so both open alike.
const checkIterations = 1_000;

// How long a check may take altogether. Nothing here waits on anything — it is the browser that
// draws the picture at the end of each one, and a cold browser on a runner has taken fifteen
// seconds. See app/students-present-by-default.test.tsx, which says the same.
const pictureTakesAWhile = 120_000;

/** The morning this check stands on: a Monday in April, which is a school day. */
const theMorning = new Date('2025-04-21T08:12:00');

/** The changing of one student's mark this requirement adds, named here so a check can ask for it. */
type RosterLib = {
  /** The three marks in the order one press after another takes a student through them. */
  markOrder: readonly AttendanceMark[];
  /** The mark a student lands on when the one they stand at is pressed. */
  nextMarkAfter: (mark: AttendanceMark) => AttendanceMark;
  /** One student's mark changed, and nobody else's: the roster as it stands after a press. */
  markedAs: (
    marks: Record<string, AttendanceMark>,
    studentId: string,
    mark: AttendanceMark,
  ) => Record<string, AttendanceMark>;
  /** Where a register starts, which is what a press changes from. */
  everyonePresent: (students: Student[]) => Record<string, AttendanceMark>;
  /** The students of one class, in the order a register is read in. */
  rosterOf: (data: ClassroomData, classroomId: string) => Student[];
};

/**
 * The pieces this requirement adds, asked for when a check runs rather than when this file loads —
 * and asked for by a name nothing can resolve before it is run, so that this file loaded on the
 * push that had no implementation behind it and every check in it failed on its own line, naming
 * what was missing. A file that cannot even load says nothing about any one criterion.
 */
async function parts() {
  const data = await import('../lib/classroom-data');
  const stats = await import('../lib/attendance-stats');
  const whereTheRosterIs = `${'../lib/roster'}`;
  const roster = (await import(/* @vite-ignore */ whereTheRosterIs)) as RosterLib;
  return { ...data, ...stats, ...roster };
}

/** The class the teacher is taking attendance in, and the others they teach the same day. */
const theClassrooms: Classroom[] = [
  { id: 'c-maths', name: 'Mathematics', period: '1st Period', subject: '📐', colour: '#2F6FED' },
  { id: 'c-science', name: 'Science', period: '2nd Period', subject: '🔬', colour: '#1FAE63' },
];

/**
 * The twenty-four students of the first period, as the agreed prototype's own roster names them.
 * Chloe Kim and Elena Wright are among them, because this requirement's own criteria are about
 * what their two rows say once a teacher has marked them.
 */
const theRoster: Student[] = [
  'Chloe Kim',
  'Aaliyah Carter',
  'Daniel Ortiz',
  'Brandon Lee',
  'Elena Wright',
  'Ethan Park',
  'Gabriel Reyes',
  'Fiona Davis',
  'Hannah Kim',
  'Isaac Brown',
  'Kevin Nguyen',
  'Julia Smith',
  'Liam Johnson',
  'Noah Patel',
  'Mia Rodriguez',
  'Olivia Chen',
  'Quinn Taylor',
  'Parker Jones',
  'Riley Scott',
  'Tyler Brooks',
  'Sofia Martinez',
  'Victor Cruz',
  'Uma Shah',
  'Wendy Lopez',
].map((name, n) => ({ id: `c-maths-s${n + 1}`, classroomId: 'c-maths', name }));

/**
 * A term of marks behind this class, every one of them before today. Today has not been taken yet,
 * so nothing on the phone says what today's marks are and every change a teacher makes here is
 * their own.
 */
function theTermBehindThem(dayText: (day: Date) => string): AttendanceRecord[] {
  const marks: AttendanceRecord[] = [];
  for (let back = 1; back <= 10; back += 1) {
    const day = new Date(theMorning.getFullYear(), theMorning.getMonth(), theMorning.getDate() - back);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    theRoster.forEach((student, n) => {
      marks.push({
        studentId: student.id,
        classroomId: 'c-maths',
        day: dayText(day),
        mark: (n + back) % 20 === 0 ? 'Absent' : 'Present',
      });
    });
  }
  return marks;
}

/** Everything this phone knows about this teacher's teaching. */
function theirTeaching(dayText: (day: Date) => string): ClassroomData {
  return { version: 1, classrooms: theClassrooms, students: theRoster, attendance: theTermBehindThem(dayText) };
}

/** The morning the prototype draws, so the date on the screen is the same one every time. */
function aMondayMorning(): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(theMorning);
}

/** A teacher arriving at the app and signing in with their own email and password. */
async function signIn(): Promise<Screen> {
  const screen = open(<TheApp />);
  await screen.type(/Email/i, teacher.email);
  await screen.type(/^Password/i, password);
  await screen.press('Log In');
  await settle();
  return screen;
}

/** Signed in, and standing in Take Attendance: the place the app's own bottom row calls Attendance. */
async function inTheRoster(): Promise<Screen> {
  aMondayMorning();
  const { classroomDataIn, keepClassroomDataIn, dayText } = await parts();
  keepAccountsIn(accountsIn([lockAccount({ email: teacher.email, password }, teacher, checkIterations)]));
  // The teacher of this phone has already been welcomed: the first morning's walkthrough is proved
  // in app/complete-onboarding.test.tsx, and what is being read here is what comes after it.
  keepOnboardingIn(onboardingIn(true));
  keepClassroomDataIn(classroomDataIn(theirTeaching(dayText)));
  const screen = await signIn();
  await screen.press('Attendance');
  await settle();
  return screen;
}

/** The roster as a person reads it: one row for each student, with what each row says on it. */
const rowsOn = (screen: Screen): { name: string; words: string }[] =>
  [...screen.root().querySelectorAll('[role="listitem"]')].map((one) => ({
    name: one.getAttribute('aria-label') ?? '',
    words: visibleText(one.innerHTML),
  }));

/** What one student's own row says, found the way a teacher finds it: by their name on it. */
function rowFor(screen: Screen, name: string): string {
  const found = rowsOn(screen).filter((one) => one.name === name);
  if (found.length !== 1) throw new Error(`${found.length} rows for ${name} on this screen, wanted exactly one`);
  return found[0].words;
}

/** Which of the three marks that student's row stands at, read off the row itself. */
function markShownFor(screen: Screen, name: string): AttendanceMark {
  const words = rowFor(screen, name);
  const standing = (['Present', 'Absent', 'Late'] as const).filter((mark) => words.includes(mark));
  if (standing.length !== 1) throw new Error(`${name}'s row says ${JSON.stringify(words)}, wanted exactly one mark`);
  return standing[0];
}

/**
 * Tapping one student's status button, the way a teacher's thumb does: the button is found by the
 * student standing on it, so pressing Chloe Kim's cannot press anybody else's.
 */
const tapStatusOf = (screen: Screen, name: string): Promise<void> => screen.press(new RegExp(`^${name}\\b`));

afterEach(() => {
  vi.useRealTimers();
  keepAccountsIn(accountsIn([]));
});

describe('Mark exceptions like Absent or Late', () => {
  it("Tapping a student's status button changes it to Absent, Late, or Present.", async () => {
    const screen = await inTheRoster();

    // Every student on the roster has a status to tap, and it says out loud that it is a button:
    // a teacher reading the screen with their ears is told there is something to press.
    const statuses = [...screen.root().querySelectorAll('[role="listitem"] [role="button"]')];
    expect(statuses).toHaveLength(24);
    for (const student of theRoster) {
      const named = statuses.filter((one) => (one.getAttribute('aria-label') ?? '').includes(student.name));
      expect(named, student.name).toHaveLength(1);
    }

    // One student, tapped three times: Present to Absent, Absent to Late, and Late back to Present.
    // All three marks are reachable with a thumb, which is the whole of this criterion.
    const student = 'Aaliyah Carter';
    expect(markShownFor(screen, student)).toBe('Present');
    await tapStatusOf(screen, student);
    expect(markShownFor(screen, student)).toBe('Absent');
    await tapStatusOf(screen, student);
    expect(markShownFor(screen, student)).toBe('Late');
    await tapStatusOf(screen, student);
    expect(markShownFor(screen, student)).toBe('Present');

    // And nobody else moved with them: a tap is one student's mark and no part of anybody else's.
    await tapStatusOf(screen, student);
    expect(markShownFor(screen, student)).toBe('Absent');
    for (const other of theRoster.filter((one) => one.name !== student)) {
      expect(markShownFor(screen, other.name), other.name).toBe('Present');
    }

    // The counts follow the taps, in the filters above the roster and at the foot of the screen.
    const read = screen.text();
    expect(read).toContain('All (24)');
    expect(read).toContain('Present (23)');
    expect(read).toContain('Absent (1)');
    expect(read).toContain('Late (0)');
    expect(read).toContain('Present: 23');
    expect(read).toContain('Absent: 1');
    expect(read).toContain('Late: 0');

    // The screen holds no rule of its own about any of this: the round of three marks and the
    // changing of one student's are lib/roster.ts's, where a check can ask them the same questions.
    const { markOrder, nextMarkAfter, markedAs, everyonePresent, rosterOf, dayText } = await parts();
    expect([...markOrder]).toEqual(['Present', 'Absent', 'Late']);
    expect(nextMarkAfter('Present')).toBe('Absent');
    expect(nextMarkAfter('Absent')).toBe('Late');
    expect(nextMarkAfter('Late')).toBe('Present');
    const roster = rosterOf(theirTeaching(dayText), 'c-maths');
    const changed = markedAs(everyonePresent(roster), 'c-maths-s1', 'Late');
    expect(changed['c-maths-s1']).toBe('Late');
    expect(Object.values(changed).filter((one) => one !== 'Present')).toEqual(['Late']);

    // It works at the phone's largest text size: nothing on it is pinned to a size, and nothing it
    // says is cut short after so many lines.
    expect(screen.markup()).not.toMatch(/[;"](max-height|line-height)\s*:/);
    expect(screen.markup()).not.toContain('numberOfLines');

    takePictureOf(
      "Mark exceptions like Absent or Late > Tapping a student's status button changes it to Absent, Late, or Present.",
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);

  it("Changing Chloe Kim's status to Absent updates her row to show Absent.", async () => {
    const screen = await inTheRoster();

    // Chloe Kim is on the roster, present like everybody else, until the teacher says otherwise.
    expect(markShownFor(screen, 'Chloe Kim')).toBe('Present');

    // The teacher taps her status once, which is what marks a student absent.
    await tapStatusOf(screen, 'Chloe Kim');

    // Her own row now says Absent, and says nothing else: not Present, and not Late.
    const hers = rowFor(screen, 'Chloe Kim');
    expect(hers).toContain('Chloe Kim');
    expect(hers).toContain('Absent');
    expect(hers).not.toContain('Present');
    expect(hers).not.toContain('Late');
    expect(markShownFor(screen, 'Chloe Kim')).toBe('Absent');

    // Hannah Kim, who shares her surname, was not marked by that tap, and nor was anybody else.
    expect(markShownFor(screen, 'Hannah Kim')).toBe('Present');
    for (const other of theRoster.filter((one) => one.name !== 'Chloe Kim')) {
      expect(markShownFor(screen, other.name), other.name).toBe('Present');
    }

    // The class is now twenty-three present and one absent, and the screen says so both ways.
    const read = screen.text();
    expect(read).toContain('Present (23)');
    expect(read).toContain('Absent (1)');
    expect(read).toContain('Present: 23');
    expect(read).toContain('Absent: 1');

    // And asked for the absent, the screen hands back her and nobody else.
    await screen.press('Absent (1)');
    expect(rowsOn(screen).map((one) => one.name)).toEqual(['Chloe Kim']);
    await screen.press('All (24)');

    takePictureOf(
      "Mark exceptions like Absent or Late > Changing Chloe Kim's status to Absent updates her row to show Absent.",
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);

  it("Changing Elena Wright's status to Late updates her row to show Late.", async () => {
    const screen = await inTheRoster();

    expect(markShownFor(screen, 'Elena Wright')).toBe('Present');

    // Late is the mark after Absent, so two taps is what a teacher gives the student who arrives
    // after the bell.
    await tapStatusOf(screen, 'Elena Wright');
    expect(markShownFor(screen, 'Elena Wright')).toBe('Absent');
    await tapStatusOf(screen, 'Elena Wright');

    // Her own row now says Late, and says nothing else.
    const hers = rowFor(screen, 'Elena Wright');
    expect(hers).toContain('Elena Wright');
    expect(hers).toContain('Late');
    expect(hers).not.toContain('Present');
    expect(hers).not.toContain('Absent');
    expect(markShownFor(screen, 'Elena Wright')).toBe('Late');

    for (const other of theRoster.filter((one) => one.name !== 'Elena Wright')) {
      expect(markShownFor(screen, other.name), other.name).toBe('Present');
    }

    // Both exceptions together, as the agreed prototype draws this register: Chloe Kim absent,
    // Elena Wright late, and the other twenty-two present.
    await tapStatusOf(screen, 'Chloe Kim');
    expect(markShownFor(screen, 'Chloe Kim')).toBe('Absent');
    expect(markShownFor(screen, 'Elena Wright')).toBe('Late');
    const read = screen.text();
    expect(read).toContain('Present (22)');
    expect(read).toContain('Absent (1)');
    expect(read).toContain('Late (1)');
    expect(read).toContain('Present: 22');
    expect(read).toContain('Absent: 1');
    expect(read).toContain('Late: 1');

    // And asked for the late, the screen hands back her and nobody else.
    await screen.press('Late (1)');
    expect(rowsOn(screen).map((one) => one.name)).toEqual(['Elena Wright']);
    await screen.press('All (24)');

    takePictureOf(
      "Mark exceptions like Absent or Late > Changing Elena Wright's status to Late updates her row to show Late.",
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);
});
