// @vitest-environment jsdom
// A teacher with no profile yet, making one: the way in from the login screen, the two steps the
// prototype asks for, and what the phone has on it afterwards. Every check here drives the real
// app — the real screens, the real records — and photographs what a person would be looking at.
import { afterEach, describe, expect, it } from 'vitest';
import { setLanguage } from '../lib/i18n';
import { keepLanguageIn, languageFileWith } from '../lib/language-file';
import { sourceLanguage } from '../lib/languages';
import { accountsFile, accountsIn, keepAccountsIn, lockAccount, openAccount } from '../lib/local-accounts';
import { open, settle, takePictureOf, type Screen } from '../test/screen';
import TheApp from './index';

// These checks read the app in the language its own words are written in, so what they prove is
// about the screens and not about a translation. Which language a screen is in, and that every
// screen follows the one a teacher chose, is proved in app/localise-app.test.tsx.
setLanguage(sourceLanguage);
keepLanguageIn(languageFileWith(null));

// The teacher making a profile, and the password only they know.
const teacher = { name: 'Ms. Rivera', email: 'ms.rivera@riversidehigh.edu' };
const password = 'Spring-2026-attendance';

// Stretching a password is slow on purpose, so a record made for a check carries its own smaller
// number rather than the app's. A record carries the number it was made with, so both open alike.
const checkIterations = 1_000;

// Making a profile really does the app's own arithmetic, and then a browser draws the picture.
const working = 180_000;

/** A phone with no profile on it at all: which is what a teacher signing up is holding. */
function aPhoneWithNoProfile(): void {
  keepAccountsIn(accountsIn([]));
}

afterEach(() => keepAccountsIn(accountsIn([])));

/** The app, opened the way a teacher opens it in the morning, and left to settle. */
async function openTheApp(): Promise<Screen> {
  const screen = open(<TheApp />);
  await settle();
  return screen;
}

/** The way in: the login screen's own invitation to make a profile. */
async function openSignUp(screen: Screen): Promise<void> {
  await screen.press(/^Create a profile$/);
  await settle();
}

/** The first step: the name a teacher is known by, and on to the second. */
async function giveTheName(screen: Screen, name: string): Promise<void> {
  await screen.type(/Your Name/i, name);
  await screen.press(/^Continue$/);
  await settle();
}

/** The second step: the email and password the profile is made with. */
async function giveTheAccount(screen: Screen, email: string, secret: string): Promise<void> {
  await screen.type(/Email/i, email);
  await screen.type(/^Password/i, secret);
  await screen.press(/^Create Profile$/);
  await settle();
}

