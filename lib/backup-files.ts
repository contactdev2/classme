// Where a backup file goes: a folder on the teacher's own phone, and nowhere else.
//
// There is no upload here and no address to upload to. A backup is written into the app's own
// documents folder, which is the phone's, and a teacher moves it off the phone themselves if they
// want it somewhere else — by the phone's own sharing, in their own hands, on purpose.
import { backupExtension } from './backup';
import { say } from './i18n';

/** The folder a teacher's backups are kept in, inside the app's own documents. */
export const backupFolderName = 'ClassMe backups';

/**
 * Where the backups are. Behind one seam, so a check can hand over a folder of its own and never
 * load a phone's native file module to do it.
 */
export type BackupFiles = {
  /** Where these backups are kept, in words a teacher can be told. */
  where(): string;
  /** Writes this backup under this name, and answers the name it was saved as. */
  save(name: string, contents: string): Promise<string>;
  /** Reads back a backup saved before. */
  read(name: string): Promise<string>;
  /** The backups already saved here, newest first. */
  saved(): Promise<string[]>;
};

/** Newest first, which for a backup's own name is the same as the order they were made in. */
const newestFirst = (names: string[]) => [...names].sort().reverse();

/** A folder holding these backups and nothing else, kept for as long as the app runs. */
export function backupFilesIn(files: Record<string, string> = {}): BackupFiles {
  const kept = new Map(Object.entries(files));
  return {
    where: () => say('backup.wherePhone'),
    async save(name, contents) {
      kept.set(name, contents);
      return name;
    },
    async read(name) {
      const found = kept.get(name);
      if (found === undefined) throw new Error('there is no backup saved under that name');
      return found;
    },
    async saved() {
      return newestFirst([...kept.keys()]);
    },
  };
}

/**
 * The folder on the phone itself: expo-file-system's own, inside the app's documents directory.
 *
 * It is asked for when a backup is actually being written, not when this module loads, so a check
 * that hands over its own folder never loads a native module it has no phone for — and so a teacher
 * who never opens Settings never pays for it either.
 */
function onThisPhone(): BackupFiles {
  const folder = async () => {
    const phone = await import('expo-file-system');
    if (!phone.documentDirectory) throw new Error('this device offers no folder of its own to keep a backup in');
    const where = `${phone.documentDirectory}${encodeURIComponent(backupFolderName)}/`;
    await phone.makeDirectoryAsync(where, { intermediates: true });
    return { phone, where };
  };
  return {
    where: () => say('backup.whereFolder', { folder: backupFolderName }),
    async save(name, contents) {
      const { phone, where } = await folder();
      await phone.writeAsStringAsync(`${where}${name}`, contents);
      return name;
    },
    async read(name) {
      const { phone, where } = await folder();
      return phone.readAsStringAsync(`${where}${name}`);
    },
    async saved() {
      const { phone, where } = await folder();
      return newestFirst((await phone.readDirectoryAsync(where)).filter((name) => name.endsWith(backupExtension)));
    },
  };
}

let files: BackupFiles = onThisPhone();

/** Keeps the backups in this folder from now on. */
export function keepBackupFilesIn(next: BackupFiles): void {
  files = next;
}

/** The folder the backups are kept in. */
export function backupFiles(): BackupFiles {
  return files;
}
