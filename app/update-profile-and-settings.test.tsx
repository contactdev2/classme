// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { say, setLanguage } from '../lib/i18n';
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

/** The teacher whose phone this is: their own name, their own email, and their own school. */
const teacher = { email: 'ms.rivera@riversidehigh.edu', name: 'Ms. Rivera', school: 'Riverside High' };
const password = 'Spring-2026-attendance';

// Stretching a password is slow on purpose, so a record made for a check says its own smaller
// number. A record carries the number it was made with, so both open alike.
const checkIterations = 1_000;

// How long a check may take altogether. Nothing here waits on anything — it is the browser that
// draws the picture at the end of each one, and a cold browser on a runner has taken fifteen
// seconds. See app/student-attendance-history.test.tsx, which says the same.
const pictureTakesAWhile = 120_000;

/** What the profile menu's own card of options is called, which is how a check finds it. */
const theMenu = '[role="list"][aria-label="Profile menu"] [role="listitem"]';

/** Which of the two ways the app can be dressed. */
type Look = 'light' | 'dark';

/** Where the look a teacher chose is kept between one morning and the next. */
type AppearanceMemory = {
  read(): Promise<Look | null>;
  write(which: Look): Promise<void>;
};

/** The keeping of a chosen look this requirement adds, named so a check can ask it by hand. */
type AppearanceLib = {
  /** Kept for as long as the app runs and no longer, for a check: nothing of a phone in it. */
  appearanceIn: (which?: Look | null) => AppearanceMemory;
  /** Keeps the chosen look in this memory from now on. */
  keepAppearanceIn: (memory: AppearanceMemory) => void;
  /** The memory the app is using now. */
  appearanceMemory: () => AppearanceMemory;
};

/** One palette: the colours the whole app is drawn in while it is wearing that look. */
type Palette = Record<string, string>;

/** What lib/theme.ts gains: the two palettes, and which of them the app is wearing. */
type ThemeLook = {
  appearanceNow: () => Look;
  setAppearance: (which: Look) => void;
  lightColours: Palette;
  darkColours: Palette;
};

/**
 * The pieces this requirement adds, asked for when a check runs rather than when this file loads —
 * and asked for by a name nothing can resolve before it is written, so that this file loaded on the
 * push that had no implementation behind it and every check in it failed on its own line, naming
 * what was missing. A file that cannot even load says nothing about any one criterion.
 */
async function parts() {
  const whereTheAppearanceIs = `${'../lib/appearance'}`;
  const appearance = (await import(/* @vite-ignore */ whereTheAppearanceIs)) as AppearanceLib;
  const theme = (await import('../lib/theme')) as unknown as ThemeLook;
  if (typeof theme.appearanceNow !== 'function') {
    throw new Error('lib/theme.ts does not say which of the two looks the app is wearing');
  }
  return { ...appearance, ...theme };
}

