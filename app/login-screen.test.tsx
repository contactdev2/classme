import { readFileSync, readdirSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { takePicture } from '../test/picture';
import LoginScreen from './index';
import { setLanguage } from '../lib/i18n';
import { keepLanguageIn, languageFileWith } from '../lib/language-file';
import { sourceLanguage } from '../lib/languages';

// This check reads the app in the language its own words are written in, so what it proves is about
// the screen and not about a translation. Which language a screen is in, and that every screen
// follows the one a teacher chose, is proved in app/localise-app.test.tsx.
setLanguage(sourceLanguage);
keepLanguageIn(languageFileWith(null));

/** What a person actually reads on the screen, with the markup taken back out. */
const visibleText = (markup: string) => markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/** The screen the app opens on: the route at '/', drawn the way the web build draws it. */
const openTheApp = () => renderToStaticMarkup(<LoginScreen />);

/** One field on the screen: the element a person types into, and the words that name it. */
function fields(markup: string) {
  return [...markup.matchAll(/<input\b[^>]*>/g)].map((m) => m[0]);
}

const labelled = (field: string, words: RegExp) => words.test(field);

describe('See the login screen on open', () => {
  it('The app opens directly to a screen with email and password fields.', () => {
    const markup = openTheApp();
    const typed = fields(markup);

    // Two things to type into, and a person can tell which is which by reading the screen.
    expect(typed.length).toBeGreaterThanOrEqual(2);
    expect(visibleText(markup)).toMatch(/Email/i);
    expect(visibleText(markup)).toMatch(/Password/i);

    // The email field is an email field: the phone offers an email keyboard, and names itself.
    const email = typed.filter((f) => labelled(f, /aria-label="[^"]*[Ee]mail/) && /type="email"/.test(f));
    expect(email.length).toBe(1);

    // The password field hides what is typed into it, and names itself too.
    const password = typed.filter((f) => labelled(f, /aria-label="[^"]*[Pp]assword/) && /type="password"/.test(f));
    expect(password.length).toBe(1);

    // Nothing on it is pinned to a size the phone's largest text would be cut off by.
    expect(markup).not.toMatch(/[;"](height|max-height|line-height)\s*:/);
    expect(markup).not.toContain('numberOfLines');

    takePicture('See the login screen on open > The app opens directly to a screen with email and password fields.', markup);
  });

  it('No other screen appears before the login screen.', () => {
    // The app's first route is '/' — app/index.tsx — and that file is the login screen itself,
    // so the first thing drawn is already the one with the fields on it.
    const markup = openTheApp();
    expect(fields(markup).some((f) => /type="password"/.test(f))).toBe(true);

    // It draws them at once: nothing is held back behind a splash, a wait, or a send-somewhere-else.
    const indexSource = readFileSync('app/index.tsx', 'utf8');
    expect(indexSource).not.toMatch(/SplashScreen|Redirect|preventAutoHide/);

    // And no other screen is in front of it: the only routes are the layout and '/'.
    const routes = readdirSync('app').filter((f) => /\.(t|j)sx?$/.test(f) && !f.includes('.test.'));
    expect(routes.sort()).toEqual(['_layout.tsx', 'index.tsx']);

    // The layout wraps the route and sends nobody anywhere else before it.
    const layoutSource = readFileSync('app/_layout.tsx', 'utf8');
    expect(layoutSource).toContain('<Slot />');
    expect(layoutSource).not.toMatch(/Redirect|initialRouteName|SplashScreen/);

    takePicture('See the login screen on open > No other screen appears before the login screen.', markup);
  });

  it('The login screen shows a Log In button.', () => {
    const markup = openTheApp();

    // A button, announced as one, and it says Log In.
    expect(markup).toMatch(/role="button"/);
    expect(visibleText(markup)).toContain('Log In');
    const buttons = [...markup.matchAll(/<[a-z]+\b[^>]*role="button"[^>]*>([\s\S]*?)<\/[a-z]+>/g)]
      .map((m) => visibleText(m[0]));
    expect(buttons.some((b) => b.includes('Log In'))).toBe(true);

    takePicture('See the login screen on open > The login screen shows a Log In button.', markup);
  });
});
