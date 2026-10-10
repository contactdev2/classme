// What a teacher's phone knows about their teaching: their classrooms, the students in them, and
// every attendance mark against a student's name. This is the data a backup file is made of, so it
// is named here once and read from here by everything that keeps it or writes it back.
//
// None of it leaves the phone. A backup is a file on the same phone (lib/backup.ts), locked with a
// password of the teacher's own choosing, and there is nowhere else any of this is ever sent.

/** What a teacher marks a student as, for one class period. */
export type AttendanceMark = 'Present' | 'Absent' | 'Late';

/** The three marks, as the app offers them. */
export const attendanceMarks: readonly AttendanceMark[] = ['Present', 'Absent', 'Late'];

/** One of a teacher's classrooms: what it is called, when it meets, and how it is picked out. */
export type Classroom = {
  id: string;
  name: string;
  period: string;
  /** The subject's own icon, as the teacher chose it. */
  subject: string;
  /** Or its colour, for a teacher who would rather tell them apart that way. */
  colour: string;
};

/** One student in one classroom. The photo is where the phone keeps it, and never a web address. */
export type Student = { id: string; classroomId: string; name: string; photo?: string };

/** One mark against one student, on one day. */
export type AttendanceRecord = { studentId: string; classroomId: string; day: string; mark: AttendanceMark };

/** Everything the phone keeps about a teacher's teaching, all together: what a backup carries. */
export type ClassroomData = {
  version: 1;
  classrooms: Classroom[];
  students: Student[];
  attendance: AttendanceRecord[];
};

/** A phone that has been told nothing yet: no classroom, no student, no mark. */
export function nothingKeptYet(): ClassroomData {
  return { version: 1, classrooms: [], students: [], attendance: [] };
}

/** This data, held apart from whoever handed it over, so nobody changes it from the outside. */
const asKept = (data: ClassroomData): ClassroomData => ({
  version: data.version,
  classrooms: [...data.classrooms],
  students: [...data.students],
  attendance: [...data.attendance],
});

/** Where the classroom data lives: the phone's own store behind one seam, so a check can hand over its own. */
export type ClassroomStore = { read(): Promise<ClassroomData>; write(data: ClassroomData): Promise<void> };

/** A store holding this data, and nothing else. */
export function classroomDataIn(data: ClassroomData): ClassroomStore {
  let kept = asKept(data);
  return {
    async read() {
      return asKept(kept);
    },
    async write(next) {
      kept = asKept(next);
    },
  };
}

// Where the classroom data is kept while the app is running. It starts empty: making a classroom is
// its own requirement, and so is keeping one past the app being closed. When that arrives, this one
// line is what it replaces — everything else already reads what is here.
let store: ClassroomStore = classroomDataIn(nothingKeptYet());

/** Keeps the classroom data in this store from now on. */
export function keepClassroomDataIn(next: ClassroomStore): void {
  store = next;
}

/** The classroom data store in use. */
export function classroomStore(): ClassroomStore {
  return store;
}

const isText = (value: unknown): value is string => typeof value === 'string';

/**
 * This value, if it really is a teacher's classroom data, and null if it is anything else. What
 * comes out of a backup file is read through here before a word of it is put back on the phone: a
 * file that opened is not yet a file worth believing.
 */
export function classroomDataIfWhole(value: unknown): ClassroomData | null {
  if (typeof value !== 'object' || value === null) return null;
  const { version, classrooms, students, attendance } = value as Record<string, unknown>;
  if (version !== 1) return null;
  if (!Array.isArray(classrooms) || !Array.isArray(students) || !Array.isArray(attendance)) return null;

  const wholeClassroom = (one: unknown) => {
    const { id, name, period, subject, colour } = (one ?? {}) as Record<string, unknown>;
    return isText(id) && isText(name) && isText(period) && isText(subject) && isText(colour);
  };
  const wholeStudent = (one: unknown) => {
    const { id, classroomId, name, photo } = (one ?? {}) as Record<string, unknown>;
    return isText(id) && isText(classroomId) && isText(name) && (photo === undefined || isText(photo));
  };
  const wholeMark = (one: unknown) => {
    const { studentId, classroomId, day, mark } = (one ?? {}) as Record<string, unknown>;
    return isText(studentId) && isText(classroomId) && isText(day) && attendanceMarks.includes(mark as AttendanceMark);
  };

  if (!classrooms.every(wholeClassroom) || !students.every(wholeStudent) || !attendance.every(wholeMark)) return null;
  return value as ClassroomData;
}
