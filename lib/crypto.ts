// The arithmetic a locked record is built from, written out here in plain TypeScript so it runs the
// same on a phone, in a browser and in a check, with nothing to install and nothing to call out to.
// Every piece is a published standard — SHA-256 (FIPS 180-4), HMAC (RFC 2104) and PBKDF2 (RFC 8018)
// — and lib/crypto.test.ts holds them to those standards' own published answers, and to the answers
// Node's own crypto gives for the same input.

/** SHA-256's round constants: the first 32 bits of the cube roots of the first 64 primes. */
const roundConstants = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** SHA-256's starting state: the first 32 bits of the square roots of the first eight primes. */
const startingState = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

const rotate = (word: number, by: number) => ((word >>> by) | (word << (32 - by))) >>> 0;

/** The bytes of a string, as UTF-8. Written out, so no global has to be there for it. */
export function utf8(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const character of text) {
    const code = character.codePointAt(0)!;
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
  }
  return new Uint8Array(bytes);
}

/** UTF-8 bytes, read back as the string they were written from. */
export function textFromUtf8(bytes: Uint8Array): string {
  let text = '';
  for (let at = 0; at < bytes.length; ) {
    const first = bytes[at];
    const following = first < 0x80 ? 0 : first < 0xe0 ? 1 : first < 0xf0 ? 2 : 3;
    let code = following === 0 ? first : first & (0x3f >> following);
    for (let more = 1; more <= following; more++) code = (code << 6) | (bytes[at + more] & 0x3f);
    text += String.fromCodePoint(code);
    at += following + 1;
  }
  return text;
}

/** Bytes, written out as hex, which is how a record keeps them. */
export function hex(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += byte.toString(16).padStart(2, '0');
  return text;
}

/** Hex, read back as the bytes it was written from. */
export function bytesFromHex(text: string): Uint8Array {
  if (text.length % 2 !== 0 || /[^0-9a-f]/i.test(text)) throw new Error('that is not hex');
  const bytes = new Uint8Array(text.length / 2);
  for (let at = 0; at < bytes.length; at++) bytes[at] = Number.parseInt(text.slice(at * 2, at * 2 + 2), 16);
  return bytes;
}

/** SHA-256 of these bytes. */
export function sha256(bytes: Uint8Array): Uint8Array {
  const state = [...startingState];

  // The message, with the one bit and the bit count the standard ends it with.
  const padded = new Uint8Array((Math.floor((bytes.length + 8) / 64) + 1) * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const reading = new DataView(padded.buffer);
  const bits = bytes.length * 8;
  reading.setUint32(padded.length - 8, Math.floor(bits / 2 ** 32));
  reading.setUint32(padded.length - 4, bits >>> 0);

  const schedule = new Uint32Array(64);
  for (let block = 0; block < padded.length; block += 64) {
    for (let at = 0; at < 16; at++) schedule[at] = reading.getUint32(block + at * 4);
    for (let at = 16; at < 64; at++) {
      const before = schedule[at - 15];
      const near = schedule[at - 2];
      const spread = (rotate(before, 7) ^ rotate(before, 18) ^ (before >>> 3)) >>> 0;
      const mixed = (rotate(near, 17) ^ rotate(near, 19) ^ (near >>> 10)) >>> 0;
      schedule[at] = (schedule[at - 16] + spread + schedule[at - 7] + mixed) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = state;
    for (let at = 0; at < 64; at++) {
      const sigmaOne = (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) >>> 0;
      const chosen = ((e & f) ^ (~e & g)) >>> 0;
      const one = (h + sigmaOne + chosen + roundConstants[at] + schedule[at]) >>> 0;
      const sigmaZero = (rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) >>> 0;
      const most = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const two = (sigmaZero + most) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + one) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (one + two) >>> 0;
    }

    for (const [at, word] of [a, b, c, d, e, f, g, h].entries()) state[at] = (state[at] + word) >>> 0;
  }

  const digest = new Uint8Array(32);
  const writing = new DataView(digest.buffer);
  for (const [at, word] of state.entries()) writing.setUint32(at * 4, word);
  return digest;
}

const blockSize = 64;

/** HMAC-SHA256 of this message under this key. */
export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const padded = new Uint8Array(blockSize);
  padded.set(key.length > blockSize ? sha256(key) : key);

  const inner = new Uint8Array(blockSize + message.length);
  const outer = new Uint8Array(blockSize + 32);
  for (let at = 0; at < blockSize; at++) {
    inner[at] = padded[at] ^ 0x36;
    outer[at] = padded[at] ^ 0x5c;
  }
  inner.set(message, blockSize);
  outer.set(sha256(inner), blockSize);
  return sha256(outer);
}

/**
 * PBKDF2-HMAC-SHA256: a password stretched into `length` bytes of key, `iterations` times over.
 * The stretching is the point — it costs whoever took the phone the same time per guess it costs
 * the teacher once, which is a price only one of them can afford.
 */
export function pbkdf2Sha256(password: Uint8Array, salt: Uint8Array, iterations: number, length: number): Uint8Array {
  if (iterations < 1) throw new Error('a password must be stretched at least once');
  const key = new Uint8Array(length);
  const counted = new Uint8Array(salt.length + 4);
  counted.set(salt);
  const counter = new DataView(counted.buffer);

  for (let block = 0; block * 32 < length; block++) {
    counter.setUint32(salt.length, block + 1);
    let round = hmacSha256(password, counted);
    const folded = round.slice();
    for (let again = 1; again < iterations; again++) {
      round = hmacSha256(password, round);
      for (let at = 0; at < folded.length; at++) folded[at] ^= round[at];
    }
    key.set(folded.subarray(0, Math.min(32, length - block * 32)), block * 32);
  }
  return key;
}

/**
 * True when these two byte strings are the same, read in a time that says nothing about where they
 * first differ — so a seal cannot be guessed one byte at a time.
 */
export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  let differences = a.length ^ b.length;
  const span = Math.max(a.length, b.length);
  for (let at = 0; at < span; at++) differences |= (a[at] ?? 0) ^ (b[at] ?? 0);
  return differences === 0;
}

/** Bytes nobody can guess, for a salt or a nonce. */
export function unguessableBytes(length: number): Uint8Array {
  const source = (globalThis as { crypto?: Crypto }).crypto;
  if (!source?.getRandomValues) {
    // Never quietly: bytes a guesser could predict would make every record openable without a
    // password, and no caller can tell the difference by looking at them.
    throw new Error('this device offers no source of unguessable bytes');
  }
  return source.getRandomValues(new Uint8Array(length));
}
