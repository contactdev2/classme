// The app's words, in the language a teacher chose.
//
// A screen asks for a key and gets words: say('login.logIn'). Which language those words come from
// is one answer for the whole app, kept here, and changed by the picker in Classroom Settings. The
// choice is remembered on the phone (lib/language-file.ts) so the next morning opens in it too.
import { useEffect, useState } from 'react';
import { languageFile } from './language-file';
import { defaultLanguage, isLanguage, readsRightToLeft, type Tag } from './languages';
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
 * arithmetic standard, and a sentence whose only English part is a brace. Every other key in every
 * other catalogue says something of its own — see the check that reads this list.
 */
export const wordsAllowedToStay: readonly WordKey[] = [
  'login.emailPlaceholder',
  'privacy.standardValue',
  'home.greetingLine',
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

/** The language a teacher chose: applied now, and kept so the app opens in it next time. */
export async function rememberLanguage(tag: Tag): Promise<void> {
  setLanguage(tag);
  try {
    await languageFile().write(tag);
  } catch {
    // A phone that would not keep the choice still shows it: the screens are already in it, and a
    // teacher is not told off about a file they never asked for.
  }
}

/** The language last chosen on this phone, put back. Nothing kept means the default stands. */
export async function recallLanguage(): Promise<Tag> {
  try {
    const kept = await languageFile().read();
    if (isLanguage(kept)) setLanguage(kept);
  } catch {
    // Nothing kept, or nothing readable: the app opens in its default, which is what it does anyway.
  }
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
