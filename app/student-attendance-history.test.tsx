// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AttendanceMark, AttendanceRecord, Classroom, ClassroomData, Student } from '../lib/classroom-data';
import { setLanguage } from '../lib/i18n';
import { keepLanguageIn, languageFileWith } from '../lib/language-file';
import { sourceLanguage } from '../lib/languages';
import { accountsIn, keepAccountsIn, lockAccount } from '../lib/local-accounts';
import { keepOnboardingIn, onboardingIn } from '../lib/onboarding';
import { open, settle, takePictureOf, type Screen } from '../test/screen';
import TheApp from './index';

// This check reads the app in the language its own words are written in, so what it proves is about
// the screen and not about a translation. Which language a screen is in, and that every screen
// follows the one a teacher chose, is proved in app/localise-app.test.tsx.
setLanguage(sourceLanguage);
keepLanguageIn(languageFileWith(null));

/** The teacher this phone belongs to, and the password that opens their own record. */
const teacher = { email: 'ms.rivera@riversidehigh.edu', name: 'Ms. Rivera' };
const password = 'Spring-2026-attendance';

// Stretching a password is slow on purpose, so a record made for a check says its own smaller
// number. A record carries the number it was made with, so both open alike.
const checkIterations = 1_000;

// How long a check may take altogether. Nothing here waits on anything — it is the browser that
// draws the picture at the end of each one, and a cold browser on a runner has taken fifteen
// seconds. See app/save-attendance.test.tsx, which says the same.
const pictureTakesAWhile = 120_000;

/** The morning this check stands on: a Monday in April, which is a school day. */
const theMorning = new Date('2025-04-21T08:12:00');

/** One day of one student's attendance, as their own history reads it. */
type HistoryDay = { day: string; mark: AttendanceMark };

/** What a stretch of one student's days adds up to. */
type HistoryTally = { present: number; absent: number; late: number; total: number; rate: number };

/** One month of a student's history, with the days of it inside. */
type HistoryMonth = { year: number; month: number; days: HistoryDay[] };

/** The reading of one student's history this requirement adds, named so a check can ask it by hand. */
type HistoryLib = {
  /** The student this id belongs to, or nothing where the phone knows no such student. */
  studentWithId: (data: ClassroomData, studentId: string) => Student | null;
  /** Every day the phone has a mark against one student's name, the day most recently taken first. */
  historyOf: (data: ClassroomData, studentId: string) => HistoryDay[];
  /** What those days add up to: how many of each mark, and the share of them present. */
  tallyOfHistory: (days: HistoryDay[]) => HistoryTally;
  /** The handful of days a profile shows before 'View All'. */
  recentDays: (days: HistoryDay[], many?: number) => HistoryDay[];
  /** The whole of a history, gathered into the months its days fall in, the latest month first. */
  historyByMonth: (days: HistoryDay[]) => HistoryMonth[];
};

/**
 * The pieces this requirement adds, asked for when a check runs rather than when this file loads —
 * and asked for by a name nothing can resolve before it is written, so that this file loaded on the
 * push that had no implementation behind it and every check in it failed on its own line, naming
 * what was missing. A file that cannot even load says nothing about any one criterion.
 */
async function parts() {
  const data = await import('../lib/classroom-data');
  const stats = await import('../lib/attendance-stats');
  const whereTheHistoryIs = `${'../lib/student-history'}`;
  const history = (await import(/* @vite-ignore */ whereTheHistoryIs)) as HistoryLib;
  return { ...data, ...stats, ...history };
}

/** The class this student is in, and the other the teacher takes the same day. */
const theClassrooms: Classroom[] = [
  { id: 'c-maths', name: 'Mathematics', period: '1st Period', subject: '📐', colour: '#2F6FED' },
  { id: 'c-science', name: 'Science', period: '2nd Period', subject: '🔬', colour: '#1FAE63' },
];

/** The twenty-four students of the first period, as the agreed prototype's own roster names them. */
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

/** The student whose history this requirement is about, and the one the mockup is drawn around. */
const chloe = theRoster[0];

/** A student of the other class, whose days must never turn up in this one's history. */
const theOtherRoster: Student[] = [{ id: 'c-science-s1', classroomId: 'c-science', name: 'Zara Ali' }];

