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
// seconds. See app/mark-exceptions.test.tsx, which says the same.
const pictureTakesAWhile = 120_000;

/** The morning this check stands on: a Monday in April, which is a school day. */
const theMorning = new Date('2025-04-21T08:12:00');

/** The adding up of a register this requirement adds, named here so a check can ask for it. */
type SummaryLib = {
  /** The three marks the summary bar adds a class up in, in the order it writes them. */
  summaryMarks: readonly AttendanceMark[];
  /** Every mark a student can stand at, so the bar can be held to covering all of them. */
  markOrder: readonly AttendanceMark[];
  /** The summary bar's own reading of a register: each mark's count, the total, and whether they agree. */
  summaryOfRoster: (
    students: Student[],
    marks: Record<string, AttendanceMark>,
  ) => { counts: { mark: AttendanceMark; many: number }[]; total: number; addsUp: boolean };
  /** Where a register starts, which is what the summary starts from. */
  everyonePresent: (students: Student[]) => Record<string, AttendanceMark>;
  /** One student's mark changed, and nobody else's. */
  markedAs: (
    marks: Record<string, AttendanceMark>,
    studentId: string,
    mark: AttendanceMark,
  ) => Record<string, AttendanceMark>;
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
  const roster = (await import(/* @vite-ignore */ whereTheRosterIs)) as SummaryLib;
  return { ...data, ...stats, ...roster };
}

/** The class the teacher is taking attendance in, and the other they teach the same day. */
const theClassrooms: Classroom[] = [
  { id: 'c-maths', name: 'Mathematics', period: '1st Period', subject: '📐', colour: '#2F6FED' },
  { id: 'c-science', name: 'Science', period: '2nd Period', subject: '🔬', colour: '#1FAE63' },
];

/**
 * The twenty-four students of the first period, as the agreed prototype's own roster names them.
 * Twenty-four is what makes this requirement worth anything: a bar that says 20, 2 and 2 is a
 * teacher's one check that the register under it is the class in front of them.
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
 * so nothing on the phone says what today's counts are and the bar is adding up this teacher's own
 * marks and nothing else.
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

/**
 * The summary bar: the one part of the register that adds the class up, found the way a screen
 * reader finds it — as a named group of its own, and not as three numbers loose among the filters
 * above it, which say counts of their own.
 */
function summaryBar(screen: Screen): HTMLElement {
  const found = [...screen.root().querySelectorAll('[role="group"]')] as HTMLElement[];
  if (found.length !== 1) throw new Error(`${found.length} summary bars on this screen, wanted exactly one`);
  return found[0];
}

/** What the bar says, in the order it says it: each mark, and the number written against it. */
function summaryCounts(screen: Screen): { mark: string; many: number }[] {
  return [...summaryBar(screen).querySelectorAll('[aria-label]')].map((one) => {
    const said = (one.getAttribute('aria-label') ?? '').trim();
    const parsed = /^(.+?):\s*(\d+)$/.exec(said);
    if (!parsed) throw new Error(`the summary bar says ${JSON.stringify(said)}, wanted a mark and its count`);
    return { mark: parsed[1], many: Number(parsed[2]) };
  });
}

/** The bar's count for one mark, or nothing at all if the bar never mentions it. */
function countOn(screen: Screen, mark: string): number | undefined {
  return summaryCounts(screen).find((one) => one.mark === mark)?.many;
}

/** The roster as a person reads it: one row for each student on the screen. */
const rowsOn = (screen: Screen): { name: string; words: string }[] =>
  [...screen.root().querySelectorAll('[role="listitem"]')].map((one) => ({
    name: one.getAttribute('aria-label') ?? '',
    words: visibleText(one.innerHTML),
  }));

/** Which of the three marks a student's row stands at, read off the row itself. */
function markShownFor(screen: Screen, name: string): AttendanceMark {
  const found = rowsOn(screen).filter((one) => one.name === name);
  if (found.length !== 1) throw new Error(`${found.length} rows for ${name} on this screen, wanted exactly one`);
  const standing = (['Present', 'Absent', 'Late'] as const).filter((mark) => found[0].words.includes(mark));
  if (standing.length !== 1) throw new Error(`${name}'s row says ${JSON.stringify(found[0].words)}, wanted one mark`);
  return standing[0];
}

/** Tapping one student's status, the way a teacher's thumb does: found by the student standing on it. */
const tapStatusOf = (screen: Screen, name: string): Promise<void> => screen.press(new RegExp(`^${name}\\b`));

/** A student marked the way the prototype marks them: tapped round until their row says it. */
async function mark(screen: Screen, name: string, wanted: AttendanceMark): Promise<void> {
  for (let taps = 0; taps < 3 && markShownFor(screen, name) !== wanted; taps += 1) await tapStatusOf(screen, name);
  expect(markShownFor(screen, name), name).toBe(wanted);
}

/**
 * The register the agreed prototype draws: Chloe Kim and Tyler Brooks absent, Elena Wright and
 * Quinn Taylor late, and the other twenty present — which is the 20, 2 and 2 on its summary bar.
 */
