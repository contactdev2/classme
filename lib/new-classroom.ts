// Making one of a teacher's classrooms, on the phone and nowhere else.
//
// The form collects what is typed and hands it here; this is the one place that decides what a
// submission means, so the screen only has to say back what it is told — the same division the
// signup beside it is built on (lib/sign-up.ts), and the same read-change-write a saved register
// goes through (lib/attendance-save.ts).
//
// A classroom is known by its name. Two classes a teacher cannot tell apart in a list are two
// classes they cannot mark attendance in either, so a name one of their classes already has is
// refused and said out loud — however it was typed, because 'Mathematics', 'mathematics' and
// ' MATHEMATICS ' are one class to the teacher reading the list.
//
// Nothing is sent anywhere. The classroom is written to the phone's own store and that is the whole
// of it.
import { classroomStore, type Classroom, type ClassroomData } from './classroom-data';
import { say, type WordKey } from './i18n';

/**
 * What a teacher fills in to make a classroom: its name, the period it meets in, and the icon and
 * colour they will spot it by. The name is the only one of the four a classroom cannot be made
 * without — an approved decision asks for all four, and three of them have an answer already.
 */
export type NewClassroom = { name: string; period: string; subject: string; colour: string };

/** One subject icon the form offers, with the words it is named by so a finger can find it. */
export type SubjectIcon = { icon: string; name: WordKey };

/** The icons a classroom is picked out by, in the order the form offers them. */
export const subjectIcons: readonly SubjectIcon[] = [
  { icon: '📐', name: 'subject.maths' },
  { icon: '🔬', name: 'subject.science' },
  { icon: '💬', name: 'subject.language' },
  { icon: '🏫', name: 'subject.humanities' },
  { icon: '🎨', name: 'subject.arts' },
  { icon: '🎵', name: 'subject.music' },
];

/** One colour the form offers, with the words it is named by: a colour nobody can read is no choice. */
export type ClassColour = { colour: string; name: WordKey };

/**
 * The colours a classroom can be told apart by. An approved decision lets a teacher pick an icon
 * **or** a colour, so the form offers both and a classroom keeps both: the list draws the icon on a
 * wash of the colour, which is how the prototype draws a card.
 */
export const classColours: readonly ClassColour[] = [
  { colour: '#2F6FED', name: 'colour.blue' },
  { colour: '#1FAE63', name: 'colour.green' },
  { colour: '#9B59D0', name: 'colour.purple' },
  { colour: '#E08A2E', name: 'colour.amber' },
  { colour: '#E0574A', name: 'colour.red' },
];

/** The form as it opens: nothing typed, and the first icon and colour already chosen. */
export function emptyForm(): NewClassroom {
  return { name: '', period: '', subject: subjectIcons[0].icon, colour: classColours[0].colour };
}

/**
 * What was typed, as the details a classroom is made from: the name and the period with the stray
 * spaces a keyboard adds taken off. A period nobody typed stays empty — it is the one of the two a
 * teacher may leave, and the list says so in its own words rather than drawing a gap.
 */
export function detailsFrom(typed: NewClassroom): NewClassroom {
  return { ...typed, name: typed.name.trim(), period: typed.period.trim() };
}

/**
 * Whether these two are one classroom's name. Compared with the ends trimmed and the case set
 * aside, because that is how the teacher reading their own list tells two names apart: 'Mathematics'
 * and 'mathematics' are not two classes, they are one class typed twice.
 */
export const sameName = (one: string, other: string): boolean =>
  one.trim().toLocaleLowerCase() === other.trim().toLocaleLowerCase();

/** The classroom this teacher already has by this name, and null when they have none. */
export function classroomNamed(data: ClassroomData, name: string): Classroom | null {
  return data.classrooms.find((one) => sameName(one.name, name)) ?? null;
}

/**
 * Whether this name belongs to a classroom the teacher already has. A class they have put away
 * counts: it is still one of their own classes, it still shows under Archived, and a second class
 * by its name would make both of them a puzzle.
 */
export const nameAlreadyUsed = (data: ClassroomData, name: string): boolean => classroomNamed(data, name) !== null;

/** The name a teacher must still type, or null when they have typed one. */
export function nameMissingFrom(typed: Pick<NewClassroom, 'name'>): string | null {
  return typed.name.trim() ? null : say('newClass.missingName');
}

/**
 * What is still wrong with these details, in words a teacher can act on, or null when there is
 * nothing left to say. Said one thing at a time, in the order the form asks for them, because a
 * person fixes one thing at a time.
 */
export function notReadyFor(data: ClassroomData, typed: NewClassroom): string | null {
  const details = detailsFrom(typed);
  const missing = nameMissingFrom(details);
  if (missing) return missing;
  if (nameAlreadyUsed(data, details.name)) return say('newClass.nameTaken');
  return null;
}

/**
 * An id for a new classroom, which nothing already on this phone answers to: the moment it was
 * made, and a number after it where two were made inside the same millisecond. Nothing random, so
 * a phone that makes the same two classrooms twice reads the same both times.
 */
export function freshClassroomId(data: ClassroomData, now: Date = new Date()): string {
  const stamp = now.getTime().toString(36);
  let id = `c-${stamp}`;
  for (let n = 2; data.classrooms.some((one) => one.id === id); n += 1) id = `c-${stamp}-${n}`;
  return id;
}

/** What was typed, as the classroom the phone will keep. */
export function classroomFrom(typed: NewClassroom, data: ClassroomData, now: Date = new Date()): Classroom {
  const details = detailsFrom(typed);
  return {
    id: freshClassroomId(data, now),
    name: details.name,
    period: details.period,
    subject: details.subject,
    colour: details.colour,
  };
}

/**
 * Everything the phone keeps, with one more classroom in it. Nothing is changed in place, so what
 * was handed in still says what it said.
 */
export function dataWithClassroom(data: ClassroomData, classroom: Classroom): ClassroomData {
  return { ...data, classrooms: [...data.classrooms, classroom] };
}

/** What making a classroom came to, and the one sentence the screen says back to the teacher. */
export type MadeClassroom = {
  created: boolean;
  said: string;
  /** The classroom that was made, when one was. */
  classroom?: Classroom;
  /** Everything the phone keeps now, so the screens behind the form need not read it again. */
  data?: ClassroomData;
};

/**
 * Makes the classroom: kept on this phone, beside whatever is already here, and said back as the
 * confirmation the teacher is shown.
 *
 * The store is read again here rather than trusted from the screen, for the reason a register's own
 * save reads it again: every other class on this phone is the phone's own, and a name is only taken
 * or free against what is actually kept.
 *
 * A phone that will not be written to answers `created: false` and a sentence saying so, and
 * **nothing is logged on the way past** — a teacher reads what to do next and never the words of
 * the thing that failed, and the app never says a classroom was created when none was. Nothing is
 * asked of a network, so the answer is the same with a connection and without one.
 */
export async function makeClassroom(typed: NewClassroom, now: Date = new Date()): Promise<MadeClassroom> {
  const details = detailsFrom(typed);
  const missing = nameMissingFrom(details);
  if (missing) return { created: false, said: missing };
  try {
    const store = classroomStore();
    const kept = await store.read();
    if (nameAlreadyUsed(kept, details.name)) return { created: false, said: say('newClass.nameTaken') };
    const classroom = classroomFrom(details, kept, now);
    const data = dataWithClassroom(kept, classroom);
    await store.write(data);
    return { created: true, said: say('newClass.created', { name: classroom.name }), classroom, data };
  } catch {
    return { created: false, said: say('newClass.couldNotSave') };
  }
}
