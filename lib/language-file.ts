// Where the language a teacher chose is kept, so the app opens in it next time.
//
// One line in one small file on the phone itself: no account, no network, nowhere else. Behind one
// seam, the way the backups are (lib/backup-files.ts), so a check can hand over a file of its own
// and never load a phone's native file module to do it.
import { isLanguage, type Tag } from './languages';

/** The one thing kept: the language last chosen, or nothing when none has been. */
export type LanguageFile = {
  read(): Promise<Tag | null>;
  write(tag: Tag): Promise<void>;
};

/** A file holding this choice and nothing else, kept for as long as the app runs. */
export function languageFileWith(chosen: Tag | null = null): LanguageFile {
  let kept = chosen;
  return {
    async read() {
      return kept;
    },
    async write(tag) {
      kept = tag;
    },
  };
}

/** What the file is called on the phone. */
export const languageFileName = 'classme-language.txt';

/**
 * The file on the phone itself: expo-file-system's own, in the app's documents directory. Asked for
 * when the choice is actually read or written, not when this module loads, so a check that hands
 * over its own file never loads a native module it has no phone for.
 */
function onThisPhone(): LanguageFile {
  const where = async () => {
    const phone = await import('expo-file-system');
    if (!phone.documentDirectory) throw new Error('this device offers no folder of its own to keep a choice in');
    return { phone, path: `${phone.documentDirectory}${languageFileName}` };
  };
  return {
    async read() {
      const { phone, path } = await where();
      const kept = (await phone.readAsStringAsync(path)).trim();
      return isLanguage(kept) ? kept : null;
    },
    async write(tag) {
      const { phone, path } = await where();
      await phone.writeAsStringAsync(path, tag);
    },
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
