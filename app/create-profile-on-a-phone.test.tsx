// @vitest-environment jsdom
// Making a profile on a phone, and not only in a browser.
//
// A browser is a generous machine: it hands the app a source of unguessable bytes, and a check that
// takes one has proved nothing about a phone. So every check in this file takes away everything the
// app is allowed to assume — no Web Crypto, no platform UUID, and in two of them no file the phone
// will read or write either — and then drives the real screens and reads the real records.
//
// That is the difference between a profile made in a check and a profile made in a teacher's hand:
// a teacher holding a phone that answers none of those questions must still end up with a profile,
// and must never be told it could not be created.
import { afterEach, describe, expect, it } from 'vitest';
import { setLanguage } from '../lib/i18n';
import { keepLanguageIn, languageFileWith } from '../lib/language-file';
import { sourceLanguage } from '../lib/languages';
import {
  accountsFile,
  accountsIn,
  keepAccountsIn,
  lockAccount,
  openAccount,
} from '../lib/local-accounts';
import { accountsKeptIn, textFileWith, type KeptText } from '../lib/accounts-file';
import { open, settle, takePictureOf, type Screen } from '../test/screen';
import TheApp from './index';

// These checks read the app in the language its own words are written in, so what they prove is
// about the screens and not about a translation.
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

/** The sentence this whole requirement is about: it must be on no screen any of these checks reach. */
const theOldFailure = 'could not be created';

// The browser's own source of unguessable bytes, kept so it can be given back afterwards.
const browserCrypto = (globalThis as { crypto?: Crypto }).crypto;

/**
 * A phone that offers the app nothing of its own.
 *
 * No `crypto.getRandomValues`, because Hermes has none and neither React Native nor Expo puts one
 * there; and no `globalThis.expo.uuidv4` either, because a phone that answers that is a phone whose
 * native side came up — and a teacher whose did not must still be able to make a profile. This is
 * the least a device can offer, and the app has to work on it.
 */
function asAPhoneThatOffersNothing(): void {
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true, writable: true });
  delete (globalThis as { expo?: unknown }).expo;
}

/** A phone whose own file will not take a record: the write is refused, every time. */
function aFileThatCannotBeWritten(): KeptText & { tried: number } {
  const file = {
    tried: 0,
    async read() {
      return null;
    },
    async write() {
      file.tried += 1;
      throw new Error('this phone would not write that down');
    },
  };
  return file;
}

/** A phone whose own file will not say what is in it: the read is refused, every time. */
function aFileThatCannotBeRead(): KeptText & { written: string | null } {
  const file = {
    written: null as string | null,
    async read(): Promise<string | null> {
      throw new Error('this phone would not say what it keeps');
    },
    async write(text: string) {
      file.written = text;
    },
  };
  return file;
}

/** The browser given back its own, so nothing after these checks is run on a pretend phone. */
function asABrowserAgain(): void {
  Object.defineProperty(globalThis, 'crypto', { value: browserCrypto, configurable: true, writable: true });
  delete (globalThis as { expo?: unknown }).expo;
}

/** A phone with no profile on it at all: which is what a teacher signing up is holding. */
function aPhoneWithNoProfile(): void {
  keepAccountsIn(accountsIn([]));
}

afterEach(() => {
  asABrowserAgain();
  keepAccountsIn(accountsIn([]));
});

/** The app, opened the way a teacher opens it in the morning, and left to settle. */
async function openTheApp(): Promise<Screen> {
  const screen = open(<TheApp />);
  await settle();
  return screen;
}

/** A moment long enough for the phone's own arithmetic and the records it writes afterwards. */
async function settleAll(): Promise<void> {
  for (let again = 0; again < 6; again += 1) await settle();
}

/** The way in: the login screen's own invitation to make a profile. */
async function openSignUp(screen: Screen): Promise<void> {
  await screen.press(/^Create a profile$/);
  await settleAll();
}

/** The first step: the name a teacher is known by, and on to the second. */
async function giveTheName(screen: Screen, name: string): Promise<void> {
  await screen.type(/Your Name/i, name);
  await screen.press(/^Continue$/);
  await settleAll();
}

/** The second step: the email and password the profile is made with, and the press that submits. */
async function giveTheAccount(screen: Screen, email: string, secret: string): Promise<void> {
  await screen.type(/Email/i, email);
  await screen.type(/^Password/i, secret);
  await screen.press(/^Create Profile$/);
  await settleAll();
}

/** Signing in with what was just made. */
async function signIn(screen: Screen, email: string, secret: string): Promise<void> {
  await screen.type(/Email/i, email);
  await screen.type(/^Password/i, secret);
  await screen.press(/^Log In$/);
  await settleAll();
}

