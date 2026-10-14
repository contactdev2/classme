// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Classroom, ClassroomData, Student } from '../lib/classroom-data';
import { setLanguage } from '../lib/i18n';
import { keepLanguageIn, languageFileWith } from '../lib/language-file';
import { sourceLanguage } from '../lib/languages';
import { accountsIn, keepAccountsIn, lockAccount } from '../lib/local-accounts';
import { keepOnboardingIn, onboardingIn } from '../lib/onboarding';
import { open, settle, takePictureOf, visibleText, type Screen } from '../test/screen';
import TheApp from './index';

// This check reads the app in the language its own words are written in, so what it proves is about
// the screen and not about a translation. Which language a screen is in, and that every screen
// follows the one a teacher chose, is proved in app/localise-app.test.tsx.
setLanguage(sourceLanguage);
keepLanguageIn(languageFileWith(null));

// The teacher this phone belongs to, and the password that opens their own record.
const teacher = { email: 'ms.rivera@riversidehigh.edu', name: 'Ms. Rivera' };
const password = 'Spring-2026-attendance';

// Stretching a password is slow on purpose, so a record made for a check says its own smaller
// number. A record carries the number it was made with, so both open alike.
const checkIterations = 1_000;

// How long a check may take altogether. Nothing here waits on anything — it is the browser that
// draws the picture at the end of each one, and a cold browser on a runner has taken fifteen
// seconds. See app/browse-classes.test.tsx, which says the same.
const pictureTakesAWhile = 120_000;

/** The morning this check stands on: a Monday in April, which is a school day. */
const theMorning = new Date('2025-04-21T08:12:00');

/**
 * The pieces this requirement adds, asked for when a check runs rather than when this file loads.
 * This file was pushed before any of them existed, so every check here had to fail on its own line
 * and name what was missing: a file that cannot even load says nothing about any one criterion.
 */
// Named as a word and not written into the import itself on purpose: a missing module written in
// plainly is a file that will not even load, and a check file that cannot load says nothing about
// any one criterion. Asked for this way, each check below fails on its own line and names what is
// missing — which is how this file was pushed before a line of the implementation existed.
const theRules = '../lib/new-classroom';

async function parts() {
  const data = await import('../lib/classroom-data');
  const made = (await import(/* @vite-ignore */ theRules)) as Record<string, any>;
  return { ...data, ...made } as typeof data & {
    detailsFrom: (typed: NewClassroom) => NewClassroom;
    nameAlreadyUsed: (data: ClassroomData, name: string) => boolean;
    classroomNamed: (data: ClassroomData, name: string) => Classroom | null;
    makeClassroom: (typed: NewClassroom) => Promise<{ created: boolean; said: string; classroom?: Classroom }>;
  };
}

/** What a teacher fills in to make a classroom, as this check fills it in. */
type NewClassroom = { name: string; period: string; subject: string; colour: string };

/** The class this teacher already has, on the checks that need one standing in the way. */
const theMaths: Classroom = { id: 'c-maths', name: 'Mathematics', period: '1st Period', subject: '📐', colour: '#2F6FED' };

/** A class with nobody in it is still a class: a roster is the next requirement's to fill. */
const noStudents: Student[] = [];

/** The morning the app is opened on, so a day in words is the same day every time. */
function aMondayMorning(): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(theMorning);
}

/** This phone: the teacher's own account on it, and whatever classes it already keeps. */
async function aPhoneWith(classrooms: Classroom[]): Promise<void> {
  const { classroomDataIn, keepClassroomDataIn } = await parts();
  keepAccountsIn(accountsIn([lockAccount({ email: teacher.email, password }, teacher, checkIterations)]));
  // The teacher of this phone has already been welcomed: the first morning's walkthrough is proved
  // in app/complete-onboarding.test.tsx, and what is being read here is what comes after it.
  keepOnboardingIn(onboardingIn(true));
  keepClassroomDataIn(classroomDataIn({ version: 1, classrooms, students: noStudents, attendance: [] }));
}

