// Whether somebody has been welcomed on this phone yet.
//
// The walkthrough is for a teacher's first morning with the app and for no morning after it, so the
// answer has to outlast the app itself: it is kept as the text of one small file in the app's own
// documents folder, beside the records (lib/accounts-file.ts), and read the moment a teacher is
// signed in.
//
// **Nothing personal is written in it.** It says that the walkthrough was finished on this phone
// and the day it was, and not a word about whose phone it is: an email in the clear here would say
// out loud which teacher this phone knows, which is exactly what the sign-in records go to some
// trouble not to say. A phone belongs to one teacher — an approved decision — so what it remembers
// is "somebody has been welcomed here", which is all that is needed to not ask them twice.
import { textOnThisPhone, type KeptText } from './accounts-file';

/** What the file is called in the app's own documents folder. */
export const onboardingFileName = 'classme-onboarding.json';

/** Whether the walkthrough has been finished on this phone, and the way to say that it has. */
export type OnboardingMemory = {
  /** True once somebody has been through the walkthrough on this phone. */
  read(): Promise<boolean>;
  /** Writes that down, in place of whatever was there. */
  write(finished: boolean): Promise<void>;
};

/** Kept for as long as the app runs and no longer, for a check: nothing of a phone in it. */
export function onboardingIn(finished = false): OnboardingMemory {
  let kept = finished;
  return {
    async read() {
      return kept;
    },
    async write(next) {
      kept = next;
    },
  };
}

/**
 * The memory as one file's text: `{ "version": 1, "finished": true, "at": "<the day>" }`.
 *
 * Text that is not what this app writes — a file somebody edited, a file from a version that kept
 * something else — reads as nobody having been welcomed, so a teacher is shown the walkthrough
 * again rather than being refused the app. Shown twice is a small cost; the other way round is a
 * teacher who never learns what the app does.
 */
export function onboardingKeptIn(file: KeptText): OnboardingMemory {
  return {
    async read() {
      const text = await file.read();
      if (!text) return false;
      let read: unknown;
      try {
        read = JSON.parse(text);
      } catch {
        return false;
      }
      if (!read || typeof read !== 'object') return false;
      return (read as Record<string, unknown>).finished === true;
    },
    async write(finished) {
      // The day is kept only so a person reading the file can see when it was written. It is the
      // phone's own day, to nobody's calendar but this one's.
      await file.write(JSON.stringify({ version: 1, finished, at: new Date().toISOString().slice(0, 10) }));
    },
  };
}

/** The memory this phone keeps, in the app's own documents folder. */
export function onboardingOnThisPhone(): OnboardingMemory {
  return onboardingKeptIn(textOnThisPhone(onboardingFileName));
}

// A phone nobody has been welcomed on, until the app itself says where its own memory is: this is
// what a check gets, and it is the honest starting state — a freshly installed app remembers
// nothing, and the teacher holding it is owed the welcome.
let memory: OnboardingMemory = onboardingIn(false);

/** Keeps whether the walkthrough is finished in this memory from now on. */
export function keepOnboardingIn(next: OnboardingMemory): void {
  memory = next;
}

/** The memory the app is using now. */
export function onboardingMemory(): OnboardingMemory {
  return memory;
}

/**
 * Whether the walkthrough has been finished on this phone.
 *
 * A phone that will not answer reads as nobody having been welcomed: the walkthrough is four
 * screens a teacher presses through, and showing it to them again is the harmless end of that
 * mistake.
 */
export async function finishedOnboarding(): Promise<boolean> {
  try {
    return await memory.read();
  } catch {
    return false;
  }
}

/**
 * Remembers that the walkthrough is finished, and answers whether the phone actually kept it.
 *
 * Never throws: the teacher is on their way to Home either way, and a phone that would not write it
 * down costs them the welcome once more and nothing else. Nothing is logged about it — what went
 * wrong is the answer handed back, not a line in a log.
 */
export async function rememberOnboardingFinished(): Promise<boolean> {
  try {
    await memory.write(true);
    return true;
  } catch {
    return false;
  }
}
