// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { accountsIn, keepAccountsIn, lockAccount, openAccount, type AccountRecord } from '../lib/local-accounts';
import { submitSignIn } from '../lib/sign-in';
import { open, takePictureOf } from '../test/screen';
import LoginScreen from './index';

// The teacher this phone belongs to, and the password only they know.
const teacher = { email: 'ms.rivera@riversidehigh.edu' };
const password = 'Spring-2026-attendance';
const wrongPassword = 'Autumn-2025-attendance';

// Stretching a password is slow on purpose, so a record made for a check says its own smaller number
// rather than the app's. A record carries the number it was made with, so both open the same way.
const checkIterations = 1_000;

/** This phone, with one account on it: the teacher's own, locked with their own password. */
function phoneWithTheTeachersAccount(): AccountRecord {
  const record = lockAccount({ email: teacher.email, password }, teacher, checkIterations);
  keepAccountsIn(accountsIn([record]));
  return record;
}

afterEach(() => keepAccountsIn(accountsIn([])));

describe('Verify login', () => {
  it('Entering the correct email and password lets the teacher continue past the login screen.', async () => {
    phoneWithTheTeachersAccount();
    const screen = open(<LoginScreen />);

    await screen.type(/Email/i, teacher.email);
    await screen.type(/^Password/i, password);
    await screen.press('Log In');

    // Past the login screen: there is nothing left to sign in with, because they are signed in.
    expect(() => screen.field(/Email/i)).toThrow();
    expect(() => screen.field(/^Password/i)).toThrow();
    expect(screen.text()).not.toContain('Log In');

    // And what they went on to is their own: the app, opened as them.
    expect(screen.text()).toContain(teacher.email);

    // Their password came this far and no further — it is on no screen, in no attribute.
    expect(screen.markup()).not.toContain(password);

    // The screen they land on works at the phone's largest text size too.
    expect(screen.markup()).not.toMatch(/[;"](height|max-height|line-height)\s*:/);

    takePictureOf('Verify login > Entering the correct email and password lets the teacher continue past the login screen.', screen);
    screen.close();
  });

  it('Entering a wrong password keeps the teacher on the login screen with an error message.', async () => {
    const record = phoneWithTheTeachersAccount();

    // The record on this phone is a real one — it opens with the right password. So what follows is
    // about the wrong password, and not about a record that could never have opened at all.
    expect(openAccount(record, { email: teacher.email, password })).toEqual(teacher);

    const screen = open(<LoginScreen />);
    await screen.type(/Email/i, teacher.email);
    await screen.type(/^Password/i, wrongPassword);
    await screen.press('Log In');

    // Still on the login screen: both fields and the button are where they were.
    expect(screen.field(/Email/i)).toBeTruthy();
    expect(screen.field(/^Password/i)).toBeTruthy();
    expect(screen.text()).toContain('Log In');

    // And told why, in a sentence a screen reader announces.
    expect(screen.text()).toContain('No account on this phone matches that email and password.');
    expect(screen.markup()).toMatch(/role="alert"/);

    // Whatever it says, it never says back what was typed.
    expect(screen.text()).not.toContain(wrongPassword);

    takePictureOf('Verify login > Entering a wrong password keeps the teacher on the login screen with an error message.', screen);
    screen.close();
  });

  it('The credential check never requires an internet connection.', async () => {
    // Nothing on the way from the button to the answer has a way off this phone.
    for (const file of ['app/index.tsx', 'lib/sign-in.ts', 'lib/local-accounts.ts', 'lib/crypto.ts']) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|navigator\.onLine|https?:\/\//);
    }

    // And with every way off this phone taken away, both answers still come back.
    phoneWithTheTeachersAccount();
    const offline = () => {
      throw new Error('a credential check must not need the network');
    };
    const plugged = {
      fetch: globalThis.fetch,
      XMLHttpRequest: globalThis.XMLHttpRequest,
      WebSocket: globalThis.WebSocket,
    };
    try {
      Object.assign(globalThis, { fetch: offline, XMLHttpRequest: offline, WebSocket: offline });
      const right = await submitSignIn({ email: teacher.email, password });
      const wrong = await submitSignIn({ email: teacher.email, password: wrongPassword });
      expect(right.signedIn).toBe(true);
      expect(wrong.signedIn).toBe(false);
    } finally {
      Object.assign(globalThis, plugged);
    }
  });
});
