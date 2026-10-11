// The language the phone itself is set to.
//
// A teacher never sets ClasseMe's language up: their phone is already in the language they read,
// and the app opens in it. What the phone says is behind one seam, the way the choice kept on it is
// (lib/language-file.ts), so a check can hand over a phone set to French and never load a phone's
// own native module to do it. The app's root installs the real one — see app/_layout.tsx.

/** What a phone says it is set to: the language tags it hands an app, the one it prefers first. */
export type PhoneTongues = () => readonly string[];

/** A phone that has not been asked, and so has said nothing: what a check starts from. */
const saidNothing: PhoneTongues = () => [];

let asked: PhoneTongues = saidNothing;

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
