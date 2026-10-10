// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { open, takePictureOf } from '../test/screen';
import { submitSignIn } from '../lib/sign-in';
import LoginScreen from './index';

// The real sign-in, watched: it answers the screen exactly as it always does, and a check can also
// see what the screen handed it. Watching it is the only way to tell "submitted" from "looked busy".
vi.mock('../lib/sign-in', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/sign-in')>();
  return { ...real, submitSignIn: vi.fn(real.submitSignIn) };
});

const typed = { email: 'ms.rivera@riversidehigh.edu', password: 'Spring-2026-attendance' };

describe('Enter credentials and submit', () => {
  it('Tapping the Log In button submits the entered credentials.', async () => {
    vi.mocked(submitSignIn).mockClear();
    const screen = open(<LoginScreen />);

    await screen.type(/Email/i, typed.email);
    await screen.type(/^Password/i, typed.password);

    // Nothing is submitted until the button is pressed.
    expect(vi.mocked(submitSignIn)).not.toHaveBeenCalled();

    await screen.press('Log In');

    // Pressed once, it submits once, and what it submits is what was entered — both fields, as typed.
    expect(vi.mocked(submitSignIn)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(submitSignIn).mock.calls[0][0]).toEqual(typed);

    // And the screen says back what the sign-in answered, so a press is never a dead end.
    const { said } = await vi.mocked(submitSignIn).mock.results[0].value;
    expect(said).toBeTruthy();
    expect(screen.text()).toContain(said);

    // Whatever it says, it never says the password back.
    expect(screen.text()).not.toContain(typed.password);

    takePictureOf('Enter credentials and submit > Tapping the Log In button submits the entered credentials.', screen);
    screen.close();
  });
});