async function theMorningAsDrawn(screen: Screen): Promise<void> {
  await mark(screen, 'Chloe Kim', 'Absent');
  await mark(screen, 'Tyler Brooks', 'Absent');
  await mark(screen, 'Elena Wright', 'Late');
  await mark(screen, 'Quinn Taylor', 'Late');
}

afterEach(() => {
  vi.useRealTimers();
  keepAccountsIn(accountsIn([]));
});

describe('Review the attendance summary before saving', () => {
  it('A summary bar shows the count of Present, Absent, and Late students.', async () => {
    const screen = await inTheRoster();

    // The bar is at the foot of the register, where the prototype draws it: one named group of its
    // own, so a teacher reading the screen with their ears hears a summary and not three numbers.
    await theMorningAsDrawn(screen);
    expect(summaryCounts(screen)).toEqual([
      { mark: 'Present', many: 20 },
      { mark: 'Absent', many: 2 },
      { mark: 'Late', many: 2 },
    ]);

    // And in the words a person reads off it, in the prototype's own order.
    const read = visibleText(summaryBar(screen).innerHTML);
    expect(read).toContain('Present: 20');
    expect(read).toContain('Absent: 2');
    expect(read).toContain('Late: 2');
    expect(read.indexOf('Present:')).toBeLessThan(read.indexOf('Absent:'));
    expect(read.indexOf('Absent:')).toBeLessThan(read.indexOf('Late:'));

    // It is under the teacher's thumb, beside the way to keep the register, and not inside the
    // part of the screen that scrolls: a summary they have to go looking for is not a check.
    expect(visibleText(summaryBar(screen).parentElement?.innerHTML ?? '')).toContain('Save Attendance');

    // The bar holds no rule of its own: which three marks it adds up, and what each comes to, is
    // lib/roster.ts's, where a check can ask it the same question — and every mark a student can
    // stand at has a column on the bar, so none of them can go uncounted.
    const { summaryMarks, markOrder, summaryOfRoster, everyonePresent, rosterOf, dayText } = await parts();
    expect([...summaryMarks]).toEqual(['Present', 'Absent', 'Late']);
    for (const one of markOrder) expect([...summaryMarks], one).toContain(one);
    const roster = rosterOf(theirTeaching(dayText), 'c-maths');
    expect(summaryOfRoster(roster, everyonePresent(roster)).counts).toEqual([
      { mark: 'Present', many: 24 },
      { mark: 'Absent', many: 0 },
      { mark: 'Late', many: 0 },
    ]);

    // It reads at the phone's largest text size: nothing on it is pinned to a height or cut short.
    expect(screen.markup()).not.toMatch(/[;"](max-height|line-height)\s*:/);
    expect(screen.markup()).not.toContain('numberOfLines');

    takePictureOf(
      'Review the attendance summary before saving > A summary bar shows the count of Present, Absent, and Late students.',
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);

  it('The counts update immediately when a status is changed.', async () => {
    const screen = await inTheRoster();

    // A register opens with the whole class present, and the bar says so before a finger touches it.
    expect(summaryCounts(screen)).toEqual([
      { mark: 'Present', many: 24 },
      { mark: 'Absent', many: 0 },
      { mark: 'Late', many: 0 },
    ]);

    // One tap, and the bar has already moved: nothing is saved, nothing is waited for, and the
    // check reads the screen the instant after the press with nothing settled in between.
    await tapStatusOf(screen, 'Chloe Kim');
    expect(countOn(screen, 'Present')).toBe(23);
    expect(countOn(screen, 'Absent')).toBe(1);
    expect(countOn(screen, 'Late')).toBe(0);

    // A second tap on the same student moves her on to Late, and the bar follows her there: a
    // count that only ever grew would say 1 absent and 1 late for one student.
    await tapStatusOf(screen, 'Chloe Kim');
    expect(countOn(screen, 'Present')).toBe(23);
    expect(countOn(screen, 'Absent')).toBe(0);
    expect(countOn(screen, 'Late')).toBe(1);

    // A third takes her back to Present, and the bar is where it started.
    await tapStatusOf(screen, 'Chloe Kim');
    expect(summaryCounts(screen)).toEqual([
      { mark: 'Present', many: 24 },
      { mark: 'Absent', many: 0 },
      { mark: 'Late', many: 0 },
    ]);

    // The morning as the prototype draws it, built one tap at a time, with the bar read after each.
    await mark(screen, 'Chloe Kim', 'Absent');
    expect(countOn(screen, 'Absent')).toBe(1);
    await mark(screen, 'Tyler Brooks', 'Absent');
    expect(countOn(screen, 'Absent')).toBe(2);
    await mark(screen, 'Elena Wright', 'Late');
    expect(countOn(screen, 'Late')).toBe(1);
    await mark(screen, 'Quinn Taylor', 'Late');
    expect(summaryCounts(screen)).toEqual([
      { mark: 'Present', many: 20 },
      { mark: 'Absent', many: 2 },
      { mark: 'Late', many: 2 },
    ]);

    // The bar adds up the whole class, not the part of it on the screen: asked for only the absent,
    // and with a name typed into the search, it still says what the register as a whole stands at.
    await screen.press('Absent (2)');
    expect(rowsOn(screen).map((one) => one.name)).toEqual(['Chloe Kim', 'Tyler Brooks']);
    expect(summaryCounts(screen)).toEqual([
      { mark: 'Present', many: 20 },
      { mark: 'Absent', many: 2 },
      { mark: 'Late', many: 2 },
    ]);
    await screen.press('All (24)');
    await screen.type('Search students', 'kim');
    expect(rowsOn(screen).map((one) => one.name)).toEqual(['Chloe Kim', 'Hannah Kim']);
    expect(summaryCounts(screen)).toEqual([
      { mark: 'Present', many: 20 },
      { mark: 'Absent', many: 2 },
      { mark: 'Late', many: 2 },
    ]);
    await screen.type('Search students', '');

    // And a mark changed is a mark changed in the summary too, worked out from the marks in hand
    // and never kept beside them: lib/roster.ts says the same of a register a check marks itself.
    const { summaryOfRoster, everyonePresent, markedAs, rosterOf, dayText } = await parts();
    const roster = rosterOf(theirTeaching(dayText), 'c-maths');
    const changed = markedAs(markedAs(everyonePresent(roster), 'c-maths-s1', 'Absent'), 'c-maths-s5', 'Late');
    expect(summaryOfRoster(roster, changed).counts).toEqual([
      { mark: 'Present', many: 22 },
      { mark: 'Absent', many: 1 },
      { mark: 'Late', many: 1 },
    ]);

    takePictureOf(
      'Review the attendance summary before saving > The counts update immediately when a status is changed.',
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);

  it('The summary bar numbers add up to the total number of students in the class.', async () => {
    const screen = await inTheRoster();

    /** The three numbers on the bar, added up the way a teacher checking them does. */
    const addedUp = () => summaryCounts(screen).reduce((all, one) => all + one.many, 0);

    // Twenty-four students in the class, twenty-four rows on the register, and twenty-four on the
    // bar: the count the filter above the roster calls All is what the three add up to.
    expect(theRoster).toHaveLength(24);
    expect(rowsOn(screen)).toHaveLength(24);
    expect(screen.text()).toContain('All (24)');
    expect(addedUp()).toBe(24);

    // And it stays twenty-four however the morning goes: after each of the three marks is given to
    // somebody, after the prototype's own two absent and two late, and with every student in the
    // class marked something other than Present — no name counted twice, and none left out.
    await mark(screen, 'Aaliyah Carter', 'Absent');
    expect(addedUp()).toBe(24);
    await mark(screen, 'Aaliyah Carter', 'Late');
    expect(addedUp()).toBe(24);
    await mark(screen, 'Aaliyah Carter', 'Present');
    expect(addedUp()).toBe(24);

    await theMorningAsDrawn(screen);
    expect(addedUp()).toBe(24);
    expect(summaryCounts(screen).map((one) => one.many)).toEqual([20, 2, 2]);

    for (const student of theRoster) await mark(screen, student.name, 'Late');
    expect(summaryCounts(screen)).toEqual([
      { mark: 'Present', many: 0 },
      { mark: 'Absent', many: 0 },
      { mark: 'Late', many: 24 },
    ]);
    expect(addedUp()).toBe(24);

    // Back to the morning the prototype draws, which is the register this picture is taken of.
    for (const student of theRoster) await mark(screen, student.name, 'Present');
    await theMorningAsDrawn(screen);
    expect(addedUp()).toBe(24);

    // The adding up is lib/roster.ts's, and it says so of itself: the total is the class, the three
    // counts come to it, and a register marked every which way still adds up to the roster it was
    // read from.
    const { summaryOfRoster, everyonePresent, markedAs, markOrder, rosterOf, dayText } = await parts();
    const roster = rosterOf(theirTeaching(dayText), 'c-maths');
    let marks = everyonePresent(roster);
    roster.forEach((student, n) => {
      marks = markedAs(marks, student.id, markOrder[n % markOrder.length]);
    });
    for (const standing of [everyonePresent(roster), marks, {}]) {
      const summary = summaryOfRoster(roster, standing);
      expect(summary.total).toBe(roster.length);
      expect(summary.counts.reduce((all, one) => all + one.many, 0)).toBe(roster.length);
      expect(summary.addsUp).toBe(true);
    }
    // A class with nobody in it adds up to nobody, rather than to a number out of nowhere.
    expect(summaryOfRoster([], {})).toEqual({
      counts: [
        { mark: 'Present', many: 0 },
        { mark: 'Absent', many: 0 },
        { mark: 'Late', many: 0 },
      ],
      total: 0,
      addsUp: true,
    });

    takePictureOf(
      'Review the attendance summary before saving > The summary bar numbers add up to the total number of students in the class.',
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);
});
