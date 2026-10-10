// A backup file: everything a teacher's phone knows about their teaching, locked into one file they
// can keep somewhere safe and put back on another phone.
//
// What makes it safe to keep is that it says nothing. The classrooms, the students and every
// attendance mark go inside a sealed box (lib/sealed-box.ts), locked with a password of the
// teacher's own choosing and nothing the app knows — there is no key in this app, and no server to
// ask for one, so a backup opens for whoever has that password and for nobody else.
//
// Nothing here writes a file or reads one: where a backup goes is lib/backup-files.ts, and it goes
// nowhere but the phone it was made on.
import { classroomDataIfWhole, type ClassroomData } from './classroom-data';
import { openBox, sealBox, stretchedTimes, type SealedBox } from './sealed-box';

/** The lock a backup is under, told apart from the lock on a teacher's own sign-in record. */
const backupLock = 'classme/backup';

/** What a backup file ends in, so a teacher can see which of their files is one. */
export const backupExtension = '.classmebackup';

/**
 * A backup file, read as a whole. Only `box` holds any of the teacher's data; what is beside it says
 * what kind of file this is and when it was made, which is what lets the app recognise one and a
 * teacher tell two of them apart. Neither names a classroom, a student, or a day anybody was absent.
 */
export type BackupFile = {
  product: 'ClassMe';
  kind: 'classroom-backup';
  version: 1;
  madeAt: string;
  box: SealedBox;
};

const two = (n: number) => String(n).padStart(2, '0');

/**
 * What a backup made at this moment is called: the app, the day and the time, by the phone's own
 * clock. Named this way, a folder of backups sorts itself into the order they were made.
 */
export function backupFileName(madeAt: Date): string {
  const day = [madeAt.getFullYear(), two(madeAt.getMonth() + 1), two(madeAt.getDate())].join('-');
  const time = [two(madeAt.getHours()), two(madeAt.getMinutes()), two(madeAt.getSeconds())].join('');
  return `classme-backup-${day}-${time}${backupExtension}`;
}

/**
 * Makes the backup file's own contents: this data, locked with this password, as the text that goes
 * into the file. The password is never kept — not in the file, not beside it, not anywhere — so a
 * teacher who forgets it has a file nobody can open, and that is the honest price of a file nobody
 * else can open either.
 */
export function makeBackup(
  data: ClassroomData,
  password: string,
  madeAt: Date = new Date(),
  iterations: number = stretchedTimes,
): string {
  const file: BackupFile = {
    product: 'ClassMe',
    kind: 'classroom-backup',
    version: 1,
    madeAt: madeAt.toISOString(),
    box: sealBox(JSON.stringify(data), password, backupLock, iterations),
  };
  return JSON.stringify(file);
}

/** When this backup was made, or null when the file is not one this app recognises. */
export function backupMadeAt(file: string): string | null {
  try {
    const read = JSON.parse(file) as Partial<BackupFile>;
    return read?.kind === 'classroom-backup' && typeof read.madeAt === 'string' ? read.madeAt : null;
  } catch {
    return null;
  }
}

/**
 * Opens a backup file with this password, or answers null when it does not open.
 *
 * Null is the one answer to a wrong password, a file somebody edited and a file that was never a
 * backup: all three mean the same thing to a teacher restoring, which is that this is not the file
 * and password that go together.
 */
export function openBackup(file: string, password: string): ClassroomData | null {
  let read: Partial<BackupFile>;
  try {
    read = JSON.parse(file) as Partial<BackupFile>;
  } catch {
    return null;
  }
  if (read?.product !== 'ClassMe' || read.kind !== 'classroom-backup' || read.version !== 1 || !read.box) return null;

  const inside = openBox(read.box, password, backupLock);
  if (inside === null) return null;
  try {
    return classroomDataIfWhole(JSON.parse(inside));
  } catch {
    return null;
  }
}