/** How many school days of marks this phone keeps behind this morning, this one counted. */
const schoolDaysKept = 39;

/**
 * The school days up to and including this morning, the most recent first: Monday to Friday, with
 * the weekends nobody takes a register on left out.
 */
function schoolDaysBack(many: number): Date[] {
  const days: Date[] = [];
  for (let back = 0; days.length < many; back += 1) {
    const day = new Date(theMorning.getFullYear(), theMorning.getMonth(), theMorning.getDate() - back);
    if (day.getDay() !== 0 && day.getDay() !== 6) days.push(day);
  }
  return days;
}

/**
 * The marks against Chloe Kim's own name, as the agreed prototype draws her term: absent twice,
 * late once, and present on every other school day — which is the 92%, the 2 and the 1 on her
 * profile, and the Apr 21 / Apr 18 / Apr 17 / Apr 16 / Apr 15 the prototype lists under Recent
 * Attendance.
 */
const herAbsences = ['2025-04-21', '2025-04-09'];
const herLates = ['2025-04-16'];

/** Which of the three marks she stands at on a day. */
const herMarkOn = (day: string): AttendanceMark =>
  herAbsences.includes(day) ? 'Absent' : herLates.includes(day) ? 'Late' : 'Present';

/**
 * A term of marks behind this morning: Chloe Kim's own as the prototype draws them, one classmate
 * away all term so that the class's own rate is nothing like hers, everybody else present — and
 * the other class's own day, which belongs to a student this profile must never count.
 */
function theTermBehindThem(dayText: (day: Date) => string): AttendanceRecord[] {
  const marks: AttendanceRecord[] = [];
  for (const day of schoolDaysBack(schoolDaysKept)) {
    const text = dayText(day);
    for (const student of theRoster) {
      const mark: AttendanceMark =
        student.id === chloe.id ? herMarkOn(text) : student.name === 'Aaliyah Carter' ? 'Absent' : 'Present';
      marks.push({ studentId: student.id, classroomId: 'c-maths', day: text, mark, savedBy: teacher.name });
    }
  }
  marks.push({ studentId: 'c-science-s1', classroomId: 'c-science', day: dayText(theMorning), mark: 'Late' });
  return marks;
}

/** Everything this phone knows about this teacher's teaching. */
function theirTeaching(dayText: (day: Date) => string): ClassroomData {
  return {
    version: 1,
    classrooms: theClassrooms,
    students: [...theRoster, ...theOtherRoster],
    attendance: theTermBehindThem(dayText),
  };
}

/** The morning the prototype draws, so the dates on the screen are the same ones every time. */
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

/** Signed in, and standing in the register: the place the app's own bottom row calls Attendance. */
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

/** Standing on one student's own profile, opened the way a teacher opens it: by their name. */
async function onTheProfile(name = chloe.name): Promise<Screen> {
  const screen = await inTheRoster();
  await screen.press(`Open ${name}'s profile`);
  await settle();
  return screen;
}

/** The names on the register a person can press to open a profile, as a screen announces them. */
const nameLinks = (screen: Screen): string[] =>
  [...screen.root().querySelectorAll('[role="link"]')].map((one) => one.getAttribute('aria-label') ?? '');

/** The rows of a list on the screen, as a screen reader is told what each of them is. */
const rowsOn = (screen: Screen): string[] =>
  [...screen.root().querySelectorAll('[role="listitem"]')].map((one) => one.getAttribute('aria-label') ?? '');

/** One named group of numbers on the screen — the tiles at the top, or a month's own summary. */
function groupNamed(screen: Screen, label: string): HTMLElement {
  const found = [...screen.root().querySelectorAll('[role="group"]')].filter(
    (one) => (one.getAttribute('aria-label') ?? '') === label,
  );
  if (found.length !== 1) throw new Error(`${found.length} groups named ${label} on this screen, wanted exactly one`);
  return found[0] as HTMLElement;
}

/** The numbers inside that group, each as the one phrase a screen reader says it in. */
const numbersIn = (group: HTMLElement): string[] =>
  [...group.querySelectorAll('[aria-label]')].map((one) => one.getAttribute('aria-label') ?? '');

/** Which of the tabs on a profile is the one in use. */
const tabInUse = (screen: Screen): string[] =>
  [...screen.root().querySelectorAll('[role="radio"]')]
    .filter((one) => one.getAttribute('aria-checked') === 'true')
    .map((one) => (one.textContent ?? '').trim());

