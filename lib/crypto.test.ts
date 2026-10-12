import { createHash, createHmac, pbkdf2Sync, randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { bytesFromHex, hex, hmacSha256, pbkdf2Sha256, sameBytes, sha256, textFromUtf8, unguessableBytes, utf8 } from './crypto';

// Arithmetic written out by hand is worth only as much as the answers it agrees with. Each piece is
// held here to the published answers of the standard it implements, and then to the answers Node's
// own crypto gives for input of every awkward length — which is the part a typo would survive.
const asHex = (bytes: Uint8Array) => hex(bytes);

describe('the arithmetic a locked record is built from', () => {
  it('SHA-256 gives the answers FIPS 180-4 publishes', () => {
    expect(asHex(sha256(utf8('abc')))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(asHex(sha256(utf8('')))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(asHex(sha256(utf8('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')))).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('SHA-256 agrees with the one Node ships, at every length a block boundary falls on', () => {
    for (const length of [0, 1, 54, 55, 56, 63, 64, 65, 119, 120, 128, 1000]) {
      const message = new Uint8Array(length).map((_, at) => (at * 37 + 11) % 256);
      expect(asHex(sha256(message)), `${length} bytes`).toBe(createHash('sha256').update(message).digest('hex'));
    }
  });

  it('HMAC-SHA256 gives the answers RFC 4231 publishes', () => {
    expect(asHex(hmacSha256(new Uint8Array(20).fill(0x0b), utf8('Hi There')))).toBe(
      'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    );
    expect(asHex(hmacSha256(utf8('Jefe'), utf8('what do ya want for nothing?')))).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
    // A key longer than one block, which is hashed down first.
    expect(asHex(hmacSha256(new Uint8Array(131).fill(0xaa), utf8('Test Using Larger Than Block-Size Key - Hash Key First')))).toBe(
      '60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54',
    );
  });

  it('HMAC-SHA256 agrees with the one Node ships, for keys either side of a block', () => {
    for (const keyLength of [0, 1, 31, 64, 65, 200]) {
      const key = new Uint8Array(keyLength).map((_, at) => (at * 13 + 7) % 256);
      const message = utf8('ms.rivera signs in on a Tuesday morning');
      expect(asHex(hmacSha256(key, message)), `${keyLength}-byte key`).toBe(
        createHmac('sha256', Buffer.from(key)).update(message).digest('hex'),
      );
    }
  });

  it('PBKDF2-HMAC-SHA256 gives the published answers, and agrees with the one Node ships', () => {
    expect(asHex(pbkdf2Sha256(utf8('password'), utf8('salt'), 1, 32))).toBe(
      '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b',
    );
    expect(asHex(pbkdf2Sha256(utf8('password'), utf8('salt'), 2, 32))).toBe(
      'ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43',
    );
    expect(asHex(pbkdf2Sha256(utf8('password'), utf8('salt'), 4096, 32))).toBe(
      'c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a',
    );

    // Including a key longer than one round's worth, which is two rounds stitched together.
    for (const [iterations, length] of [[1, 20], [1000, 40], [2048, 64]] as const) {
      expect(asHex(pbkdf2Sha256(utf8('Spring-2026'), utf8('a-salt'), iterations, length)), `${iterations}x${length}`).toBe(
        pbkdf2Sync('Spring-2026', 'a-salt', iterations, length, 'sha256').toString('hex'),
      );
    }

    // And passwords and salts either side of the block the password is folded into: a password
    // longer than 64 bytes is hashed down to one first, which is its own path through the stretching.
    const passwords = ['', 'x', 'Spring-2026-attendance', 'p'.repeat(63), 'p'.repeat(64), 'p'.repeat(65), 'p'.repeat(200)];
    for (const password of passwords) {
      for (const salt of ['', 's'.repeat(55), 's'.repeat(60), 's'.repeat(64)]) {
        expect(asHex(pbkdf2Sha256(utf8(password), utf8(salt), 37, 48)), `${password.length}/${salt.length}`).toBe(
          pbkdf2Sync(password, salt, 37, 48, 'sha256').toString('hex'),
        );
      }
    }
  });

  it('text, bytes and hex all come back as they went in', () => {
    for (const text of ['', 'ms.rivera@riversidehigh.edu', 'Spring 2026 · attendance', 'Señora Ríos 🎓']) {
      expect(textFromUtf8(utf8(text))).toBe(text);
      expect(bytesFromHex(hex(utf8(text)))).toEqual(utf8(text));
    }
    expect(() => bytesFromHex('not hex')).toThrow();
  });

  it('two byte strings are the same only when they are', () => {
    expect(sameBytes(utf8('seal'), utf8('seal'))).toBe(true);
    expect(sameBytes(utf8('seal'), utf8('seam'))).toBe(false);
    expect(sameBytes(utf8('seal'), utf8('sea'))).toBe(false);
    expect(sameBytes(utf8(''), utf8(''))).toBe(true);
  });

  it('unguessable bytes are asked of the device, and no two are alike', () => {
    expect(unguessableBytes(16)).toHaveLength(16);
    expect(hex(unguessableBytes(16))).not.toBe(hex(unguessableBytes(16)));
  });

  it("on a phone, which has no Web Crypto, they are asked of the platform's own UUIDs", () => {
    // What a phone really offers: no crypto global at all, and expo-modules-core's native UUID,
    // which on Android is java.util.UUID.randomUUID() and so SecureRandom. Node's is the stand-in.
    const browsers = (globalThis as { crypto?: Crypto }).crypto;
    const asked: string[] = [];
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true, writable: true });
    (globalThis as { expo?: { uuidv4(): string } }).expo = {
      uuidv4: () => {
        const made = randomUUID();
        asked.push(made);
        return made;
      },
    };
    try {
      const salt = unguessableBytes(16);
      const nonce = unguessableBytes(16);

      // Bytes of the length asked for, never the same twice, and the phone really was asked.
      expect(salt).toHaveLength(16);
      expect(hex(salt)).not.toBe(hex(nonce));
      expect(asked.length).toBeGreaterThanOrEqual(4);

      // And what comes back is not a UUID written out: a UUID has bits in it a guesser knows.
      for (const uuid of asked) expect(hex(salt) + hex(nonce)).not.toContain(uuid.replace(/-/g, ''));

      // Long runs come out whole, past the 32 bytes one fold gives.
      expect(unguessableBytes(48)).toHaveLength(48);

      // A platform that offers the function and then refuses to answer it offers nothing, and is
      // passed over for the next source rather than taken at its word.
      (globalThis as { expo?: { uuidv4(): string } }).expo = {
        uuidv4: () => {
          throw new Error('this platform will not answer that');
        },
      };
      expect(unguessableBytes(16)).toHaveLength(16);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: browsers, configurable: true, writable: true });
      delete (globalThis as { expo?: unknown }).expo;
    }
  });
  it('on a device that offers neither, they are gathered rather than refused', () => {
    // The least a device can offer: no Web Crypto and no platform UUID. A salt and a nonce have to
    // be unique, not secret — what keeps a record shut is the password and its fifty thousand
    // stretches — so bytes are still answered, and a teacher still gets a profile. Refusing here is
    // what put "Your profile could not be created just now." in front of a teacher on a phone.
    const browsers = (globalThis as { crypto?: Crypto }).crypto;
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true, writable: true });
    delete (globalThis as { expo?: unknown }).expo;
    try {
      const asked = Array.from({ length: 200 }, () => hex(unguessableBytes(16)));
      for (const bytes of asked) expect(bytes).toHaveLength(32);

      // No two alike, two hundred times over: that is the whole of what a salt and a nonce are for.
      expect(new Set(asked).size).toBe(asked.length);

      // Long runs come out whole here too, past the 32 bytes one fold gives.
      expect(unguessableBytes(48)).toHaveLength(48);

      // And a record locks and opens with them, which is the thing a teacher is waiting for.
      const key = pbkdf2Sha256(utf8('Spring-2026-attendance'), unguessableBytes(16), 1_000, 32);
      expect(key).toHaveLength(32);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: browsers, configurable: true, writable: true });
    }
  });
});
