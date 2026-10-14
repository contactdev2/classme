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
// seconds. See app/browse-classes.test.tsx, which says the same.
const pictureTakesAWhile = 120_000;

/** The morning this check stands on: a Monday in April, which is a school day. */
const theMorning = new Date('2025-04-21T08:12:00');

/** The reading of a roster this requirement adds, named here so a check can ask for it by hand. */
type RosterLib = {
  /** The mark every student on a roster starts at. */
  markToStartWith: AttendanceMark;
  /** The students of one class, in the order a register is read in. */
  rosterOf: (data: ClassroomData, classroomId: string) => Student[];
  /** What a roster is marked as when it opens: every one of them the same. */
  everyonePresent: (students: Student[]) => Record<string, AttendanceMark>;
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
  { id: 'c-english', name: 'English', period: '3rd Period', subject: '💬', colour: '#9B59D0' },
];

/**
 * The twenty-four students of the first period, as the agreed prototype's own roster names them.
 * They are handed to the phone in no particular order on purpose: the order a teacher reads them
 * in is the screen's to decide, and this check holds it to the one a register is read in.
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

/** Everybody the teacher teaches in their other classes: not one of them belongs on this roster. */
const theOthers: Student[] = [
  { id: 'c-science-s1', classroomId: 'c-science', name: 'Amara Okafor' },
  { id: 'c-science-s2', classroomId: 'c-science', name: 'Jonah Pike' },
  { id: 'c-english-s1', classroomId: 'c-english', name: 'Leila Haddad' },
];

/** The names of a roster, in the order a register is read in. */
const inRegisterOrder = (students: Student[]): string[] => students.map((one) => one.name).sort((one, other) => one.localeCompare(other));

/**
 * A term of marks behind this class, every one of them before today. Today has not been taken yet
 * — that is the whole point of the screen — so nothing on the phone says what today's marks are.
 */
function theTermBehindThem(dayText: (day: Date) => string): AttendanceRecord[] {
  const marks: AttendanceRecord[] = [];
  for (let back = 1; back <= 20; back += 1) {
    const day = new Date(theMorning.getFullYear(), theMorning.getMonth(), theMorning.getDate() - back);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    theRoster.forEach((student, n) => {
      const nth = (n + back) % 20;
      marks.push({
        studentId: student.id,
        classroomId: 'c-maths',
        day: dayText(day),
        mark: nth === 0 ? 'Absent' : nth === 1 ? 'Late' : 'Present',
      });
    });
  }
  return marks;
}

/** Everything this phone knows about this teacher's teaching. */
function theirTeaching(dayText: (day: Date) => string, students: Student[] = theRoster): ClassroomData {
  return {
    version: 1,
    classrooms: theClassrooms,
    students: [...students, ...theOthers],
    attendance: theTermBehindThem(dayText),
  };
}

/** The morning the prototype draws, so the date on the screen is the same one every time. */
function aMondayMorning(): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(theMorning);
}