/** The five days the agreed prototype lists under Recent Attendance, newest first. */
const theRecentDaysDrawn = [
  'Apr 21, 2025 — Absent',
  'Apr 18, 2025 — Present',
  'Apr 17, 2025 — Present',
  'Apr 16, 2025 — Late',
  'Apr 15, 2025 — Present',
];

afterEach(() => {
  vi.useRealTimers();
  keepAccountsIn(accountsIn([]));
});

describe("Check a student's attendance history", () => {
  it("Tapping a student's name opens their profile.", async () => {
    const screen = await inTheRoster();

    // Every student on the register is a name a person can press, and the screen says out loud
    // whose profile it opens — so two students sharing a surname are two different names to press.
    expect(nameLinks(screen)).toHaveLength(theRoster.length);
    for (const student of theRoster) {
      expect(nameLinks(screen), student.name).toContain(`Open ${student.name}'s profile`);
    }

    // The register is still the register: a name is a way in, not a second way to mark somebody.
    expect(screen.text()).toContain('Take Attendance');

    // One name pressed, and that student's profile is the screen — theirs, by name, with the class
    // they are in. The register is behind it and not under it.
    await screen.press(`Open ${chloe.name}'s profile`);
    await settle();
    const read = screen.text();
    expect(read).toContain('Student Profile');
    expect(read).toContain(chloe.name);
    expect(read).toContain('Mathematics');
    expect(read).toContain('1st Period');
    expect(read).not.toContain('Search students');
    expect(read).not.toContain('Save Attendance');

    // And it is the student whose name was pressed, not the first student the class happens to
    // have: back to the register, another name, and the profile is that one's.
    await screen.press('Back to the register');
    await settle();
    expect(screen.text()).toContain('Take Attendance');
    await screen.press("Open Hannah Kim's profile");
    await settle();
    expect(screen.text()).toContain('Hannah Kim');
    expect(screen.text()).not.toContain(chloe.name);

    // A teacher who looks a student up has not lost the register they were marking: the marks they
    // had made are where they left them.
    await screen.press('Back to the register');
    await settle();
    expect(rowsOn(screen)).toHaveLength(theRoster.length);

    takePictureOf("Check a student's attendance history > Tapping a student's name opens their profile.", screen);
    screen.close();
  }, pictureTakesAWhile);

  it('The Overview tab shows attendance rate, absences, and lates.', async () => {
    const screen = await onTheProfile();

    // The profile opens on Overview, which is where the prototype opens it.
    expect(tabInUse(screen)).toEqual(['Overview']);

    // The three numbers the prototype draws, each one phrase to a screen reader: this student's own
    // rate, how many days they were away, and how many they came in late on.
    expect(numbersIn(groupNamed(screen, 'Attendance summary'))).toEqual([
      'Attendance Rate: 92%',
      'Absences: 2',
      'Late: 1',
    ]);

    // They are hers and not her class's: the class she is in stands at 96% over the same term, so a
    // profile reading 92% is reading the marks against her own name.
    const { historyOf, tallyOfHistory, tallyFor, dayText } = await parts();
    const data = theirTeaching(dayText);
    expect(tallyFor(data, 'c-maths').rate).toBe(96);
    const hers = tallyOfHistory(historyOf(data, chloe.id));
    expect(hers).toEqual({ present: 36, absent: 2, late: 1, total: schoolDaysKept, rate: 92 });

    // The screen holds no rule of its own: the numbers on it are lib/student-history.ts's, worked
    // out from the daily records each time they are read and never kept beside them.
    expect(historyOf(data, chloe.id)).toHaveLength(schoolDaysKept);
    expect(historyOf(data, 'c-science-s1')).toHaveLength(1);
    expect(historyOf(data, 'nobody-at-all')).toEqual([]);

    takePictureOf(
      "Check a student's attendance history > The Overview tab shows attendance rate, absences, and lates.",
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);

  it('The Attendance tab lists recent dates and statuses.', async () => {
    const screen = await onTheProfile();

    // The tab is one of the three a profile has, and pressing it is the whole of getting there.
    await screen.press('Attendance');
    await settle();
    expect(tabInUse(screen)).toEqual(['Attendance']);

    // The days, newest first, each with the date it was taken on and the status she stood at —
    // which is the five the prototype draws.
    expect(rowsOn(screen)).toEqual(theRecentDaysDrawn);

    // And in the words a person reads off the screen, not only in what a screen reader is told.
    const read = screen.text();
    expect(read).toContain('Recent Attendance');
    for (const day of ['Apr 21, 2025', 'Apr 18, 2025', 'Apr 17, 2025', 'Apr 16, 2025', 'Apr 15, 2025']) {
      expect(read, day).toContain(day);
    }
    expect(read).toContain('Absent');
    expect(read).toContain('Present');
    expect(read).toContain('Late');

    // The month she is in, added up as the prototype adds it up: every day of April this phone has
    // a mark for, and how those days went.
    expect(numbersIn(groupNamed(screen, 'April Summary'))).toEqual([
      'Days Tracked: 15',
      'Present: 12',
      'Absent: 2',
      'Late: 1',
    ]);

    // Which five days those are is lib/student-history.ts's reading, where a check can ask it the
    // same question: the most recent of them, newest first.
    const { historyOf, recentDays, dayText } = await parts();
    const days = historyOf(theirTeaching(dayText), chloe.id);
    expect(recentDays(days).map((one) => `${one.day} ${one.mark}`)).toEqual([
      '2025-04-21 Absent',
      '2025-04-18 Present',
      '2025-04-17 Present',
      '2025-04-16 Late',
      '2025-04-15 Present',
    ]);

    takePictureOf(
      "Check a student's attendance history > The Attendance tab lists recent dates and statuses.",
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);

  it("Tapping 'View All' shows the complete attendance history.", async () => {
    const screen = await onTheProfile();

    // Before it is pressed, the profile shows the handful of recent days and says there are more.
    expect(rowsOn(screen)).toHaveLength(5);
    expect(screen.text()).toContain('View All');

    await screen.press('View All');
    await settle();

    // The whole record, and not a longer handful of it: every school day this phone has a mark
    // against her name, newest first, each with its own date and status.
    const read = screen.text();
    expect(read).toContain('Full Attendance Record');
    expect(rowsOn(screen)).toHaveLength(schoolDaysKept);
    expect(rowsOn(screen).slice(0, 5)).toEqual(theRecentDaysDrawn);
    expect(rowsOn(screen)[schoolDaysKept - 1]).toBe('Feb 26, 2025 — Present');

    // Gathered into the months the days fall in, the month she is in first, as the prototype draws
    // them — and her own name and rate at the top of it, so a long list never loses whose it is.
    expect(read).toContain(chloe.name);
    expect(read).toContain('92%');
    for (const month of ['April 2025', 'March 2025', 'February 2025']) expect(read, month).toContain(month);
    expect(read.indexOf('April 2025')).toBeLessThan(read.indexOf('March 2025'));
    expect(read.indexOf('March 2025')).toBeLessThan(read.indexOf('February 2025'));

    // The whole of it adds up to what the profile said of her: thirty-six days present, two away,
    // one late.
    expect(numbersIn(groupNamed(screen, 'Attendance summary'))).toEqual(['Present: 36', 'Absent: 2', 'Late: 1']);

    // It reads at the phone's largest text size: nothing on it is pinned to a height or cut short.
    expect(screen.markup()).not.toMatch(/[;"](max-height|line-height)\s*:/);

    // Which months those are, and which days are in each of them, is lib/student-history.ts's own
    // reading — the latest month first, and not one day of the record left out of it.
    const { historyOf, historyByMonth, dayText } = await parts();
    const months = historyByMonth(historyOf(theirTeaching(dayText), chloe.id));
    expect(months.map((one) => `${one.year}-${one.month} ${one.days.length}`)).toEqual([
      '2025-4 15',
      '2025-3 21',
      '2025-2 3',
    ]);
    expect(months.reduce((all, one) => all + one.days.length, 0)).toBe(schoolDaysKept);

    // And the way back is the way back to her profile, which is where it was pressed from.
    await screen.press('Back to the profile');
    await settle();
    expect(screen.text()).toContain('Student Profile');

    await screen.press('View All');
    await settle();
    takePictureOf(
      "Check a student's attendance history > Tapping 'View All' shows the complete attendance history.",
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);
});
