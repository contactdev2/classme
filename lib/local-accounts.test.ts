import { describe, expect, it } from 'vitest';
import { accountsIn, keepAccountsIn, lockAccount, openAccount, teacherMatching } from './local-accounts';

// A record made for a check says its own smaller number of stretches: the arithmetic is the same,
// and a check should not spend a second of a phone's worth of it on every line.
const stretches = 1_000;
const teacher = { email: 'ms.rivera@riversidehigh.edu' };
const password = 'Spring-2026-attendance';
const credentials = { email: teacher.email, password };

describe('a teacher account kept on this phone', () => {
  it('opens with the password it was locked with, and says who it belongs to', () => {
    const record = lockAccount(credentials, teacher, stretches);
    expect(openAccount(record, credentials)).toEqual(teacher);
  });

  it('keeps nothing in the clear — not the password, and not the email either', () => {
    const record = lockAccount(credentials, teacher, stretches);
    const written = JSON.stringify(record);
    expect(written).not.toContain(password);
    expect(written).not.toContain(teacher.email);
    expect(written).not.toContain('riversidehigh');
  });

  it('does not open for a wrong password, however nearly right', () => {
    const record = lockAccount(credentials, teacher, stretches);
    for (const wrong of ['', 'spring-2026-attendance', 'Spring-2026-attendance ', 'Spring-2026-attendanc']) {
      expect(openAccount(record, { email: teacher.email, password: wrong }), wrong).toBeNull();
    }
  });

  it('does not open for another teacher asking with the right password', () => {
    const record = lockAccount(credentials, teacher, stretches);
    expect(openAccount(record, { email: 'mr.okafor@riversidehigh.edu', password })).toBeNull();
  });

  it('opens for the teacher whatever case or spacing they typed their email in', () => {
    const record = lockAccount(credentials, teacher, stretches);
    expect(openAccount(record, { email: ' MS.Rivera@RiversideHigh.edu ', password })).toEqual(teacher);
  });

  it('does not open once any part of it has been edited', () => {
    const record = lockAccount(credentials, teacher, stretches);
    for (const edit of [{ locked: record.locked.replace(/^../, 'ff') }, { nonce: record.nonce.replace(/^../, 'ff') }, { iterations: 1 }, { seal: record.seal.replace(/^../, 'ff') }, { salt: record.salt.replace(/^../, 'ff') }]) {
      expect(openAccount({ ...record, ...edit }, credentials), JSON.stringify(edit)).toBeNull();
    }
    expect(openAccount({ ...record, locked: 'not hex' }, credentials)).toBeNull();
  });

  it('is locked afresh every time, so two phones with one password look nothing alike', () => {
    const one = lockAccount(credentials, teacher, stretches);
    const other = lockAccount(credentials, teacher, stretches);
    expect(one.salt).not.toBe(other.salt);
    expect(one.nonce).not.toBe(other.nonce);
    expect(one.locked).not.toBe(other.locked);
    expect(openAccount(other, credentials)).toEqual(teacher);
  });

  it('is found among the records this phone keeps, and only by whoever can open it', async () => {
    const others = [
      lockAccount({ email: 'mr.okafor@riversidehigh.edu', password: 'another-password' }, { email: 'mr.okafor@riversidehigh.edu' }, stretches),
      lockAccount(credentials, teacher, stretches),
    ];
    keepAccountsIn(accountsIn(others));
    expect(await teacherMatching(credentials)).toEqual(teacher);
    expect(await teacherMatching({ email: teacher.email, password: 'another-password' })).toBeNull();

    keepAccountsIn(accountsIn([]));
    expect(await teacherMatching(credentials)).toBeNull();
  });
});
