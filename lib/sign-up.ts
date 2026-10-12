// Making a teacher's own profile, on the phone and nowhere else. The signup screen collects what is
// typed and hands it here; this is the one place that decides what a submission means, so the screen
// only has to say back what it is told — the same division the sign-in beside it is built on.
import { say } from './i18n';
import { addAccount, emailAlreadyUsed, lockAccount, type TeacherProfile } from './local-accounts';

/**
 * What a teacher fills in to make a profile. These three words travel together and no further: they
 * are never written to a log, never put in a message, and never sent off the phone.
 */
export type NewProfile = { name: string; email: string; password: string };

/** How short a password is allowed to be. The screen says this number; so does the refusal. */
export const shortestPassword = 8;

/** What a submission came to, and the one sentence the screen says back to the teacher who made it. */
export type SignUpOutcome = {
  created: boolean;
  said: string;
  /** The profile that was made, when one was: what is now locked in their own record, and no more. */
  teacher?: TeacherProfile;
  /**
   * Whether the phone really wrote the record down, when a profile was made. A phone with no folder
   * of its own, or no room left in it, still gets its teacher a profile to work with today — but it
   * will not be there tomorrow, and the screen has to be able to say so rather than promise it.
   */
  saved?: boolean;
};

/**
 * What was typed, as the details a profile is made from: the name and the email with the stray
 * spaces a keyboard adds taken off, and the password exactly as typed — a space inside a password
 * is part of the password.
 */
export function detailsFrom(typed: NewProfile): NewProfile {
  return { name: typed.name.trim(), email: typed.email.trim(), password: typed.password };
}

/** An address a profile can be made with: a name, an @, and something with a dot in it after it. */
const looksLikeAnEmail = (email: string) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email);

/**
 * The name a teacher must still give before the second step can ask them anything, or null when
 * they have given it. The first step is one field, so this is one sentence.
 */
export function nameMissingFrom(typed: Pick<NewProfile, 'name'>): string | null {
  return typed.name.trim() ? null : say('signUp.missingName');
}

/**
 * What is still wrong with these details, in words a teacher can act on, or null when there is
 * nothing left to say. Said one thing at a time, in the order the screen asks for them, because a
 * person fixes one thing at a time.
 */
export function notReadyFor(typed: NewProfile): string | null {
  const details = detailsFrom(typed);
  const nameMissing = nameMissingFrom(details);
  if (nameMissing) return nameMissing;
  if (!details.email) return say('signUp.missingEmail');
  if (!looksLikeAnEmail(details.email)) return say('signUp.badEmail');
  if (!details.password) return say('signUp.missingPassword');
  // Counted the way a person counts: a character they typed is a character, whatever a phone needs
  // to keep it in.
  if ([...details.password].length < shortestPassword) return say('signUp.shortPassword', { least: shortestPassword });
  return null;
}

/**
 * Makes the profile: a record of this teacher's own, locked with the password they chose, kept on
 * this phone beside whatever is already here.
 *
 * Nothing is sent anywhere, nothing is asked of a network, and the answer is the same whether the
 * phone has a connection or not. A phone that will not keep the record still gets its teacher the
 * profile — `saved` says it was not written down, and the screen says so in words. Making one is
 * the phone's own arithmetic and the phone's own folder, so there is nothing here that can fail for
 * a reason a teacher could do anything about.
 *
 * An email some record here already belongs to is refused and said out loud, because a teacher who
 * cannot tell which of two profiles is theirs has lost both — and
 * because the refusal is about an address they have just typed themselves, so it tells them nothing
 * about this phone they did not already know.
 */
export async function submitSignUp(details: NewProfile): Promise<SignUpOutcome> {
  const notReady = notReadyFor(details);
  if (notReady) return { created: false, said: notReady };

  const ready = detailsFrom(details);
  if (await emailAlreadyUsed(ready.email)) return { created: false, said: say('signUp.emailTaken') };

  const teacher: TeacherProfile = { email: ready.email, name: ready.name };
  const saved = await addAccount(lockAccount({ email: ready.email, password: ready.password }, teacher));
  return { created: true, said: say('signUp.created'), teacher, saved };
}