/** A teacher arriving at the app and signing in with their own email and password. */
async function signIn(): Promise<Screen> {
  const screen = open(<TheApp />);
  await screen.type(/Email/i, teacher.email);
  await screen.type(/^Password/i, password);
  await screen.press('Log In');
  await settle();
  return screen;
}

/** Signed in, and standing in the Classes list: the place the app's own bottom row calls Classes. */
async function inTheClassesList(classrooms: Classroom[] = []): Promise<Screen> {
  aMondayMorning();
  await aPhoneWith(classrooms);
  const screen = await signIn();
  await screen.press('Classes');
  await settle();
  return screen;
}

/** Standing in front of the empty form where a classroom is made. */
async function makingAClassroom(classrooms: Classroom[] = []): Promise<Screen> {
  const screen = await inTheClassesList(classrooms);
  await screen.press(classrooms.length === 0 ? 'Create Classroom' : 'New classroom');
  await settle();
  return screen;
}

/** Everything a control on this screen says, as a person reads it. */
const controlsOn = (screen: Screen): { words: string; label: string }[] =>
  [...screen.root().querySelectorAll('[role="button"], [role="radio"], [role="link"]')].map((one) => ({
    words: visibleText(one.innerHTML || (one.textContent ?? '')),
    label: one.getAttribute('aria-label') ?? '',
  }));

/** The control a person would press to see these words, and nothing else on the screen. */
const controlSaying = (screen: Screen, words: string) =>
  controlsOn(screen).filter((one) => one.words.includes(words) || one.label.includes(words));

/** What the phone itself keeps, read back the way the app reads it. */
async function keptOnThePhone(): Promise<ClassroomData> {
  const { classroomStore } = await parts();
  return classroomStore().read();
}

/** Every sentence this screen is saying out loud as something a teacher has to read now. */
const alertsOn = (screen: Screen): string[] =>
  [...screen.root().querySelectorAll('[role="alert"]')].map((one) => visibleText(one.innerHTML));

/** Typing a classroom's name into the form, the way a thumb does. */
async function typeTheName(screen: Screen, name: string): Promise<void> {
  await screen.type(/Classroom Name/i, name);
}

afterEach(() => {
  vi.useRealTimers();
  keepAccountsIn(accountsIn([]));
});

