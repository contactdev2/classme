// A teacher's own classes, as the Classes list shows them: which of them to show, in what order,
// and how many students are in each. The data itself is lib/classroom-data.ts; this is only the
// reading of it, so the screen holds no rule of its own and a check can ask the same questions.

import type { Classroom, ClassroomData } from './classroom-data';

/** Which of a teacher's classes the list is showing: all of them, the ones being taught, or the ones put away. */
export type ClassFilter = 'all' | 'active' | 'archived';

/** The three filters, in the order the list offers them. */
export const classFilters: readonly ClassFilter[] = ['all', 'active', 'archived'];

/** Whether a class has been put away: finished with, and kept rather than deleted. */
export const isArchived = (one: Classroom): boolean => one.archived === true;

/**
 * Where a class falls in a teacher's day, read off the period it meets in: '1st Period' before
 * '2nd Period', and 'Period 10' after 'Period 9'. A period with no number in it sorts after the
 * ones that have, by its own name, so nothing is ever lost off the end of the list.
 */
export function periodOrder(period: string): number {
  const number = /\d+/.exec(period);
  return number ? Number(number[0]) : Number.POSITIVE_INFINITY;
}

const inTheDaysOrder = (one: Classroom, other: Classroom): number =>
  periodOrder(one.period) - periodOrder(other.period) || one.name.localeCompare(other.name);

/** The classes this filter asks for, in the order the teacher's own day puts them. */
export function classesShown(data: ClassroomData, filter: ClassFilter): Classroom[] {
  const wanted = data.classrooms.filter((one) =>
    filter === 'all' ? true : filter === 'archived' ? isArchived(one) : !isArchived(one),
  );
  return [...wanted].sort(inTheDaysOrder);
}

/** How many students are in this class, counted off the students the phone keeps. */
export function studentsInClass(data: ClassroomData, classroomId: string): number {
  return data.students.filter((one) => one.classroomId === classroomId).length;
}

/** The class with this id, and null when the phone knows no such class. */
export function classroomWithId(data: ClassroomData, classroomId: string): Classroom | null {
  return data.classrooms.find((one) => one.id === classroomId) ?? null;
}

/**
 * The classes a teacher can switch straight to from inside one of them: the ones they are teaching,
 * and the one they are looking at — which may be a class they have put away and opened anyway.
 */
export function classesToSwitchTo(data: ClassroomData, showing: string): Classroom[] {
  const active = classesShown(data, 'active');
  if (active.some((one) => one.id === showing)) return active;
  const open = classroomWithId(data, showing);
  return open ? [...active, open].sort(inTheDaysOrder) : active;
}
