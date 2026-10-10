// A secret, locked into something a phone can keep and only a password can open.
//
// This is the plumbing a teacher's own sign-in record has been locked with since the sign-in was
// built, now in one place because a backup file is locked exactly the same way: the password is
// stretched into two keys, one that locks the secret and one that seals it, and the seal is checked
// before a single byte inside is read. The arithmetic underneath is lib/crypto.ts — written out, so
// nothing is installed for it and nothing is asked of a server.
//
// A box says nothing about what is in it. Whoever reads one off a phone reads a salt, a nonce, a
// count and two runs of hex, and no amount of staring at them says whose data it is.
import { bytesFromHex, hex, hmacSha256, pbkdf2Sha256, sameBytes, textFromUtf8, unguessableBytes, utf8 } from './crypto';

/**
 * How many times a password is stretched into a key. Every one of them costs whoever took the phone
 * the same again per guess, so the number wants to be as large as a person will wait for: this is
 * about a second of a phone's own arithmetic, done once, and never on a server. A box carries the
 * number it was made with, so raising it later leaves older boxes opening as they did.
 */
export const stretchedTimes = 50_000;

/** A locked secret as it sits on a phone, or in a file: unreadable, sealed, and saying nothing. */
export type SealedBox = {
  version: 1;
  /** This box's own salt, so the same password on two phones stretches to two different keys. */
  salt: string;
  /** How many times the password was stretched to make this box's keys. */
  iterations: number;
  /** This box's own nonce, so no two boxes are locked with the same keystream. */
  nonce: string;
  /** The locked secret itself, unreadable without the password. */
  locked: string;
  /** The seal over every field above, so a wrong password is told from a tampered box. */
  seal: string;
};

/**
 * The two keys a password becomes: one to lock with, one to seal with, never the same. The domain
 * is what keeps them apart from another kind of box's keys — a backup's keys and an account's keys
 * are different keys even when a teacher types the same password into both.
 */
function keysFrom(password: string, domain: string, salt: Uint8Array, iterations: number) {
  const stretched = pbkdf2Sha256(utf8(password), salt, iterations, 32);
  return {
    locking: hmacSha256(stretched, utf8(`${domain}/locking`)),
    sealing: hmacSha256(stretched, utf8(`${domain}/sealing`)),
  };
}

/** The bytes a secret is locked with: HMAC-SHA256 counted up from this box's own nonce. */
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
function underKeystream(key: Uint8Array, nonce: Uint8Array, bytes: Uint8Array): Uint8Array {
  const stream = keystream(key, nonce, bytes.length);
  const out = new Uint8Array(bytes.length);
  for (let at = 0; at < bytes.length; at++) out[at] = bytes[at] ^ stream[at];
  return out;
}

/** The seal over everything a box keeps, so no part of it can be changed without the password. */
function sealOver(sealing: Uint8Array, box: Omit<SealedBox, 'seal'>): Uint8Array {
  return hmacSha256(sealing, utf8([box.version, box.salt, box.iterations, box.nonce, box.locked].join('|')));
}

/** Locks this secret into a box that only this password, under this domain, opens. */
export function sealBox(secret: string, password: string, domain: string, iterations: number = stretchedTimes): SealedBox {
  const salt = unguessableBytes(16);
  const nonce = unguessableBytes(16);
  const { locking, sealing } = keysFrom(password, domain, salt, iterations);
  const sealless = {
    version: 1 as const,
    salt: hex(salt),
    iterations,
    nonce: hex(nonce),
    locked: hex(underKeystream(locking, nonce, utf8(secret))),
  };
  return { ...sealless, seal: hex(sealOver(sealing, sealless)) };
}

/**
 * Opens a box with this password, or answers null when the password is not the one that locked it.
 *
 * Null is the one answer to a wrong password, a box of another kind, and a box somebody edited — on
 * purpose: a caller that could tell them apart could be asked what it is looking at.
 */
export function openBox(box: SealedBox, password: string, domain: string): string | null {
  if (box?.version !== 1 || typeof box.iterations !== 'number' || box.iterations < 1) return null;
  let salt: Uint8Array;
  let nonce: Uint8Array;
  let locked: Uint8Array;
  let seal: Uint8Array;
  try {
    salt = bytesFromHex(box.salt);
    nonce = bytesFromHex(box.nonce);
    locked = bytesFromHex(box.locked);
    seal = bytesFromHex(box.seal);
  } catch {
    return null;
  }

  const { locking, sealing } = keysFrom(password, domain, salt, box.iterations);
  // The seal first: nothing inside is read until the password has proved it belongs to this box.
  if (!sameBytes(sealOver(sealing, box), seal)) return null;
  return textFromUtf8(underKeystream(locking, nonce, locked));
}
