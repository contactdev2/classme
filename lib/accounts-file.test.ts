// The file a phone keeps its teachers' records in: what goes into it comes back out, and what is
// not one of this app's own records is passed over rather than handed to the lock.
import { describe, expect, it } from 'vitest';
import { accountsKeptIn, textFileWith } from './accounts-file';
import { lockAccount, openAccount, type AccountRecord } from './local-accounts';

// Stretching a password is slow on purpose, so a record made for a check carries its own number.
const checkIterations = 1_000;

const teacher = { email: 'ms.rivera@riversidehigh.edu', name: 'Ms. Rivera' };
const password = 'Spring-2026-attendance';

describe('the records a phone keeps in a file', () => {
  it('outlast the app: written once, they are there for the next run to read', async () => {
    const file = textFileWith(null);

    // A phone nobody has signed up on yet answers no records, and is not a fault.
    expect(await accountsKeptIn(file).read()).toEqual([]);

    const record = lockAccount({ email: teacher.email, password }, teacher, checkIterations);
    await accountsKeptIn(file).write([record]);

    // The app closed and opened again: a store of its own, over the text the phone kept.
    const nextMorning = accountsKeptIn(textFileWith(await file.read()));
    const read = await nextMorning.read();
    expect(read).toHaveLength(1);
    expect(openAccount(read[0], { email: teacher.email, password })).toEqual(teacher);

    // And nothing of the teacher is in the clear in what was written down.
    const written = (await file.read()) ?? '';
    expect(written).not.toContain(password);
    expect(written).not.toContain(teacher.email);
    expect(written).not.toContain(teacher.name);
  });

  it('pass over anything in the file that is not one of this app’s own records', async () => {
    const record = lockAccount({ email: teacher.email, password }, teacher, checkIterations);
    const alongside = [
      { ...record, version: 2 },
      { ...record, salt: 17 },
      { ...record, iterations: 0 },
      { ...record, at: { marked: true } },
      'not a record at all',
      null,
    ];
    const file = textFileWith(JSON.stringify([...alongside, record]));
    expect(await accountsKeptIn(file).read()).toEqual([record as AccountRecord]);
  });

  it('answer no records at all for text this app did not write, rather than refusing the app', async () => {
    for (const text of ['', 'not json', '{"records":[]}', '[']) {
      expect(await accountsKeptIn(textFileWith(text)).read(), text).toEqual([]);
    }
  });
});