describe('Create a teacher profile on a phone', () => {
  it("When a teacher fills in the required signup fields correctly and submits, the profile is created without showing 'could not create the profile'.", async () => {
    asAPhoneThatOffersNothing();
    aPhoneWithNoProfile();
    const screen = await openTheApp();
    await openSignUp(screen);
    await giveTheName(screen, teacher.name);
    await giveTheAccount(screen, teacher.email, password);

    // The sentence this requirement is about is on nothing a teacher who filled the form in
    // correctly can see.
    expect(screen.text()).not.toContain(theOldFailure);
    expect(screen.root().querySelectorAll('[role="alert"]')).toHaveLength(0);

    // And the profile is really on the phone: one record, which opens with what they chose and
    // says who they are.
    const records = await accountsFile().read();
    expect(records).toHaveLength(1);
    expect(openAccount(records[0], { email: teacher.email, password })).toEqual(teacher);

    // What they typed was locked away, not written down: neither word is in the record in the clear.
    expect(JSON.stringify(records)).not.toContain(password);
    expect(JSON.stringify(records)).not.toContain(teacher.email);

    takePictureOf(
      "Create a teacher profile on a phone > When a teacher fills in the required signup fields correctly and submits, the profile is created without showing 'could not create the profile'.",
      screen,
    );
    screen.close();
  }, working);

  it("After a successful profile creation, the teacher's name and details appear saved and can be retrieved when the app is reopened.", async () => {
    asAPhoneThatOffersNothing();

    // This phone keeps its records in a file, the way a phone does, and the file is empty.
    const onThePhone = textFileWith(null);
    keepAccountsIn(accountsKeptIn(onThePhone));

    let screen = await openTheApp();
    await openSignUp(screen);
    await giveTheName(screen, teacher.name);
    await giveTheAccount(screen, teacher.email, password);

    // Made, and the app says their details are saved — with the name and the email it saved.
    expect(screen.text()).not.toContain(theOldFailure);
    expect(screen.text()).toContain(teacher.name);
    expect(screen.text()).toContain(teacher.email);

    // The phone has it written down, and what is written down says nothing in the clear.
    const written = await onThePhone.read();
    expect(written).toBeTruthy();
    expect(written).not.toContain(password);
    expect(written).not.toContain(teacher.email);

    // The app closed and opened again: a run of its own, reading the phone's own file as it finds it.
    screen.close();
    keepAccountsIn(accountsKeptIn(textFileWith(written)));
    screen = await openTheApp();
    await signIn(screen, teacher.email, password);

    // Past the login screen, because the record the phone kept opened — and greeted by the name
    // they signed up with, which is the detail that was saved.
    expect(() => screen.field(/^Password/i)).toThrow();
    expect(screen.text()).toContain(teacher.name);
    expect(screen.markup()).not.toContain(password);

    takePictureOf(
      "Create a teacher profile on a phone > After a successful profile creation, the teacher's name and details appear saved and can be retrieved when the app is reopened.",
      screen,
    );
    screen.close();
  }, working);

  it('After a successful profile creation, the teacher sees a confirmation or is taken to the next screen, not an error message.', async () => {
    asAPhoneThatOffersNothing();
    aPhoneWithNoProfile();
    const screen = await openTheApp();
    await openSignUp(screen);
    await giveTheName(screen, teacher.name);
    await giveTheAccount(screen, teacher.email, password);

    // The third step, as the chosen mockup lays it out: the steps all ticked, the confirmation, the
    // details that were saved, what became of them, and the way on.
    const read = screen.text();
    const order = [
      'Create Profile',
      'Name',
      'Account',
      'Done',
      'Profile Created',
      teacher.name,
      teacher.email,
      'Your details have been saved',
      'Go to Dashboard',
    ];
    let at = -1;
    for (const words of order) {
      const found = read.indexOf(words, at + 1);
      expect(found, words).toBeGreaterThan(at);
      at = found;
    }

    // Not an error message: nothing on it is announced as one, and the old failure is nowhere.
    expect(read).not.toContain(theOldFailure);
    expect(screen.root().querySelectorAll('[role="alert"]')).toHaveLength(0);

    takePictureOf(
      'Create a teacher profile on a phone > After a successful profile creation, the teacher sees a confirmation or is taken to the next screen, not an error message.',
      screen,
    );

    // And the way on is a way on: pressing it leaves the signup behind for the screen a teacher
    // works on, with nothing left to sign in with.
    await screen.press(/^Go to Dashboard$/);
    await settleAll();
    expect(() => screen.field(/^Password/i)).toThrow();
    expect(screen.text()).toContain(teacher.name);

    screen.close();
  }, working);

  it('Require full name, valid email, and password of at least 8 characters.', async () => {
    asAPhoneThatOffersNothing();
    aPhoneWithNoProfile();
    const screen = await openTheApp();
    await openSignUp(screen);

    // A name is required: without one, the second step is never even asked for.
    await screen.press(/^Continue$/);
    await settleAll();
    expect(screen.text()).toContain('Enter your name to carry on.');
    expect(() => screen.field(/Email/i)).toThrow();

    await giveTheName(screen, teacher.name);

    // The password rule is on the screen before anything is typed, where a person reads it as they
    // choose.
    expect(screen.text()).toContain('Password must be at least 8 characters');

    // Something that is not an email address is not accepted as one.
    await giveTheAccount(screen, 'ms.rivera.riversidehigh.edu', password);
    expect(screen.text()).toContain('Enter an email address in the form name@school.edu.');
    expect(await accountsFile().read()).toHaveLength(0);

    // Seven characters is not eight, and the profile is not made.
    await giveTheAccount(screen, teacher.email, 'Spring7');
    expect(screen.text()).toContain('Choose a password of at least 8 characters.');
    expect(await accountsFile().read()).toHaveLength(0);

    // Still on the second step, with the email they typed standing where they can correct it.
    expect(screen.field(/Email/i).value).toBe(teacher.email);

    takePictureOf(
      'Create a teacher profile on a phone > Require full name, valid email, and password of at least 8 characters.',
      screen,
    );

    // All three as they must be: a name, an address, eight characters — and the profile is made.
    await screen.type(/^Password/i, 'Spring78');
    await screen.press(/^Create Profile$/);
    await settleAll();
    const records = await accountsFile().read();
    expect(records).toHaveLength(1);
    expect(openAccount(records[0], { email: teacher.email, password: 'Spring78' })).toEqual(teacher);

    screen.close();
  }, working);

  it("Show 'An account with this email already exists' and prevent creation.", async () => {
    // A phone that offers nothing, which already has a profile on it: the record was locked by the
    // phone itself, with the phone's own arithmetic, and the email on it is about to be typed again.
    asAPhoneThatOffersNothing();
    const theirs = lockAccount({ email: teacher.email, password }, teacher, checkIterations);
    keepAccountsIn(accountsIn([theirs]));

    const screen = await openTheApp();
    await openSignUp(screen);
    await giveTheName(screen, 'Mr. Okafor');

    // The same email, written the other way about — a phone that only matched it letter for letter
    // would make the duplicate anyway.
    await giveTheAccount(screen, ' MS.Rivera@RiversideHigh.edu ', 'Autumn-2025-attendance');

    // Told, in those words, and in a sentence a screen reader announces.
    expect(screen.text()).toContain('An account with this email already exists');
    const announced = [...screen.root().querySelectorAll('[role="alert"]')].map((one) => one.textContent ?? '');
    expect(announced.join(' ')).toContain('An account with this email already exists');

    // Creation prevented: the phone keeps the one record it had, the teacher's own, untouched.
    const records = await accountsFile().read();
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(theirs);

    // And no confirmation anywhere: they are still on the step they were on, where they can correct it.
    expect(screen.text()).not.toContain('Profile Created');
    expect(screen.field(/Email/i)).toBeTruthy();

    takePictureOf(
      "Create a teacher profile on a phone > Show 'An account with this email already exists' and prevent creation.",
      screen,
    );
    screen.close();
  }, working);
  it('A phone that will not write the record down still makes the profile, and says what became of it.', async () => {
    // A phone whose own folder answers nothing — no native file module, no room left, a store that
    // refuses — is still a phone a teacher is holding. It must not cost them their profile.
    asAPhoneThatOffersNothing();
    const stubborn = aFileThatCannotBeWritten();
    keepAccountsIn(accountsKeptIn(stubborn));

    const screen = await openTheApp();
    await openSignUp(screen);
    await giveTheName(screen, teacher.name);
    await giveTheAccount(screen, teacher.email, password);

    // The phone really was asked, and really refused.
    expect(stubborn.tried).toBeGreaterThan(0);

    // And the teacher is told their profile is made, not that it could not be — with the truth
    // about what became of it, rather than a promise this phone did not keep.
    const read = screen.text();
    expect(read).not.toContain(theOldFailure);
    expect(read).toContain('Profile Created');
    expect(read).toContain(teacher.name);
    expect(read).toContain('could not write it down');
    expect(read).not.toContain('will be available when you reopen the app');

    // The way on is still a way on: they are signed in with the profile they just made.
    await screen.press(/^Go to Dashboard$/);
    await settleAll();
    expect(() => screen.field(/^Password/i)).toThrow();
    expect(screen.text()).toContain(teacher.name);
    screen.close();
  }, working);

  it('A phone that will not say what it keeps still makes the profile, and writes nothing over.', async () => {
    // A file that cannot be read is a file nothing may be written over: whatever is in it would be
    // lost, and the app cannot know it is not another teacher's. So the profile is made and the
    // file is left exactly as it was.
    asAPhoneThatOffersNothing();
    const silent = aFileThatCannotBeRead();
    keepAccountsIn(accountsKeptIn(silent));

    const screen = await openTheApp();
    await openSignUp(screen);
    await giveTheName(screen, teacher.name);
    await giveTheAccount(screen, teacher.email, password);

    expect(screen.text()).not.toContain(theOldFailure);
    expect(screen.text()).toContain('Profile Created');
    expect(silent.written).toBeNull();
    screen.close();
  }, working);
});
