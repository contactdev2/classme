// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { accountsIn, keepAccountsIn, lockAccount, stretchedTimes } from '../lib/local-accounts';
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

// The teacher this phone belongs to — their name as the school says it, and the password only they
// know. The name is kept inside their own record, so the app can only greet them by it once their
// record has opened.
const teacher = { email: 'ms.rivera@riversidehigh.edu', name: 'Ms. Rivera' };
const password = 'Spring-2026-attendance';

// Stretching a password is slow on purpose, so a record made for a check says its own smaller
// number rather than the app's. A record carries the number it was made with, so both open alike.
const checkIterations = 1_000;

// How long a check may take altogether. Nothing here waits on anything — it is the browser that
// draws the picture at the end of each one, and a cold browser starting for the first time on a
// runner has taken fifteen seconds. The two seconds a teacher waits is measured on its own, inside
// the check, and this number has nothing to do with it.
const pictureTakesAWhile = 120_000;

/** This phone, with one account on it: the teacher's own, locked with their own password. */
function phoneWithTheTeachersAccount(iterations = checkIterations): void {
  keepAccountsIn(accountsIn([lockAccount({ email: teacher.email, password }, teacher, iterations)]));
}

/** The morning the prototype draws: a Monday, before noon, so the greeting is the morning's own. */
function aMondayMorning(): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2025-04-21T08:12:00'));
}

/** A teacher arriving at the app and signing in with their own email and password. */
async function signIn() {
  const screen = open(<TheApp />);
  await screen.type(/Email/i, teacher.email);
  await screen.type(/^Password/i, password);
  await screen.press('Log In');
  return screen;
}

afterEach(() => {
  vi.useRealTimers();
  keepAccountsIn(accountsIn([]));
});

describe('Land on greeted Home screen', () => {
  it('After a successful login, the teacher sees the Home screen.', async () => {
    aMondayMorning();
    phoneWithTheTeachersAccount();
    const screen = await signIn();

    // The login screen is behind them: there is nothing left to sign in with.
    expect(() => screen.field(/Email/i)).toThrow();
    expect(() => screen.field(/^Password/i)).toThrow();
    expect(screen.text()).not.toContain('Log In');

    // And what they are on is Home: the day ahead, named as Home among the app's own places.
    const read = screen.text();
    expect(read).toContain('Home');
    expect(read).toContain("Here's what's happening today.");
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) expect(read, day).toContain(day);
    for (const place of ['Classes', 'Attendance', 'Messages', 'More']) expect(read, place).toContain(place);

    // Their password came this far and no further — it is on no screen, in no attribute.
    expect(screen.markup()).not.toContain(password);

    // And Home works at the phone's largest text size: nothing on it is pinned to a size.
    expect(screen.markup()).not.toMatch(/[;"](height|max-height|line-height)\s*:/);
    expect(screen.markup()).not.toContain('numberOfLines');

    takePictureOf('Land on greeted Home screen > After a successful login, the teacher sees the Home screen.', screen);
    screen.close();
  }, pictureTakesAWhile);

  it("The Home screen shows a greeting with the teacher's name, for example 'Good morning, Ms. Rivera'.", async () => {
    aMondayMorning();
    phoneWithTheTeachersAccount();
    const screen = await signIn();

    // Greeted, by name, in the morning's own words.
    expect(screen.text()).toContain('Good morning, Ms. Rivera');

    // The name is their record's, not the screen's: no screen may carry a teacher's name in it.
    expect(readFileSync('components/home-screen.tsx', 'utf8')).not.toContain('Rivera');

    takePictureOf(
      "Land on greeted Home screen > The Home screen shows a greeting with the teacher's name, for example 'Good morning, Ms. Rivera'.",
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);

  it('The Home screen appears within two seconds of a successful login.', async () => {
    // At the number of stretches the app itself uses, not a check's smaller one: what is measured
    // here is the wait a teacher actually has in the morning, from the press to being greeted.
    phoneWithTheTeachersAccount(stretchedTimes);

    const screen = open(<TheApp />);
    await screen.type(/Email/i, teacher.email);
    await screen.type(/^Password/i, password);
    const began = performance.now();
    await screen.press('Log In');
    const took = performance.now() - began;

    // Greeted by name, whatever the hour of the check — so the time taken is the time to Home.
    expect(screen.text()).toMatch(/Good (morning|afternoon|evening), Ms\. Rivera/);
    expect(took, `the press took ${Math.round(took)}ms`).toBeLessThan(2_000);

    // And nothing is left to wait for once it is drawn: Home has no clock, no animation and no
    // errand of its own between a teacher signing in and reading their day.
    const source = readFileSync('components/home-screen.tsx', 'utf8');
    expect(source).not.toMatch(/setTimeout|setInterval|requestAnimationFrame|Animated|\bfetch\s*\(|\bawait\b/);

    takePictureOf('Land on greeted Home screen > The Home screen appears within two seconds of a successful login.', screen);
    screen.close();
  }, pictureTakesAWhile);
});
