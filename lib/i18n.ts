// The app's words, in the language a teacher chose.
//
// A screen asks for a key and gets words: say('login.logIn'). Which language those words come from
// is one answer for the whole app, kept here.
//
// Who gives that answer, in order: the phone itself — a teacher reads their phone in a language
// already, and the app opens in that one, or in English where the app has no words for it; and then
// the picker in Classroom Settings, for a teacher who wants the app in another language than their
// phone. Both are remembered on the phone (lib/language-file.ts) along with the phone language they
// were matched to, so the next morning opens in the right one: a choice made on this phone stands,
// and a phone since set to another language is followed into it.
import { useEffect, useState } from 'react';
import { languageFile } from './language-file';
import { defaultLanguage, isLanguage, readsRightToLeft, type Tag } from './languages';
import { phoneLanguage } from './phone-language';
import { english, type WordKey, type Words } from './words/en';
import { simplifiedChinese } from './words/zh-hans';
import { french } from './words/fr';
import { arabic } from './words/ar';
import { japanese } from './words/ja';

export type { WordKey, Words };

/** Every language's words, the English source among them as the one everything falls back to. */
export const catalogues: Record<Tag, Words> = {
  en: english,
  'zh-Hans': simplifiedChinese,
  fr: french,
  ar: arabic,
  ja: japanese,
};

/**
 * The keys whose words are allowed to be the same as the English: a sample address, the name of an
 * arithmetic standard, a sentence whose only English part is a brace, and a count written as a
 * count — 1/3 is 1/3 in every language the app offers. Every other key in every other catalogue
 * says something of its own — see the check that reads this list.
 */
export const wordsAllowedToStay: readonly WordKey[] = [
  'login.emailPlaceholder',
  'privacy.standardValue',
  'home.greetingLine',
  'home.greetingName',
  'onboard.step',
];

let current: Tag = defaultLanguage;
const listeners = new Set<() => void>();

/** The language the app is in at this moment. */
export const languageNow = (): Tag => current;

/** Which way the screens read in it. */
export const direction = (): 'ltr' | 'rtl' => (readsRightToLeft(current) ? 'rtl' : 'ltr');

/** Told when the language changes, and handed back the way to stop being told. */
export function onLanguageChange(tell: () => void): () => void {
  listeners.add(tell);
  return () => {
    listeners.delete(tell);
  };
}

/** Puts the whole app into this language, at once. Nothing is remembered by this alone. */
export function setLanguage(tag: Tag): void {
  if (tag === current) return;
  current = tag;
  for (const tell of [...listeners]) tell();
}

/**
 * What the app is showing now, kept on the phone with the phone language it is matching, so that
 * tomorrow morning can tell the two apart.
 */
async function keepWhatIsShown(matching: Tag | null): Promise<void> {
  try {
    const file = languageFile();
    await file.write(current);
    if (matching) await file.writePhone(matching);
  } catch {
    // A phone that would not keep it still shows it: the screens are already in this language, and
    // a teacher is not told off about a file they never asked for.
  }
}

/** The language a teacher chose: applied now, and kept so the app opens in it next time. */
export async function rememberLanguage(tag: Tag): Promise<void> {
  setLanguage(tag);
  await keepWhatIsShown(phoneLanguage());
}

/**
 * The language the app opens in, decided once as it opens.
 *
 * The phone is asked first: its own language, or English where the app has no words for it. What is
 * kept on the phone is read beside it — the language the app was last showing, and the phone
 * language it was matching then. A phone still set the way it was keeps what was last shown, which
 * is how a teacher's own choice in Classroom Settings survives the night. A phone set to another
 * language since is followed into it, with nothing to press and nothing to be asked. A phone that
 * will not say what it is set to leaves the last shown language standing, and the app's own default
 * where there is none.
 *
 * Whatever comes of it is written back, so the app always knows which language it is showing.
 */
export async function openInPhoneLanguage(): Promise<Tag> {
  const phone = phoneLanguage();
  let shown: Tag | null = null;
  let matching: Tag | null = null;
  try {
    const file = languageFile();
    [shown, matching] = await Promise.all([file.read(), file.readPhone()]);
  } catch {
    // Nothing kept, or nothing readable: the phone's own language decides on its own.
  }
  if (isLanguage(shown) && (!phone || matching === phone)) setLanguage(shown);
  else if (phone) setLanguage(phone);
  await keepWhatIsShown(phone);
  return current;
}

/** Words for a key, with anything in braces filled in. */
export function say(key: WordKey, filling: Record<string, string | number> = {}): string {
  const words = catalogues[current][key] ?? english[key];
  return words.replace(/\{(\w+)\}/g, (all, name: string) => (name in filling ? String(filling[name]) : all));
}

/** How many of a thing there are, in the words this language uses for that many. */
export function counted(many: number, thing: 'classroom' | 'student' | 'record'): string {
  return say(`counted.${thing}.${many === 1 ? 'one' : 'many'}` as WordKey, { many });
}

/**
 * The app's words, for a screen that must be redrawn the moment the language changes. Every screen
 * asks through this, so a teacher pressing a language in Settings sees the screen behind their
 * finger change with it.
 */
export function useWords(): typeof say {
  const [, bump] = useState(0);
  useEffect(() => onLanguageChange(() => bump((n) => n + 1)), []);
  return say;
}

/** Which way the screens read, for a screen that must be redrawn the moment that changes. */
export function useDirection(): 'ltr' | 'rtl' {
  useWords();
  return direction();
}
