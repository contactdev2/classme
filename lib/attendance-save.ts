// Keeping one day's register: the marks under a teacher's thumb turned into the records the phone
// keeps, written to the phone's own store, and said back as the confirmation a teacher is shown.
//
// Records are the only thing written. Every rate, every trend and every summary in the app is
// worked out fresh from them each time it is read (lib/attendance-stats.ts, lib/roster.ts), which
// is an approved decision: a total stored beside the marks it came from is a second truth, and the
// day the two disagree there is no telling which of them was the teacher's own class.
//
// None of it leaves the phone.

import { dayText } from './attendance-stats';
import { classroomStore, type AttendanceRecord, type ClassroomData, type Student } from './classroom-data';
import { markOf, summaryOfRoster, type MarkedRoster, type RosterSummary } from './roster';

/** The day a register is being taken on, as a mark against a student's name writes it: '2025-04-21'. */
export const dayOfRegister = (now: Date): string => dayText(now);

/**
 * The same day back again, as the phone's own clock counts days, so a screen can say it in words:
 * 'Mon, Apr 21'. Read as the day it is where the teacher is standing and never as a moment in some
 * other part of the world — a register belongs to a school day and not to an hour.
 */
export function dayFromText(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
}

/**
 * One day's register, as the records the phone keeps it as: one record for every student on the
 * roster, each at the mark the register had them at, each carrying the day it was taken on and the
 * name of the teacher who saved it.
 *
 * Every student gets a record, including the ones nobody touched — a register is what a whole class
 * did that day, and a day with twenty-two marks in a class of twenty-four is two students nobody
 * can say anything about afterwards.
 *
 * `savedBy` left out is a register saved by nobody this app knows of: a phone whose teacher's own
 * sealed record keeps no name puts none here rather than a name the app invented for them.
 */
export function recordsForRegister(
  roster: Student[],
  marks: MarkedRoster,
  classroomId: string,
  day: string,
  savedBy?: string,
): AttendanceRecord[] {
  return roster.map((student) => ({
    studentId: student.id,
    classroomId,
    day,
    mark: markOf(marks, student),
    ...(savedBy === undefined ? {} : { savedBy }),
  }));
}

/**
 * Everything the phone keeps, with one day's register in place of whatever it kept for that class
 * on that day. A day saved twice is one day's register and not two, and every other day and every
 * other class are left exactly where they were. Nothing is changed in place, so what was handed in
 * still says what it said.
 */
export function dataWithRegister(
  data: ClassroomData,
  classroomId: string,
  day: string,
  records: AttendanceRecord[],
): ClassroomData {
  return {
    ...data,
    attendance: [
      ...data.attendance.filter((one) => !(one.classroomId === classroomId && one.day === day)),
      ...records,
    ],
  };
}

/**
 * The register already saved for a class on a day, as the marks a screen holds. A day nothing was
 * saved on reads as no marks at all, which is where a register starts — see lib/roster.ts.
 *
 * This is what a register re-opened on a day it was already taken reads from, so a teacher who
 * comes back to it sees what they kept rather than a class the app has quietly marked all present
 * again. It answers requirements 11 and 13's open question, on purpose.
 */
export function savedRegisterFor(data: ClassroomData, classroomId: string, day: string): MarkedRoster {
  const marks: MarkedRoster = {};
  for (const one of data.attendance) {
    if (one.classroomId === classroomId && one.day === day) marks[one.studentId] = one.mark;
  }
  return marks;
}

/** What a teacher is shown once their register is kept: which register it was, and how it stood. */
export type SavedRegister = {
  classroomId: string;
  /** The day it was taken on, as a mark writes a day. */
  day: string;
  /** The teacher whose register it is, or nothing where their own record keeps no name. */
  savedBy?: string;
  /** How the class stood: each mark with how many were at it, and the number of students. */
  summary: RosterSummary;
};

/**
 * One day's register kept on the phone, and said back for the confirmation that follows it.
 *
 * The store is read again here rather than trusted from the screen: the records for every other
 * day and every other class are the phone's own, and writing a screen's idea of them back over
 * them would lose anything written since it was drawn.
 *
 * A phone that will not be written to answers null, and nothing is logged on the way past — a
 * teacher reads what to do next and never the words of the thing that failed, and a register never
 * says it was saved when it was not. Whoever asks is the one that tells them.
 */
export async function keepRegister({
  roster,
  marks,
  classroomId,
  now,
  savedBy,
}: {
  roster: Student[];
  marks: MarkedRoster;
  classroomId: string;
  now: Date;
  savedBy?: string;
}): Promise<{ saved: SavedRegister; data: ClassroomData } | null> {
  const day = dayOfRegister(now);
  const records = recordsForRegister(roster, marks, classroomId, day, savedBy);
  try {
    const store = classroomStore();
    const data = dataWithRegister(await store.read(), classroomId, day, records);
    await store.write(data);
    return { saved: { classroomId, day, savedBy, summary: summaryOfRoster(roster, marks) }, data };
  } catch {
    return null;
  }
}
