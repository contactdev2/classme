// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { classroomDataIn, keepClassroomDataIn, type Classroom, type ClassroomData, type Student } from '../lib/classroom-data';
import { setLanguage } from '../lib/i18n';
import { keepLanguageIn, languageFileWith } from '../lib/language-file';
import { sourceLanguage } from '../lib/languages';
import { accountsIn, keepAccountsIn, lockAccount } from '../lib/local-accounts';
import { keepOnboardingIn, onboardingIn } from '../lib/onboarding';
import { rosterOf } from '../lib/roster';
import { dateLabel, dayName } from '../lib/week';
import { open, settle, takePictureOf, visibleText, type Screen } from '../test/screen';
import TheApp from './index';

// This check reads the app in the language its own words are written in, so what it proves is about
// the screen and not about a translation. Which language a screen is in, and that every screen
// follows the one a teacher chose, is proved in app/localise-app.test.tsx.
setLanguage(sourceLanguage);
keepLanguageIn(languageFileWith(null));

// The teacher this phone belongs to, and the password that opens their own record. Their name is
// kept inside that record, so the app can only greet them by it once the record has opened.
const teacher = { email: 'ms.rivera@riversidehigh.edu', name: 'Ms. Rivera' };
const password = 'Spring-2026-attendance';

// Stretching a password is slow on purpose, so a record made for a check says its own smaller
// number. A record carries the number it was made with, so both open alike.
const checkIterations = 1_000;

// How long a check may take altogether. Nothing here waits on anything — it is the browser that
// draws the picture at the end of each one, and a cold browser on a runner has taken fifteen
// seconds. See app/class-attendance-trends.test.tsx, which says the same.
const pictureTakesAWhile = 120_000;

/** The morning this check stands on: the Monday the prototype draws, before noon, a school day. */
const theMorning = new Date('2025-04-21T08:12:00');

/** The Wednesday of that same week, which is the day this check picks instead of today. */
const theWednesday = new Date(2025, 3, 23);

/**
 * The reading of a teacher's own day, asked for when a check runs rather than when this file loads.
 *
 * Named as a word and not written into the import itself on purpose: a missing module written in
 * plainly is a file that will not even load, and a check file that cannot load says nothing about
 * any one criterion. Asked for this way, each check below fails on its own line and names what is
 * missing — which is how this file was pushed before a line of the implementation existed. The
 * shape app/create-classroom.test.tsx asked the next check file to keep.
 */
const theDaysRules = '../lib/day-schedule';

/** One class standing on the day a teacher is looking at, as lib/day-schedule hands it over. */
type ScheduledClass = { classroom: Classroom; students: number };

/** One day of the week the day selector offers. */
type PickableDay = { name: string; date: string; on: Date; today: boolean };

async function parts() {
  const made = (await import(/* @vite-ignore */ theDaysRules)) as Record<string, unknown>;
  return made as unknown as {
    schoolDaysOf: (now: Date) => PickableDay[];
    theDaysClasses: (data: ClassroomData) => ScheduledClass[];
    classToTakeNow: (schedule: ScheduledClass[], looking: Date, now: Date) => ScheduledClass | null;
  };
}

/**
 * The classes this teacher teaches: two with a period of their own, one with the period left empty
 * — a teacher who has not been given a timetable yet — and one they have put away, which is no
 * longer part of any day.
 */
const theMaths: Classroom = { id: 'c-maths', name: 'Mathematics', period: '1st Period', subject: '📐', colour: '#2F6FED' };
const theScience: Classroom = { id: 'c-science', name: 'Science', period: '2nd Period', subject: '🔬', colour: '#1FAE63' };
const theStudyHall: Classroom = { id: 'c-study', name: 'Study Hall', period: '', subject: '📖', colour: '#7C5CDB' };
const theDrama: Classroom = { id: 'c-drama', name: 'Drama', period: '4th Period', subject: '🎭', colour: '#E0574A', archived: true };
const theClassrooms = [theScience, theMaths, theStudyHall, theDrama];

const firstNames = ['Amara', 'Jonah', 'Leila', 'Mateo', 'Nadia', 'Ollie'];
const surnames = ['Okafor', 'Pike', 'Haddad', 'Nunes'];

/** A class's worth of students, named so no two of them are the same person. */
const rosterFor = (classroomId: string, many: number): Student[] =>
  Array.from({ length: many }, (_, n) => ({
    id: `${classroomId}-s${n + 1}`,
    classroomId,
    name: `${firstNames[n % firstNames.length]} ${surnames[(n * 3) % surnames.length]}`,
  }));

/** How many are in each of them, so a card's count is a different number for each class. */
const howMany: Record<string, number> = { 'c-maths': 6, 'c-science': 4, 'c-study': 2, 'c-drama': 3 };

