// The arithmetic a locked record is built from, written out here in plain TypeScript so it runs the
// same on a phone, in a browser and in a check, with nothing to install and nothing to call out to.
// Every piece is a published standard — SHA-256 (FIPS 180-4), HMAC (RFC 2104) and PBKDF2 (RFC 8018)
// — and lib/crypto.test.ts holds them to those standards' own published answers.

/** The bytes of a string, as UTF-8. */
export function utf8(text: string): Uint8Array {
  throw new Error('utf8 is not written yet');
}

/** Bytes, written out as hex, which is how a record keeps them. */
export function hex(bytes: Uint8Array): string {
  throw new Error('hex is not written yet');
}

/** Hex, read back as the bytes it was written from. */
export function bytesFromHex(text: string): Uint8Array {
  throw new Error('bytesFromHex is not written yet');
}

/** SHA-256 of these bytes. */
export function sha256(bytes: Uint8Array): Uint8Array {
  throw new Error('sha256 is not written yet');
}

/** HMAC-SHA256 of this message under this key. */
export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  throw new Error('hmacSha256 is not written yet');
}

/** PBKDF2-HMAC-SHA256: a password stretched into `length` bytes of key. */
export function pbkdf2Sha256(password: Uint8Array, salt: Uint8Array, iterations: number, length: number): Uint8Array {
  throw new Error('pbkdf2Sha256 is not written yet');
}

/** True when these two byte strings are the same, read in a time that does not depend on where they differ. */
export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  throw new Error('sameBytes is not written yet');
}

/** Bytes nobody can guess, for a salt or a nonce. */
export function unguessableBytes(length: number): Uint8Array {
  throw new Error('unguessableBytes is not written yet');
}
