// What Home says first: the part of the day it is, and the teacher whose phone this is. Kept apart
// from the screen that draws it so the words are one thing and the layout another.
import type { TeacherProfile } from './local-accounts';

/**
 * The part of the day, as a person greets it. Noon and six o'clock are where the words change,
 * read off the phone's own clock — the teacher's morning, not a server's.
 */
export function partOfDay(at: Date): string {
  const hour = at.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * What to call this teacher: the name kept inside their own record, which only their password
 * opens. A record that keeps no name is greeted by the email it does keep — never by a name the
 * app invented for them.
 */
export function nameOf(teacher: TeacherProfile): string {
  return teacher.name?.trim() || teacher.email;
}

/** The greeting in the two lines the prototype draws: the hour first, then who is being greeted. */
export function greetingFor(teacher: TeacherProfile, at: Date): { hour: string; name: string } {
  return { hour: `${partOfDay(at)},`, name: nameOf(teacher) };
}
