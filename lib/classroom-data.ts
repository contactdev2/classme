// The classroom data a backup is made of. Declared here so the checks that prove a backup can name
// the pieces they call; nothing behind any of it yet.
export type AttendanceMark = 'Present' | 'Absent' | 'Late';
export type Classroom = { id: string; name: string; period: string; subject: string; colour: string };
export type Student = { id: string; classroomId: string; name: string; photo?: string };
export type AttendanceRecord = { studentId: string; classroomId: string; day: string; mark: AttendanceMark };
export type ClassroomData = {
  version: 1;
  classrooms: Classroom[];
  students: Student[];
  attendance: AttendanceRecord[];
};
export type ClassroomStore = { read(): Promise<ClassroomData>; write(data: ClassroomData): Promise<void> };

const notBuiltYet = () => new Error('keeping classroom data is not built yet');

export function nothingKeptYet(): ClassroomData {
  throw notBuiltYet();
}

export function classroomDataIn(_data: ClassroomData): ClassroomStore {
  throw notBuiltYet();
}

export function keepClassroomDataIn(_store: ClassroomStore): void {
  throw notBuiltYet();
}

export function classroomStore(): ClassroomStore {
  throw notBuiltYet();
}
