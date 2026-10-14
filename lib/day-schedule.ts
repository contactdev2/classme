// A teacher's own day, as Home reads it: the week they pick a day out of, the classes that day
// holds, and which of those classes they are standing in now.
//
// A classroom keeps a name, a period, a subject icon and a colour (lib/classroom-data.ts) and
// nothing about which days of the week it meets on. So every class a teacher is teaching stands on
// every school day of their week, and the day they pick decides what the schedule is headed with
// and whether there is a register to take — not which classes are on it. Giving a class days of its
// own is a requirement of its own, and the form a class is made in would be where it is asked for.
//
// The data itself is lib/classroom-data.ts and the reading of a teacher's classes is lib/classes.ts;
// this is only the reading of their day, so Home holds no rule of its own and a check can ask the
// same questions.

import { classesShown, studentsInClass } from './classes';
import type { Classroom, ClassroomData } from './classroom-data';
import { sameDay, schoolWeekOf, type SchoolDay } from './week';

/** One date the day selector on Home offers, and whether it is the day the teacher is on. */
export type PickableDay = SchoolDay;

/**
 * The dates the selector offers: Monday to Friday of the week this day falls in. A Saturday or a
 * Sunday belongs to the week just taught, so that is the week shown — with no day picked out,
 * because the teacher is not in school on it. See lib/week.ts.
 */
export const schoolDaysOf = (now: Date): PickableDay[] => schoolWeekOf(now);

/** Whether the date a teacher is looking at is the day they are looking at it on. */
export const isToday = (looking: Date, now: Date): boolean => sameDay(looking, now);

/** One class standing on a teacher's day: the class itself, and how many students are in it. */
export type ScheduledClass = { classroom: Classroom; students: number };

/**
 * The classes a school day holds: the ones the teacher is teaching, in the order their periods put
 * them, each with the count a card says. A class they have put away is on no day — it is finished
 * with, and kept rather than deleted.
 */
export function theDaysClasses(data: ClassroomData): ScheduledClass[] {
  return classesShown(data, 'active').map((classroom) => ({
    classroom,
    students: studentsInClass(data, classroom.id),
  }));
}

/**
 * The class a teacher can take the register of from Home, and null where there is none.
 *
 * It is the first class of the day, and only on the day itself. A period is what the teacher typed
 * — '1st Period', 'Period 10' — with no hours against it, so nothing here can know which period is
 * running at half past two; and the register this app saves is always today's (see
 * lib/attendance-save.ts), so a day in the week ahead has a schedule to read and no attendance to
 * take. A requirement that gives a period its own hours is the one that should narrow this.
 */
export function classToTakeNow(schedule: ScheduledClass[], looking: Date, now: Date): ScheduledClass | null {
  if (!isToday(looking, now)) return null;
  return schedule[0] ?? null;
}
