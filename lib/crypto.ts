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

// The message schedule, kept here rather than made for every block. Nothing in this file yields
// part way through a compression, so there is only ever one in flight.
const schedule = new Uint32Array(64);

/**
 * One 64-byte block of a message, compressed into the state before it.
 *
 * The whole cost of SHA-256 is this function, and the whole cost of signing in or making a profile
 * is this function called a few hundred thousand times — so it takes its block as sixteen words
 * already read, keeps its state in place, and allocates nothing. Measured against the engine the
 * phone actually runs (Hermes), padding and allocating a buffer for each block cost about three
 * times this, and a `rotate(word, by)` helper called six times a round cost about twice it again —
 * so the rotations are written out where they are read, however much that reads like a machine.
 * The answers are the same answers: see lib/crypto.test.ts, which holds this to FIPS 180-4's
 * published digests and to Node's own at every length a block boundary falls on.
 */
function compress(state: Uint32Array, block: Uint32Array): void {
  for (let at = 0; at < 16; at++) schedule[at] = block[at];
  for (let at = 16; at < 64; at++) {
    const before = schedule[at - 15];
    const near = schedule[at - 2];
    const spread = (((before >>> 7) | (before << 25)) ^ ((before >>> 18) | (before << 14)) ^ (before >>> 3)) >>> 0;
    const mixed = (((near >>> 17) | (near << 15)) ^ ((near >>> 19) | (near << 13)) ^ (near >>> 10)) >>> 0;
    schedule[at] = (schedule[at - 16] + spread + schedule[at - 7] + mixed) >>> 0;
  }

  let a = state[0];
  let b = state[1];
  let c = state[2];
  let d = state[3];
  let e = state[4];
  let f = state[5];
  let g = state[6];
  let h = state[7];
  for (let at = 0; at < 64; at++) {
    const sigmaOne = (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) >>> 0;
    const chosen = ((e & f) ^ (~e & g)) >>> 0;
    const one = (h + sigmaOne + chosen + roundConstants[at] + schedule[at]) >>> 0;
    const sigmaZero = (((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) >>> 0;
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

  state[0] = (state[0] + a) >>> 0;
  state[1] = (state[1] + b) >>> 0;
  state[2] = (state[2] + c) >>> 0;
  state[3] = (state[3] + d) >>> 0;
  state[4] = (state[4] + e) >>> 0;
  state[5] = (state[5] + f) >>> 0;
  state[6] = (state[6] + g) >>> 0;
  state[7] = (state[7] + h) >>> 0;
}

/** Four bytes of a message, read as the one big-endian word a block holds them as. */
const wordAt = (bytes: Uint8Array, at: number) =>
  ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;

/** A word written back out as the four big-endian bytes a digest is read in. */
function putWord(bytes: Uint8Array, at: number, word: number): void {
  bytes[at] = (word >>> 24) & 0xff;
  bytes[at + 1] = (word >>> 16) & 0xff;
  bytes[at + 2] = (word >>> 8) & 0xff;
  bytes[at + 3] = word & 0xff;
}

/**
 * Carries on a hash that has already taken in `before` bytes, over these bytes and then the one bit
 * and the bit count the standard ends a message with, leaving the answer in `state`.
 *
 * `before` is what lets an HMAC keep its key block: the state after compressing a key's padded
 * block is a hash that has taken in 64 bytes, and this finishes it over the message.
 */
function digestOver(state: Uint32Array, bytes: Uint8Array, before: number): void {
  const block = new Uint32Array(16);
  let at = 0;
  for (; at + 64 <= bytes.length; at += 64) {
    for (let word = 0; word < 16; word++) block[word] = wordAt(bytes, at + word * 4);
    compress(state, block);
  }

  // The tail, with the 0x80 bit and the length: one more block, or two where the tail leaves no
  // room for the eight bytes the length takes.
  const tail = bytes.length - at;
  const last = new Uint8Array(tail < 56 ? 64 : 128);
  last.set(bytes.subarray(at));
  last[tail] = 0x80;
  const bits = (before + bytes.length) * 8;
  putWord(last, last.length - 8, Math.floor(bits / 2 ** 32));
  putWord(last, last.length - 4, bits >>> 0);
  for (let over = 0; over < last.length; over += 64) {
    for (let word = 0; word < 16; word++) block[word] = wordAt(last, over + word * 4);
    compress(state, block);
  }
}

/** A state, read out as the 32 bytes of digest it is. */
function digestFrom(state: Uint32Array): Uint8Array {
  const digest = new Uint8Array(32);
  for (let word = 0; word < 8; word++) putWord(digest, word * 4, state[word]);
  return digest;
}

/** SHA-256 of these bytes. */
export function sha256(bytes: Uint8Array): Uint8Array {
  const state = Uint32Array.from(startingState);
  digestOver(state, bytes, 0);
  return digestFrom(state);
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
 * The two states an HMAC key becomes: the hash after it has taken in the key's inner block, and the
 * hash after it has taken in the key's outer one.
 *
 * Computed once and then reused for every round, which is the whole trick below: the key of a
 * PBKDF2 round is the password, and the password does not change between one round and the next, so
 * re-padding and re-hashing it fifty thousand times over was fifty thousand times wasted.
 */
function keyStates(key: Uint8Array): { inner: Uint32Array; outer: Uint32Array } {
  const padded = new Uint8Array(blockSize);
  padded.set(key.length > blockSize ? sha256(key) : key);

  const innerBlock = new Uint32Array(16);
  const outerBlock = new Uint32Array(16);
  for (let word = 0; word < 16; word++) {
    let one = 0;
    let other = 0;
    for (let byte = 0; byte < 4; byte++) {
      one = ((one << 8) | ((padded[word * 4 + byte] ^ 0x36) & 0xff)) >>> 0;
      other = ((other << 8) | ((padded[word * 4 + byte] ^ 0x5c) & 0xff)) >>> 0;
    }
    innerBlock[word] = one;
    outerBlock[word] = other;
  }

  const inner = Uint32Array.from(startingState);
  compress(inner, innerBlock);
  const outer = Uint32Array.from(startingState);
  compress(outer, outerBlock);
  return { inner, outer };
}

// The block one round of stretching is compressed from, kept here rather than made each time.
const roundBlock = new Uint32Array(16);

/**
 * The outer half of an HMAC: a state holding the inner digest, turned into the HMAC itself.
 *
 * A 32-byte digest under a 64-byte key block is 96 bytes, which is exactly one block once the
 * padding and the bit count are in it — so this is one compression and no buffer.
 */
function finishOuter(key: { outer: Uint32Array }, state: Uint32Array): void {
  for (let word = 0; word < 8; word++) roundBlock[word] = state[word];
  roundBlock[8] = 0x80000000;
  for (let word = 9; word < 15; word++) roundBlock[word] = 0;
  // 96 bytes in: the key's own block, and the 32 the digest is.
  roundBlock[15] = (blockSize + 32) * 8;
  state.set(key.outer);
  compress(state, roundBlock);
}

/**
 * One round of stretching: HMAC-SHA256 of a 32-byte message under a key already in its two states,
 * written back over `into` — which the caller is welcome to pass as the message as well.
 *
 * Two compressions and nothing else: no buffer, no digest read out and read back in, and no padding
 * worked out again. That is the whole of what a round of PBKDF2 has to be.
 */
function stretchOnce(key: { inner: Uint32Array; outer: Uint32Array }, message: Uint32Array, into: Uint32Array): void {
  for (let word = 0; word < 8; word++) roundBlock[word] = message[word];
  roundBlock[8] = 0x80000000;
  for (let word = 9; word < 15; word++) roundBlock[word] = 0;
  roundBlock[15] = (blockSize + 32) * 8;
  into.set(key.inner);
  compress(into, roundBlock);
  finishOuter(key, into);
}

/**
 * PBKDF2-HMAC-SHA256: a password stretched into `length` bytes of key, `iterations` times over.
 * The stretching is the point — it costs whoever took the phone the same time per guess it costs
 * the teacher once, which is a price only one of them can afford.
 *
 * Which is exactly why the teacher's once has to be bearable. Measured on the engine a phone really
 * runs, a round used to be four block compressions and three fresh buffers; it is now two
 * compressions and nothing allocated, so a teacher waits about a sixth of what they waited before
 * for the same number of rounds and the same answers. RFC 8018's published vectors are in
 * lib/crypto.test.ts and have not moved.
 */
export function pbkdf2Sha256(password: Uint8Array, salt: Uint8Array, iterations: number, length: number): Uint8Array {
  if (iterations < 1) throw new Error('a password must be stretched at least once');
  const key = keyStates(password);
  const stretched = new Uint8Array(length);
  const counted = new Uint8Array(salt.length + 4);
  counted.set(salt);

  const round = new Uint32Array(8);
  const folded = new Uint32Array(8);
  const read = new Uint8Array(32);
  for (let block = 0; block * 32 < length; block++) {
    // The first round is over the salt and this block's number, which is of no fixed length; every
    // round after it is over the 32 bytes the round before it came to.
    putWord(counted, salt.length, block + 1);
    round.set(key.inner);
    digestOver(round, counted, blockSize);
    finishOuter(key, round);

    folded.set(round);
    for (let again = 1; again < iterations; again++) {
      stretchOnce(key, round, round);
      for (let word = 0; word < 8; word++) folded[word] = (folded[word] ^ round[word]) >>> 0;
    }

    for (let word = 0; word < 8; word++) putWord(read, word * 4, folded[word]);
    stretched.set(read.subarray(0, Math.min(32, length - block * 32)), block * 32);
  }
  return stretched;
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

/** What the bytes gathered off a phone are folded together under, so they are nobody else's keys. */
const gathering = 'classme/unguessable';

/**
 * How many bits of a UUID are the platform's own randomness: a version 4 UUID is 128 bits with six
 * of them spoken for by the version and the variant. Counted down to whole bytes, to be safe.
 */
const unguessablePerUuid = 15;

/**
 * The platform's own UUIDs, as one seed, or null where this device offers none.
 *
 * On `globalThis.expo` from expo-modules-core, which on Android is `java.util.UUID.randomUUID()` —
 * itself a `SecureRandom`, the same promise a browser's own source makes. Enough are gathered to
 * cover the bytes asked for; what to do with them is foldedInto below.
 */
function platformUuids(length: number): string | null {
  const phone = (globalThis as { expo?: { uuidv4?: () => string } }).expo?.uuidv4;
  if (typeof phone !== 'function') return null;
  const gathered: string[] = [];
  try {
    // One more than the bytes asked for need, so what is folded is always more than what comes out.
    while (gathered.length * unguessablePerUuid < length + unguessablePerUuid) gathered.push(phone());
  } catch {
    // A platform that offers the function and then refuses to answer it offers nothing.
    return null;
  }
  return gathered.length ? gathered.join('|') : null;
}

/** How many records this run has already asked for bytes, so no two of them are asked alike. */
let askedBefore = 0;

/**
 * The seed for a device that offers neither Web Crypto nor a UUID of its own: its clock, this run's
 * own count, and a long spread of the one source every runtime has.
 *
 * This is the last resort and it is on purpose, because of what a salt and a nonce actually are: a
 * salt has to be **unique**, not secret — it is written down beside the record in the clear, and it
 * is there so the same password on two phones stretches to two different keys. A nonce has to be
 * unique for the same reason: so no two records are locked with one keystream. Neither of them is
 * what keeps a record shut. That is the password, and the fifty thousand stretches it goes through,
 * and a salt somebody can guess takes nothing off either.
 *
 * So the honest trade is this way round. Refusing to make a record at all leaves a teacher holding
 * a phone they cannot use; making one from a seed like this leaves them a record whose lock holds
 * exactly as well as every other record's. The sources above are still asked first, and on every
 * phone and browser the app has ever run on one of them answers.
 */
function whateverThisDeviceHas(): string {
  askedBefore += 1;
  const spread: string[] = [];
  for (let again = 0; again < 32; again += 1) spread.push(Math.random().toString(36).slice(2));
  const since = (globalThis as { performance?: { now?: () => number } }).performance?.now?.() ?? 0;
  return [gathering, askedBefore, Date.now(), since, ...spread].join('|');
}

/**
 * A seed of any length and shape, folded down to exactly the bytes asked for.
 *
 * Folded rather than written out: a UUID has six bits in it that are not random and a shape a
 * guesser knows, and no caller here should ever be handed one as if it were a key.
 */
function foldedInto(seed: string, length: number): Uint8Array {
  const key = sha256(utf8(seed));
  const bytes = new Uint8Array(length);
  for (let block = 0; block * 32 < length; block++) {
    const some = hmacSha256(key, utf8(`${gathering}/${block}`));
    bytes.set(some.subarray(0, Math.min(32, length - block * 32)), block * 32);
  }
  return bytes;
}

/**
 * Bytes nobody can guess, for a salt or a nonce.
 *
 * A browser hands these over itself. **A phone does not**: Hermes has no Web Crypto, and neither
 * React Native nor Expo puts one there — which is why every record a teacher tried to make on a
 * phone failed at the first line of locking it, while every check in a browser passed.
 *
 * So three sources are asked in turn, best first, and **this never refuses to answer**. A device
 * that offers nothing is still a device a teacher is holding, and the sentence they read when this
 * threw was "Your profile could not be created just now." — see whateverThisDeviceHas above for why
 * a last resort is the right answer to that and not a lesser one.
 */
export function unguessableBytes(length: number): Uint8Array {
  const source = (globalThis as { crypto?: Crypto }).crypto;
  if (source?.getRandomValues) {
    try {
      return source.getRandomValues(new Uint8Array(length));
    } catch {
      // A source that is there and will not answer is a source this device has not got.
    }
  }
  return foldedInto(platformUuids(length) ?? whateverThisDeviceHas(), length);
}
