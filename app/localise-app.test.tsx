// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { backupFilesIn, keepBackupFilesIn } from '../lib/backup-files';
import { classroomDataIn, keepClassroomDataIn, nothingKeptYet } from '../lib/classroom-data';
import { catalogues, direction, languageNow, say, setLanguage, wordsAllowedToStay } from '../lib/i18n';
import { keepLanguageIn, languageFile, languageFileWith } from '../lib/language-file';
import { defaultLanguage, languages, type Tag } from '../lib/languages';
import { accountsIn, keepAccountsIn, lockAccount } from '../lib/local-accounts';
import { productName } from '../lib/product';
import { versionLabel } from '../lib/version';
import { english, type WordKey } from '../lib/words/en';
import { lettersMissingFrom } from '../test/picture';
import { open, settle, takePictureOf, type Screen } from '../test/screen';
import TheApp from './index';

// The teacher this phone belongs to, and the password that opens their own record.
const teacher = { email: 'ms.rivera@riversidehigh.edu', name: 'Ms. Rivera' };
const password = 'Spring-2026-attendance';

// Stretching a password is slow on purpose, so a record made for a check says its own smaller number.
const checkIterations = 1_000;

// A check here walks every screen of the app and then waits on a browser to draw the picture.
const picturing = 180_000;

/** This phone: the teacher's own account on it, nothing taught yet, and this language remembered. */
function thisPhone(remembered: Tag | null = null): void {
  keepAccountsIn(accountsIn([lockAccount({ email: teacher.email, password }, teacher, checkIterations)]));
  keepClassroomDataIn(classroomDataIn(nothingKeptYet()));
  keepBackupFilesIn(backupFilesIn());
  keepLanguageIn(languageFileWith(remembered));
  // The app has just been installed: nothing has been chosen in this run of it.
  setLanguage(defaultLanguage);
}

afterEach(() => {
  keepAccountsIn(accountsIn([]));
  keepLanguageIn(languageFileWith(null));
  setLanguage(defaultLanguage);
});

/** The app, opened the way a teacher opens it in the morning, and left to settle. */
async function openTheApp(): Promise<Screen> {
  const screen = open(<TheApp />);
  await settle();
  return screen;
}

/** Signing in, in whatever language the app is in: the words on the screen are the way in. */
async function signIn(screen: Screen): Promise<void> {
  await screen.type(say('login.email'), teacher.email);
  await screen.type(say('login.password'), password);
  await screen.press(say('login.logIn'));
  await settle();
}

/** Classroom Settings, reached the way the prototype sends a teacher there: their own avatar. */
async function openSettings(screen: Screen): Promise<void> {
  await screen.press(say('home.account'));
  await settle();
}

/** A teacher arriving, signing in, and standing in Classroom Settings where the languages are. */
async function inSettings(): Promise<Screen> {
  thisPhone();
  const screen = await openTheApp();
  await signIn(screen);
  await openSettings(screen);
  return screen;
}

/** Choosing a language from the picker, by pressing the name the language calls itself. */
async function choose(screen: Screen, tag: Tag): Promise<void> {
  const chosen = languages.find((one) => one.tag === tag);
  if (!chosen) throw new Error(`${tag} is not a language the app offers`);
  await screen.press(chosen.native);
  await settle();
}

type Which = 'login' | 'home' | 'settings';

/** Words that belong to each screen, and so must be in that language when the screen is in it. */
const wordsOn: Record<Which, WordKey[]> = {
  login: ['login.welcome', 'login.invite', 'login.email', 'login.password', 'login.logIn', 'login.remember', 'login.promiseTitle'],
  home: ['home.here', 'home.todayLabel', 'home.noClasses', 'place.home', 'place.classes', 'place.attendance', 'place.messages', 'place.more'],
  settings: [
    'settings.title', 'settings.teacher', 'settings.dataPrivacy', 'settings.localStorage', 'settings.createBackup',
    'settings.restoreTitle', 'settings.preferences', 'settings.darkMode', 'settings.account', 'settings.logout',
    'language.title', 'language.note',
  ],
};

/** The English words that a catalogue of its own says differently, and so must be nowhere on it. */
const englishWordsReplacedIn = (tag: Tag): string[] =>
  (Object.keys(english) as WordKey[])
    .filter((key) => !wordsAllowedToStay.includes(key))
    .filter((key) => catalogues[tag][key] !== english[key])
    .map((key) => english[key])
    .filter((words) => !words.includes('{') && words.length >= 4);

