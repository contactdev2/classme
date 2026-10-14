// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AttendanceRecord, Classroom, ClassroomData, Student } from '../lib/classroom-data';
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
// seconds. See app/land-on-home.test.tsx, which says the same.
const pictureTakesAWhile = 120_000;

/** The morning this check stands on: a Monday in April, which is a school day. */
const theMorning = new Date('2025-04-21T08:12:00');

/**
 * The pieces this requirement adds, asked for when a check runs rather than when this file loads.
 * This file was pushed before any of them existed, so every check here had to fail on its own line
 * and name what was missing: a file that cannot even load says nothing about any one criterion.
 */
async function parts() {
  const data = await import('../lib/classroom-data');
  const classes = await import('../lib/classes');
  const stats = await import('../lib/attendance-stats');
  return { ...data, ...classes, ...stats };
}

// The teacher's own classrooms, as the prototype draws them: four being taught this term and one
// they have finished with and put away. The icon beside each is the teacher's own choosing, which
// is what a classroom keeps (lib/classroom-data.ts).
const theClassrooms: Classroom[] = [
  { id: 'c-maths', name: 'Mathematics', period: '1st Period', subject: '📐', colour: '#2F6FED' },
  { id: 'c-science', name: 'Science', period: '2nd Period', subject: '🔬', colour: '#1FAE63' },
  { id: 'c-english', name: 'English', period: '3rd Period', subject: '💬', colour: '#9B59D0' },
  { id: 'c-history', name: 'History', period: '4th Period', subject: '🏫', colour: '#E08A2E' },
  { id: 'c-drama', name: 'Drama', period: '5th Period', subject: '🎓', colour: '#E0652E', archived: true },
];

/** How many students are in each of them, which is what a card has to say out loud. */
const howManyIn: Record<string, number> = {
  'c-maths': 24,
  'c-science': 22,
  'c-english': 28,
  'c-history': 26,
  'c-drama': 19,
};

const firstNames = ['Amara', 'Jonah', 'Leila', 'Mateo', 'Nadia', 'Ollie', 'Priya', 'Rafael'];
const surnames = ['Okafor', 'Pike', 'Haddad', 'Nunes', 'Bakker', 'Iyer'];

/** A class's worth of students, named so no two of them are the same person. */
function rosterFor(classroomId: string, many: number): Student[] {
  return Array.from({ length: many }, (_, n) => ({
    id: `${classroomId}-s${n + 1}`,
    classroomId,
    name: `${firstNames[n % firstNames.length]} ${surnames[(n * 5) % surnames.length]}`,
  }));
}

/** A term of attendance for one class: every school day marked, most of them present. */
function termOfMarks(dayText: (day: Date) => string, classroomId: string, students: Student[], days: number): AttendanceRecord[] {
  const marks: AttendanceRecord[] = [];
  for (let back = 1; back <= days; back += 1) {
    const day = new Date(theMorning.getFullYear(), theMorning.getMonth(), theMorning.getDate() - back);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    students.forEach((student, n) => {
      const nth = (n + back) % 20;
      marks.push({
        studentId: student.id,
        classroomId,
        day: dayText(day),
        mark: nth === 0 ? 'Absent' : nth === 1 ? 'Late' : 'Present',
      });
    });
  }
  return marks;
}

/** Everything this phone knows about this teacher's teaching: five classes, their students, a term of marks. */
function theirTeaching(dayText: (day: Date) => string): ClassroomData {
  const students = theClassrooms.flatMap((one) => rosterFor(one.id, howManyIn[one.id]));
  const attendance = theClassrooms.flatMap((one) =>
    termOfMarks(dayText, one.id, students.filter((s) => s.classroomId === one.id), 60),
  );
  return { version: 1, classrooms: theClassrooms, students, attendance };
}

/** The morning the prototype draws, so a trend and a rate are the same ones every time. */
function aMondayMorning(): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(theMorning);
}

