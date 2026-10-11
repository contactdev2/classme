// Where the language the app is showing is kept, so it opens in the right one next time.
//
// Two things are kept, a line each in a small file of its own on the phone itself: the language the
// app is showing, and the phone language it was matched to when it started showing it. The second
// is what tells a teacher's own choice apart from a phone the app was simply following: a phone
// that has since been set to another language is followed again, and a choice made on a phone still
// set the way it was stands.
//
// No account, no network, nowhere else. Behind one seam, the way the backups are
// (lib/backup-files.ts), so a check can hand over files of its own and never load a phone's native
// file module to do it.
import { isLanguage, type Tag } from './languages';

/** What is kept: the language the app is showing, and the phone language it is matching. */
export type LanguageFile = {
  read(): Promise<Tag | null>;
  write(tag: Tag): Promise<void>;
  /** The phone's own language the shown one was matched to, or nothing from before it was kept. */
  readPhone(): Promise<Tag | null>;
  writePhone(tag: Tag): Promise<void>;
};

/** Files holding this and nothing else, kept for as long as the app runs. */
export function languageFileWith(shown: Tag | null = null, matching: Tag | null = null): LanguageFile {
  let kept = shown;
  let keptPhone = matching;
  return {
    async read() {
      return kept;
    },
    async write(tag) {
      kept = tag;
    },
    async readPhone() {
      return keptPhone;
    },
    async writePhone(tag) {
      keptPhone = tag;
    },
  };
}

/** What the file holding the shown language is called on the phone. */
export const languageFileName = 'classme-language.txt';

/** And the one beside it, holding the phone language that one was matched to. */
export const phoneLanguageFileName = 'classme-phone-language.txt';

/**
 * The file on the phone itself: expo-file-system's own, in the app's documents directory. Asked for
 * when the choice is actually read or written, not when this module loads, so a check that hands
 * over its own file never loads a native module it has no phone for.
 */
function onThisPhone(): LanguageFile {
  const where = async (name: string) => {
    const phone = await import('expo-file-system');
    if (!phone.documentDirectory) throw new Error('this device offers no folder of its own to keep a choice in');
    return { phone, path: `${phone.documentDirectory}${name}` };
  };
  const readFrom = async (name: string): Promise<Tag | null> => {
    const { phone, path } = await where(name);
    const kept = (await phone.readAsStringAsync(path)).trim();
    return isLanguage(kept) ? kept : null;
  };
  const writeTo = async (name: string, tag: Tag): Promise<void> => {
    const { phone, path } = await where(name);
    await phone.writeAsStringAsync(path, tag);
  };
  return {
    read: () => readFrom(languageFileName),
    write: (tag) => writeTo(languageFileName, tag),
    readPhone: () => readFrom(phoneLanguageFileName),
    writePhone: (tag) => writeTo(phoneLanguageFileName, tag),
  };
}

let file: LanguageFile = onThisPhone();

/** Keeps the language choice in this file from now on. */
export function keepLanguageIn(next: LanguageFile): void {
  file = next;
}

/** The file the language choice is kept in. */
export function languageFile(): LanguageFile {
  return file;
}
