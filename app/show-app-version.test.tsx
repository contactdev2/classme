// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { open, takePictureOf } from '../test/screen';
import LoginScreen from './index';

/**
 * The version of the app that is installed on the phone. For an Expo app that is the one number in
 * app.json: the build takes it as the Android versionName, so what is written there is what a
 * teacher reads in their phone's own app list. The checks read it from the same place, so they
 * compare the screen against the installed app and not against a copy of a number.
 */
function installedVersion(): string {
  return JSON.parse(readFileSync('app.json', 'utf8')).expo?.version;
}

/** The version as a person reads it on a screen: vMAJOR.MINOR.PATCH. */
const asRead = (version: string) => `v${version}`;

/** Every element on the screen whose own words are the version and nothing else. */
function versionElements(): HTMLElement[] {
  return [...document.body.querySelectorAll<HTMLElement>('*')].filter(
    (el) => el.children.length === 0 && (el.textContent ?? '').trim() === asRead(installedVersion()),
  );
}

/** Whether this element, or anything it sits inside, is a thing a person has to scroll. */
function insideSomethingScrolled(el: HTMLElement): boolean {
  for (let at: HTMLElement | null = el; at && at !== document.body; at = at.parentElement) {
    const overflow = `${at.style.overflowY} ${at.style.overflow} ${at.style.overflowX}`;
    if (/auto|scroll/.test(overflow)) return true;
  }
  return false;
}

/** A check that photographs its screen waits on a browser to launch, which on a busy machine
 * takes longer than a check that only reads one. */
const picturing = 120_000;

describe('Show the app version on the welcome screen', () => {
  it('When the welcome screen opens, a version number is visible on it.', () => {
    const screen = open(<LoginScreen />);

    // Nothing was typed and nothing was pressed: this is the screen as it arrives.
    const version = installedVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);

    // And a person reading the screen reads the version on it.
    expect(screen.text()).toContain(asRead(version));

    // Drawn as its own words somewhere on the screen, not hidden away in the markup.
    const shown = versionElements();
    expect(shown.length).toBeGreaterThanOrEqual(1);
    for (const el of shown) expect(el.style.display).not.toBe('none');

    takePictureOf('Show the app version on the welcome screen > When the welcome screen opens, a version number is visible on it.', screen);
    screen.close();
  }, picturing);

  it('The version number shown on the welcome screen is the same as the version number of the installed app.', () => {
    const screen = open(<LoginScreen />);

    // The one number the build installs on the phone.
    const installed = installedVersion();
    expect(installed).toMatch(/^\d+\.\d+\.\d+$/);

    // The screen says that number, and says no other version beside it.
    const said = [...screen.text().matchAll(/\bv\d+(?:\.\d+)*\b/g)].map((m) => m[0]);
    expect(said).toContain(asRead(installed));
    expect([...new Set(said)]).toEqual([asRead(installed)]);

    // And it reads that number from app.json itself rather than keeping a copy of its own, so the
    // two can never drift apart: a release that changes the installed version changes the screen.
    const source = readFileSync('lib/version.ts', 'utf8');
    expect(source).toContain('app.json');
    expect(source).not.toMatch(/['"`]\d+\.\d+\.\d+['"`]/);

    takePictureOf('Show the app version on the welcome screen > The version number shown on the welcome screen is the same as the version number of the installed app.', screen);
    screen.close();
  }, picturing);

  it('The version number can be read without scrolling or tapping anything.', () => {
    const screen = open(<LoginScreen />);

    // Nothing is tapped to reach it: it is there on the screen the moment it opens.
    const shown = versionElements();
    expect(shown.length).toBeGreaterThanOrEqual(1);

    // And nothing is scrolled to reach it either: it sits outside everything that scrolls, pinned
    // to the foot of the screen, so a long login card slides under it and never past it.
    const pinned = shown.filter((el) => !insideSomethingScrolled(el));
    expect(pinned.length).toBeGreaterThanOrEqual(1);

    // The foot of the screen is the last thing in it, under everything else.
    const footer = pinned[0].closest('div');
    expect(footer).not.toBeNull();
    const screenRoot = document.body.firstElementChild?.firstElementChild as HTMLElement;
    expect(screenRoot.lastElementChild?.contains(pinned[0])).toBe(true);

    // What it scrolls is given the room that is left, so the foot is never pushed off the phone.
    const scrolled = [...screenRoot.children].filter((el) => /auto|scroll/.test((el as HTMLElement).style.overflowY));
    expect(scrolled.length).toBe(1);
    expect((scrolled[0] as HTMLElement).style.flex).not.toBe('');

    takePictureOf('Show the app version on the welcome screen > The version number can be read without scrolling or tapping anything.', screen);
    screen.close();
  }, picturing);

  it('Use the format vMAJOR.MINOR.PATCH, e.g. v1.0.0', () => {
    const screen = open(<LoginScreen />);

    // Three numbers, a dot between them, a v in front: v1.0.0 and nothing looser.
    const said = [...screen.text().matchAll(/v\d[\d.]*/g)].map((m) => m[0]);
    expect(said.length).toBeGreaterThanOrEqual(1);
    for (const one of said) expect(one).toMatch(/^v\d+\.\d+\.\d+$/);

    // The installed version is written in that shape too, so there is nothing to round off.
    expect(installedVersion()).toMatch(/^\d+\.\d+\.\d+$/);

    takePictureOf('Show the app version on the welcome screen > Use the format vMAJOR.MINOR.PATCH, e.g. v1.0.0', screen);
    screen.close();
  }, picturing);

  it('The version number stays the same and visible every time the welcome screen is opened.', () => {
    const wanted = asRead(installedVersion());

    // Opened, closed, opened again — the way a teacher's morning actually goes. Every time, the
    // same words in the same place: nothing counts up, nothing is dropped after the first look.
    const read: string[] = [];
    let last = open(<LoginScreen />);
    for (let time = 0; time < 3; time += 1) {
      if (time > 0) {
        last.close();
        last = open(<LoginScreen />);
      }
      const shown = versionElements().filter((el) => !insideSomethingScrolled(el));
      expect(shown.length).toBeGreaterThanOrEqual(1);
      read.push((shown[0].textContent ?? '').trim());
    }
    expect(read).toEqual([wanted, wanted, wanted]);

    takePictureOf('Show the app version on the welcome screen > The version number stays the same and visible every time the welcome screen is opened.', last);
    last.close();
  }, picturing);
});
