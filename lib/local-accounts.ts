// The teacher accounts kept on this phone, and the only way to open one.
//
// A record keeps nothing in the clear: not the password, and not even the email. What it keeps is a
// locked blob and a seal over it — a sealed box (lib/sealed-box.ts), the same lock a backup file
// carries. The key is the password itself, stretched; so a record opens only for the password it was
// locked with, and an email can only be read out of a record that opened. Nothing here reaches off
// the phone, and nothing here is ever logged.
import { bytesFromHex, hex, hmacSha256, pbkdf2Sha256, sha256, sameBytes, utf8 } from './crypto';
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
  /**
   * The school they teach at — 'Riverside High'. Their own profile menu shows it under their name.
   * Optional, as the name is: a record made before schools were kept opens exactly as it did, and
   * a teacher who did not give one is not given one by the app.
   */
  school?: string;
};

/**
 * One teacher's account as it sits on the phone: locked, sealed, and saying nothing about who it is
 * — beyond the one thing the phone has to be able to ask without a password, which is whether some
 * record here is already this email's. That is the mark: see markOf below for what it costs to read.
 */
export type AccountRecord = SealedBox & {
  /** This record's email, marked rather than written — see markOf. A record made before is unmarked. */
  at?: string;
};

/** The lock a teacher's own record is under, told apart from the lock on anything else. */
const accountLock = 'classme/account';

/** How many times a sign-in password is stretched. The same number a backup file is locked with. */
export { stretchedTimes };

/** An email as the one spelling two ways of writing the same address agree on. */
const oneSpelling = (email: string) => email.trim().toLowerCase();

/** The same email, written two ways, is the same teacher. The password is never treated so kindly. */
const sameEmail = (one: string, other: string) =>
  sameBytes(sha256(utf8(oneSpelling(one))), sha256(utf8(oneSpelling(other))));

/**
 * This email's mark under one record's own salt: what lets the phone say "a profile already uses
 * that email" without opening a single record, and the only thing a record says about itself.
 *
 * It is the email stretched exactly as a password is — this record's salt, this record's number of
 * stretches — and not a plain hash of it, on purpose. A plain hash of an address is as good as the
 * address: there are not many to try, and whoever took the phone could try them all in a second.
 * Marked this way, every guess at the email costs the same arithmetic as a guess at the password,
 * which is the price the rest of this file is already built around.
 */
function markOf(email: string, salt: string, iterations: number): string {
  const stretched = pbkdf2Sha256(utf8(oneSpelling(email)), bytesFromHex(salt), iterations, 32);
  return hex(hmacSha256(stretched, utf8(`${accountLock}/mark`)));
}

/** Locks a teacher's details into a record that only this password opens. */
export function lockAccount(credentials: Credentials, profile: TeacherProfile, iterations: number = stretchedTimes): AccountRecord {
  const name = profile.name?.trim();
  const school = profile.school?.trim();
  // Inside the lock, and only what the teacher gave: a field they left empty is left out of the
  // record rather than written into it empty, so a record keeps nothing it was not told.
  const inside = JSON.stringify({
    email: profile.email,
    ...(name ? { name } : {}),
    ...(school ? { school } : {}),
  });
  const box = sealBox(inside, credentials.password, accountLock, iterations);
  return { ...box, at: markOf(profile.email, box.salt, box.iterations) };
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

  let inside: { email?: unknown; name?: unknown; school?: unknown };
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
  // The school is kept the same way, and read back the same way: a record that has none says so by
  // leaving it out, and the profile menu then says the school has not been added rather than
  // showing one this teacher never typed.
  const school = typeof inside.school === 'string' ? inside.school.trim() : '';
  return { email: inside.email, ...(name ? { name } : {}), ...(school ? { school } : {}) };
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
 * Whether some record this phone keeps is already this email's, which is the one question signing
 * up has to ask and signing in never does.
 *
 * A record from before records were marked answers for nothing: it is passed over here rather than
 * opened, because opening it would need the password of whoever made it. So the worst this can do
 * is let a second record for one email stand beside an old unmarked one — never refuse a teacher
 * an email nobody has, and never a reason to open a record that is not the asker's.
 */
export async function emailAlreadyUsed(email: string): Promise<boolean> {
  for (const record of (await recordsKept()) ?? []) {
    if (typeof record.at !== 'string') continue;
    try {
      if (sameBytes(bytesFromHex(record.at), bytesFromHex(markOf(email, record.salt, record.iterations)))) return true;
    } catch {
      // A record whose salt or mark is not hex is not a record this phone wrote. It marks nothing.
    }
  }
  return false;
}

/**
 * What this phone keeps, or none of it where the phone will not say.
 *
 * A phone that cannot be read answers no records rather than refusing the asker, because of what
 * the two callers below do with the answer: signing up asks whether an email is taken, and a phone
 * that will not say has taken nothing — a profile is still made, and the one thing that could go
 * wrong is a second record beside one nobody could read. Being told instead that the profile could
 * not be created leaves a teacher with no profile at all, which is strictly worse.
 */
async function recordsKept(): Promise<AccountRecord[] | null> {
  try {
    return await accountsFile().read();
  } catch {
    return null;
  }
}

/**
 * Keeps one more record on this phone, beside the ones already here and without touching them, and
 * answers whether the phone really wrote it down.
 *
 * Never throws, and never writes over what it could not read. A file this app cannot read could be
 * holding another teacher's record, so the records are left exactly as they are and the caller is
 * told the profile is not written down — rather than a teacher losing somebody else's profile, or
 * their own being refused.
 */
export async function addAccount(record: AccountRecord): Promise<boolean> {
  const kept = await recordsKept();
  if (kept === null) return false;
  try {
    await accountsFile().write([...kept, record]);
    return true;
  } catch {
    return false;
  }
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