/** This phone: the teacher's own account on it, and their own classes, students and marks in it. */
async function aPhoneWithTheirClasses(students: Student[] = theRoster): Promise<void> {
  const { classroomDataIn, keepClassroomDataIn, dayText } = await parts();
  keepAccountsIn(accountsIn([lockAccount({ email: teacher.email, password }, teacher, checkIterations)]));
  // The teacher of this phone has already been welcomed: the first morning's walkthrough is proved
  // in app/complete-onboarding.test.tsx, and what is being read here is what comes after it.
  keepOnboardingIn(onboardingIn(true));
  keepClassroomDataIn(classroomDataIn(theirTeaching(dayText, students)));
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
async function inTheRoster(students: Student[] = theRoster): Promise<Screen> {
  aMondayMorning();
  await aPhoneWithTheirClasses(students);
  const screen = await signIn();
  await screen.press(/^Attendance$/);
  await settle();
  return screen;
}

/** The roster as a person reads it: one row for each student, with what each row says on it. */
const rowsOn = (screen: Screen): { name: string; words: string }[] =>
  [...screen.root().querySelectorAll('[role="listitem"]')].map((one) => ({
    name: one.getAttribute('aria-label') ?? '',
    words: visibleText(one.innerHTML),
  }));

afterEach(() => {
  vi.useRealTimers();
  keepAccountsIn(accountsIn([]));
});

describe('See every student marked Present by default', () => {
  it('The roster lists all 24 students in the class.', async () => {
    const screen = await inTheRoster();

    // The teacher is on the screen where attendance is taken, in the class they are teaching.
    const read = screen.text();
    expect(read).toContain('Take Attendance');
    expect(read).toContain('Mathematics');
    expect(read).toContain('1st Period');

    // And every one of the twenty-four is on it, each with a row of their own.
    const rows = rowsOn(screen);
    expect(rows).toHaveLength(24);
    expect(rows.map((one) => one.name)).toEqual(inRegisterOrder(theRoster));
    for (const student of theRoster) expect(read, student.name).toContain(student.name);

    // The screen says how many that is, counted and not written in: twenty-four.
    expect(read).toContain('All (24)');

    // It works at the phone's largest text size: nothing on it is pinned to a size, and nothing it
    // says is cut short after so many lines.
    expect(screen.markup()).not.toMatch(/[;"](max-height|line-height)\s*:/);
    expect(screen.markup()).not.toContain('numberOfLines');

    takePictureOf('See every student marked Present by default > The roster lists all 24 students in the class.', screen);
    screen.close();
  }, pictureTakesAWhile);

  it("Each student's status starts as Present.", async () => {
    const screen = await inTheRoster();

    // Nothing has been pressed: every row on the roster already stands at Present, and not one of
    // them says Absent or Late.
    const rows = rowsOn(screen);
    expect(rows).toHaveLength(24);
    for (const row of rows) {
      expect(row.words, row.name).toContain('Present');
      expect(row.words, row.name).not.toContain('Absent');
      expect(row.words, row.name).not.toContain('Late');
    }

    // The counts agree with the rows, in the filters above them and at the foot of the screen.
    const read = screen.text();
    expect(read).toContain('Present (24)');
    expect(read).toContain('Absent (0)');
    expect(read).toContain('Late (0)');
    expect(read).toContain('Present: 24');
    expect(read).toContain('Absent: 0');
    expect(read).toContain('Late: 0');

    // Asked for the ones marked Present, it is the whole class; asked for the other two, nobody.
    await screen.press('Present (24)');
    expect(rowsOn(screen)).toHaveLength(24);
    await screen.press('Absent (0)');
    expect(rowsOn(screen)).toHaveLength(0);
    await screen.press('Late (0)');
    expect(rowsOn(screen)).toHaveLength(0);
    await screen.press('All (24)');
    expect(rowsOn(screen)).toHaveLength(24);

    // And none of that was read off a mark on the phone: today has not been taken yet, so there is
    // no record of it to read. Present is where a roster starts, which is what the screen shows.
    const { dayText, everyonePresent, markToStartWith, rosterOf } = await parts();
    const data = theirTeaching(dayText);
    expect(data.attendance.some((one) => one.day === dayText(theMorning))).toBe(false);
    expect(markToStartWith).toBe('Present');
    expect(Object.values(everyonePresent(rosterOf(data, 'c-maths')))).toEqual(Array.from({ length: 24 }, () => 'Present'));

    takePictureOf("See every student marked Present by default > Each student's status starts as Present.", screen);
    screen.close();
  }, pictureTakesAWhile);

  it('The list matches the class roster stored for that class.', async () => {
    const screen = await inTheRoster();

    // Every name on the screen is a student this phone keeps in this class, and every student it
    // keeps in this class is on the screen.
    expect(rowsOn(screen).map((one) => one.name)).toEqual(inRegisterOrder(theRoster));

    // Nobody the teacher teaches in another class is on this one's roster.
    for (const other of theOthers) expect(screen.text(), other.name).not.toContain(other.name);

    // The roster is read off the phone and nowhere else: a student removed from the class, and
    // another added to it, and the screen is the class as the phone now keeps it.
    const { rosterOf, dayText } = await parts();
    const changed = [
      ...theRoster.filter((one) => one.name !== 'Wendy Lopez'),
      { id: 'c-maths-s25', classroomId: 'c-maths', name: 'Aaron Adeyemi' },
    ];
    expect(rosterOf(theirTeaching(dayText, changed), 'c-maths').map((one) => one.name)).toEqual(inRegisterOrder(changed));

    screen.close();
    const again = await inTheRoster(changed);
    const names = rowsOn(again).map((one) => one.name);
    expect(names).toEqual(inRegisterOrder(changed));
    expect(names).toHaveLength(24);
    expect(names).toContain('Aaron Adeyemi');
    expect(names).not.toContain('Wendy Lopez');

    takePictureOf(
      'See every student marked Present by default > The list matches the class roster stored for that class.',
      again,
    );
    again.close();
  }, pictureTakesAWhile);
});
