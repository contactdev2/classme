// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  AttendanceMark,
  AttendanceRecord,
  Classroom,
  ClassroomData,
  ClassroomStore,
  Student,
} from '../lib/classroom-data';
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

// The teacher this phone belongs to, and the password that opens their own record. Their name is
// what the saved register is expected to carry, so it is written here once.
const teacher = { email: 'ms.rivera@riversidehigh.edu', name: 'Ms. Rivera' };
const password = 'Spring-2026-attendance';

// Stretching a password is slow on purpose, so a record made for a check says its own smaller
// number. A record carries the number it was made with, so both open alike.
const checkIterations = 1_000;

// How long a check may take altogether. Nothing here waits on anything — it is the browser that
// draws the picture at the end of each one, and a cold browser on a runner has taken fifteen
// seconds. See app/review-attendance-summary.test.tsx, which says the same.
const pictureTakesAWhile = 120_000;

/** The morning this check stands on: a Monday in April, which is a school day. */
const theMorning = new Date('2025-04-21T08:12:00');

/** The day that morning is, as a mark against a student's name writes it. */
const todayText = '2025-04-21';

/** The keeping of a register this requirement adds, named here so a check can ask for it by hand. */
type SaveLib = {
  /** One day's register, as the records the phone keeps it as: one for every student on the roster. */
  recordsForRegister: (
    roster: Student[],
    marks: Record<string, AttendanceMark>,
    classroomId: string,
    day: string,
    savedBy?: string,
  ) => AttendanceRecord[];
  /** Everything the phone keeps, with one day's register in place of whatever it kept for that day. */
  dataWithRegister: (
    data: ClassroomData,
    classroomId: string,
    day: string,
    records: AttendanceRecord[],
  ) => ClassroomData;
  /** What a register already saved for a day says, so re-opening it shows what was kept. */
  savedRegisterFor: (data: ClassroomData, classroomId: string, day: string) => Record<string, AttendanceMark>;
  /** The students of one class, in the order a register is read in. */
  rosterOf: (data: ClassroomData, classroomId: string) => Student[];
  /** Where a register starts. */
  everyonePresent: (students: Student[]) => Record<string, AttendanceMark>;
  /** One student's mark changed, and nobody else's. */
  markedAs: (
    marks: Record<string, AttendanceMark>,
    studentId: string,
    mark: AttendanceMark,
  ) => Record<string, AttendanceMark>;
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
  const roster = await import('../lib/roster');
  const whereTheSavingIs = `${'../lib/attendance-save'}`;
  const saving = (await import(/* @vite-ignore */ whereTheSavingIs)) as SaveLib;
  return { ...data, ...stats, ...roster, ...saving };
}

/** The class the teacher is taking attendance in, and the other they teach the same day. */
const theClassrooms: Classroom[] = [
  { id: 'c-maths', name: 'Mathematics', period: '1st Period', subject: '📐', colour: '#2F6FED' },
  { id: 'c-science', name: 'Science', period: '2nd Period', subject: '🔬', colour: '#1FAE63' },
];

/**
 * The twenty-four students of the first period, as the agreed prototype's own roster names them.
 * Twenty-four is what makes this requirement worth anything: a saved register that holds twenty-two
 * of them is a day two students were never marked on.
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

/** The one student of the second period, whose own day must not be touched by saving the first's. */
const theOtherRoster: Student[] = [{ id: 'c-science-s1', classroomId: 'c-science', name: 'Zara Ali' }];

/**
 * A term of marks behind the first-period class, every one of them before today. Today has not been
 * taken yet, so nothing on the phone says what today is until this requirement's own press saves it.
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
  // The second period's own day today, taken before the first period's was: saving one register
  // must leave the other class's marks exactly where they are.
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

/**
 * Signed in, and standing in Take Attendance: the place the app's own bottom row calls Attendance.
 * The store the phone keeps its teaching in is handed back too, because what this requirement is
 * about is what ends up inside it.
 */
