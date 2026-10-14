// How one student's attendance is drawn, in the two places it is drawn: their profile, and the full
// record behind 'View All'. Both screens draw a day of theirs and both draw their initials, so the
// look of a day and the wash behind a face live here and neither screen keeps a second copy.

import { dayFromText } from '../lib/attendance-save';
import type { AttendanceMark, ClassroomData, Student } from '../lib/classroom-data';
import { say, type WordKey } from '../lib/i18n';
import { rosterOf } from '../lib/roster';
import type { HistoryDay } from '../lib/student-history';
import { avatarWashes, markColours } from '../lib/theme';
import { dateLabel } from '../lib/week';

/**
 * Each mark's own word, its own colour, and the sign the prototype draws beside that word: a tick
 * for a day the student was here, a cross for one they were away, a clock for one they came in
 * after the bell. The word carries the meaning on its own — the sign is beside it, never instead
 * of it, so a screen read with the ears says the same thing as one read with the eyes.
 */
export const dayLook: Record<AttendanceMark, { name: WordKey; colour: string; sign: string }> = {
  Present: { name: 'mark.present', colour: markColours.present, sign: '✓' },
  Absent: { name: 'mark.absent', colour: markColours.absent, sign: '✕' },
  Late: { name: 'mark.late', colour: markColours.late, sign: '⏰' },
};

/** A mark's colour, washed out, behind the sign for it. */
export const washOf = (colour: string): string => `${colour}26`;

/**
 * A day of a student's history as a person reads it: 'Apr 21, 2025'. The year is on it because a
 * history runs back past the month it is read in, and a term's own dates with no year on them are
 * a puzzle in September. The month, the day and the year fall in each language's own order.
 */
export const dateInWords = (day: string): string => {
  const when = dayFromText(day);
  return say('student.dayDate', { date: dateLabel(when), year: when.getFullYear() });
};

/** One day of a history as a screen reader hears it, in one phrase: 'Apr 21, 2025 — Absent'. */
export const dayInWords = (one: HistoryDay): string =>
  say('student.day', { date: dateInWords(one.day), mark: say(dayLook[one.mark].name) });

/** That month, as a heading over the days of it: 'April 2025', '2025年4月'. */
export const monthInWords = (year: number, month: number): string =>
  say('student.monthOf', { month: say(`monthFull.${month}` as WordKey), year });

/**
 * The soft wash a student's own initials sit on: the next one along by their place in their class's
 * own register, so the same face is the same colour wherever the app draws it — on the register, on
 * their profile, and at the top of their full record.
 */
export function washFor(data: ClassroomData, student: Student): (typeof avatarWashes)[number] {
  const at = rosterOf(data, student.classroomId).findIndex((one) => one.id === student.id);
  return avatarWashes[(at < 0 ? 0 : at) % avatarWashes.length];
}