/** This screen, read in this language: its own words on it, and no English left anywhere. */
function readsIn(screen: Screen, which: Which, tag: Tag): void {
  const read = screen.text();
  for (const key of wordsOn[which]) expect(read, `${which} · ${key}`).toContain(catalogues[tag][key]);
  for (const left of englishWordsReplacedIn(tag)) expect(read, `${which} · English left on it`).not.toContain(left);
}

/**
 * Every screen the app has, one after another, in the language it is in now: Classroom Settings
 * where a teacher stands, Home behind it, and the login screen they came in by. Left in Settings
 * again at the end, which is where the picture of each of these checks is taken.
 */
async function everyScreenInTurn(screen: Screen, look: (which: Which) => void): Promise<void> {
  look('settings');
  await screen.press(say('settings.back'));
  look('home');
  await openSettings(screen);
  await screen.press(say('settings.logout'));
  look('login');
  await signIn(screen);
  await openSettings(screen);
}

/** The things on a screen that are nobody's language: a name, a number, a language's own name. */
const nobodysLanguage = [
  productName(),
  versionLabel(),
  teacher.name,
  teacher.email,
  'MR',
  ...languages.map((one) => one.native),
  ...languages.map((one) => one.mark),
];

/** One catalogue's words, as what they look like once the braces in them are filled in. */
const asPattern = (words: string) =>
  new RegExp(`^${words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\w+\\\}/g, '[\\s\\S]*')}$`);

/** Whether these words on the screen are this language's own, or something nobody translates. */
const explained = (tag: Tag, words: string): boolean =>
  !/\p{L}/u.test(words) ||
  nobodysLanguage.includes(words) ||
  Object.values(catalogues[tag]).some((one) => asPattern(one).test(words));