async function inTheRoster(): Promise<{ screen: Screen; store: ClassroomStore }> {
  aMondayMorning();
  const { classroomDataIn, keepClassroomDataIn, dayText } = await parts();
  keepAccountsIn(accountsIn([lockAccount({ email: teacher.email, password }, teacher, checkIterations)]));
  // The teacher of this phone has already been welcomed: the first morning's walkthrough is proved
  // in app/complete-onboarding.test.tsx, and what is being read here is what comes after it.
  keepOnboardingIn(onboardingIn(true));
  const store = classroomDataIn(theirTeaching(dayText));
  keepClassroomDataIn(store);
  const screen = await signIn();
  await screen.press('Attendance');
  await settle();
  return { screen, store };
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
 * Quinn Taylor late, and the other twenty present — which is the 20, 2 and 2 on its summary bar and
 * on the confirmation that follows saving it.
 */
async function theMorningAsDrawn(screen: Screen): Promise<void> {
  await mark(screen, 'Chloe Kim', 'Absent');
  await mark(screen, 'Tyler Brooks', 'Absent');
  await mark(screen, 'Elena Wright', 'Late');
  await mark(screen, 'Quinn Taylor', 'Late');
}

/** The register kept, the way a teacher keeps it: one press on the button the prototype draws. */
async function save(screen: Screen): Promise<void> {
  await screen.press('Save Attendance');
  await settle();
}

/** What the phone keeps for one class on one day, by the student it is kept against. */
async function keptFor(store: ClassroomStore, classroomId: string, day: string): Promise<AttendanceRecord[]> {
  const data = await store.read();
  return data.attendance.filter((one) => one.classroomId === classroomId && one.day === day);
}

/** The mark kept against one student today, found by the name the roster calls them. */
function keptMarkOf(kept: AttendanceRecord[], name: string): AttendanceMark | undefined {
  const student = theRoster.find((one) => one.name === name);
  return kept.find((one) => one.studentId === student?.id)?.mark;
}

afterEach(() => {
  vi.useRealTimers();
  keepAccountsIn(accountsIn([]));
});

describe("Save the day's attendance and see confirmation", () => {
  it("Tapping 'Save Attendance' stores today's status for every student in the class.", async () => {
    const { screen, store } = await inTheRoster();

    // Before the press, the phone knows nothing about today in this class: the term behind it is
    // there, and today is not. Whatever is read back after the press is this press's own doing.
    expect(await keptFor(store, 'c-maths', todayText)).toHaveLength(0);

    // The morning as the prototype draws it, marked with a thumb on the register.
    await theMorningAsDrawn(screen);

    // Save Attendance is a button a teacher can press — not a word drawn where a button goes.
    await save(screen);

    // Every student in the class has today's status on the phone: twenty-four students,
    // twenty-four records, one each, and the mark against each name is the one on the register.
    const kept = await keptFor(store, 'c-maths', todayText);
    expect(kept).toHaveLength(theRoster.length);
    expect(new Set(kept.map((one) => one.studentId)).size).toBe(theRoster.length);
    for (const student of theRoster) {
      expect(
        kept.filter((one) => one.studentId === student.id),
        student.name,
      ).toHaveLength(1);
    }
    expect(keptMarkOf(kept, 'Chloe Kim')).toBe('Absent');
    expect(keptMarkOf(kept, 'Tyler Brooks')).toBe('Absent');
    expect(keptMarkOf(kept, 'Elena Wright')).toBe('Late');
    expect(keptMarkOf(kept, 'Quinn Taylor')).toBe('Late');
    expect(kept.filter((one) => one.mark === 'Present')).toHaveLength(20);
    expect(kept.filter((one) => one.mark === 'Absent')).toHaveLength(2);
    expect(kept.filter((one) => one.mark === 'Late')).toHaveLength(2);

    // And nothing else on the phone moved: the ten school days behind this one are where they were,
    // and the second period's own register today is untouched by the first period's being kept.
    const after = await store.read();
    const { dayText } = await parts();
    const before = theTermBehindThem(dayText);
    for (const one of before.filter((mark) => mark.day !== todayText)) {
      expect(after.attendance, `${one.studentId} on ${one.day}`).toContainEqual(one);
    }
    expect(await keptFor(store, 'c-science', todayText)).toEqual([
      { studentId: 'c-science-s1', classroomId: 'c-science', day: todayText, mark: 'Late' },
    ]);

    // A day saved twice is one day's register, not two: back to the register — where the marks that
    // were kept are the ones showing, which is what a teacher who comes back to it has a right to
    // see — one mark changed, and saved again.
    await screen.press('Back to the register');
    await settle();
    expect(markShownFor(screen, 'Chloe Kim')).toBe('Absent');
    expect(markShownFor(screen, 'Elena Wright')).toBe('Late');
    expect(markShownFor(screen, 'Aaliyah Carter')).toBe('Present');
    await mark(screen, 'Chloe Kim', 'Present');
    await save(screen);
    const again = await keptFor(store, 'c-maths', todayText);
    expect(again).toHaveLength(theRoster.length);
    expect(keptMarkOf(again, 'Chloe Kim')).toBe('Present');
    expect(again.filter((one) => one.mark === 'Present')).toHaveLength(21);

    // The register is turned into records by lib/attendance-save.ts and nowhere else, so a check
    // can ask it the same question: one record for every student on the roster, each at the mark
    // the register had them at, and a day already kept replaced rather than added to.
    const { recordsForRegister, dataWithRegister, everyonePresent, markedAs, rosterOf } = await parts();
    const data = theirTeaching(dayText);
    const roster = rosterOf(data, 'c-maths');
    const marks = markedAs(markedAs(everyonePresent(roster), 'c-maths-s1', 'Absent'), 'c-maths-s5', 'Late');
    const records = recordsForRegister(roster, marks, 'c-maths', todayText, teacher.name);
    expect(records).toHaveLength(roster.length);
    expect(records.map((one) => one.studentId)).toEqual(roster.map((one) => one.id));
    expect(records.filter((one) => one.mark === 'Absent').map((one) => one.studentId)).toEqual(['c-maths-s1']);
    expect(records.filter((one) => one.mark === 'Late').map((one) => one.studentId)).toEqual(['c-maths-s5']);

    const put = dataWithRegister(data, 'c-maths', todayText, records);
    expect(put.attendance.filter((one) => one.classroomId === 'c-maths' && one.day === todayText)).toHaveLength(
      roster.length,
    );
    // Twice over, and it is still one day's register.
    const twice = dataWithRegister(put, 'c-maths', todayText, records);
    expect(twice.attendance.filter((one) => one.classroomId === 'c-maths' && one.day === todayText)).toHaveLength(
      roster.length,
    );
    // Nothing is changed in place: the data handed in still says what it said.
    expect(data.attendance.some((one) => one.classroomId === 'c-maths' && one.day === todayText)).toBe(false);

    // The picture is the register itself: the whole class, the button a teacher presses, and the
    // marks that are now on the phone showing against the names they were saved against.
    await screen.press('Back to the register');
    await settle();
    expect(rowsOn(screen)).toHaveLength(theRoster.length);
    expect(markShownFor(screen, 'Tyler Brooks')).toBe('Absent');
    expect(screen.text()).toContain('Save Attendance');

    takePictureOf(
      "Save the day's attendance and see confirmation > Tapping 'Save Attendance' stores today's status for every student in the class.",
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);

  it("After saving, the 'Attendance Saved!' confirmation screen appears.", async () => {
    const { screen } = await inTheRoster();

    // The register is not the confirmation: nothing says it is saved before it has been.
    expect(screen.text()).not.toContain('Attendance Saved!');

    await theMorningAsDrawn(screen);
    await save(screen);

    // The confirmation the prototype draws: that it is saved, which register it was, the day, and
    // the class added up in the three marks.
    const read = screen.text();
    expect(read).toContain('Attendance Saved!');
    expect(read).toContain('Mathematics');
    expect(read).toContain('1st Period');
    expect(read).toContain('Mon, Apr 21');
    expect(read).toContain('20');
    expect(read).toContain('Present');
    expect(read).toContain('Absent');
    expect(read).toContain('Late');
    expect(read).toContain("You can edit today's attendance anytime from Class Report.");

    // The register itself is behind it now, not under it: a teacher is looking at one screen.
    expect(rowsOn(screen)).toHaveLength(0);
    expect(read).not.toContain('Search students');

    // And the two ways on that the prototype draws are both buttons that go where they say.
    await screen.press('View Class Report');
    await settle();
    expect(screen.text()).toContain('Mathematics');
    expect(screen.text()).toContain('Overall Attendance');

    // Back into the register, saved again, and this time out to Home.
    await screen.press('Back to My Classes');
    await settle();
    await screen.press('Attendance');
    await settle();
    await theMorningAsDrawn(screen);
    await save(screen);
    expect(screen.text()).toContain('Attendance Saved!');
    await screen.press('Back to Home');
    await settle();
    expect(screen.text()).toContain('Ms. Rivera');
    expect(screen.text()).not.toContain('Attendance Saved!');

    // The confirmation once more, which is the screen this picture is of. It reads at the phone's
    // largest text size: nothing on it is pinned to a height or cut short.
    await screen.press('Attendance');
    await settle();
    await theMorningAsDrawn(screen);
    await save(screen);
    expect(screen.text()).toContain('Attendance Saved!');
    expect(screen.markup()).not.toMatch(/[;"](max-height|line-height)\s*:/);
    expect(screen.markup()).not.toContain('numberOfLines');

    takePictureOf(
      "Save the day's attendance and see confirmation > After saving, the 'Attendance Saved!' confirmation screen appears.",
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);

  it("The saved record includes the teacher's name and today's date.", async () => {
    const { screen, store } = await inTheRoster();

    await theMorningAsDrawn(screen);
    await save(screen);

    // Every one of today's records carries the day it was taken on and the name of the teacher who
    // saved it — the name their own sealed record keeps, not one the app invented for them.
    const kept = await keptFor(store, 'c-maths', todayText);
    expect(kept).toHaveLength(theRoster.length);
    for (const one of kept) {
      expect(one.day, one.studentId).toBe(todayText);
      expect(one.savedBy, one.studentId).toBe(teacher.name);
    }

    // Today's date is the phone's own clock and not a day typed in: the morning this check stands
    // on is a Monday in April, and that is the day on the record and on the screen.
    const { dayText } = await parts();
    expect(dayText(theMorning)).toBe(todayText);
    expect(screen.text()).toContain('Mon, Apr 21');
    expect(screen.text()).toContain('Saved by Ms. Rivera');

    // The marks behind today were saved by nobody this app knows of, and saving today did not put
    // a name on them.
    const after = await store.read();
    for (const one of after.attendance.filter((mark) => mark.day !== todayText)) {
      expect(one.savedBy, `${one.studentId} on ${one.day}`).toBeUndefined();
    }

    // Who saved a register and when is put on it by lib/attendance-save.ts, so a check can ask it
    // the same question: every record of a day carries that day and that teacher's name.
    const { recordsForRegister, everyonePresent, rosterOf, savedRegisterFor, dataWithRegister } = await parts();
    const data = theirTeaching(dayText);
    const roster = rosterOf(data, 'c-maths');
    const records = recordsForRegister(roster, everyonePresent(roster), 'c-maths', todayText, teacher.name);
    expect(records.every((one) => one.day === todayText)).toBe(true);
    expect(records.every((one) => one.savedBy === teacher.name)).toBe(true);
    // A phone whose record keeps no name of its own puts none on the register, rather than a name
    // the app made up: the email that record does keep is what a teacher is called everywhere else.
    expect(recordsForRegister(roster, everyonePresent(roster), 'c-maths', todayText).every((one) => one.savedBy === undefined)).toBe(true);

    // And a register already saved for a day is what a register re-opened on that day reads from,
    // which is why a teacher who comes back to it sees what they kept.
    const put = dataWithRegister(data, 'c-maths', todayText, records);
    expect(Object.keys(savedRegisterFor(put, 'c-maths', todayText))).toHaveLength(roster.length);
    expect(savedRegisterFor(data, 'c-maths', todayText)).toEqual({});

    takePictureOf(
      "Save the day's attendance and see confirmation > The saved record includes the teacher's name and today's date.",
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);
});
