// The teacher accounts kept on this phone, and the only way to open one.
//
// A record keeps nothing in the clear: not the password, and not even the email. What it keeps is a
// locked blob and a seal over it. The key is the password itself, stretched; so a record opens only
// for the password it was locked with, and an email can only be read out of a record that opened.
// Nothing here reaches off the phone, and nothing here is ever logged.
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

/** Locks a teacher's details into a record only this password can open. */
export function lockAccount(credentials: Credentials, profile: TeacherProfile, iterations?: number): AccountRecord {
  throw new Error('lockAccount is not written yet');
}

/** Opens a record with these credentials, or answers null when it is not theirs. */
export function openAccount(record: AccountRecord, credentials: Credentials): TeacherProfile | null {
  throw new Error('openAccount is not written yet');
}

/** Where the records live. The phone's own store behind one seam, so a check can hand over its own. */
export type AccountsFile = {
  read(): Promise<AccountRecord[]>;
  write(records: AccountRecord[]): Promise<void>;
};

/** An accounts file holding these records, and nothing else. */
export function accountsIn(records: AccountRecord[]): AccountsFile {
  throw new Error('accountsIn is not written yet');
}

/** Keeps the accounts in this file from now on. */
export function keepAccountsIn(file: AccountsFile): void {
  throw new Error('keepAccountsIn is not written yet');
}

/** The accounts file in use. */
export function accountsFile(): AccountsFile {
  throw new Error('accountsFile is not written yet');
}

/**
 * The teacher whose record on this phone opens with these credentials, or null when none does.
 * This is the whole of the check: the phone's own records, opened on the phone, and nothing else.
 */
export async function teacherMatching(credentials: Credentials): Promise<TeacherProfile | null> {
  throw new Error('teacherMatching is not written yet');
}
