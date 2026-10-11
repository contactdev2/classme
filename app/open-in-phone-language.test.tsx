// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { backupFilesIn, keepBackupFilesIn } from '../lib/backup-files';
import { classroomDataIn, keepClassroomDataIn, nothingKeptYet } from '../lib/classroom-data';
import { catalogues, direction, languageNow, say, setLanguage, wordsAllowedToStay } from '../lib/i18n';
import { keepLanguageIn, languageFile, languageFileWith } from '../lib/language-file';
import { languages, sourceLanguage, type Tag } from '../lib/languages';
import { accountsIn, keepAccountsIn, lockAccount } from '../lib/local-accounts';
import { phoneSaysItIsIn } from '../lib/phone-language';
import { productName } from '../lib/product';
import { versionLabel } from '../lib/version';
import { english, type WordKey } from '../lib/words/en';
import { open, settle, takePictureOf, type Screen } from '../test/screen';
import TheApp from './index';

// The teacher this phone belongs to, and the password that opens their own record.
const teacher = { email: 'ms.rivera@riversidehigh.edu', name: 'Ms. Rivera' };
const password = 'Spring-2026-attendance';

// Stretching a password is slow on purpose, so a record made for a check says its own smaller number.
const checkIterations = 1_000;

// A check here walks every screen of the app and then waits on a browser to draw the picture.
const picturing = 180_000;

/**
 * This phone: the teacher's own account on it, nothing taught yet, and the phone itself set to
 * these languages — the tags a phone hands an app, the one it prefers first.
 *
 * Every check here starts with the app in the language its own words are written in, which is what
 * a freshly installed app has before it has asked anything: so a screen a check then reads in
 * French, Arabic, Japanese or Chinese can only have come from the phone it asked.
 */
function thisPhone(setTo: readonly string[], shown: Tag | null = null, matching: Tag | null = null): void {
  keepAccountsIn(accountsIn([lockAccount({ email: teacher.email, password }, teacher, checkIterations)]));
  keepClassroomDataIn(classroomDataIn(nothingKeptYet()));
  keepBackupFilesIn(backupFilesIn());
  keepLanguageIn(languageFileWith(shown, matching));
  phoneSaysItIsIn(...setTo);
  setLanguage(sourceLanguage);
}

