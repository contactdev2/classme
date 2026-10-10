// The teacher accounts kept on this phone, and the only way to open one.
//
// A record keeps nothing in the clear: not the password, and not even the email. What it keeps is a
// locked blob and a seal over it. The key is the password itself, stretched; so a record opens only
// for the password it was locked with, and an email can only be read out of a record that opened.
// Nothing here reaches off the phone, and nothing here is ever logged.
import { bytesFromHex, hex, hmacSha256, pbkdf2Sha256, sameBytes, sha256, textFromUtf8, unguessableBytes, utf8 } from './crypto';
import type { Credentials } from './sign-in';

/** What is known about a teacher once their record opens. Kept inside the locked blob, never beside it. */
export type TeacherProfile = { email: string };

/** One teacher's account as it sits on the phone: locked, sealed, and saying nothing about who it is. */
export type AccountRecord = {
  version: 1;
  /** This record's own salt, so the same password on two phones stretches to two different keys. */
  salt: string;
  /** How many times the password was stretched to make this record's key. */
  iterations: number;
  /** This record's own nonce, so no two records are locked with the same keystream. */
  nonce: string;
  /** The locked blob: what the record knows, unreadable without the password. */
  locked: string;
  /** The seal over the locked blob, so a wrong password is told from a tampered record. */
  seal: string;
};

/**
 * How many times a password is stretched into a key. Every one of them costs whoever took the phone
 * the same again per guess, so the number wants to be as large as a teacher will wait for: this is
 * about a second of a phone's own arithmetic, done once per sign-in and never on a server. A record
 * carries the number it was made with, so raising it later leaves older records opening as they did.
 */
export const stretchedTimes = 50_000;

/** The two keys a password becomes: one to lock the blob with, one to seal it with. Never the same. */
function keysFrom(credentials: Credentials, salt: Uint8Array, iterations: number) {
  const stretched = pbkdf2Sha256(utf8(credentials.password), salt, iterations, 32);
  return {
    locking: hmacSha256(stretched, utf8('classme/account/locking')),
    sealing: hmacSha256(stretched, utf8('classme/account/sealing')),
  };
}

/** The bytes a blob is locked with: HMAC-SHA256 counted up from this record's own nonce. */
function keystream(key: Uint8Array, nonce: Uint8Array, length: number): Uint8Array {
  const stream = new Uint8Array(length);
  const counted = new Uint8Array(nonce.length + 4);
  counted.set(nonce);
  const counter = new DataView(counted.buffer);
  for (let block = 0; block * 32 < length; block++) {
    counter.setUint32(nonce.length, block);
    stream.set(hmacSha256(key, counted).subarray(0, Math.min(32, length - block * 32)), block * 32);
  }
  return stream;
}

/** Bytes locked, or the same bytes unlocked: one keystream, laid over them either way. */
function locked(key: Uint8Array, nonce: Uint8Array, bytes: Uint8Array): Uint8Array {
  const stream = keystream(key, nonce, bytes.length);
  const out = new Uint8Array(bytes.length);
  for (let at = 0; at < bytes.length; at++) out[at] = bytes[at] ^ stream[at];
  return out;
}

/** The seal over everything a record keeps, so no part of it can be changed without the password. */
function sealOver(sealing: Uint8Array, record: Omit<AccountRecord, 'seal'>): Uint8Array {
  return hmacSha256(sealing, utf8([record.version, record.salt, record.iterations, record.nonce, record.locked].join('|')));
}

/** The same email, written two ways, is the same teacher. The password is never treated so kindly. */
const sameEmail = (one: string, other: string) =>
  sameBytes(sha256(utf8(one.trim().toLowerCase())), sha256(utf8(other.trim().toLowerCase())));

/** Locks a teacher's details into a record that only this password opens. */
export function lockAccount(credentials: Credentials, profile: TeacherProfile, iterations: number = stretchedTimes): AccountRecord {
  const salt = unguessableBytes(16);
  const nonce = unguessableBytes(16);
  const { locking, sealing } = keysFrom(credentials, salt, iterations);
  const inside = utf8(JSON.stringify({ email: profile.email }));
  const sealless = {
    version: 1 as const,
    salt: hex(salt),
    iterations,
    nonce: hex(nonce),
    locked: hex(locked(locking, nonce, inside)),
  };
  return { ...sealless, seal: hex(sealOver(sealing, sealless)) };
}

/**
 * Opens a record with these credentials, or answers null when it is not theirs.
 *
 * Null is one answer to three different things — a wrong password, another teacher's record, a
 * record somebody edited — on purpose: a caller that could tell them apart could be asked which
 * emails this phone knows.
 */
export function openAccount(record: AccountRecord, credentials: Credentials): TeacherProfile | null {
  if (record.version !== 1 || record.iterations < 1) return null;
  let salt: Uint8Array;
  let nonce: Uint8Array;
  let blob: Uint8Array;
  let seal: Uint8Array;
  try {
    salt = bytesFromHex(record.salt);
    nonce = bytesFromHex(record.nonce);
    blob = bytesFromHex(record.locked);
    seal = bytesFromHex(record.seal);
  } catch {
    return null;
  }

  const { locking, sealing } = keysFrom(credentials, salt, record.iterations);
  // The seal first: nothing inside the blob is read until the password has proved it belongs to it.
  if (!sameBytes(sealOver(sealing, record), seal)) return null;

  let inside: { email?: unknown };
  try {
    inside = JSON.parse(textFromUtf8(locked(locking, nonce, blob)));
  } catch {
    return null;
  }
  if (typeof inside.email !== 'string') return null;

  // The record opened — and it is this teacher's only if the email in it is the one they typed.
  return sameEmail(inside.email, credentials.email) ? { email: inside.email } : null;
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