describe('Add ability for teachers to create their profile with a signup action', () => {
  it('A teacher can open a signup screen from the login screen.', async () => {
    aPhoneWithNoProfile();
    const screen = await openTheApp();

    // The login screen says there is a way in for somebody with no profile yet, and offers it.
    expect(screen.text()).toContain('New here?');
    expect(screen.text()).toContain('Create a profile');

    await openSignUp(screen);

    // The signup screen: named, and asking for the first thing it needs.
    expect(screen.text()).toContain('Create Profile');
    expect(screen.field(/Your Name/i)).toBeTruthy();

    // And it is a screen of its own: the login screen's own fields are not on it.
    expect(() => screen.field(/^Password/i)).toThrow();

    takePictureOf(
      'Add ability for teachers to create their profile with a signup action > A teacher can open a signup screen from the login screen.',
      screen,
    );
    screen.close();
  }, working);

  it('A teacher can enter their name, email, and a password, then submit to create their profile.', async () => {
    aPhoneWithNoProfile();
    const screen = await openTheApp();
    await openSignUp(screen);

    // Their name, typed, and the step that asked for it done.
    await giveTheName(screen, teacher.name);
    expect(screen.text()).toContain(`Hi, ${teacher.name}`);

    // Their email and their password, typed, and both standing in the fields that asked for them.
    await screen.type(/Email/i, teacher.email);
    await screen.type(/^Password/i, password);
    expect(screen.field(/Email/i).value).toBe(teacher.email);
    expect(screen.field(/^Password/i).value).toBe(password);

    // The screen as a person sees it with everything filled in, a press away from being a profile.
    takePictureOf(
      'Add ability for teachers to create their profile with a signup action > A teacher can enter their name, email, and a password, then submit to create their profile.',
      screen,
    );

    await screen.press(/^Create Profile$/);
    await settle();

    // Submitted, and their profile is on this phone: one record, which opens with what they chose
    // and says who they are.
    const records = await accountsFile().read();
    expect(records).toHaveLength(1);
    expect(openAccount(records[0], { email: teacher.email, password })).toEqual(teacher);

    // What they typed was locked away, not written down: neither word is in the record in the clear.
    expect(JSON.stringify(records)).not.toContain(password);
    expect(JSON.stringify(records)).not.toContain(teacher.email);

    screen.close();
  }, working);

  it("After submitting valid signup details, the teacher's profile is saved and they can log in with it.", async () => {
    aPhoneWithNoProfile();
    let screen = await openTheApp();
    await openSignUp(screen);
    await giveTheName(screen, teacher.name);
    await giveTheAccount(screen, teacher.email, password);

    // Made: the app says so, where they are about to use it.
    expect(screen.text()).toContain('Profile created');

    // The profile is on the phone and not merely in the app that is running: closed and opened
    // again, it is still there to log in with.
    screen.close();
    screen = await openTheApp();

    await screen.type(/Email/i, teacher.email);
    await screen.type(/^Password/i, password);
    await screen.press(/^Log In$/);
    await settle();

    // Past the login screen: there is nothing left to sign in with, because they are signed in.
    expect(() => screen.field(/^Password/i)).toThrow();
    expect(screen.text()).not.toContain('Log In');

    // And the app greets them by the name they signed up with.
    expect(screen.text()).toContain(teacher.name);

    // Their password came this far and no further — it is on no screen, in no attribute.
    expect(screen.markup()).not.toContain(password);

    takePictureOf(
      "Add ability for teachers to create their profile with a signup action > After submitting valid signup details, the teacher's profile is saved and they can log in with it.",
      screen,
    );
    screen.close();
  }, working);

  it('If a teacher tries to sign up with an email already used by another profile, the app shows a clear message instead of creating a duplicate.', async () => {
    // This phone already has a profile, and the email on it is the one about to be typed again.
    const theirs = lockAccount({ email: teacher.email, password }, teacher, checkIterations);
    keepAccountsIn(accountsIn([theirs]));

    const screen = await openTheApp();
    await openSignUp(screen);
    await giveTheName(screen, 'Mr. Okafor');

    // The same email, written the other way about — a phone that only matched it letter for letter
    // would make the duplicate anyway.
    await giveTheAccount(screen, ' MS.Rivera@RiversideHigh.edu ', 'Autumn-2025-attendance');

    // Told plainly what the matter is, in a sentence a screen reader announces.
    expect(screen.text()).toContain('A profile already uses that email');
    const announced = [...screen.root().querySelectorAll('[role="alert"]')].map((one) => one.textContent ?? '');
    expect(announced.join(' ')).toContain('A profile already uses that email');

    // And nothing was made: the phone keeps the one record it had, the teacher's own, untouched.
    const records = await accountsFile().read();
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(theirs);

    // Still on the signup screen, with what they typed where they can correct it.
    expect(screen.field(/Email/i)).toBeTruthy();

    takePictureOf(
      'Add ability for teachers to create their profile with a signup action > If a teacher tries to sign up with an email already used by another profile, the app shows a clear message instead of creating a duplicate.',
      screen,
    );
    screen.close();
  }, working);

  it('Require at least 8 characters.', async () => {
    aPhoneWithNoProfile();
    const screen = await openTheApp();
    await openSignUp(screen);
    await giveTheName(screen, teacher.name);

    // The rule is on the screen before anything is typed, where a person reads it as they choose.
    expect(screen.text()).toContain('Password must be at least 8 characters');

    // Seven characters is not eight, and the profile is not made.
    await giveTheAccount(screen, teacher.email, 'Spring7');
    expect(screen.text()).toContain('Choose a password of at least 8 characters');
    expect(await accountsFile().read()).toHaveLength(0);

    // Still on the second step, with the email they typed still standing in its field.
    expect(screen.field(/Email/i).value).toBe(teacher.email);

    takePictureOf(
      'Add ability for teachers to create their profile with a signup action > Require at least 8 characters.',
      screen,
    );

    // Eight is enough: the same details with one more character make the profile.
    await screen.type(/^Password/i, 'Spring78');
    await screen.press(/^Create Profile$/);
    await settle();

    const records = await accountsFile().read();
    expect(records).toHaveLength(1);
    expect(openAccount(records[0], { email: teacher.email, password: 'Spring78' })).toEqual(teacher);

    screen.close();
  }, working);

  it('The signup screen looks correctly laid out and readable.', async () => {
    aPhoneWithNoProfile();
    const screen = await openTheApp();
    await openSignUp(screen);

    // Both steps are named along the top, in the order they are walked.
    const firstStep = screen.text();
    expect(firstStep.indexOf('Name')).toBeGreaterThanOrEqual(0);
    expect(firstStep.indexOf('Name')).toBeLessThan(firstStep.indexOf('Account'));

    await giveTheName(screen, teacher.name);

    // The second step, read down the screen the way the prototype lays it out: the screen's name,
    // then the steps, then who it is greeting, then the two things it asks for, then the button.
    const read = screen.text();
    const order = ['Create Profile', 'Account', `Hi, ${teacher.name}`, 'Email Address', 'Password', 'Already have a profile?'];
    let at = -1;
    for (const words of order) {
      const found = read.indexOf(words, at + 1);
      expect(found, words).toBeGreaterThan(at);
      at = found;
    }

    // The agreed look (round 3): the screen on the soft background, a white card with 16px corners
    // on it, and one accent button in white letters.
    expect(screen.root().style.backgroundColor).toBe('rgb(245, 248, 252)');
    const cards = [...screen.root().querySelectorAll('div')].filter(
      (one) => (one as HTMLElement).style.backgroundColor === 'rgb(255, 255, 255)' && (one as HTMLElement).style.borderRadius === '16px',
    );
    expect(cards.length).toBeGreaterThanOrEqual(1);
    const buttons = [...screen.root().querySelectorAll('[role="button"]')].filter(
      (one) => (one as HTMLElement).style.backgroundColor === 'rgb(47, 111, 237)',
    );
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toBe('Create Profile');

    // Readable at the phone's largest text size: nothing on it is pinned to a height a grown
    // letter would be cut off by, and no field is held to a number of lines.
    expect(screen.markup()).not.toMatch(/[;"](height|max-height|line-height)\s*:/);
    expect(screen.markup()).not.toContain('numberOfLines');

    // Every field says what it is, above it and to a screen reader both.
    for (const label of [/Email/i, /^Password/i]) expect(screen.field(label)).toBeTruthy();
    expect(read).toContain('Email Address');

    takePictureOf(
      'Add ability for teachers to create their profile with a signup action > The signup screen looks correctly laid out and readable.',
      screen,
    );
    screen.close();
  }, working);
});