afterEach(() => {
  keepAccountsIn(accountsIn([]));
  keepLanguageIn(languageFileWith(null));
  phoneSaysItIsIn();
  setLanguage(sourceLanguage);
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
  if (tag !== sourceLanguage) {
    for (const left of englishWordsReplacedIn(tag)) expect(read, `${which} · English left on it`).not.toContain(left);
  }
}

/**
 * Every screen the app has, one after another, in the language it opened in: Classroom Settings,
 * Home behind it, and the login screen a teacher came in by. Left in Settings again at the end,
 * which is where the picture of each of these checks is taken.
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

/** A teacher opening the app on a phone set to this, and walking in as far as Classroom Settings. */
async function openedOnAPhoneSetTo(setTo: readonly string[]): Promise<Screen> {
  thisPhone(setTo);
  const screen = await openTheApp();
  await signIn(screen);
  await openSettings(screen);
  return screen;
}

/** The names the picker calls the languages by, which are in nobody's language but their own. */
const theirOwnNames = [...languages.map((one) => one.native), ...languages.map((one) => one.mark)];

/** What is left of a screen once the things nobody translates are taken off it. */
const beyondTheUntranslated = (screen: Screen): string => {
  let read = screen.text();
  for (const words of [...theirOwnNames, productName(), versionLabel(), teacher.email, teacher.name]) read = read.split(words).join(' ');
  return read;
};

describe('Use the phone system language as default application language', () => {
  it("When a phone's system language is set to French, opening the app shows all screens in French.", async () => {
    // Nothing was ever chosen in this app. The phone is a French one, and that is the whole of it.
    const screen = await openedOnAPhoneSetTo(['fr-FR']);
    expect(languageNow()).toBe('fr');

    await everyScreenInTurn(screen, (which) => readsIn(screen, which, 'fr'));

    takePictureOf(
      "Use the phone system language as default application language > When a phone's system language is set to French, opening the app shows all screens in French.",
      screen,
    );
    screen.close();
  }, picturing);

  it("When a phone's system language is set to Arabic, opening the app shows all screens in Arabic with right-to-left text.", async () => {
    const screen = await openedOnAPhoneSetTo(['ar-EG', 'en-GB']);
    expect(languageNow()).toBe('ar');
    expect(direction()).toBe('rtl');

    // Every screen reads in Arabic — and is laid out the other way round, mirrored, as it must be.
    await everyScreenInTurn(screen, (which) => {
      readsIn(screen, which, 'ar');
      expect(screen.root().style.direction, `${which} · mirrored`).toBe('rtl');
    });

    takePictureOf(
      "Use the phone system language as default application language > When a phone's system language is set to Arabic, opening the app shows all screens in Arabic with right-to-left text.",
      screen,
    );
    screen.close();
  }, picturing);

  it("When a phone's system language is set to Japanese, opening the app shows all screens in Japanese.", async () => {
    const screen = await openedOnAPhoneSetTo(['ja-JP']);
    expect(languageNow()).toBe('ja');

    await everyScreenInTurn(screen, (which) => readsIn(screen, which, 'ja'));

    takePictureOf(
      "Use the phone system language as default application language > When a phone's system language is set to Japanese, opening the app shows all screens in Japanese.",
      screen,
    );
    screen.close();
  }, picturing);

  it("When a phone's system language is set to Chinese, opening the app shows all screens in Chinese.", async () => {
    // A phone set to Chinese as mainland China sets it, which the app has Simplified Chinese for.
    const screen = await openedOnAPhoneSetTo(['zh-Hans-CN']);
    expect(languageNow()).toBe('zh-Hans');

    await everyScreenInTurn(screen, (which) => readsIn(screen, which, 'zh-Hans'));

    takePictureOf(
      "Use the phone system language as default application language > When a phone's system language is set to Chinese, opening the app shows all screens in Chinese.",
      screen,
    );
    screen.close();
  }, picturing);

  it('Use English as the fallback language.', async () => {
    // A phone set to a language the app has no words of its own for: German, with Korean behind it.
    // This app was showing French yesterday, on a phone that was set to French — so the English a
    // check reads here is the language the app fell back to, and not one it was simply left in.
    thisPhone(['de-DE', 'ko-KR'], 'fr', 'fr');
    const screen = await openTheApp();
    expect(languageNow()).toBe(sourceLanguage);
    await signIn(screen);
    await openSettings(screen);

    await everyScreenInTurn(screen, (which) => {
      // English on every screen — and not a character of the languages the phone did not ask for:
      // the only Chinese, Japanese and Arabic left anywhere is each language's own name in the
      // picker, which is that language's name in English too.
      readsIn(screen, which, sourceLanguage);
      expect(screen.root().style.direction, `${which} · read left to right`).toBe('ltr');
      expect(
        beyondTheUntranslated(screen).match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Arabic}]/gu) ?? [],
        `${which} · another language left on it`,
      ).toEqual([]);
    });

    takePictureOf(
      'Use the phone system language as default application language > Use English as the fallback language.',
      screen,
    );
    screen.close();
  }, picturing);

  it("The app remembers which language it is currently showing, so switching the phone's language and reopening the app updates the app to match.", async () => {
    // A French phone, first thing in the morning: the app opens in French and remembers that it
    // is showing French, and which phone language it is matching to do so.
    const screen = await openedOnAPhoneSetTo(['fr-FR']);
    expect(languageNow()).toBe('fr');
    expect(await languageFile().read()).toBe('fr');
    expect(await languageFile().readPhone()).toBe('fr');

    // Closed: the app is gone, and everything it was holding in mind with it. What is on the phone
    // is what it remembered — French, matching a French phone.
    screen.close();
    setLanguage(sourceLanguage);

    // The phone itself is set to Japanese, and the app is opened again.
    phoneSaysItIsIn('ja-JP');
    const again = await openTheApp();

    // It has followed the phone: Japanese on the first screen, before anything is pressed, and
    // Japanese all the way in. And it remembers that this is what it is showing now.
    expect(languageNow()).toBe('ja');
    readsIn(again, 'login', 'ja');
    expect(await languageFile().read()).toBe('ja');
    expect(await languageFile().readPhone()).toBe('ja');

    await signIn(again);
    readsIn(again, 'home', 'ja');
    await openSettings(again);
    readsIn(again, 'settings', 'ja');

    takePictureOf(
      "Use the phone system language as default application language > The app remembers which language it is currently showing, so switching the phone's language and reopening the app updates the app to match.",
      again,
    );
    again.close();
  }, picturing);
});