describe('Add ability to create new classrooms by a teacher', () => {
  it("A teacher can tap a clear 'create classroom' option from their screen.", async () => {
    const screen = await inTheClassesList();

    // A teacher with no classes yet is met by the one thing there is to do: the card the prototype
    // draws, saying what a classroom is for and offering to make one.
    const read = screen.text();
    expect(read).toContain('My Classes');
    expect(read).toContain('Create Classroom');
    expect(read).toContain('Create your first classroom');

    // It is a button, announced as one, and there is exactly one of it.
    expect(controlSaying(screen, 'Create Classroom')).toHaveLength(1);

    // And it opens the form where a classroom is made.
    await screen.press('Create Classroom');
    await settle();
    expect(screen.text()).toContain('New Classroom');
    expect(screen.field(/Classroom Name/i)).toBeTruthy();

    // A teacher who already has classes reaches the same form from the top of their own list.
    const again = await inTheClassesList([theMaths]);
    expect(controlSaying(again, 'New classroom')).toHaveLength(1);
    await again.press('New classroom');
    await settle();
    expect(again.text()).toContain('New Classroom');
    again.close();

    // The empty list works at the phone's largest text size: nothing on it is pinned to a size,
    // and nothing it says is cut short after so many lines.
    const empty = await inTheClassesList();
    expect(empty.markup()).not.toMatch(/[;"](max-height|line-height)\s*:/);
    expect(empty.markup()).not.toContain('numberOfLines');

    takePictureOf(
      "Add ability to create new classrooms by a teacher > A teacher can tap a clear 'create classroom' option from their screen.",
      empty,
    );
    empty.close();
    screen.close();
  }, pictureTakesAWhile);

  it('A teacher can type a classroom name and save it to create a new classroom.', async () => {
    const screen = await makingAClassroom();

    // A name typed into the form, and the button under it pressed: that is the whole of making one.
    await typeTheName(screen, 'Mathematics');
    await screen.press('Create Classroom');
    await settle();

    // The phone keeps it now, under the name that was typed.
    const kept = await keptOnThePhone();
    expect(kept.classrooms).toHaveLength(1);
    expect(kept.classrooms[0].name).toBe('Mathematics');
    // And it is a whole classroom: an icon and a colour to pick it out by, so the list it joins can
    // draw it the way it draws every other card.
    expect(kept.classrooms[0].id).toBeTruthy();
    expect(kept.classrooms[0].subject).toBeTruthy();
    expect(kept.classrooms[0].colour).toMatch(/^#[0-9A-Fa-f]{6}$/);

    // The name is taken as the teacher typed it, with the stray spaces a keyboard adds taken off.
    const { detailsFrom } = await parts();
    expect(detailsFrom({ name: '  Physics  ', period: ' 2nd Period ', subject: '📐', colour: '#2F6FED' }).name).toBe('Physics');

    // The form as a teacher leaves it: their class named, and the button that makes it under their
    // thumb.
    const form = await makingAClassroom();
    await typeTheName(form, 'Mathematics');
    takePictureOf(
      'Add ability to create new classrooms by a teacher > A teacher can type a classroom name and save it to create a new classroom.',
      form,
    );
    form.close();
    screen.close();
  }, pictureTakesAWhile);

  it("After saving, the new classroom appears in the teacher's list of classes.", async () => {
    const screen = await makingAClassroom();
    await typeTheName(screen, 'Mathematics');
    await screen.press('Create Classroom');
    await settle();

    // The teacher is back in their own list, and the class they have just made has a card in it.
    const read = screen.text();
    expect(read).toContain('My Classes');
    const card = controlSaying(screen, 'Mathematics');
    expect(card).toHaveLength(1);
    expect(read).not.toContain('Create your first classroom');

    // It is in the list because it is on the phone, not because the screen remembered it: the app
    // closed and opened again shows the same class.
    const tomorrow = await signIn();
    await tomorrow.press('Classes');
    await settle();
    expect(controlSaying(tomorrow, 'Mathematics')).toHaveLength(1);
    tomorrow.close();

    takePictureOf(
      "Add ability to create new classrooms by a teacher > After saving, the new classroom appears in the teacher's list of classes.",
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);

  it('The teacher sees a confirmation message right after a classroom is created.', async () => {
    const screen = await makingAClassroom();
    await typeTheName(screen, 'Mathematics');
    await screen.press('Create Classroom');
    await settle();

    // The screen says so, in words, and says it out loud: a sentence naming the class that has just
    // been made, announced as something a teacher has to read now.
    const said = alertsOn(screen);
    expect(said).toHaveLength(1);
    expect(said[0]).toContain('Mathematics');
    expect(said[0]).toMatch(/created/i);

    // Nothing ever says a classroom was created over a phone that would not keep one: a store that
    // refuses to be written to answers that nothing was made, and says so in words of its own.
    const { keepClassroomDataIn, makeClassroom, nothingKeptYet } = await parts();
    keepClassroomDataIn({
      async read() {
        return nothingKeptYet();
      },
      async write() {
        throw new Error('this phone has no room left');
      },
    });
    const refused = await makeClassroom({ name: 'History', period: '', subject: '📐', colour: '#2F6FED' });
    expect(refused.created).toBe(false);
    expect(refused.said).not.toMatch(/created/i);
    expect(refused.classroom).toBeUndefined();

    takePictureOf(
      'Add ability to create new classrooms by a teacher > The teacher sees a confirmation message right after a classroom is created.',
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);

  it('If a teacher tries to save a classroom without typing a name, the app shows an error and does not create it.', async () => {
    const screen = await makingAClassroom();

    // The button pressed with the name field left empty.
    await screen.press('Create Classroom');
    await settle();

    // The screen says what is missing, out loud, and the teacher is still standing in the form.
    const said = alertsOn(screen);
    expect(said).toHaveLength(1);
    expect(said[0]).toMatch(/name/i);
    expect(screen.text()).toContain('New Classroom');

    // And nothing was made: the phone keeps no classroom at all.
    expect((await keptOnThePhone()).classrooms).toHaveLength(0);

    // A name of nothing but spaces is a name nobody typed.
    await typeTheName(screen, '   ');
    await screen.press('Create Classroom');
    await settle();
    expect(alertsOn(screen)[0]).toMatch(/name/i);
    expect((await keptOnThePhone()).classrooms).toHaveLength(0);

    takePictureOf(
      'Add ability to create new classrooms by a teacher > If a teacher tries to save a classroom without typing a name, the app shows an error and does not create it.',
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);

  it("Block creation and show 'A classroom with this name already exists' if the name matches one the teacher already has.", async () => {
    const screen = await makingAClassroom([theMaths]);

    // The name of a class this teacher already has, typed again.
    await typeTheName(screen, 'Mathematics');
    await screen.press('Create Classroom');
    await settle();

    // The refusal is said in those words exactly, and said out loud.
    expect(screen.text()).toContain('A classroom with this name already exists');
    expect(alertsOn(screen).join(' ')).toContain('A classroom with this name already exists');

    // Nothing was made: the phone keeps the one class it kept before.
    const kept = await keptOnThePhone();
    expect(kept.classrooms).toHaveLength(1);
    expect(kept.classrooms[0].id).toBe(theMaths.id);

    takePictureOf(
      "Add ability to create new classrooms by a teacher > Block creation and show 'A classroom with this name already exists' if the name matches one the teacher already has.",
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);

  it('A classroom is unique based on the classroom  name', async () => {
    const { nameAlreadyUsed, classroomNamed } = await parts();
    const kept: ClassroomData = { version: 1, classrooms: [theMaths], students: noStudents, attendance: [] };

    // One name is one classroom, however it is typed: the same letters in another case, or with the
    // spaces a keyboard leaves on the ends, are the class the teacher already has.
    expect(nameAlreadyUsed(kept, 'Mathematics')).toBe(true);
    expect(nameAlreadyUsed(kept, 'mathematics')).toBe(true);
    expect(nameAlreadyUsed(kept, '  MATHEMATICS  ')).toBe(true);
    expect(nameAlreadyUsed(kept, 'Mathematics II')).toBe(false);
    expect(classroomNamed(kept, ' mathematics ')?.id).toBe(theMaths.id);

    // A class put away is still a class this teacher has, so its name is still taken: two classes
    // one name apart cannot be told from each other in a list or in a backup file.
    const archived: ClassroomData = { ...kept, classrooms: [{ ...theMaths, archived: true }] };
    expect(nameAlreadyUsed(archived, 'Mathematics')).toBe(true);

    // And it holds on the phone, not only in the reading of it: the same name typed twice leaves
    // one class behind, and a name of its own leaves a second.
    const screen = await makingAClassroom();
    await typeTheName(screen, 'Mathematics');
    await screen.press('Create Classroom');
    await settle();
    await screen.press('New classroom');
    await settle();
    await typeTheName(screen, 'mathematics');
    await screen.press('Create Classroom');
    await settle();
    expect(screen.text()).toContain('A classroom with this name already exists');
    expect((await keptOnThePhone()).classrooms).toHaveLength(1);

    await typeTheName(screen, 'Science');
    await screen.press('Create Classroom');
    await settle();
    const both = await keptOnThePhone();
    expect(both.classrooms.map((one) => one.name).sort()).toEqual(['Mathematics', 'Science']);
    expect(new Set(both.classrooms.map((one) => one.id)).size).toBe(2);

    takePictureOf(
      'Add ability to create new classrooms by a teacher > A classroom is unique based on the classroom  name',
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);
});
