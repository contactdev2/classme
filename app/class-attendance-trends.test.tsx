// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lastDays, monthOnMonth, tallyFor, weeklyTrend, dayText } from '../lib/attendance-stats';
import { classroomDataIn, keepClassroomDataIn, type AttendanceRecord, type Classroom, type ClassroomData, type Student } from '../lib/classroom-data';
import { setLanguage } from '../lib/i18n';
import { keepLanguageIn, languageFileWith } from '../lib/language-file';
import { sourceLanguage } from '../lib/languages';
import { accountsIn, keepAccountsIn, lockAccount } from '../lib/local-accounts';
import { keepOnboardingIn, onboardingIn } from '../lib/onboarding';
import { markColours } from '../lib/theme';
import { dateLabel } from '../lib/week';
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
// seconds. See app/add-student.test.tsx, which says the same.
const pictureTakesAWhile = 120_000;

/** The morning this check stands on: a Monday in April, which is a school day. */
const theMorning = new Date('2025-04-21T08:12:00');

/** The stretch of days the dashboard reads, and the weeks its trend is drawn over. */
const overTheLast = 30;
const trendWeeks = 5;

/** Two of the teacher's own classes, so switching between them is still one press from here. */
const theMaths: Classroom = { id: 'c-maths', name: 'Mathematics', period: '1st Period', subject: '📐', colour: '#2F6FED' };
const theScience: Classroom = { id: 'c-science', name: 'Science', period: '2nd Period', subject: '🔬', colour: '#1FAE63' };
const theClassrooms = [theMaths, theScience];

const firstNames = ['Amara', 'Jonah', 'Leila', 'Mateo', 'Nadia', 'Ollie'];
const surnames = ['Okafor', 'Pike', 'Haddad', 'Nunes'];

/** A class's worth of students, named so no two of them are the same person. */
const rosterFor = (classroomId: string, many: number): Student[] =>
  Array.from({ length: many }, (_, n) => ({
    id: `${classroomId}-s${n + 1}`,
    classroomId,
    name: `${firstNames[n % firstNames.length]} ${surnames[(n * 3) % surnames.length]}`,
  }));

/**
 * A term of attendance for one class: every school day of the last sixty marked, and the last
 * thirty of them better attended than the thirty before — which is what gives the insight card
 * something to say about this month against the last one.
 */
