// The language the phone itself is set to.
//
// A teacher never sets ClasseMe's language up: their phone is already in the language they read,
// and the app opens in it. What the phone says is behind one seam, the way the choice kept on it is
// (lib/language-file.ts), so a check can hand over a phone set to French and never load a phone's
// own native module to do it. The app's root installs the real one — see app/_layout.tsx.
import { languages, sourceLanguage, type Tag } from './languages';

/** What a phone says it is set to: the language tags it hands an app, the one it prefers first. */
export type PhoneTongues = () => readonly string[];

/** A phone that has not been asked, and so has said nothing: what a check starts from. */
const saidNothing: PhoneTongues = () => [];

let asked: PhoneTongues = saidNothing;

/**
 * The phone itself, asked the two ways a phone answers.
 *
 * expo-localization reads the phone's own language settings: every language a teacher has put in
 * their phone's list, in the order they put them there. An app whose binary was built before that
 * module was asked for does not carry it — a DoneMark preview opened on an older test build is
 * exactly that — and rather than fall over, or ignore the phone altogether, the runtime's own idea
 * of where it is standing is taken instead, which on a phone is the phone's language. A runtime
 * with neither says nothing, and the app stays in the language it was already showing.
 */
export const thisPhoneItself: PhoneTongues = () => {
  const said: string[] = [];
  try {
    const { getLocales } = require('expo-localization') as typeof import('expo-localization');
    for (const one of getLocales()) if (one.languageTag) said.push(one.languageTag);
  } catch {
    // No such module in this build of the app: what follows is the other way of asking.
  }
  if (said.length) return said;
  try {
    return [new Intl.DateTimeFormat().resolvedOptions().locale];
  } catch {
    return [];
  }
};

/** Asks this phone, from now on. Installed once, at the app's root, on a phone that can answer. */
export function askThisPhone(ask: PhoneTongues): void {
  asked = ask;
}

/** A phone set to these languages, for a check that is holding no phone. */
export function phoneSaysItIsIn(...said: string[]): void {
  asked = said.length ? () => said : saidNothing;
}

/** What this phone says it is set to, or nothing at all from a phone that will not say. */
export function phoneLanguages(): readonly string[] {
  try {
    return asked() ?? [];
  } catch {
    // A phone that will not say leaves the app in the language it was already showing.
    return [];
  }
}

/** The language tag within a phone's own, which may carry a region and a script with it. */
const primaryOf = (tag: string): string => tag.toLowerCase().split(/[-_]/)[0];

/**
 * The language the app has words in for a phone set to this one, or nothing when it has none.
 *
 * A phone says more than a language: fr-FR, ar-EG, zh-Hans-CN. What the app answers to is the
 * language in front — every Chinese phone, written either way and in any region, is answered in
 * the Simplified Chinese the app has, that being the only Chinese it has words in.
 */
const offered = (said: string): Tag | null => {
  const want = primaryOf(said);
  if (want === primaryOf(sourceLanguage)) return sourceLanguage;
  return languages.find((one) => primaryOf(one.tag) === want)?.tag ?? null;
};

/**
 * The language the app shows a phone set to these: the first of them it has words in, and English —
 * the language its own words are written in — for a phone set to anything else. Nothing at all back
 * from the phone is not an answer and not a fallback: it is nothing to go on, and says so.
 */
export function languageForPhone(said: readonly string[]): Tag | null {
  for (const one of said) {
    const has = offered(one);
    if (has) return has;
  }
  return said.length ? sourceLanguage : null;
}

/** The language this phone asks the app to be in, or nothing from a phone that would not say. */
export const phoneLanguage = (): Tag | null => languageForPhone(phoneLanguages());
