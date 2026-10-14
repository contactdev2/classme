// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { setLanguage } from '../lib/i18n';
import { keepLanguageIn, languageFileWith } from '../lib/language-file';
import { sourceLanguage } from '../lib/languages';
import { accountsIn, keepAccountsIn, lockAccount } from '../lib/local-accounts';
import { open, settle, takePictureOf, type Screen } from '../test/screen';
import TheApp from './index';

// These checks read the app in the language its own words are written in, so what they prove is
// about the screens and not about a translation. Which language a screen is in is proved in
// app/localise-app.test.tsx.
setLanguage(sourceLanguage);
keepLanguageIn(languageFileWith(null));

// The teacher opening this app for the first time: their name as their students know it, and the
// password only they know. The name is inside their own record, so Home can only greet them by it
// once that record has opened.
const teacher = { email: 'ms.rivera@riversidehigh.edu', name: 'Ms. Rivera' };
const password = 'Spring-2026-attendance';

// Stretching a password is slow on purpose, so a record made for a check says its own smaller
// number rather than the app's. A record carries the number it was made with, so both open alike.
const checkIterations = 1_000;

// How long a check may take altogether. Nothing here waits on anything — it is the browser that
// draws the picture at the end of each one, and a cold browser on a runner has taken fifteen
// seconds. See app/land-on-home.test.tsx, which says the same.
const pictureTakesAWhile = 120_000;

/** This phone, with the teacher's own account on it, locked with their own password. */
function phoneWithTheTeachersAccount(): void {
  keepAccountsIn(accountsIn([lockAccount({ email: teacher.email, password }, teacher, checkIterations)]));
}

/** A teacher arriving at the app and signing in with their own email and password. */
async function signIn(): Promise<Screen> {
  const screen = open(<TheApp />);
  await settle();
  await screen.type(/Email/i, teacher.email);
  await screen.type(/^Password/i, password);
  await screen.press('Log In');
  await settle();
  return screen;
}

/** The three slides, walked the way a teacher walks them: the welcome, then Next, then Next. */
async function walkToTheLastSlide(screen: Screen): Promise<void> {
  await screen.press('Get Started');
  await screen.press('Next');
  await screen.press('Next');
}

/** What Home says, and nothing else does: the day in front of the teacher who just signed in. */
const homeWords = "Here's what's happening today.";

afterEach(() => {
  keepAccountsIn(accountsIn([]));
});

describe('Complete first-time onboarding', () => {
  it("The welcome screen shows a 'Get Started' button.", async () => {
    phoneWithTheTeachersAccount();
    const screen = await signIn();

    // The first thing a teacher reads on a phone nobody has been welcomed on: the welcome itself,
    // with what the app is for, and not the dashboard behind it.
    const read = screen.text();
    expect(read).toContain('A simpler way to manage');
    expect(read).not.toContain(homeWords);

    // And the way on is a button, announced as one, saying Get Started.
    const pressable = [...screen.root().querySelectorAll('[role="button"]')].map((b) => b.textContent ?? '');
    expect(pressable.some((words) => words.includes('Get Started'))).toBe(true);

    // It works at the phone's largest text size: nothing on it is pinned to a size, and nothing it
    // says is cut short after so many lines.
    expect(screen.markup()).not.toMatch(/[;"](height|max-height|line-height)\s*:/);
    expect(screen.markup()).not.toContain('numberOfLines');

    takePictureOf("Complete first-time onboarding > The welcome screen shows a 'Get Started' button.", screen);
    screen.close();
  }, pictureTakesAWhile);

  it('Three onboarding slides explain attendance, organization, and insights features.', async () => {
    phoneWithTheTeachersAccount();
    const screen = await signIn();

    // Get Started leads into the walkthrough, not past it: the first slide, counted 1 of 3.
    await screen.press('Get Started');
    let read = screen.text();
    expect(read).toContain('1/3');
    expect(read).toContain('Take Attendance');
    expect(read).toContain('Mark your class, track progress, and never miss a day.');
    expect(read).not.toContain(homeWords);

    // The second: keeping the classes, the periods and the students in order.
    await screen.press('Next');
    read = screen.text();
    expect(read).toContain('2/3');
    expect(read).toContain('Organize');
    expect(read).toContain('Keep your classrooms, periods and students in order.');

    // The third: what the records add up to once they are kept.
    await screen.press('Next');
    read = screen.text();
    expect(read).toContain('3/3');
    expect(read).toContain('Gain Insights');
    expect(read).toContain("View attendance trends and support every student's success.");

    // Three slides and no fourth: the last one offers the way in, not another Next.
    expect(read).not.toContain('Next');

    // Every one of them works at the phone's largest text size.
    expect(screen.markup()).not.toMatch(/[;"](height|max-height|line-height)\s*:/);
    expect(screen.markup()).not.toContain('numberOfLines');

    takePictureOf('Complete first-time onboarding > Three onboarding slides explain attendance, organization, and insights features.', screen);
    screen.close();
  }, pictureTakesAWhile);

  it("Tapping 'Get Started' on the last slide leads to the Home dashboard.", async () => {
    phoneWithTheTeachersAccount();
    const screen = await signIn();
    await walkToTheLastSlide(screen);

    // Standing on the last slide, with the way in on it.
    expect(screen.text()).toContain('3/3');

    await screen.press('Get Started');
    await settle();

    // Home: the teacher greeted by the name their own record keeps, their week, and the places the
    // app has along the bottom.
    const read = screen.text();
    expect(read).toContain(homeWords);
    expect(read).toMatch(/Good (morning|afternoon|evening), Ms\. Rivera/);
    for (const place of ['Home', 'Classes', 'Attendance', 'Messages', 'More']) expect(read, place).toContain(place);

    // And the walkthrough is behind them: no slide, no count, nothing left to press through.
    expect(read).not.toContain('3/3');
    expect(read).not.toContain('Get Started');

    takePictureOf("Complete first-time onboarding > Tapping 'Get Started' on the last slide leads to the Home dashboard.", screen);
    screen.close();
  }, pictureTakesAWhile);

  it('Onboarding is skipped on future app opens once completed.', async () => {
    phoneWithTheTeachersAccount();

    // The first morning: the teacher signs in, is welcomed, walks the three slides, and reaches Home.
    let screen = await signIn();
    expect(screen.text()).toContain('A simpler way to manage');
    await walkToTheLastSlide(screen);
    await screen.press('Get Started');
    await settle();
    expect(screen.text()).toContain(homeWords);
    screen.close();

    // The app is closed and opened again — a fresh app, reading what the phone itself kept.
    screen = await signIn();

    // Home, straight away: no welcome, no slide, nothing to press through a second time.
    const read = screen.text();
    expect(read).toContain(homeWords);
    expect(read).not.toContain('A simpler way to manage');
    expect(read).not.toContain('Get Started');
    expect(read).not.toContain('1/3');

    takePictureOf('Complete first-time onboarding > Onboarding is skipped on future app opens once completed.', screen);
    screen.close();
  }, pictureTakesAWhile);
});