function termOfMarks(classroomId: string, students: Student[], days: number): AttendanceRecord[] {
  const marks: AttendanceRecord[] = [];
  for (let back = 0; back < days; back += 1) {
    const day = new Date(theMorning.getFullYear(), theMorning.getMonth(), theMorning.getDate() - back);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const thisMonth = back < overTheLast;
    students.forEach((student, n) => {
      // One in twelve missing this month, one in four the month before it.
      const nth = (n + back) % (thisMonth ? 12 : 4);
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

/** Everything this phone knows about this teacher's teaching: two classes, their students, their marks. */
function theirTeaching(): ClassroomData {
  const students = theClassrooms.flatMap((one) => rosterFor(one.id, 6));
  const attendance = theClassrooms.flatMap((one) =>
    termOfMarks(one.id, students.filter((s) => s.classroomId === one.id), 60),
  );
  return { version: 1, classrooms: theClassrooms, students, attendance };
}

/** The morning the prototype draws, so a rate and a trend are the same ones every time. */
function aMondayMorning(): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(theMorning);
}

/** This phone: the teacher's own account on it, and their own classes, students and marks in it. */
function aPhoneWithTheirClasses(): void {
  keepAccountsIn(accountsIn([lockAccount({ email: teacher.email, password }, teacher, checkIterations)]));
  // The teacher of this phone has already been welcomed: the first morning's walkthrough is proved
  // in app/complete-onboarding.test.tsx, and what is being read here is what comes after it.
  keepOnboardingIn(onboardingIn(true));
  keepClassroomDataIn(classroomDataIn(theirTeaching()));
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

/** Signed in, and standing in the Classes list, where a class is selected by its own card. */
async function inTheClassesList(): Promise<Screen> {
  aMondayMorning();
  aPhoneWithTheirClasses();
  const screen = await signIn();
  await screen.press('Classes');
  await settle();
  return screen;
}

/** Selecting the Mathematics class, which is what a card in the list does. */
async function inTheClass(): Promise<Screen> {
  const screen = await inTheClassesList();
  await screen.press(theMaths.name);
  await settle();
  return screen;
}

/** And standing on that class's own Trends tab, which is one press from its overview. */
async function onTheTrendsTab(): Promise<Screen> {
  const screen = await inTheClass();
  await screen.press('Trends');
  await settle();
  return screen;
}

/** Everything a control on this screen says, and whether it is the one in use. */
const controlsOn = (screen: Screen): { words: string; marked: string | null }[] =>
  [...screen.root().querySelectorAll('[role="button"], [role="radio"], [role="tab"]')].map((one) => ({
    words: visibleText(one.innerHTML || (one.textContent ?? '')),
    marked: one.getAttribute('aria-checked') ?? one.getAttribute('aria-selected'),
  }));

/** The control a person would press to see these words, and nothing else on the screen. */
const controlSaying = (screen: Screen, words: string) => controlsOn(screen).filter((one) => one.words.includes(words));

/** Every element drawn on the screen, which is how a shape rather than a word is read back. */
const everything = (screen: Screen): HTMLElement[] => [...screen.root().querySelectorAll<HTMLElement>('*')];

/** A colour as a browser says it back, so #22C55E read off the screen is still #22C55E. */
const asBrowser = (hex: string): string[] => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return [hex.toLowerCase(), `rgb(${r}, ${g}, ${b})`, `rgb(${r},${g},${b})`];
};

/** Whether this colour is drawn anywhere on the screen. */
const drawsTheColour = (screen: Screen, hex: string): boolean => {
  const said = asBrowser(hex);
  return everything(screen).some((one) =>
    said.includes(one.style.backgroundColor.toLowerCase()) || said.includes(one.style.borderColor.toLowerCase()),
  );
};

/**
 * The ring the overall rate is written inside: a thick round band, which is how this app draws a
 * donut — React Native has no conic gradient of its own without a drawing package, and a ring
 * sized by the number in it still reads at the phone's largest text.
 */
const theDonut = (screen: Screen): HTMLElement[] =>
  everything(screen).filter((one) => one.style.borderRadius === '999px' && parseInt(one.style.borderWidth || '0', 10) >= 8);

/** Every bar of the weekly chart, as the share of the week it stands for. */
const barsOn = (screen: Screen): string[] =>
  everything(screen)
    .filter((one) => one.style.width.endsWith('%'))
    .map((one) => one.style.width);

afterEach(() => {
  vi.useRealTimers();
  keepAccountsIn(accountsIn([]));
});

describe('Review class-wide attendance trends', () => {
  it('Selecting a class opens its attendance overview.', async () => {
    const screen = await inTheClassesList();

    // The list of classes, and the card that is this class.
    expect(screen.text()).toContain('My Classes');
    await screen.press(theMaths.name);
    await settle();

    // What a card opens is that class's attendance overview: its name, the days the numbers are
    // worked out over, and the overview itself.
    const read = screen.text();
    expect(read).not.toContain('My Classes');
    expect(read).toContain('Mathematics');
    expect(read).toContain('Last 30 days');
    expect(read).toContain('Overall Attendance');

    // And it opens on Overview and not on one of the other two, each of which is a press away.
    expect(controlSaying(screen, 'Overview')[0].marked).toBe('true');
    expect(controlSaying(screen, 'Students')).toHaveLength(1);
    expect(controlSaying(screen, 'Students')[0].marked).toBe('false');
    expect(controlSaying(screen, 'Trends')).toHaveLength(1);
    expect(controlSaying(screen, 'Trends')[0].marked).toBe('false');

    // The numbers on it are this class's own, worked out from the marks this phone already keeps.
    const tally = tallyFor(theirTeaching(), theMaths.id, lastDays(theMorning, overTheLast));
    expect(tally.total).toBeGreaterThan(0);
    expect(read).toContain(`${tally.rate}%`);
    expect(read).toContain(String(tally.present));

    takePictureOf('Review class-wide attendance trends > Selecting a class opens its attendance overview.', screen);
    screen.close();
  }, pictureTakesAWhile);

  it('The Trends tab shows overall attendance as a donut chart with Present, Absent, Late counts.', async () => {
    const screen = await inTheClass();

    // Trends is a tab a finger can reach, and pressing it is where the teacher now stands.
    expect(controlSaying(screen, 'Trends')).toHaveLength(1);
    await screen.press('Trends');
    await settle();
    expect(controlSaying(screen, 'Trends')[0].marked).toBe('true');
    expect(controlSaying(screen, 'Overview')[0].marked).toBe('false');

    // The donut: a thick round band with the share present written in the hole of it.
    expect(theDonut(screen)).toHaveLength(1);
    const tally = tallyFor(theirTeaching(), theMaths.id, lastDays(theMorning, overTheLast));
    expect(tally.total).toBeGreaterThan(0);
    expect(visibleText(theDonut(screen)[0].innerHTML)).toContain(`${tally.rate}%`);
    expect(visibleText(theDonut(screen)[0].innerHTML)).toContain('Overall Attendance');

    // The three marks beside it, each named, each counted, and each in its own colour — so the
    // shares of the donut can be told apart and not only read.
    const read = screen.text();
    for (const [mark, many] of [['Present', tally.present], ['Absent', tally.absent], ['Late', tally.late]] as const) {
      expect(read, mark).toContain(mark);
      expect(read, mark).toContain(String(many));
    }
    expect(tally.absent).toBeGreaterThan(0);
    expect(tally.late).toBeGreaterThan(0);
    for (const of of ['present', 'absent', 'late'] as const) {
      expect(drawsTheColour(screen, markColours[of]), of).toBe(true);
    }

    takePictureOf(
      'Review class-wide attendance trends > The Trends tab shows overall attendance as a donut chart with Present, Absent, Late counts.',
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);

  it('A weekly bar chart shows attendance trend over the past month.', async () => {
    const screen = await onTheTrendsTab();

    // The chart says what it is and that a bar is a week of it.
    const read = screen.text();
    expect(read).toContain('Attendance Trend');
    expect(read).toContain('Weekly');

    // One bar for each of the five weeks the past month falls in, oldest first, the week being
    // taught last — each labelled with the Monday it begins on.
    const weeks = weeklyTrend(theirTeaching(), theMaths.id, theMorning, trendWeeks);
    expect(weeks).toHaveLength(trendWeeks);
    expect(weeks[0].label).toBe(dateLabel(new Date(2025, 2, 24)));
    expect(weeks[trendWeeks - 1].label).toBe(dateLabel(new Date(2025, 3, 21)));
    for (const week of weeks) expect(read, week.label).toContain(week.label);

    // And each bar is drawn as long as that week's own share present: the chart is the data and
    // not a picture beside it.
    expect(weeks.every((week) => week.marks > 0)).toBe(true);
    expect(barsOn(screen)).toEqual(weeks.map((week) => `${week.rate}%`));

    // Nothing on it is pinned to a height, so the phone's largest text makes the chart taller
    // rather than clipping a week out of it.
    expect(screen.markup()).not.toMatch(/[;"](max-height|line-height)\s*:/);
    expect(screen.markup()).not.toContain('numberOfLines');

    takePictureOf('Review class-wide attendance trends > A weekly bar chart shows attendance trend over the past month.', screen);
    screen.close();
  }, pictureTakesAWhile);

  it('A Key Insights card summarizes how attendance has changed compared to last month.', async () => {
    const screen = await onTheTrendsTab();

    // This class is better attended this month than last, so that is what the card says — in whole
    // points of per cent, worked out from the marks themselves.
    const month = monthOnMonth(theirTeaching(), theMaths.id, theMorning, overTheLast);
    expect(month.of.total).toBeGreaterThan(0);
    expect(month.before.total).toBeGreaterThan(0);
    expect(month.points).toBeGreaterThan(0);

    const read = screen.text();
    expect(read).toContain('Key Insights');
    expect(read).toContain(`Attendance is up ${month.points}% on the thirty days before.`);

    // A class whose attendance went the other way is told so, and not told it improved: the
    // sentence follows the marks, which is the whole of what the card is for.
    const slipping: ClassroomData = {
      version: 1,
      classrooms: [theMaths],
      students: rosterFor(theMaths.id, 4),
      attendance: [],
    };
    const everyDay = (from: number, to: number, mark: AttendanceRecord['mark']): AttendanceRecord[] => {
      const marks: AttendanceRecord[] = [];
      for (let back = from; back < to; back += 1) {
        const day = new Date(theMorning.getFullYear(), theMorning.getMonth(), theMorning.getDate() - back);
        for (const student of slipping.students) {
          marks.push({ studentId: student.id, classroomId: theMaths.id, day: dayText(day), mark });
        }
      }
      return marks;
    };
    // Everybody present the month before last; three in four present this month.
    const fading = {
      ...slipping,
      attendance: [
        ...everyDay(30, 60, 'Present'),
        ...everyDay(0, 15, 'Present'),
        ...everyDay(15, 30, 'Absent'),
      ],
    };
    const down = monthOnMonth(fading, theMaths.id, theMorning, overTheLast);
    expect(down.points).toBeLessThan(0);

    keepClassroomDataIn(classroomDataIn(fading));
    const other = await signIn();
    await other.press('Classes');
    await settle();
    await other.press(theMaths.name);
    await settle();
    await other.press('Trends');
    await settle();
    expect(other.text()).toContain('Key Insights');
    expect(other.text()).toContain(`Attendance is down ${-down.points}% on the thirty days before.`);
    expect(other.text()).not.toContain('Attendance is up');
    other.close();

    takePictureOf(
      'Review class-wide attendance trends > A Key Insights card summarizes how attendance has changed compared to last month.',
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);
});
