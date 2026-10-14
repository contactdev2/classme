import { describe, expect, it } from 'vitest';
import { textFileWith } from './accounts-file';
import { classroomDataKeptIn, classroomFileName } from './classroom-file';
import { nothingKeptYet, type ClassroomData } from './classroom-data';

/** A phone with one class on it, one student in it and one mark against their name. */
const aTermOfTeaching: ClassroomData = {
  version: 1,
  classrooms: [{ id: 'c-maths', name: 'Mathematics', period: '1st Period', subject: '📐', colour: '#2F6FED' }],
  students: [{ id: 'c-maths-s1', classroomId: 'c-maths', name: 'Chloe Kim' }],
  attendance: [{ studentId: 'c-maths-s1', classroomId: 'c-maths', day: '2025-04-21', mark: 'Present' }],
};

describe('The teaching a phone keeps', () => {
  it('is read back as it was written', async () => {
    const store = classroomDataKeptIn(textFileWith(null));
    await store.write(aTermOfTeaching);
    expect(await store.read()).toEqual(aTermOfTeaching);
  });

  it('is nothing at all on a phone nothing has ever been written to', async () => {
    expect(await classroomDataKeptIn(textFileWith(null)).read()).toEqual(nothingKeptYet());
  });

  it('is nothing at all where the file is not what this app writes', async () => {
    // A file somebody edited, a file from a version that kept something else, a file half written:
    // each reads as a phone that has been told nothing yet, which every screen can already say.
    for (const text of ['', 'not json at all', '[]', '{"version":2,"classrooms":[]}', '{"version":1,"classrooms":{}}']) {
      expect(await classroomDataKeptIn(textFileWith(text)).read(), text).toEqual(nothingKeptYet());
    }
  });

  it('passes over a classroom that is not the shape a classroom is written in', async () => {
    const mangled = JSON.stringify({ ...aTermOfTeaching, classrooms: [{ id: 'c-maths', name: 7 }] });
    expect(await classroomDataKeptIn(textFileWith(mangled)).read()).toEqual(nothingKeptYet());
  });

  it('is kept in a file of its own, beside the records', () => {
    expect(classroomFileName).toBe('classme-classrooms.json');
  });
});
