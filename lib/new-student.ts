// Adding one student to one of a teacher's classrooms, on the phone and nowhere else.
//
// The dialog collects the name and hands it here; this is the one place that decides what adding a
// student means, so the screen only has to say back what it is told — the same division making a
// classroom beside it is built on (lib/new-classroom.ts), and the same read-change-write a saved
// register goes through (lib/attendance-save.ts).
//
// A student is known in their class by their name. Two names a teacher cannot tell apart on a
// register are two students they cannot mark attendance for either, so a name somebody in that
// class already has is refused and said out loud — however it was typed, because 'Amelia Ruiz',
// 'amelia ruiz' and ' AMELIA RUIZ ' are one girl to the teacher reading the list.
//
// That holds **inside one classroom and no further**: the same name in another of the teacher's
// classes is another person in another room, and refusing it there would be refusing a real
// student a place in a real class.
//
// Nothing is sent anywhere. The student is written to the phone's own store and that is the whole
// of it.
import { classroomWithId } from './classes';
import { classroomStore, type ClassroomData, type Student } from './classroom-data';
import { say } from './i18n';

/**
 * What a teacher fills in to add a student: their name, which is the whole of it. An approved
 * decision keeps a photo against a student as well, and the dialog this requirement's mockup draws
 * asks for a name alone — a photo is the camera's own requirement, and `Student.photo` is already
 * optional and waiting for it.
 */
export type NewStudent = { name: string };

/** The dialog as it opens: nothing typed. */
export function emptyStudent(): NewStudent {
  return { name: '' };
}

/**
 * What was typed, as the details a student is made from: the name with the stray spaces a keyboard
 * adds taken off.
 */
export function detailsFrom(typed: NewStudent): NewStudent {
  return { ...typed, name: typed.name.trim() };
}

/**
 * Whether these two are one student's name. Compared with the ends trimmed and the case set aside,
 * because that is how the teacher reading their own register tells two names apart: 'Amelia Ruiz'
 * and 'amelia ruiz' are not two girls, they are one girl typed twice. Set aside this way, the exact
 * same name can never stand on a class's list twice either.
 */
export const sameStudentName = (one: string, other: string): boolean =>
  one.trim().toLocaleLowerCase() === other.trim().toLocaleLowerCase();

/** The student this class already has by this name, and null when nobody in it has it. */
export function studentNamedIn(data: ClassroomData, classroomId: string, name: string): Student | null {
  return data.students.find((one) => one.classroomId === classroomId && sameStudentName(one.name, name)) ?? null;
}

/**
 * Whether this name belongs to somebody in **this** class already. Another class of the same
 * teacher's is not asked: a girl called Chloe Kim in the first period and a boy called Chloe Kim in
 * the fourth are two people, and the register each of them stands on is its own.
 */
export const nameAlreadyInClass = (data: ClassroomData, classroomId: string, name: string): boolean =>
  studentNamedIn(data, classroomId, name) !== null;

/** The name a teacher must still type, or null when they have typed one. */
export function nameMissingFrom(typed: NewStudent): string | null {
  return typed.name.trim() ? null : say('newStudent.missingName');
}

/**
 * What is still wrong with this name, in words a teacher can act on, or null when there is nothing
 * left to say. Said one thing at a time, because a person fixes one thing at a time.
 */
export function notReadyFor(data: ClassroomData, classroomId: string, typed: NewStudent): string | null {
  const details = detailsFrom(typed);
  const missing = nameMissingFrom(details);
  if (missing) return missing;
  if (!classroomWithId(data, classroomId)) return say('newStudent.noClass');
  if (nameAlreadyInClass(data, classroomId, details.name)) return say('newStudent.nameTaken');
  return null;
}

/**
 * An id for a new student, which nothing already on this phone answers to: the moment they were
 * added, and a number after it where two were added inside the same millisecond. Nothing random, so
 * a phone adding the same two students twice reads the same both times — the shape a classroom's
 * own id is made in (lib/new-classroom.ts).
 */
export function freshStudentId(data: ClassroomData, now: Date = new Date()): string {
  const stamp = now.getTime().toString(36);
  let id = `s-${stamp}`;
  for (let n = 2; data.students.some((one) => one.id === id); n += 1) id = `s-${stamp}-${n}`;
  return id;
}

/** What was typed, as the student the phone will keep in this class. */
export function studentFrom(
  typed: NewStudent,
  classroomId: string,
  data: ClassroomData,
  now: Date = new Date(),
): Student {
  return { id: freshStudentId(data, now), classroomId, name: detailsFrom(typed).name };
}

/**
 * Everything the phone keeps, with one more student in it. Nothing is changed in place, so what was
 * handed in still says what it said.
 */
export function dataWithStudent(data: ClassroomData, student: Student): ClassroomData {
  return { ...data, students: [...data.students, student] };
}

/** What adding a student came to, and the one sentence the dialog says back to the teacher. */
export type AddedStudent = {
  added: boolean;
  said: string;
  /** The student that was added, when one was. */
  student?: Student;
  /** Everything the phone keeps now, so the screens behind the dialog need not read it again. */
  data?: ClassroomData;
};

/**
 * Adds the student: kept on this phone, in this class, beside whoever is already in it, and said
 * back as the confirmation the teacher is shown.
 *
 * The store is read again here rather than trusted from the screen, for the reason a classroom's
 * own name is checked against it: every other student in this class is the phone's own, and a name
 * is only taken or free against what is actually kept.
 *
 * A phone that will not be written to answers `added: false` and a sentence saying so, and
 * **nothing is logged on the way past** — a teacher reads what to do next and never a student's
 * name out of a log, and the app never says a student was added when none was. Nothing is asked of
 * a network, so the answer is the same with a connection and without one.
 */
export async function addStudent(
  classroomId: string,
  typed: NewStudent,
  now: Date = new Date(),
): Promise<AddedStudent> {
  const details = detailsFrom(typed);
  const missing = nameMissingFrom(details);
  if (missing) return { added: false, said: missing };
  try {
    const store = classroomStore();
    const kept = await store.read();
    const notReady = notReadyFor(kept, classroomId, details);
    if (notReady) return { added: false, said: notReady };
    const student = studentFrom(details, classroomId, kept, now);
    const data = dataWithStudent(kept, student);
    await store.write(data);
    const classroom = classroomWithId(data, classroomId);
    return {
      added: true,
      said: say('newStudent.added', { name: student.name, class: classroom?.name ?? '' }),
      student,
      data,
    };
  } catch {
    return { added: false, said: say('newStudent.couldNotSave') };
  }
}
