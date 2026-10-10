// Signing a teacher in, on the phone and nowhere else. The login screen collects what is typed and
// hands it here; this is the one place that decides what a submission means, so the screen only has
// to say back what it is told.

/**
 * What a teacher types in to sign in. These two words travel together and no further: they are
 * never written to a log, never put in a message, and never sent off the phone.
 */
export type Credentials = { email: string; password: string };

/** What a submission came to, and the one sentence the screen says back to the teacher. */
export type SignInOutcome = { signedIn: boolean; said: string };

/**
 * What a teacher has still to fill in, in words they can act on, or null when both fields are there.
 * Said field by field, because "something is missing" makes a person check both.
 */
export function missingFrom(typed: Credentials): string | null {
  const email = typed.email.trim();
  if (!email && !typed.password) return 'Enter your email and password to log in.';
  if (!email) return 'Enter your email address to log in.';
  if (!typed.password) return 'Enter your password to log in.';
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
 * No account is kept on this phone yet — keeping a teacher's login details locally and encrypted is
 * its own requirement, still to come — so there is nothing here any email and password could match,
 * and that is what this answers. When accounts are kept, this is the one function to teach how to
 * read them: everything else on the login screen already goes through it.
 */
export async function submitSignIn(credentials: Credentials): Promise<SignInOutcome> {
  void credentials;
  return { signedIn: false, said: 'No account on this phone matches that email and password.' };
}
