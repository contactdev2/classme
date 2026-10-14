// One student's attendance over time, as their own profile reads it: every day the phone has a mark
// against their name, what those days add up to, the handful most recently taken, and the whole of
// them gathered into the months they fall in.
//
// Nothing here is kept. A rate, a count of absences, a month's own summary — every number is worked
// out from the daily records each time it is read, which is an approved decision: a total stored
// beside the marks it came from is a second truth, and the day the two disagree there is no telling
// which of them was the student's own term.
//
// The data itself is lib/classroom-data.ts; this is only the reading of it, so the screens hold no
// rule of their own and a check can ask the same questions.

import { dayFromText } from './attendance-save';
import { rateOf, type Tally } from './attendance-stats';
import type { AttendanceMark, ClassroomData, Student } from './classroom-data';

/** One day the phone has a mark against this student's name. */
export type HistoryDay = {
  /** The day itself, as a mark against a student's name writes it: '2025-04-21'. */
  day: string;
  mark: AttendanceMark;
};

/** How many days a profile shows under Recent Attendance before 'View All' is pressed. */
export const recentlyShown = 5;

/** The student this id belongs to, or nothing where the phone knows no such student. */
export const studentWithId = (data: ClassroomData, studentId: string): Student | null =>
  data.students.find((one) => one.id === studentId) ?? null;

/**
 * Every day the phone has a mark against one student's name, the day most recently taken first —
 * which is the order a history is read in, and the order the prototype draws it in.
 *
 * It is the marks against that one student and nobody else: a class they are in is not consulted,
 * so a student who moved class mid-term still has one history and it is all of theirs.
 */
export function historyOf(data: ClassroomData, studentId: string): HistoryDay[] {
  return data.attendance
    .filter((one) => one.studentId === studentId)
    .map(({ day, mark }) => ({ day, mark }))
    .sort((one, other) => (one.day < other.day ? 1 : one.day > other.day ? -1 : 0));
}

/**
 * What a stretch of one student's days adds up to: how many of each mark, how many days altogether,
 * and the share of them they were present for, as a whole number of per cent. A student with
 * nothing marked against them is 0% of nothing, not a student with perfect attendance.
 */
export function tallyOfHistory(days: HistoryDay[]): Tally {
  let present = 0;
  let absent = 0;
  let late = 0;
  for (const one of days) {
    if (one.mark === 'Present') present += 1;
    else if (one.mark === 'Absent') absent += 1;
    else late += 1;
  }
  const total = present + absent + late;
  return { present, absent, late, total, rate: rateOf(present, total) };
}

/** The handful of days a profile shows before 'View All': the most recent, newest first. */
export const recentDays = (days: HistoryDay[], many: number = recentlyShown): HistoryDay[] => days.slice(0, many);

/** One month of a student's history: which month it is, and the days of theirs that fall in it. */
export type HistoryMonth = {
  /** The year, as a person counts years. */
  year: number;
  /** The month, as a person counts months: 1 is January. */
  month: number;
  /** The days of that month, the most recent first. */
  days: HistoryDay[];
};

/**
 * A whole history gathered into the months its days fall in, the latest month first and the days
 * inside each one newest first. Not one day of the record is left out of it: a complete history is
 * the point of the screen that draws this, and a month heading with a day missing under it would
 * be a quieter lie than an empty screen.
 */
export function historyByMonth(days: HistoryDay[]): HistoryMonth[] {
  const months: HistoryMonth[] = [];
  for (const one of days) {
    const when = dayFromText(one.day);
    const year = when.getFullYear();
    const month = when.getMonth() + 1;
    const already = months.find((some) => some.year === year && some.month === month);
    if (already) already.days.push(one);
    else months.push({ year, month, days: [one] });
  }
  return months;
}

/**
 * The month a profile's own summary is of: the latest one this student has a day in. A student
 * with nothing marked against them has none, and the screen says so rather than adding up a month
 * nobody has taught yet.
 */
export const latestMonth = (days: HistoryDay[]): HistoryMonth | null => historyByMonth(days)[0] ?? null;