/** A colour as a browser writes it back out of a style, so a check can read a screen's own colour. */
const asBrowserSaysIt = (hex: string): string => {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((at) => parseInt(n.slice(at, at + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
};

/** The colour the screen in front of the teacher is drawn on. */
const behindTheScreen = (screen: Screen): string => screen.root().style.backgroundColor;

/** A teacher arriving at the app and signing in with their own email and password. */
async function signInAs(who: { email: string }): Promise<Screen> {
  const screen = open(<TheApp />);
  await screen.type(/Email/i, who.email);
  await screen.type(/^Password/i, password);
  await screen.press('Log In');
  await settle();
  return screen;
}

/** This phone, with one teacher's own record on it and nothing of anybody else's. */
function phoneOf(who: { email: string; name: string; school: string }): void {
  keepAccountsIn(accountsIn([lockAccount({ email: who.email, password }, who, checkIterations)]));
  // The teacher of this phone has already been welcomed: the first morning's walkthrough is proved
  // in app/complete-onboarding.test.tsx, and what is being read here is what comes after it.
  keepOnboardingIn(onboardingIn(true));
}

/** Signed in, and standing on the profile menu, opened the way a teacher opens it: their own avatar. */
async function onTheProfileMenu(who = teacher): Promise<Screen> {
  phoneOf(who);
  const screen = await signInAs(who);
  await screen.press(say('home.account'));
  await settle();
  return screen;
}

/** The options of the profile menu, as a screen says each of them to the teacher reading it. */
const menuOptions = (screen: Screen): string[] =>
  [...screen.root().querySelectorAll(theMenu)].map((one) => (one.getAttribute('aria-label') ?? '').trim());

afterEach(async () => {
  keepAccountsIn(accountsIn([]));
  try {
    const { setAppearance, keepAppearanceIn, appearanceIn } = await parts();
    setAppearance('light');
    keepAppearanceIn(appearanceIn(null));
  } catch {
    // Nothing to put back on a push where none of this exists yet: every check in this file has
    // already failed on its own line, saying what was missing.
  }
});

describe('Update profile and settings', () => {
  it("The profile menu shows the teacher's name and school.", async () => {
    const screen = await onTheProfileMenu();

    // The screen is the profile menu, and the card at the top of it is this teacher's own: the name
    // their record keeps, what they are, and the school that record keeps beside it.
    const read = screen.text();
    expect(read).toContain('Profile');
    expect(read).toContain(teacher.name);
    expect(read).toContain(teacher.school);
    expect(read).toContain('Teacher');

    // It is read out of their own record and not invented for them: a phone whose record keeps
    // another teacher's name and school shows that one, and nothing of this one.
    const other = { email: 'mr.osei@northgate.edu', name: 'Mr. Osei', school: 'Northgate Academy' };
    const theirs = await onTheProfileMenu(other);
    expect(theirs.text()).toContain(other.name);
    expect(theirs.text()).toContain(other.school);
    expect(theirs.text()).not.toContain(teacher.school);
    theirs.close();

    takePictureOf("Update profile and settings > The profile menu shows the teacher's name and school.", screen);
    screen.close();
  }, pictureTakesAWhile);

  it('Menu options include Classroom Settings, Students, Attendance Reports, and Notifications.', async () => {
    const screen = await onTheProfileMenu();

    // The four the criterion names are options of this menu, each one an option in its own right
    // and not a word somewhere on the screen.
    const options = menuOptions(screen);
    for (const option of ['Classroom Settings', 'Students', 'Attendance Reports', 'Notifications']) {
      expect(options, option).toContain(option);
    }

    // And Classroom Settings is the way in to the settings themselves, where what is done with a
    // teacher's data is told to them and a backup of it is made.
    await screen.press('Classroom Settings');
    await settle();
    expect(screen.text()).toContain(say('settings.dataPrivacy'));
    expect(screen.text()).toContain(say('settings.backupTitle'));

    // The picture is of the menu those options are on, which is where this check began.
    await screen.press(say('settings.back'));
    await settle();
    await screen.press(say('home.account'));
    await settle();
    expect(menuOptions(screen)).toEqual(options);
    takePictureOf(
      'Update profile and settings > Menu options include Classroom Settings, Students, Attendance Reports, and Notifications.',
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);

  it("Toggling Dark Mode changes the app's appearance.", async () => {
    const { appearanceNow, lightColours, darkColours, keepAppearanceIn, appearanceIn, appearanceMemory } = await parts();
    const kept = appearanceIn(null);
    keepAppearanceIn(kept);
    const screen = await onTheProfileMenu();

    // The app opens in the light it has always been drawn in, on the light palette's own background.
    expect(appearanceNow()).toBe('light');
    expect(behindTheScreen(screen)).toBe(asBrowserSaysIt(lightColours.background));
    const inTheLight = screen.markup();

    // One press of Dark Mode, and the app is wearing the other palette: the screen under the
    // teacher's own finger is redrawn in it, and it is a different screen to look at.
    await screen.press(say('settings.darkMode'));
    await settle();
    expect(appearanceNow()).toBe('dark');
    expect(behindTheScreen(screen)).toBe(asBrowserSaysIt(darkColours.background));
    expect(screen.markup()).not.toBe(inTheLight);

    // The two palettes really are two: what a teacher reads, what it is drawn on, and the cards
    // between them are a different colour in one than in the other.
    for (const word of ['text', 'background', 'card', 'line', 'muted']) {
      expect(darkColours[word], word).not.toBe(lightColours[word]);
    }

    // It is the app's appearance and not this one screen's: every other screen a teacher walks to
    // is drawn in the same dark, and none of them has lost a word of what it says.
    const sameWords = screen.text();
    await screen.press('Classroom Settings');
    await settle();
    expect(behindTheScreen(screen)).toBe(asBrowserSaysIt(darkColours.background));
    expect(screen.text()).toContain(say('settings.dataPrivacy'));
    await screen.press(say('settings.back'));
    await settle();
    expect(behindTheScreen(screen)).toBe(asBrowserSaysIt(darkColours.background));
    expect(screen.text()).toContain(say('home.here'));

    // And it is kept on the phone, so the app opens tomorrow morning the way it was left tonight.
    expect(appearanceMemory()).toBe(kept);
    expect(await kept.read()).toBe('dark');
    const tomorrow = await onTheProfileMenu();
    expect(appearanceNow()).toBe('dark');
    expect(behindTheScreen(tomorrow)).toBe(asBrowserSaysIt(darkColours.background));
    tomorrow.close();

    // The picture is of the menu in the dark it was switched into: that is what changed.
    await screen.press(say('home.account'));
    await settle();
    expect(screen.text()).toBe(sameWords);
    takePictureOf("Update profile and settings > Toggling Dark Mode changes the app's appearance.", screen);

    // Pressing it again puts the app back into the light, which is the whole of a toggle.
    await screen.press(say('settings.darkMode'));
    await settle();
    expect(appearanceNow()).toBe('light');
    expect(behindTheScreen(screen)).toBe(asBrowserSaysIt(lightColours.background));
    expect(await kept.read()).toBe('light');
    screen.close();
  }, pictureTakesAWhile);

  it('Tapping Logout signs the teacher out of the app.', async () => {
    const screen = await onTheProfileMenu();

    // Signed in, standing on their own profile menu — the one the options are on — and then out
    // of it: Logout is on this screen, which is where the agreed prototype puts it.
    expect(screen.text()).toContain(teacher.name);
    expect(menuOptions(screen)).toContain(say('settings.title'));
    await screen.press(say('settings.logout'));
    await settle();

    // The app is back on the screen it opens on, asking to be signed in to: nothing of the teacher
    // who was in it is on the screen any more.
    const read = screen.text();
    expect(read).toContain(say('login.logIn'));
    expect(read).toContain(say('login.welcome'));
    expect(read).not.toContain(teacher.name);
    expect(read).not.toContain(teacher.email);
    expect(read).not.toContain(teacher.school);

    // And nobody is let back in without a password: the email on its own leaves them where they are.
    await screen.type(/Email/i, teacher.email);
    await screen.press('Log In');
    await settle();
    expect(screen.text()).not.toContain(teacher.name);

    takePictureOf('Update profile and settings > Tapping Logout signs the teacher out of the app.', screen);
    screen.close();
  }, pictureTakesAWhile);
});