describe('ClasseMe should be localisable to French, Arabic , Japanese and Chinese', () => {
  it("A person can switch the app's language to French and every screen then shows French text.", async () => {
    const screen = await inSettings();

    // The picker offers French by the name French calls itself, and pressing it is the whole of it.
    expect(screen.text()).toContain('Français');
    await choose(screen, 'fr');
    expect(languageNow()).toBe('fr');

    // And from that press on, every screen the app has reads in French.
    await everyScreenInTurn(screen, (which) => readsIn(screen, which, 'fr'));

    takePictureOf(
      "ClasseMe should be localisable to French, Arabic , Japanese and Chinese > A person can switch the app's language to French and every screen then shows French text.",
      screen,
    );
    screen.close();
  }, picturing);

  it("A person can switch the app's language to Arabic and every screen then shows Arabic text with the layout mirrored right-to-left.", async () => {
    const screen = await inSettings();

    // Before the choice, the app reads the way its default language reads: left to right.
    expect(screen.root().style.direction).toBe('ltr');

    expect(screen.text()).toContain('العربية');
    await choose(screen, 'ar');
    expect(languageNow()).toBe('ar');
    expect(direction()).toBe('rtl');

    // Every screen reads in Arabic — and is laid out the other way round, mirrored, as it must be.
    await everyScreenInTurn(screen, (which) => {
      readsIn(screen, which, 'ar');
      expect(screen.root().style.direction, `${which} · mirrored`).toBe('rtl');
    });

    takePictureOf(
      "ClasseMe should be localisable to French, Arabic , Japanese and Chinese > A person can switch the app's language to Arabic and every screen then shows Arabic text with the layout mirrored right-to-left.",
      screen,
    );
    screen.close();
  }, picturing);

  it("A person can switch the app's language to Japanese and every screen then shows Japanese text.", async () => {
    const screen = await inSettings();

    expect(screen.text()).toContain('日本語');
    await choose(screen, 'ja');
    expect(languageNow()).toBe('ja');

    await everyScreenInTurn(screen, (which) => readsIn(screen, which, 'ja'));

    takePictureOf(
      "ClasseMe should be localisable to French, Arabic , Japanese and Chinese > A person can switch the app's language to Japanese and every screen then shows Japanese text.",
      screen,
    );
    screen.close();
  }, picturing);

  it('Use Simplified Chinese as the default, matching mainland China users.', async () => {
    // A phone on which nobody has ever chosen a language: this is what it opens in.
    expect(defaultLanguage).toBe('zh-Hans');
    expect(languages[0].tag).toBe('zh-Hans');

    thisPhone();
    const screen = await openTheApp();
    expect(languageNow()).toBe('zh-Hans');

    // Nothing was pressed and nothing was chosen: the first screen is already in Simplified Chinese.
    readsIn(screen, 'login', 'zh-Hans');

    await signIn(screen);
    await openSettings(screen);

    // And the picker says so: Simplified Chinese is the one marked, and named as the default.
    const marked = [...screen.root().querySelectorAll('[role="radio"]')].filter((row) => row.getAttribute('aria-checked') === 'true');
    expect(marked).toHaveLength(1);
    expect(marked[0].textContent).toContain('简体中文');
    expect(marked[0].textContent).toContain(say('language.default'));

    await everyScreenInTurn(screen, (which) => readsIn(screen, which, 'zh-Hans'));

    takePictureOf(
      'ClasseMe should be localisable to French, Arabic , Japanese and Chinese > Use Simplified Chinese as the default, matching mainland China users.',
      screen,
    );
    screen.close();
  }, picturing);

  it('When a person closes and reopens the app, it still shows the language they last chose.', async () => {
    const screen = await inSettings();
    await choose(screen, 'fr');
    expect(languageNow()).toBe('fr');

    // The choice is on the phone, not only in the app that is running.
    expect(await languageFile().read()).toBe('fr');

    // Closed: the app is gone, and everything it was holding in mind with it.
    screen.close();
    setLanguage(defaultLanguage);
    expect(languageNow()).toBe(defaultLanguage);

    // Opened again the next morning — and it is in French, on the first screen, before anything
    // is pressed and without being asked again.
    const again = await openTheApp();
    expect(languageNow()).toBe('fr');
    readsIn(again, 'login', 'fr');

    // And it is still French all the way in.
    await signIn(again);
    readsIn(again, 'home', 'fr');
    await openSettings(again);
    readsIn(again, 'settings', 'fr');

    takePictureOf(
      'ClasseMe should be localisable to French, Arabic , Japanese and Chinese > When a person closes and reopens the app, it still shows the language they last chose.',
      again,
    );
    again.close();
  }, picturing);

  // What a judge is handed is a picture, and a picture is drawn by a machine that may own no
  // Chinese, Japanese or Arabic letters: where it owns none it draws an empty box, and a screen
  // of empty boxes says nothing about a translation. So the letters travel with the app, and this
  // reads every screen in every language back off the drawn page to be sure none came out a box.
  it("Every screen's picture shows each language's own letters, with no empty boxes in place of characters.", async () => {
    const screen = await inSettings();

    // Every screen the app has, in every language it offers, drawn the way a picture of it is
    // drawn, and read back off the page: not one character of it came out an empty box.
    for (const { tag } of languages) {
      await choose(screen, tag);
      const drawn: string[] = [];
      await everyScreenInTurn(screen, () => drawn.push(screen.markup()));
      expect(lettersMissingFrom(drawn.join('\n'), { lang: tag }).join(' '), `${tag} · drawn as boxes`).toBe('');
    }

    // And the picture of it: Classroom Settings in Japanese, the screen whose every word is a
    // character the machine drawing it has to have been lent a letter for.
    await choose(screen, 'ja');
    takePictureOf(
      "ClasseMe should be localisable to French, Arabic , Japanese and Chinese > Every screen's picture shows each language's own letters, with no empty boxes in place of characters.",
      screen,
    );
    screen.close();
  }, 600_000);

  it('Every label, button, and message on screen appears translated, with none left in the original language.', async () => {
    // Every language says everything the app can say: the same keys, none of them empty, and none
    // of them left as the English they were translated from.
    for (const { tag } of languages) {
      expect(Object.keys(catalogues[tag]), tag).toEqual(Object.keys(english));
      for (const [key, words] of Object.entries(catalogues[tag])) {
        expect(words.trim(), `${tag} · ${key}`).not.toBe('');
        if (words === english[key as WordKey]) expect(wordsAllowedToStay, `${tag} · ${key}`).toContain(key);
      }
    }

    // And on the screens themselves: every word a person reads, on every screen, in every language,
    // is that language's own — a label, a button, a message, a hint under a field, the words that
    // name a field to a screen reader. What is left over is nobody's language: a teacher's own name,
    // the app's own name, a version number.
    let screen = await inSettings();
    for (const { tag } of languages) {
      await choose(screen, tag);
      await everyScreenInTurn(screen, (which) => {
        readsIn(screen, which, tag);
        for (const words of screen.readable()) {
          expect(explained(tag, words), `${tag} · ${which} · ${JSON.stringify(words)}`).toBe(true);
        }
      });
    }

    // The picture is the screen the app opens on, in the language it opens in, with nothing on it
    // left in English.
    await choose(screen, 'zh-Hans');
    await screen.press(say('settings.logout'));
    readsIn(screen, 'login', 'zh-Hans');
    takePictureOf(
      'ClasseMe should be localisable to French, Arabic , Japanese and Chinese > Every label, button, and message on screen appears translated, with none left in the original language.',
      screen,
    );
    screen.close();
  }, 600_000);
});
