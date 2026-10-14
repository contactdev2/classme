// One class's roster, as the screen where attendance is taken reads it: who is in the class, what
// each of them is marked as while the teacher is standing in front of them, and what that comes to.
//
// A register starts with everybody present. Marking a class is mostly marking the few who are not
// there, so the roster opens with every student already at Present and a teacher changes what they
// need to — which is the whole of why this screen is quick. Nothing here is read off a saved mark:
// Present is where the roster starts, and the marks the phone keeps are the days already taken.
//
// The data itself is lib/classroom-data.ts; this is only the reading of it, so the screen holds no
// rule of its own and a check can ask the same questions.

import { classesShown, classroomWithId } from './classes';
import type { AttendanceMark, Classroom, ClassroomData, Student } from './classroom-data';

/** The mark every student on a roster starts at: full attendance, until the teacher says otherwise. */
export const markToStartWith: AttendanceMark = 'Present';

/** What a teacher is looking at on the roster: everybody, or only those at one of the three marks. */
export type RosterFilter = 'all' | AttendanceMark;

/** The four, in the order the screen offers them. */
export const rosterFilters: readonly RosterFilter[] = ['all', 'Present', 'Absent', 'Late'];

/** What each student in a class is marked as, by the id the phone knows them by. */
export type MarkedRoster = Record<string, AttendanceMark>;

/** The order a register is read in: by the student's own name, as this language sorts names. */
const inRegisterOrder = (one: Student, other: Student): number => one.name.localeCompare(other.name);

/**
 * The students of one class, in the order a register is read in. This is the class's roster as the
 * phone itself keeps it — no name is added to it and none is left off.
 */
export function rosterOf(data: ClassroomData, classroomId: string): Student[] {
  return data.students.filter((one) => one.classroomId === classroomId).sort(inRegisterOrder);
}

/** A roster as it stands the moment it opens: every student on it marked Present. */
export function everyonePresent(students: Student[]): MarkedRoster {
  return Object.fromEntries(students.map((one) => [one.id, markToStartWith]));
}

/** What a student standing on the roster is marked as; Present for one nobody has changed. */
export const markOf = (marks: MarkedRoster, student: Student): AttendanceMark => marks[student.id] ?? markToStartWith;

/** How many of a roster stand at each of the three marks, and how many there are altogether. */
export type RosterTally = { present: number; absent: number; late: number; total: number };

export function tallyOfRoster(students: Student[], marks: MarkedRoster): RosterTally {
  let present = 0;
  let absent = 0;
  let late = 0;
  for (const student of students) {
    const mark = markOf(marks, student);
    if (mark === 'Present') present += 1;
    else if (mark === 'Absent') absent += 1;
    else late += 1;
  }
  return { present, absent, late, total: students.length };
}

/** How many of them this filter is asking about, which is the number written on it. */
export const countedBy = (tally: RosterTally, filter: RosterFilter): number =>
  filter === 'all' ? tally.total : filter === 'Present' ? tally.present : filter === 'Absent' ? tally.absent : tally.late;

/**
 * The students a teacher is looking at: the ones at the mark they asked for, and whose name has in
 * it what they typed into the search. An empty search asks for nobody in particular, so everybody
 * the filter allows is on the screen.
 */
export function rosterShown(
  students: Student[],
  marks: MarkedRoster,
  filter: RosterFilter,
  looking = '',
): Student[] {
  const wanted = looking.trim().toLocaleLowerCase();
  return students.filter(
    (one) =>
      (filter === 'all' || markOf(marks, one) === filter) &&
      (wanted === '' || one.name.toLocaleLowerCase().includes(wanted)),
  );
}

/**
 * A student's own initials, as the circle beside their name draws them: 'Aaliyah Carter' is AC, and
 * somebody with one name to their name is the first two letters of it. Counted in characters and
 * not in bytes, so a name written in any language keeps its own first letter.
 */
export function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter((one) => one !== '');
  if (words.length === 0) return '';
  const letters =
    words.length === 1
      ? [...words[0]].slice(0, 2)
      : [[...words[0]][0], [...words[words.length - 1]][0]];
  return letters.join('').toLocaleUpperCase();
}

/**
 * The class a teacher is taking attendance in: the one they opened, if they opened one, and
 * otherwise the first class of their own day. A phone with nothing taught on it has none, and the
 * screen says so plainly rather than drawing an empty register.
 */
export function classToMarkIn(data: ClassroomData, opened: string | null = null): Classroom | null {
  const open = opened === null ? null : classroomWithId(data, opened);
  if (open) return open;
  return classesShown(data, 'active')[0] ?? classesShown(data, 'all')[0] ?? null;
}