/** This phone: the teacher's own account on it, and their own classes, students and marks in it. */
async function aPhoneWithTheirClasses(): Promise<void> {
  const { classroomDataIn, keepClassroomDataIn, dayText } = await parts();
  keepAccountsIn(accountsIn([lockAccount({ email: teacher.email, password }, teacher, checkIterations)]));
  // The teacher of this phone has already been welcomed: the first morning's walkthrough is proved
  // in app/complete-onboarding.test.tsx, and what is being read here is what comes after it.
  keepOnboardingIn(onboardingIn(true));
  keepClassroomDataIn(classroomDataIn(theirTeaching(dayText)));
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

/** Signed in, and standing in the Classes list: the place the app's own bottom row calls Classes. */
async function inTheClassesList(): Promise<Screen> {
  aMondayMorning();
  await aPhoneWithTheirClasses();
  const screen = await signIn();
  await screen.press('Classes');
  await settle();
  return screen;
}

/** Everything a control on this screen says, as a person reads it. */
const controlsOn = (screen: Screen): { words: string; marked: string | null }[] =>
  [...screen.root().querySelectorAll('[role="button"], [role="radio"], [role="tab"]')].map((one) => ({
    words: visibleText(one.innerHTML || (one.textContent ?? '')),
    marked: one.getAttribute('aria-checked') ?? one.getAttribute('aria-selected'),
  }));

/** The control a person would press to see these words, and nothing else on the screen. */
const controlSaying = (screen: Screen, words: string) => controlsOn(screen).filter((one) => one.words.includes(words));

afterEach(() => {
  vi.useRealTimers();
  keepAccountsIn(accountsIn([]));
});

describe('Browse and switch between classes', () => {
  it('The Classes list shows All, Active, and Archived filter tabs.', async () => {
    const screen = await inTheClassesList();

    // The teacher is in their classes, and the three ways of narrowing them are on the screen.
    const read = screen.text();
    expect(read).toContain('My Classes');
    for (const tab of ['All', 'Active', 'Archived']) expect(read, tab).toContain(tab);

    // Each of the three is a control a finger can find, and exactly one of them is the one in use.
    for (const tab of ['All', 'Active', 'Archived']) expect(controlSaying(screen, tab), tab).toHaveLength(1);
    expect(controlsOn(screen).filter((one) => one.marked === 'true')).toHaveLength(1);

    // And they do what they say. Archived shows the class put away and none of the ones being
    // taught; All shows both; Active shows the ones being taught and not the one put away.
    await screen.press('Archived');
    expect(screen.text()).toContain('Drama');
    expect(screen.text()).not.toContain('Mathematics');

    await screen.press('All');
    expect(screen.text()).toContain('Drama');
    expect(screen.text()).toContain('Mathematics');

    await screen.press('Active');
    expect(screen.text()).toContain('Mathematics');
    expect(screen.text()).not.toContain('Drama');

    // It works at the phone's largest text size: nothing on it is pinned to a size, and nothing it
    // says is cut short after so many lines.
    expect(screen.markup()).not.toMatch(/[;"](max-height|line-height)\s*:/);
    expect(screen.markup()).not.toContain('numberOfLines');

    await screen.press('All');
    takePictureOf('Browse and switch between classes > The Classes list shows All, Active, and Archived filter tabs.', screen);
    screen.close();
  }, pictureTakesAWhile);

  it('Each class card shows its name, period, and student count.', async () => {
    const screen = await inTheClassesList();
    await screen.press('All');

    // Every one of the teacher's classes has a card, and each card says the three things a teacher
    // picks a class out by: what it is called, when it meets, and how many are in it.
    for (const classroom of theClassrooms) {
      const card = controlSaying(screen, classroom.name);
      expect(card, classroom.name).toHaveLength(1);
      expect(card[0].words, `${classroom.name} · period`).toContain(classroom.period);
      expect(card[0].words, `${classroom.name} · students`).toContain(`${howManyIn[classroom.id]} students`);
    }

    // The count is counted off the students this phone keeps, not written into the screen.
    const { studentsInClass, classroomDataIn, keepClassroomDataIn, dayText } = await parts();
    const data = theirTeaching(dayText);
    expect(studentsInClass(data, 'c-maths')).toBe(24);

    // One student fewer, and the card says one fewer.
    keepClassroomDataIn(
      classroomDataIn({ ...data, students: data.students.filter((one) => one.id !== 'c-maths-s1') }),
    );
    const again = await signIn();
    await again.press('Classes');
    await settle();
    await again.press('All');
    expect(controlSaying(again, 'Mathematics')[0].words).toContain('23 students');
    again.close();

    takePictureOf('Browse and switch between classes > Each class card shows its name, period, and student count.', screen);
    screen.close();
  }, pictureTakesAWhile);

  it('Tapping a class card opens its attendance dashboard.', async () => {
    const screen = await inTheClassesList();

    // A finger on the Mathematics card, and the teacher is in that class's attendance.
    await screen.press('Mathematics');
    await settle();

    const read = screen.text();
    expect(read).toContain('Mathematics');
    expect(read).toContain('Overview');
    expect(read).toContain('Overall Attendance');
    for (const mark of ['Present', 'Absent', 'Late']) expect(read, mark).toContain(mark);
    expect(read).toContain('Attendance Trend');
    expect(read).toContain('Key Insights');

    // What it says is this class's own attendance, worked out from the marks on this phone.
    const { tallyFor, lastDays, dayText } = await parts();
    const tally = tallyFor(theirTeaching(dayText), 'c-maths', lastDays(theMorning, 30));
    expect(tally.total).toBeGreaterThan(0);
    expect(read).toContain(`${tally.rate}%`);
    expect(read).toContain(String(tally.present));

    // The list of classes is behind them now: this is the class's own screen.
    expect(read).not.toContain('My Classes');
    expect(controlSaying(screen, 'Archived')).toHaveLength(0);

    // And from here a teacher switches to another class without going back for it.
    await screen.press('Science');
    await settle();
    const science = tallyFor(theirTeaching(dayText), 'c-science', lastDays(theMorning, 30));
    expect(screen.text()).toContain(`${science.rate}%`);
    expect(screen.text()).toContain(String(science.present));

    // The way back is to the list they came from.
    await screen.press(/Back to My Classes/i);
    await settle();
    expect(screen.text()).toContain('My Classes');

    await screen.press('Mathematics');
    await settle();
    takePictureOf('Browse and switch between classes > Tapping a class card opens its attendance dashboard.', screen);
    screen.close();
  }, pictureTakesAWhile);
});
