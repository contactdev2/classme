// Signing a teacher in, on the phone and nowhere else. The login screen collects what is typed and
// hands it here; this is the one place that decides what a submission means, so the screen only has
// to say back what it is told.
import { say } from './i18n';
import { teacherMatching, type TeacherProfile } from './local-accounts';

/**
 * What a teacher types in to sign in. These two words travel together and no further: they are
 * never written to a log, never put in a message, and never sent off the phone.
 */
export type Credentials = { email: string; password: string };

/** What a submission came to, and the one sentence the screen says back to the teacher. */
export type SignInOutcome = {
  signedIn: boolean;
  said: string;
  /** Who signed in, when somebody did: the details read out of their own record, and no more. */
  teacher?: TeacherProfile;
};

/**
 * What a teacher has still to fill in, in words they can act on, or null when both fields are there.
 * Said field by field, because "something is missing" makes a person check both.
 */
export function missingFrom(typed: Credentials): string | null {
  const email = typed.email.trim();
  if (!email && !typed.password) return say('signIn.missingBoth');
  if (!email) return say('signIn.missingEmail');
  if (!typed.password) return say('signIn.missingPassword');
  return null;
}

/**
 * What was typed, as the credentials to be checked: the email with the stray spaces a keyboard adds
 * taken off, and the password exactly as typed — a space inside a password is part of the password.
 */
export function credentialsFrom(typed: Credentials): Credentials {
  return { email: typed.email.trim(), password: typed.password };
}

/**
 * Submits the credentials to be checked against the teacher accounts kept on this phone.
 *
 * The check is the phone's own, start to finish: a record of its own opens with the password that
 * locked it, or no record does. Nothing is sent anywhere, nothing is asked of a network, and the
 * answer is the same whether the phone has a connection or not.
 *
 * A wrong password and an email this phone has never seen are answered with the same sentence on
 * purpose: told apart, they would say out loud which teachers this phone knows.
 */
export async function submitSignIn(credentials: Credentials): Promise<SignInOutcome> {
  const teacher = await teacherMatching(credentials);
  if (!teacher) return { signedIn: false, said: say('signIn.noMatch') };
  return { signedIn: true, said: say('signIn.signedIn'), teacher };
}
