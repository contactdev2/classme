// What a class's attendance adds up to: the rate over a stretch of days, how the weeks compare, and
// whether the month is better or worse than the one before it.
//
// None of it is kept: every number here is worked out fresh from the daily marks the phone already
// has, which is an approved decision — a summary stored beside the records is a second truth, and
// the day they disagree there is no telling which of them is the teacher's own class.
import type { ClassroomData } from './classroom-data';
import { dateLabel } from './week';

/** A day, as a mark against a student's name writes it: '2025-04-21'. */
export const dayText = (day: Date): string =>
  `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

/** A stretch of days, both ends counted. */
export type Days = { from: string; to: string };

/** The last so many days up to and including today. */
export function lastDays(now: Date, days: number): Days {
  const first = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  return { from: dayText(first), to: dayText(now) };
}

/** The same stretch of days again, ending the day before this one began. */
export function theDaysBefore(span: Days, days: number): Days {
  const [year, month, day] = span.from.split('-').map(Number);
  const last = new Date(year, month - 1, day - 1);
  return lastDays(last, days);
}

const within = (span: Days | undefined, day: string): boolean => !span || (day >= span.from && day <= span.to);

/** What a class's marks add up to: how many of each, and the share of them that were present. */
export type Tally = {
  present: number;
  absent: number;
  late: number;
  /** Every mark counted, whichever of the three it was. */
  total: number;
  /** The share that were present, as a whole number of per cent; 0 where nothing is marked. */
  rate: number;
};

/** The share of these marks that were present, as a whole number of per cent. */
export const rateOf = (present: number, total: number): number => (total === 0 ? 0 : Math.round((present / total) * 100));

/** One class's marks, added up — over a stretch of days, or over everything the phone keeps. */
export function tallyFor(data: ClassroomData, classroomId: string, span?: Days): Tally {
  let present = 0;
  let absent = 0;
  let late = 0;
  for (const mark of data.attendance) {
    if (mark.classroomId !== classroomId || !within(span, mark.day)) continue;
    if (mark.mark === 'Present') present += 1;
    else if (mark.mark === 'Absent') absent += 1;
    else late += 1;
  }
  const total = present + absent + late;
  return { present, absent, late, total, rate: rateOf(present, total) };
}

/** One week of a class's attendance, as the trend draws it. */
export type TrendWeek = {
  /** The Monday the week begins on, as this language writes a date: 'Apr 21', '4月21日'. */
  label: string;
  /** The share present that week, as a whole number of per cent. */
  rate: number;
  /** How many marks that week was worked out from: none means the week is empty, not perfect. */
  marks: number;
};

/** The Monday of the week a day falls in. */
const mondayOf = (day: Date): Date =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate() - ((day.getDay() + 6) % 7));

/** The last so many weeks of a class's attendance, oldest first, the week being taught last. */
export function weeklyTrend(data: ClassroomData, classroomId: string, now: Date, weeks: number): TrendWeek[] {
  const thisMonday = mondayOf(now);
  return Array.from({ length: weeks }, (_, n) => {
    const monday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - (weeks - 1 - n) * 7);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    const tally = tallyFor(data, classroomId, { from: dayText(monday), to: dayText(sunday) });
    return { label: dateLabel(monday), rate: tally.rate, marks: tally.total };
  });
}

/** How a class's last thirty days compare with the thirty before them, in whole points of per cent. */
export type MonthOnMonth = { points: number; of: Tally; before: Tally };

export function monthOnMonth(data: ClassroomData, classroomId: string, now: Date, days = 30): MonthOnMonth {
  const span = lastDays(now, days);
  const of = tallyFor(data, classroomId, span);
  const before = tallyFor(data, classroomId, theDaysBefore(span, days));
  // A stretch with nothing marked in it is not a drop to zero: there is simply nothing to compare.
  const points = of.total === 0 || before.total === 0 ? 0 : of.rate - before.rate;
  return { points, of, before };
}
