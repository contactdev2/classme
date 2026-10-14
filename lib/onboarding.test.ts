// What a phone remembers about the welcome: written once, it is there for the next run to read, and
// anything else in that file reads as nobody having been welcomed rather than as a fault.
import { describe, expect, it } from 'vitest';
import { textFileWith } from './accounts-file';
import { finishedOnboarding, keepOnboardingIn, onboardingIn, onboardingKeptIn, rememberOnboardingFinished } from './onboarding';

describe('what a phone remembers about the welcome', () => {
  it('outlasts the app: written once, the next run reads it', async () => {
    const file = textFileWith(null);

    // A phone the app was installed on this morning remembers nothing, and that is not a fault.
    expect(await onboardingKeptIn(file).read()).toBe(false);

    await onboardingKeptIn(file).write(true);

    // The app closed and opened again: a memory of its own, over the text the phone kept.
    const nextMorning = onboardingKeptIn(textFileWith(await file.read()));
    expect(await nextMorning.read()).toBe(true);
  });

  it('says that somebody was welcomed here, and nothing about who', async () => {
    const file = textFileWith(null);
    await onboardingKeptIn(file).write(true);
    const written = (await file.read()) ?? '';

    // Nothing in it could say which teacher this phone knows: it is a fact about the phone.
    expect(written).toContain('finished');
    expect(written).not.toMatch(/@/);
    expect(written.toLowerCase()).not.toContain('email');
    expect(written.toLowerCase()).not.toContain('name');
  });

  it('reads anything that is not this app’s own file as nobody having been welcomed', async () => {
    for (const text of ['', 'not json at all', '[]', '{}', '{"finished":"yes"}', '{"version":1}', 'null']) {
      expect(await onboardingKeptIn(textFileWith(text)).read(), text).toBe(false);
    }
  });

  it('never refuses a teacher over it: a phone that will not answer welcomes them again', async () => {
    const stubborn = {
      async read(): Promise<boolean> {
        throw new Error('this phone will not say');
      },
      async write(): Promise<void> {
        throw new Error('this phone will not keep it');
      },
    };
    keepOnboardingIn(stubborn);

    // Read as nobody welcomed, written as not kept — and neither one thrown at the screen.
    expect(await finishedOnboarding()).toBe(false);
    expect(await rememberOnboardingFinished()).toBe(false);

    // A phone that does keep it says so.
    keepOnboardingIn(onboardingIn(false));
    expect(await rememberOnboardingFinished()).toBe(true);
    expect(await finishedOnboarding()).toBe(true);
    keepOnboardingIn(onboardingIn(false));
  });
});
