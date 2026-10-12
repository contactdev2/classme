// Where a teacher's own records are kept between one morning and the next: a file on their phone.
//
// Until now the records lived in a variable, which is why a profile made at nine was gone by ten:
// the app had closed. They are kept here instead, as the text of one file in the app's own
// documents folder — the phone's, and nowhere else. Nothing is uploaded, nothing is asked of a
// network, and what is written down is what a record already is: a sealed box saying nothing about
// whose it is, not the password that opens it and not even the email inside it.
import type { AccountRecord, AccountsFile } from './local-accounts';

/** What the file is called in the app's own documents folder. */
export const accountsFileName = 'classme-accounts.json';

/**
 * A piece of text the phone keeps, behind one seam, so a check can hand over text of its own and
 * never load a phone's native file module to do it.
 */
export type KeptText = {
  /** What is in the file, or null where nothing has ever been written to it. */
  read(): Promise<string | null>;
  /** Writes this text, in place of whatever was there. */
  write(text: string): Promise<void>;
};

/** Text kept for as long as the app runs and no longer, for a check: nothing of a phone in it. */
export function textFileWith(text: string | null = null): KeptText {
  let kept = text;
  return {
    async read() {
      return kept;
    },
    async write(next) {
      kept = next;
    },
  };
}

/**
 * The file on the phone itself: expo-file-system's own, in the app's documents directory.
 *
 * It is asked for when a record is actually being read or written, not when this module loads, so a
 * check that hands over text of its own never reaches a native module it has no phone for.
 */
export function accountsTextOnThisPhone(): KeptText {
  const file = async () => {
    const phone = await import('expo-file-system');
    if (!phone.documentDirectory) throw new Error('this device offers no folder of its own to keep a record in');
    return { phone, at: `${phone.documentDirectory}${accountsFileName}` };
  };
  return {
    async read() {
      const { phone, at } = await file();
      const there = await phone.getInfoAsync(at);
      // Nothing written yet is not a fault: it is a phone nobody has signed up on.
      if (!there.exists) return null;
      return phone.readAsStringAsync(at);
    },
    async write(text) {
      const { phone, at } = await file();
      await phone.writeAsStringAsync(at, text);
    },
  };
}

/**
 * One record, as it is read back off a file that could in principle say anything — a file somebody
 * edited, or one from a version of this app that kept something else. Anything that is not the
 * shape a record is written in answers null, and is passed over rather than handed to the lock.
 */
function recordIfWhole(one: unknown): AccountRecord | null {
  if (!one || typeof one !== 'object') return null;
  const read = one as Record<string, unknown>;
  if (read.version !== 1) return null;
  if (typeof read.iterations !== 'number' || !Number.isInteger(read.iterations) || read.iterations < 1) return null;
  for (const word of ['salt', 'nonce', 'locked', 'seal']) if (typeof read[word] !== 'string') return null;
  if (read.at !== undefined && typeof read.at !== 'string') return null;
  const whole: AccountRecord = {
    version: 1,
    salt: read.salt as string,
    iterations: read.iterations,
    nonce: read.nonce as string,
    locked: read.locked as string,
    seal: read.seal as string,
  };
  return typeof read.at === 'string' ? { ...whole, at: read.at } : whole;
}

/**
 * The records in this file: read back off it whenever they are asked for, so the app always answers
 * from what the phone actually keeps, and written back whole whenever one is added.
 *
 * Text that is not the file this app writes answers no records at all, rather than refusing a
 * teacher the whole app: nothing in here could open a record it cannot read, and somebody holding
 * a phone whose file has been mangled must still be able to make a profile on it.
 */
export function accountsKeptIn(file: KeptText): AccountsFile {
  return {
    async read() {
      const text = await file.read();
      if (!text) return [];
      let read: unknown;
      try {
        read = JSON.parse(text);
      } catch {
        return [];
      }
      if (!Array.isArray(read)) return [];
      return read.map(recordIfWhole).filter((one): one is AccountRecord => one !== null);
    },
    async write(records) {
      await file.write(JSON.stringify(records));
    },
  };
}

/** The records this phone keeps, in the app's own documents folder. */
export function accountsOnThisPhone(): AccountsFile {
  return accountsKeptIn(accountsTextOnThisPhone());
}