/** Everything this phone knows about this teacher's teaching: their classes and their students. */
function theirTeaching(): ClassroomData {
  const students = theClassrooms.flatMap((one) => rosterFor(one.id, howMany[one.id]));
  return { version: 1, classrooms: theClassrooms, students, attendance: [] };
}

/** The morning the prototype draws, so the week and the day picked out are the same ones every time. */
function aMondayMorning(): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(theMorning);
}

/** This phone: the teacher's own account on it, and their own classes and students in it. */
function aPhoneWithTheirClasses(data: ClassroomData = theirTeaching()): void {
  keepAccountsIn(accountsIn([lockAccount({ email: teacher.email, password }, teacher, checkIterations)]));
  // The teacher of this phone has already been welcomed: the first morning's walkthrough is proved
  // in app/complete-onboarding.test.tsx, and what is being read here is what comes after it.
  keepOnboardingIn(onboardingIn(true));
  keepClassroomDataIn(classroomDataIn(data));
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

/** Signed in on that Monday morning, which lands the teacher on Home: their own day. */
async function onHome(data: ClassroomData = theirTeaching()): Promise<Screen> {
  aMondayMorning();
  aPhoneWithTheirClasses(data);
  return signIn();
}

/** How a day of the week is named to a finger and to a screen reader: 'Mon, Apr 21'. */
const dayLabel = (day: Date): string => `${dayName(day)}, ${dateLabel(day)}`;

/** Everything on this screen a person can press, and whether it is the one in use. */
const controlsOn = (screen: Screen): { words: string; label: string; marked: string | null }[] =>
  [...screen.root().querySelectorAll('[role="button"], [role="radio"], [role="link"]')].map((one) => ({
    words: visibleText(one.innerHTML || (one.textContent ?? '')),
    label: one.getAttribute('aria-label') ?? '',
    marked: one.getAttribute('aria-checked'),
  }));

/** The controls a person would press to see these words, and nothing else on the screen. */
const controlsSaying = (screen: Screen, words: string) =>
  controlsOn(screen).filter((one) => one.words.includes(words) || one.label.includes(words));

/** The cards of the schedule, in the order they are read down the screen. */
const cardsOn = (screen: Screen): { name: string; words: string }[] =>
  [...screen.root().querySelectorAll('[role="listitem"]')].map((one) => ({
    name: one.getAttribute('aria-label') ?? '',
    words: visibleText(one.innerHTML),
  }));

/** Where these words are read on the screen, counting from the top of it. */
const readAt = (screen: Screen, words: string): number =>
  screen.readable().findIndex((one) => one.includes(words));

afterEach(() => {
  vi.useRealTimers();
  keepAccountsIn(accountsIn([]));
});

describe("Check today's schedule from Home", () => {
  it("Home shows a greeting with the teacher's name.", async () => {
    const screen = await onHome();

    // Greeted by their own name, in the words of the hour it is — the first thing on the screen,
    // read before the week they can pick a day from and before the day's own classes.
    expect(screen.text()).toContain('Good morning, Ms. Rivera');
    expect(readAt(screen, 'Good morning')).toBeGreaterThanOrEqual(0);
    expect(readAt(screen, 'Good morning')).toBeLessThan(readAt(screen, dayLabel(theMorning)));
    expect(readAt(screen, dayLabel(theMorning))).toBeLessThan(readAt(screen, theMaths.name));

    // Their name came out of their own locked record, and what opened it came no further than the
    // login screen: the password they typed is on no screen and in no attribute of this one.
    expect(screen.markup()).not.toContain(password);

    takePictureOf("Check today's schedule from Home > Home shows a greeting with the teacher's name.", screen);
    screen.close();
  }, pictureTakesAWhile);

  it('A day selector lets the teacher pick a date to view.', async () => {
    const { schoolDaysOf } = await parts();
    const screen = await onHome();

    // Monday to Friday of the week being taught, each one a date a finger can pick.
    const week = schoolDaysOf(theMorning);
    expect(week.map((day) => day.name)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    for (const day of week) {
      expect(controlsSaying(screen, dayLabel(day.on)), day.name).toHaveLength(1);
    }

    // Exactly one of them is the day being viewed, and on this morning it is today.
    const picked = () => controlsOn(screen).filter((one) => one.marked === 'true');
    expect(picked()).toHaveLength(1);
    expect(picked()[0].label).toBe(dayLabel(theMorning));
    expect(screen.text()).toContain('Today');

    // Picking another date moves the view to it: that date is the one marked now, today is not,
    // and the schedule under the selector says which day it is showing.
    await screen.press(dayLabel(theWednesday));
    await settle();
    expect(picked()).toHaveLength(1);
    expect(picked()[0].label).toBe(dayLabel(theWednesday));
    expect(screen.text()).toContain(dayLabel(theWednesday));
    expect(screen.text()).not.toContain('Today');

    // And back to today, which is a press on the day the teacher is standing in.
    await screen.press(dayLabel(theMorning));
    await settle();
    expect(picked()[0].label).toBe(dayLabel(theMorning));

    await screen.press(dayLabel(theWednesday));
    await settle();
    takePictureOf("Check today's schedule from Home > A day selector lets the teacher pick a date to view.", screen);
    screen.close();
  }, pictureTakesAWhile);

  it('The schedule list shows each class period for the selected day.', async () => {
    const { theDaysClasses } = await parts();
    const screen = await onHome();

    // Every class the teacher is teaching has a card on the day, in the order their periods put
    // them — and the class they have put away is on no day at all.
    const schedule = theDaysClasses(theirTeaching());
    expect(schedule.map((one) => one.classroom.name)).toEqual(['Mathematics', 'Science', 'Study Hall']);
    expect(cardsOn(screen).map((card) => card.name)).toEqual(schedule.map((one) => one.classroom.name));
    expect(screen.text()).not.toContain(theDrama.name);

    // And each card says the three things a teacher plans a day by: the period it meets in, the
    // class it is, and how many students are in it.
    for (const { classroom, students } of schedule) {
      const card = cardsOn(screen).find((one) => one.name === classroom.name)!;
      expect(card.words, classroom.name).toContain(classroom.name);
      // A teacher who was not given a timetable yet left the period empty, and the card says so in
      // words rather than drawing a gap where a period should be — the Classes list's own word.
      expect(card.words, classroom.name).toContain(classroom.period.trim() || 'No period set');
      expect(card.words, classroom.name).toContain(`${students} students`);
      expect(students).toBe(howMany[classroom.id]);
    }

    // The day the list is showing is named over it, so a teacher reading it knows which day it is.
    expect(screen.text()).toContain('Today');
    await screen.press(dayLabel(theWednesday));
    await settle();
    expect(screen.text()).toContain(dayLabel(theWednesday));
    expect(cardsOn(screen).map((card) => card.name)).toEqual(schedule.map((one) => one.classroom.name));

    // A teacher with nothing taught on this phone reads that, in the same card shape, rather than
    // reading somebody else's sample timetable.
    const empty = await onHome({ version: 1, classrooms: [], students: [], attendance: [] });
    expect(empty.text()).toContain('No classes yet');
    expect(cardsOn(empty)).toHaveLength(0);
    empty.close();

    await screen.press(dayLabel(theMorning));
    await settle();
    takePictureOf("Check today's schedule from Home > The schedule list shows each class period for the selected day.", screen);
    screen.close();
  }, pictureTakesAWhile);

  it("Tapping 'Take Attendance' on the current class jumps to its roster.", async () => {
    const { theDaysClasses, classToTakeNow } = await parts();
    const screen = await onHome();

    // The class the teacher is in now is the first of their own day, and it is the one card with a
    // way into its register on it: one button on the whole screen, and it is on that card.
    const now = classToTakeNow(theDaysClasses(theirTeaching()), theMorning, theMorning);
    expect(now?.classroom.id).toBe(theMaths.id);
    expect(controlsSaying(screen, 'Take Attendance')).toHaveLength(1);
    const current = cardsOn(screen).find((card) => card.words.includes('Take Attendance'));
    expect(current?.name).toBe(theMaths.name);

    // Pressing it is one press, and what it opens is that class's own roster: the register, named,
    // with the class it is marking and every student on it.
    await screen.press('Take Attendance');
    await settle();
    const read = screen.text();
    expect(read).not.toContain('Good morning');
    expect(read).toContain('Take Attendance');
    expect(read).toContain(theMaths.name);
    expect(read).toContain(theMaths.period);
    expect(read).toContain('Save Attendance');

    // Its roster and no other class's: the students the phone keeps against this class, every one
    // of them, and nobody from the class next door.
    const roster = rosterOf(theirTeaching(), theMaths.id);
    expect(roster).toHaveLength(howMany[theMaths.id]);
    const rows = [...screen.root().querySelectorAll('[role="listitem"]')].map((one) => one.getAttribute('aria-label'));
    expect(rows).toEqual(roster.map((student) => student.name));
    for (const student of rosterOf(theirTeaching(), theScience.id)) {
      if (!roster.some((one) => one.name === student.name)) expect(read, student.name).not.toContain(student.name);
    }

    // On a day that is not today there is no register to take: the app saves today's attendance and
    // only today's, so the schedule for another day is read and says so plainly.
    const other = await onHome();
    await other.press(dayLabel(theWednesday));
    await settle();
    expect(classToTakeNow(theDaysClasses(theirTeaching()), theWednesday, theMorning)).toBe(null);
    expect(controlsSaying(other, 'Take Attendance')).toHaveLength(0);
    expect(other.text()).toContain('Attendance is taken on the day itself.');
    other.close();

    takePictureOf("Check today's schedule from Home > Tapping 'Take Attendance' on the current class jumps to its roster.", screen);
    screen.close();
  }, pictureTakesAWhile);
});
