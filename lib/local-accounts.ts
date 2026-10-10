// The teacher accounts kept on this phone, and the only way to open one.
//
// A record keeps nothing in the clear: not the password, and not even the email. What it keeps is a
// locked blob and a seal over it — a sealed box (lib/sealed-box.ts), the same lock a backup file
// carries. The key is the password itself, stretched; so a record opens only for the password it was
// locked with, and an email can only be read out of a record that opened. Nothing here reaches off
// the phone, and nothing here is ever logged.
import { sha256, sameBytes, utf8 } from './crypto';
import { openBox, sealBox, stretchedTimes, type SealedBox } from './sealed-box';
import type { Credentials } from './sign-in';

/**
 * What is known about a teacher once their record opens. Kept inside the locked blob, never beside
 * it: the name a teacher is greeted by is as much theirs as the email they sign in with, so it is
 * locked with the same password and readable nowhere else.
 */
export type TeacherProfile = {
  email: string;
  /** The name the school knows them by — 'Ms. Rivera'. A record made before names were kept has none. */
  name?: string;
};

/** One teacher's account as it sits on the phone: locked, sealed, and saying nothing about who it is. */
export type AccountRecord = SealedBox;

/** The lock a teacher's own record is under, told apart from the lock on anything else. */
const accountLock = 'classme/account';

/** How many times a sign-in password is stretched. The same number a backup file is locked with. */
export { stretchedTimes };

/** The same email, written two ways, is the same teacher. The password is never treated so kindly. */
const sameEmail = (one: string, other: string) =>
  sameBytes(sha256(utf8(one.trim().toLowerCase())), sha256(utf8(other.trim().toLowerCase())));

/** Locks a teacher's details into a record that only this password opens. */
export function lockAccount(credentials: Credentials, profile: TeacherProfile, iterations: number = stretchedTimes): AccountRecord {
  const name = profile.name?.trim();
  const inside = JSON.stringify(name ? { email: profile.email, name } : { email: profile.email });
  return sealBox(inside, credentials.password, accountLock, iterations);
}

/**
 * Opens a record with these credentials, or answers null when it is not theirs.
 *
 * Null is one answer to three different things — a wrong password, another teacher's record, a
 * record somebody edited — on purpose: a caller that could tell them apart could be asked which
 * emails this phone knows.
 */
export function openAccount(record: AccountRecord, credentials: Credentials): TeacherProfile | null {
  const opened = openBox(record, credentials.password, accountLock);
  if (opened === null) return null;

  let inside: { email?: unknown; name?: unknown };
  try {
    inside = JSON.parse(opened);
  } catch {
    return null;
  }
  if (typeof inside.email !== 'string') return null;

  // The record opened — and it is this teacher's only if the email in it is the one they typed.
  if (!sameEmail(inside.email, credentials.email)) return null;
  // A record from before names were kept has none, and says so by leaving it out rather than by
  // offering an empty one: whoever greets this teacher then has only their email to go on.
  const name = typeof inside.name === 'string' ? inside.name.trim() : '';
  return name ? { email: inside.email, name } : { email: inside.email };
}

/** Where the records live: the phone's own store behind one seam, so a check can hand over its own. */
export type AccountsFile = {
  read(): Promise<AccountRecord[]>;
  write(records: AccountRecord[]): Promise<void>;
};

/** An accounts file holding these records, and nothing else. */
export function accountsIn(records: AccountRecord[]): AccountsFile {
  let kept = [...records];
  return {
    async read() {
      return [...kept];
    },
    async write(next) {
      kept = [...next];
    },
  };
}

// Where the accounts are kept while the app is running. It starts empty and nothing has written to
// it yet: a teacher's records outlasting the app being closed is its own requirement, and when it
// arrives this one line is what it replaces — everything else already reads what is here.
let file: AccountsFile = accountsIn([]);

/** Keeps the accounts in this file from now on. */
export function keepAccountsIn(next: AccountsFile): void {
  file = next;
}

/** The accounts file in use. */
export function accountsFile(): AccountsFile {
  return file;
}

/**
 * The teacher whose record on this phone opens with these credentials, or null when none does.
 * This is the whole of the check: the phone's own records, opened on the phone, and nothing else.
 */
export async function teacherMatching(credentials: Credentials): Promise<TeacherProfile | null> {
  const records = await accountsFile().read();
  for (const record of records) {
    const teacher = openAccount(record, credentials);
    if (teacher) return teacher;
  }
  return null;
}
