// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { open, takePictureOf } from '../test/screen';
import LoginScreen from './index';

const typed = { email: 'ms.rivera@riversidehigh.edu', password: 'Spring-2026-attendance' };

describe('Enter credentials and submit', () => {
  it('Teacher can type an email address into a field.', async () => {
    const screen = open(<LoginScreen />);

    // A field a person finds by reading the words that name it, and it starts empty.
    const email = screen.field(/Email/i);
    expect(email.value).toBe('');

    // Typed into, it keeps exactly what was typed — every character, nothing swallowed.
    await screen.type(/Email/i, typed.email);
    expect(email.value).toBe(typed.email);

    // It is an email field, so the phone offers the keyboard for one and does not capitalise it.
    expect(email.getAttribute('type')).toBe('email');

    takePictureOf('Enter credentials and submit > Teacher can type an email address into a field.', screen);
    screen.close();
  });

  it('Teacher can type a password into a separate field.', async () => {
    const screen = open(<LoginScreen />);

    // Two fields, not one: what is typed as a password goes somewhere else than the email.
    const email = screen.field(/Email/i);
    const password = screen.field(/^Password/i);
    expect(password).not.toBe(email);

    await screen.type(/Email/i, typed.email);
    await screen.type(/^Password/i, typed.password);

    // Each field keeps its own, and neither took the other's.
    expect(password.value).toBe(typed.password);
    expect(email.value).toBe(typed.email);

    // The password is hidden as it is typed, so a class reading over a shoulder cannot see it.
    expect(password.getAttribute('type')).toBe('password');
    expect(screen.text()).not.toContain(typed.password);

    takePictureOf('Enter credentials and submit > Teacher can type a password into a separate field.', screen);

    // And a teacher who mistypes can look at it: shown, it is exactly what they typed.
    await screen.press('Show password');
    expect(screen.field(/^Password/i).getAttribute('type')).toBe('text');
    expect(screen.field(/^Password/i).value).toBe(typed.password);
    screen.close();
  });
});
